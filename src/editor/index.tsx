'use client'
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type {
  DiagramDocument,
  EditorCommand,
  EditorStore,
  GraphNode,
  GraphPort,
  Locale,
  NodeInput,
  Point,
  RoutePlacement,
} from '../editor-core/types'
import type {
  DiagramNode,
  ErEntity,
  PortSide,
  SequenceParticipant,
  SwimlaneLane,
  TableField,
} from '../types'
import { getAdapter } from '../editor-core/adapters'
import { edgesOf, freeTypes, nodesOf } from '../editor-core/model'
import { isNodeLocked } from '../editor-core/commands'
import { resolveDocument, relayoutScene, anchorPoint, anchorFromPoint } from '../editor-core/scene'
import { fitViewport, zoomAt, screenToWorld } from '../editor-core/viewport'
import { serializeDocument } from '../editor-core/document'
import { renderSceneMarkup } from '../render'
import { createFragment, pasteFragment } from '../editor-core/clipboard'
import type { DiagramFragment, RelationInput } from '../editor-core/types'
import { createEditorStore } from '../editor-core/store'
import { arrangeRects, type Arrangement } from '../geometry/arrange'
import { RESIZE_HANDLES, rectsUnion, resizeRects, type ResizeDirection } from '../geometry/resize'
import { pinchViewport } from '../geometry/pinch'
import { nodeGeometry } from '../geometry/node'
import { marqueeBounds, intersectsMarquee } from '../geometry/selection'
import { createCanvasTextMeasurer } from '../geometry/text'
import type { StoreOptions } from '../editor-core/types'

const Context = createContext<{ store: EditorStore; locale: Locale } | null>(null)
/** Real font widths once Geist is loaded; conservative estimate otherwise. */
const measureText = createCanvasTextMeasurer()
export function EditorRoot({
  store,
  locale,
  children,
}: {
  store: EditorStore
  locale: Locale
  children: ReactNode
}) {
  return <Context.Provider value={{ store, locale }}>{children}</Context.Provider>
}
export function useEditor() {
  const context = useContext(Context)
  if (!context) throw new Error('Editor components require EditorRoot')
  return context
}
export function useEditorSnapshot() {
  const { store } = useEditor()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
/** Shallow equality for composite selector slices (selection/document pairs). */
export const shallowEqual = <T,>(a: T, b: T): boolean => {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const keysA = Object.keys(a as object),
    keysB = Object.keys(b as object)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) =>
    Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  )
}
export function useEditorSelector<T>(
  select: (snapshot: ReturnType<EditorStore['getSnapshot']>) => T,
  equals: (a: T, b: T) => boolean = Object.is,
): T {
  const { store } = useEditor()
  const selectRef = useRef(select)
  selectRef.current = select
  const equalsRef = useRef(equals)
  equalsRef.current = equals
  const cache = useRef<
    | {
        store: EditorStore
        select: (snapshot: ReturnType<EditorStore['getSnapshot']>) => T
        value: T
      }
    | undefined
  >(undefined)
  const [, setTick] = useState(0)
  useEffect(() => {
    const update = () => {
      const next = selectRef.current(store.getSnapshot())
      const current = cache.current?.value
      if (current === undefined || !equalsRef.current(next, current)) {
        cache.current = { store, select: selectRef.current, value: next }
        setTick((tick) => tick + 1)
      }
    }
    update()
    return store.subscribe(update)
  }, [store])
  const cached = cache.current
  if (!cached || cached.store !== store || cached.select !== select) {
    const next = select(store.getSnapshot())
    cache.current = { store, select, value: next }
    return next
  }
  return cached.value
}
function useLabels() {
  const { locale } = useEditor()
  return (en: string, es: string) => (locale === 'es' ? es : en)
}
interface NodeHitRectProps {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
  selected: boolean
  zoom: number
  stroke: string
  onSelect: (id: string) => void
  onKey: (id: string) => void
}
const NodeHitRect = memo(function NodeHitRect({
  id,
  x,
  y,
  width,
  height,
  label,
  selected,
  zoom,
  stroke,
  onSelect,
  onKey,
}: NodeHitRectProps) {
  return (
    <rect
      data-hit-node={id}
      x={x}
      y={y}
      width={width}
      height={height}
      rx={4}
      fill="transparent"
      stroke={selected ? stroke : 'none'}
      strokeWidth={2 / zoom}
      tabIndex={0}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onFocus={() => {
        if (!selected) onSelect(id)
      }}
      onKeyDown={(event: ReactKeyboardEvent<SVGRectElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onKey(id)
        }
      }}
    />
  )
})
interface EdgeHitRectProps {
  id: string
  index: number
  x: number
  y: number
  width: number
  height: number
  selected: boolean
  zoom: number
  stroke: string
  label: string
  onSelect: (id: string) => void
}
const EdgeHitRect = memo(function EdgeHitRect({
  id,
  index,
  x,
  y,
  width,
  height,
  selected,
  zoom,
  stroke,
  label,
  onSelect,
}: EdgeHitRectProps) {
  void zoom
  return (
    <rect
      key={`${id}-hit-${index}`}
      data-hit-edge={id}
      x={x}
      y={y}
      width={width}
      height={height}
      rx={6}
      fill="rgba(0, 0, 0, 0.001)"
      stroke={selected ? stroke : 'rgba(0, 0, 0, 0.001)'}
      style={{ cursor: 'pointer' }}
      tabIndex={0}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onFocus={() => onSelect(id)}
      onKeyDown={(event: ReactKeyboardEvent<SVGRectElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(id)
        }
      }}
    />
  )
})
function dispatch(store: EditorStore, commands: EditorCommand[], label: string) {
  return store.dispatch({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    label,
    expectedRevision: store.getSnapshot().document.revision,
    commands,
  })
}
function materialize(document: DiagramDocument) {
  const result = resolveDocument(document, {
    quality: 'edit',
    requestId: 'gesture',
    measureText,
    skipValidation: true,
    skipDiagnostics: true,
  })
  if (!result.ok) return document.scene
  return {
    ...structuredClone(document.scene),
    mode: 'manual' as const,
    nodes: Object.fromEntries(
      result.value.layout.nodes.map((n) => [
        n.id,
        {
          x: n.x,
          y: n.y,
          width: n.w,
          height: n.h,
          locked: document.scene.nodes[n.id]?.locked ?? false,
        },
      ]),
    ),
  }
}
export function EditorStatus() {
  const dirty = useEditorSelector((s) => s.dirty),
    t = useLabels()
  return (
    <span className="adl-editor-status" role="status">
      {dirty
        ? t('Unsaved changes', 'Cambios sin guardar')
        : t('No pending changes', 'Sin cambios pendientes')}
    </span>
  )
}
export function EditorToolbar() {
  const { store } = useEditor(),
    snapshot = useEditorSelector(
      (s) => ({
        tool: s.tool,
        selection: s.selection,
        document: s.document,
        viewport: s.viewport,
        canUndo: s.canUndo,
        canRedo: s.canRedo,
      }),
      shallowEqual,
    ),
    t = useLabels()
  return (
    <div
      className="adl-editor-toolbar"
      role="toolbar"
      aria-label={t('Editor tools', 'Herramientas de edición')}
    >
      <button
        type="button"
        aria-pressed={snapshot.tool === 'select'}
        onClick={() => store.setTool('select')}
      >
        {t('Select', 'Seleccionar')}
      </button>
      <button
        type="button"
        aria-pressed={snapshot.tool === 'hand'}
        onClick={() => store.setTool('hand')}
      >
        {t('Pan', 'Desplazar')}
      </button>
      <button type="button" disabled={!snapshot.canUndo} onClick={() => store.undo()}>
        {t('Undo', 'Deshacer')}
      </button>
      <button type="button" disabled={!snapshot.canRedo} onClick={() => store.redo()}>
        {t('Redo', 'Rehacer')}
      </button>
      <button
        type="button"
        onClick={() =>
          store.setViewport({
            ...snapshot.viewport,
            zoom: Math.max(0.1, snapshot.viewport.zoom / 1.25),
          })
        }
        aria-label={t('Zoom out', 'Alejar')}
      >
        −
      </button>
      <output aria-label={t('Zoom', 'Zoom')}>{Math.round(snapshot.viewport.zoom * 100)}%</output>
      <button
        type="button"
        onClick={() =>
          store.setViewport({
            ...snapshot.viewport,
            zoom: Math.min(4, snapshot.viewport.zoom * 1.25),
          })
        }
        aria-label={t('Zoom in', 'Acercar')}
      >
        +
      </button>
      <EditorSelectionTools />
      <EditorRelayout />
      <EditorStatus />
    </div>
  )
}
function EditorRelayout() {
  const { store } = useEditor(),
    snapshot = useEditorSelector((s) => ({ document: s.document, draft: s.draft }), shallowEqual),
    t = useLabels(),
    transactionRef = useRef<string | null>(null)
  const previewing =
    snapshot.draft.kind === 'gesture' && snapshot.draft.transactionId === transactionRef.current
  const apply = () => {
    const current = store.getSnapshot()
    if (!getAdapter(current.document.spec.type).capabilities.includes('move-free')) return
    const scene = relayoutScene(current.document)
    if (!scene.ok) return
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now())
    if (
      !store.beginGesture({ id, label: 'Re-layout', expectedRevision: current.document.revision })
        .ok
    )
      return
    store.previewGesture([{ type: 'scene.set', scene: scene.value }], { skipValidation: true })
    transactionRef.current = id
  }
  const confirm = () => {
    store.commitGesture()
    transactionRef.current = null
  }
  const cancel = () => {
    store.cancelGesture()
    transactionRef.current = null
  }
  return previewing ? (
    <span className="adl-editor-relayout">
      <button type="button" onClick={confirm}>
        {t('Apply relayout', 'Aplicar reajuste')}
      </button>
      <button type="button" onClick={cancel}>
        {t('Cancel', 'Cancelar')}
      </button>
    </span>
  ) : (
    <button
      type="button"
      onClick={apply}
      disabled={!getAdapter(snapshot.document.spec.type).capabilities.includes('move-free')}
    >
      {t('Re-layout', 'Reajustar')}
    </button>
  )
}
// Keep the static SVG subtree out of React's innerHTML update path during gestures.
const SceneMarkup = memo(function SceneMarkup({ markup }: { markup: string }) {
  return <g dangerouslySetInnerHTML={{ __html: markup }} />
})

const SceneHits = memo(function SceneHits({
  nodes,
  edges,
  selection,
  zoom,
  color,
  connectionLabel,
  selectEdge,
  selectNode,
  handleNodeKey,
}: {
  nodes: import('../layout').PlacedNode[]
  edges: import('../layout').PlacedEdge[]
  selection: ReturnType<EditorStore['getSnapshot']>['selection']
  zoom: number
  color: string
  connectionLabel: string
  selectEdge: (id: string) => void
  selectNode: (id: string) => void
  handleNodeKey: (id: string) => void
}) {
  return (
    <>
      {edges.flatMap((e) => {
        const points = e.routePoints ?? []
        const segments: Array<{ x: number; y: number; width: number; height: number }> = []
        for (let i = 1; i < points.length; i++) {
          const [x1, y1] = points[i - 1],
            [x2, y2] = points[i]
          segments.push({
            x: Math.min(x1, x2) - 6,
            y: Math.min(y1, y2) - 6,
            width: Math.abs(x2 - x1) + 12,
            height: Math.abs(y2 - y1) + 12,
          })
        }
        const hit = segments.length
          ? segments
          : [{ x: e.startX - 6, y: e.startY - 6, width: 12, height: 12 }]
        const selected = selection.some((r) => r.kind === 'edge' && r.id === e.id)
        const stroke = color
        return hit.map((segment, index) => (
          <EdgeHitRect
            key={`${e.id}-hit-${index}`}
            id={e.id}
            index={index}
            x={segment.x}
            y={segment.y}
            width={segment.width}
            height={segment.height}
            selected={selected}
            zoom={zoom}
            stroke={stroke}
            label={`${connectionLabel}: ${e.label ?? e.id}`}
            onSelect={selectEdge}
          />
        ))
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <NodeHitRect
            id={n.id}
            x={nodeGeometry(n).hit.x}
            y={nodeGeometry(n).hit.y}
            width={nodeGeometry(n).hit.width}
            height={nodeGeometry(n).hit.height}
            label={n.label}
            selected={selection.some((r) => r.kind === 'node' && r.id === n.id)}
            zoom={zoom}
            stroke={color}
            onSelect={selectNode}
            onKey={handleNodeKey}
          />
        </g>
      ))}
    </>
  )
})

export function EditorSurface({
  ariaLabel,
  className,
}: {
  ariaLabel?: string
  className?: string
}) {
  const { store } = useEditor(),
    snapshot = useEditorSnapshot(),
    t = useLabels(),
    instanceId = useId()
  const svgRef = useRef<SVGSVGElement>(null),
    [size, setSize] = useState({ width: 800, height: 600 })
  const activeDoc = snapshot.draft.kind === 'gesture' ? snapshot.draft.preview : snapshot.document
  const committedResolved = useMemo(
    () =>
      resolveDocument(snapshot.document, {
        quality: 'edit',
        requestId: instanceId,
        measureText,
        skipValidation: true,
        skipDiagnostics: true,
      }),
    [snapshot.document, instanceId],
  )
  const resolved = useMemo(
    () =>
      activeDoc === snapshot.document
        ? committedResolved
        : resolveDocument(activeDoc, {
            quality: 'edit',
            requestId: instanceId,
            measureText,
            skipValidation: true,
            skipDiagnostics: true,
          }),
    [activeDoc, snapshot.document, committedResolved, instanceId],
  )
  const [gestureEntities, setGestureEntities] = useState<{
    nodes: string[]
    edges: string[]
  } | null>(null)
  const gestureKey = gestureEntities
    ? `${[...gestureEntities.nodes].sort().join(',')}|${[...gestureEntities.edges].sort().join(',')}`
    : null
  const baselineCache = useRef<{ key: string; markup: string } | null>(null)
  const baseline = useMemo(() => {
    if (!gestureEntities || !gestureKey) {
      baselineCache.current = null
      return null
    }
    const cacheKey = `${gestureKey}|${snapshot.document.revision}`
    if (baselineCache.current?.key === cacheKey) return baselineCache.current.markup
    const baseDoc = snapshot.document
    const baseResolved = resolveDocument(baseDoc, {
      quality: 'edit',
      requestId: `${instanceId}-baseline`,
      measureText,
      skipValidation: true,
      skipDiagnostics: true,
    })
    if (!baseResolved.ok) return null
    const baselineMarkup = renderSceneMarkup(baseDoc, baseResolved.value, {
      instanceId,
      exclude: {
        nodes: new Set(gestureEntities.nodes),
        edges: new Set(gestureEntities.edges),
      },
    })
    baselineCache.current = { key: cacheKey, markup: baselineMarkup }
    return baselineMarkup
  }, [gestureEntities, gestureKey, snapshot.document, instanceId])
  const deltaMarkup = useMemo(() => {
    if (!gestureEntities || !resolved.ok) return null
    return renderSceneMarkup(activeDoc, resolved.value, {
      instanceId,
      only: { nodes: new Set(gestureEntities.nodes), edges: new Set(gestureEntities.edges) },
    })
  }, [activeDoc, resolved, gestureEntities, instanceId])
  const markup = useMemo(
    () =>
      gestureEntities
        ? ''
        : resolved.ok
          ? renderSceneMarkup(activeDoc, resolved.value, { instanceId })
          : '',
    [activeDoc, resolved, gestureEntities, instanceId],
  )
  const gesture = useRef<{
    pointer: number
    start: Point
    viewport: typeof snapshot.viewport
    positions: Record<string, Point>
    scene: DiagramDocument['scene']
    pan: boolean
    resize?: { ids: string[]; direction: ResizeDirection }
    waypoint?: {
      edgeId: string
      index: number
      anchor?: 'source' | 'target'
      pointerWorld: Point
    }
    port?: { nodeId: string; portId: string; pointerWorld: Point }
    connect?: { sourceId: string }
  } | null>(null)
  const marquee = useRef<{
    pointer: number
    start: Point
    viewport: typeof snapshot.viewport
    selection: typeof snapshot.selection
    additive: boolean
    moved: boolean
  } | null>(null)
  const [selectionBox, setSelectionBox] = useState<ReturnType<typeof marqueeBounds> | null>(null)
  const [connectLine, setConnectLine] = useState<{
    x1: number
    y1: number
    x2: number
    y2: number
  } | null>(null)
  const [connectSource, setConnectSource] = useState<string | null>(null)
  const authoredNodes = useMemo(() => {
    const ids = new Set(nodesOf(activeDoc.spec).map((n) => n.id))
    return resolved.ok ? resolved.value.layout.nodes.filter((n) => ids.has(n.id)) : []
  }, [activeDoc.spec, resolved])
  const authoredEdges = useMemo(() => {
    const ids = new Set(edgesOf(activeDoc.spec).map((e) => e.id))
    return resolved.ok ? resolved.value.layout.edges.filter((e) => ids.has(e.id)) : []
  }, [activeDoc.spec, resolved])
  const hitBaseResolved = gestureEntities ? committedResolved : resolved
  const hitBaseline = useMemo(() => {
    const scene = hitBaseResolved.ok ? hitBaseResolved.value.layout : null
    const nodeIds = new Set(nodesOf(snapshot.document.spec).map((node) => node.id))
    const edgeIds = new Set(edgesOf(snapshot.document.spec).map((edge) => edge.id))
    return {
      nodes: (scene?.nodes ?? []).filter(
        (node) => nodeIds.has(node.id) && !gestureEntities?.nodes.includes(node.id),
      ),
      edges: (scene?.edges ?? []).filter(
        (edge) => edgeIds.has(edge.id) && !gestureEntities?.edges.includes(edge.id),
      ),
    }
  }, [hitBaseResolved, snapshot.document.spec, gestureEntities])
  function cancelMarquee() {
    if (!marquee.current) return false
    store.setSelection([...marquee.current.selection])
    marquee.current = null
    setSelectionBox(null)
    return true
  }
  const touches = useRef(new Map<number, Point>())
  const pinch = useRef<{
    start: readonly [Point, Point]
    viewport: typeof snapshot.viewport
  } | null>(null)
  const spacePan = useRef(false)
  const fitted = useRef(false)
  /** One gesture update per animation frame: pointermove can outrun paint. */
  const moveRaf = useRef(0)
  const pendingMove = useRef<Point | null>(null)
  const pendingPointer = useRef(-1)
  const flushMove = () => {
    if (moveRaf.current) {
      cancelAnimationFrame(moveRaf.current)
      moveRaf.current = 0
    }
    const point = pendingMove.current
    pendingMove.current = null
    const pointer = pendingPointer.current
    pendingPointer.current = -1
    if (point && pointer >= 0) applyMovePoint(point, pointer)
  }
  useEffect(
    () => () => {
      if (moveRaf.current) cancelAnimationFrame(moveRaf.current)
    },
    [],
  )
  function applyMovePoint(point: Point, pointerId: number) {
    const selection = marquee.current
    if (selection?.pointer === pointerId) {
      if (!selection.moved) {
        if (Math.hypot(point.x - selection.start.x, point.y - selection.start.y) < 3) return
        selection.moved = true
      }
      const box = marqueeBounds(
        screenToWorld(selection.start, selection.viewport),
        screenToWorld(point, selection.viewport),
      )
      setSelectionBox(box)
      const selected = authoredNodes
        .filter((n) => intersectsMarquee(box, nodeGeometry(n).hit))
        .map((n) => ({ kind: 'node' as const, id: n.id }))
      const baseline = selection.additive ? selection.selection : []
      store.setSelection([
        ...baseline,
        ...selected.filter((n) => !baseline.some((r) => r.kind === n.kind && r.id === n.id)),
      ])
      return
    }
    const current = gesture.current
    if (!current || current.pointer !== pointerId) return
    if (current.pan) {
      store.setViewport({
        ...current.viewport,
        x: current.viewport.x + point.x - current.start.x,
        y: current.viewport.y + point.y - current.start.y,
      })
      return
    }
    if (current.connect) {
      const world = screenToWorld(point, current.viewport),
        source = current.scene.nodes[current.connect.sourceId]
      const anchor = source ? anchorPoint(source, { side: 'right', offset: 0.5 }) : { x: 0, y: 0 }
      setConnectLine({ x1: anchor.x, y1: anchor.y, x2: world.x, y2: world.y })
      return
    }
    const sceneCommands: EditorCommand[] =
      snapshot.document.scene.mode === 'manual' &&
      Object.keys(snapshot.document.scene.nodes).length === nodesOf(snapshot.document.spec).length
        ? []
        : [{ type: 'scene.set', scene: current.scene }]
    const dx = point.x - current.start.x,
      dy = point.y - current.start.y,
      positions: Record<string, Point> = {},
      grid = snapshot.document.presentation.grid
    if (current.port) {
      const authored = nodesOf(snapshot.document.spec).find((n) => n.id === current.port!.nodeId)
      const rect = current.scene.nodes[current.port.nodeId]
      if (!authored || !rect) return
      const graphNode = authored as GraphNode
      const port = graphNode.ports?.find((p) => p.id === current.port!.portId)
      if (!port) return
      const world = {
        x: current.port.pointerWorld.x + dx / current.viewport.zoom,
        y: current.port.pointerWorld.y + dy / current.viewport.zoom,
      }
      const anchor = anchorFromPoint(world, rect)
      const next = {
        ...graphNode,
        ports: (graphNode.ports ?? []).map((p) =>
          p.id === current.port!.portId ? { ...p, side: anchor.side, offset: anchor.offset } : p,
        ),
      }
      const result = getAdapter(snapshot.document.spec.type).replaceNode(snapshot.document.spec, {
        diagramType: snapshot.document.spec.type,
        node: next,
      } as NodeInput)
      if (!result.ok) return
      store.previewGesture([{ type: 'spec.replace', spec: result.value, references: 'reject' }], {
        skipValidation: true,
      })
      return
    }
    if (current.waypoint) {
      const route = current.scene.routes[current.waypoint.edgeId]
      if (!route || route.mode !== 'manual') return
      const next = structuredClone(route)
      const waypoint = current.waypoint
      if (waypoint.anchor) {
        const edge = edgesOf(snapshot.document.spec).find((e) => e.id === waypoint.edgeId)
        if (!edge) return
        const rect = current.scene.nodes[waypoint.anchor === 'source' ? edge.from! : edge.to!]
        if (!rect) return
        const world = {
          x: waypoint.pointerWorld.x + dx / current.viewport.zoom,
          y: waypoint.pointerWorld.y + dy / current.viewport.zoom,
        }
        if (waypoint.anchor === 'source') next.source = anchorFromPoint(world, rect)
        else next.target = anchorFromPoint(world, rect)
      } else {
        const index = waypoint.index,
          initial = route.points[index]
        if (!initial) return
        next.points = route.points.map((p, i) =>
          i === index
            ? {
                x: initial.x + dx / current.viewport.zoom,
                y: initial.y + dy / current.viewport.zoom,
              }
            : p,
        )
      }
      store.previewGesture(
        [...sceneCommands, { type: 'route.set', id: waypoint.edgeId, route: next }],
        { skipValidation: true },
      )
      return
    }
    if (current.resize) {
      const rects = current.resize.ids
        .map((resizeId) => current.scene.nodes[resizeId])
        .filter((node) => node)
        .map((node) => ({
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        }))
      const resized = resizeRects(
        rects,
        current.resize.direction,
        {
          x: dx / current.viewport.zoom,
          y: dy / current.viewport.zoom,
        },
        grid.snap ? grid.size : undefined,
      )
      const resizeCommands = resized.flatMap((rect, index) => {
        const resizeId = current.resize!.ids[index]
        return [
          { type: 'nodes.move', positions: { [resizeId]: { x: rect.x, y: rect.y } } },
          {
            type: 'node.resize',
            id: resizeId,
            size: { width: rect.width, height: rect.height },
          },
        ] as const
      })
      store.previewGesture([...sceneCommands, ...resizeCommands], {
        skipValidation: true,
      })
      return
    }
    for (const [id, start] of Object.entries(current.positions)) {
      const x = start.x + dx / current.viewport.zoom,
        y = start.y + dy / current.viewport.zoom
      positions[id] = {
        x: grid.snap ? Math.round(x / grid.size) * grid.size : x,
        y: grid.snap ? Math.round(y / grid.size) * grid.size : y,
      }
    }
    store.previewGesture([...sceneCommands, { type: 'nodes.move', positions }], {
      skipValidation: true,
    })
  }
  const scheduleMove = (point: Point, pointerId: number) => {
    pendingMove.current = point
    pendingPointer.current = pointerId
    if (moveRaf.current) return
    moveRaf.current = requestAnimationFrame(() => {
      moveRaf.current = 0
      const queued = pendingMove.current
      pendingMove.current = null
      const pointer = pendingPointer.current
      pendingPointer.current = -1
      if (queued && pointer >= 0) applyMovePoint(queued, pointer)
    })
  }
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const observer = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      if (r.width > 0 && r.height > 0) {
        const measured = { width: r.width, height: r.height }
        setSize(measured)
        if (!fitted.current) {
          const current = resolveDocument(store.getSnapshot().document, {
            quality: 'edit',
            requestId: 'initial-fit',
            measureText,
            skipValidation: true,
          })
          if (current.ok) {
            fitted.current = true
            store.setViewport(fitViewport(current.value.worldBounds, measured, 24))
          }
        }
      }
    })
    observer.observe(svg)
    return () => {
      observer.disconnect()
      store.cancelGesture()
    }
  }, [store])
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      if (marquee.current || gesture.current || pinch.current) return
      const viewport = store.getSnapshot().viewport
      const matrix = svg.getScreenCTM()
      if (!matrix) return
      const anchor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1)
      store.setViewport(zoomAt(anchor, viewport.zoom * Math.exp(-delta * 0.002), viewport))
    }
    svg.addEventListener('wheel', wheel, { passive: false })
    return () => svg.removeEventListener('wheel', wheel)
  }, [store])
  function local(event: { clientX: number; clientY: number }): Point {
    const matrix = svgRef.current?.getScreenCTM()
    if (!matrix) return { x: 0, y: 0 }
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return { x: point.x, y: point.y }
  }
  function finish(event: ReactPointerEvent<SVGSVGElement>, cancel = false) {
    touches.current.delete(event.pointerId)
    if (pinch.current) {
      if (cancel) {
        store.setViewport(pinch.current.viewport)
        touches.current.clear()
      }
      if (!touches.current.size) pinch.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId)
      return
    }
    if (marquee.current?.pointer === event.pointerId) {
      if (cancel) cancelMarquee()
      else {
        if (!marquee.current.moved && !marquee.current.additive) store.setSelection([])
        marquee.current = null
        setSelectionBox(null)
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId)
      return
    }
    if (gesture.current?.pointer !== event.pointerId) return
    if (gesture.current.connect) {
      if (cancel) store.cancelGesture()
      else {
        flushMove()
        const viewport = store.getSnapshot().viewport,
          world = screenToWorld(local(event), viewport),
          sourceId = gesture.current.connect.sourceId,
          current = store.getSnapshot()
        const target = authoredNodes.find((n) => {
          if (n.id === sourceId) return false
          const hit = nodeGeometry(n).hit
          return (
            world.x >= hit.x &&
            world.x <= hit.x + hit.width &&
            world.y >= hit.y &&
            world.y <= hit.y + hit.height
          )
        })
        if (target) {
          const adapter = getAdapter(current.document.spec.type)
          const inserted = adapter.insertRelation(current.document.spec, {
            diagramType: current.document.spec.type,
            relation: {
              id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
              from: sourceId,
              to: target.id,
            },
          } as RelationInput)
          if (inserted.ok)
            store.previewGesture([
              { type: 'spec.replace', spec: inserted.value, references: 'reject' },
            ])
        }
        store.commitGesture()
      }
      setConnectLine(null)
      gesture.current = null
      setGestureEntities(null)
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId)
      return
    }
    if (!gesture.current.pan) {
      if (cancel) store.cancelGesture()
      else {
        flushMove()
        store.commitGesture()
      }
    }
    gesture.current = null
    setGestureEntities(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }
  function removeSelection() {
    const current = store.getSnapshot(),
      ids = current.selection.filter((r) => r.kind === 'node').map((r) => r.id)
    if (ids.some((id) => isNodeLocked(current.document, id))) return
    const adapter = getAdapter(current.document.spec.type)
    const removed = adapter.removeNodes(current.document.spec, ids)
    if (!removed.ok) return
    const edgeIds = current.selection.filter((r) => r.kind === 'edge').map((r) => r.id)
    const next = edgeIds.length ? adapter.removeRelations(removed.value, edgeIds) : removed
    if (next.ok)
      dispatch(
        store,
        [{ type: 'spec.replace', spec: next.value, references: 'prune-references' }],
        'Delete selection',
      )
  }
  function connectKeyboard(from: string, to: string) {
    const current = store.getSnapshot(),
      adapter = getAdapter(current.document.spec.type)
    if (!adapter.capabilities.includes('connect')) return
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now())
    const inserted = adapter.insertRelation(current.document.spec, {
      diagramType: current.document.spec.type,
      relation: { id, from, to },
    } as RelationInput)
    if (!inserted.ok) return
    dispatch(
      store,
      [{ type: 'spec.replace', spec: inserted.value, references: 'reject' }],
      'Connect nodes',
    )
    store.setSelection([{ kind: 'edge', id }])
  }
  const connectKeyboardRef = useRef(connectKeyboard)
  connectKeyboardRef.current = connectKeyboard
  const connectSourceRef = useRef(connectSource)
  connectSourceRef.current = connectSource
  const incidentEdges = useCallback(
    (nodeIds: string[]) => {
      const spec = store.getSnapshot().document.spec
      return edgesOf(spec)
        .filter((e) => e.from && e.to && (nodeIds.includes(e.from) || nodeIds.includes(e.to)))
        .map((e) => e.id!)
    },
    [store],
  )
  const selectEdge = useCallback(
    (id: string) => store.setSelection([{ kind: 'edge' as const, id }]),
    [store],
  )
  const selectNode = useCallback(
    (id: string) => store.setSelection([{ kind: 'node' as const, id }]),
    [store],
  )
  const handleNodeKey = useCallback(
    (id: string) => {
      const source = connectSourceRef.current
      if (source) {
        if (source === id) setConnectSource(null)
        else {
          connectKeyboardRef.current(source, id)
          setConnectSource(null)
        }
        return
      }
      store.setSelection([{ kind: 'node' as const, id }])
    },
    [store],
  )
  return (
    <div className={`adl-editor-surface ${className ?? ''}`}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="group"
        tabIndex={0}
        aria-label={
          ariaLabel ??
          t(
            'Editable diagram. Select a node, then use arrow keys to move it.',
            'Diagrama editable. Selecciona un nodo y usa las flechas para moverlo.',
          )
        }
        onKeyDown={(event) => {
          if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement
          )
            return
          if (event.key === ' ' && event.target === event.currentTarget) {
            event.preventDefault()
            spacePan.current = true
            return
          }
          const mod = event.metaKey || event.ctrlKey
          if (event.key === 'Escape') {
            if (pinch.current) {
              store.setViewport(pinch.current.viewport)
              pinch.current = null
              touches.current.clear()
            }
            spacePan.current = false
            setConnectSource(null)
            setConnectLine(null)
            if (cancelMarquee()) {
              event.preventDefault()
              return
            }
            store.cancelGesture()
            gesture.current = null
            store.setSelection([])
            event.preventDefault()
          } else if (mod && event.key.toLowerCase() === 'z') {
            event.preventDefault()
            if (event.shiftKey) store.redo()
            else store.undo()
          } else if (mod && event.key.toLowerCase() === 'a') {
            event.preventDefault()
            store.setSelection(
              nodesOf(snapshot.document.spec).map((n) => ({ kind: 'node', id: n.id })),
            )
          } else if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault()
            removeSelection()
          } else if (
            ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) &&
            getAdapter(snapshot.document.spec.type).capabilities.includes('move-free')
          ) {
            event.preventDefault()
            const scene = materialize(snapshot.document),
              positions: Record<string, Point> = {}
            for (const ref of snapshot.selection)
              if (
                ref.kind === 'node' &&
                scene.nodes[ref.id] &&
                !isNodeLocked(snapshot.document, ref.id)
              ) {
                const p = scene.nodes[ref.id],
                  step = event.shiftKey ? 16 : 1
                positions[ref.id] = {
                  x:
                    p.x +
                    (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
                  y: p.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0),
                }
              }
            if (Object.keys(positions).length)
              dispatch(
                store,
                [
                  { type: 'scene.set', scene },
                  { type: 'nodes.move', positions },
                ],
                'Nudge selection',
              )
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ') spacePan.current = false
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            spacePan.current = false
        }}
        onPointerDown={(event) => {
          if (event.pointerType === 'touch') {
            touches.current.set(event.pointerId, local(event))
            if (touches.current.size >= 2) {
              event.preventDefault()
              store.cancelGesture()
              gesture.current = null
              cancelMarquee()
              if (!pinch.current) {
                const points = [...touches.current.values()]
                pinch.current = {
                  start: [points[0], points[1]],
                  viewport: { ...store.getSnapshot().viewport },
                }
              }
              event.currentTarget.setPointerCapture(event.pointerId)
              return
            }
          }
          if (marquee.current || gesture.current || (event.button !== 0 && event.button !== 1))
            return
          const target = (event.target as Element).closest(
              '[data-hit-node], [data-resize-node], [data-resize-selection], [data-hit-edge], [data-waypoint], [data-port], [data-connect-source]',
            ),
            resizeId = target?.getAttribute('data-resize-node') ?? undefined,
            resizeSelection = target?.hasAttribute('data-resize-selection') ?? false,
            id = resizeId ?? target?.getAttribute('data-hit-node'),
            waypointEdge = target?.getAttribute('data-waypoint') ?? undefined,
            waypointIndex = Number(target?.getAttribute('data-waypoint-index') ?? '-1'),
            waypointAnchor =
              (target?.getAttribute('data-waypoint-anchor') as 'source' | 'target' | null) ??
              undefined,
            edgeId = target?.getAttribute('data-hit-edge') ?? undefined,
            portNodeId = target?.getAttribute('data-port-node') ?? undefined,
            portId = target?.getAttribute('data-port') ?? undefined,
            connectSourceId = target?.getAttribute('data-connect-source') ?? undefined
          const pan = snapshot.tool === 'hand' || event.button === 1 || spacePan.current
          if (connectSource && !connectSourceId) setConnectSource(null)
          if (
            !pan &&
            !id &&
            !resizeSelection &&
            !edgeId &&
            !waypointEdge &&
            !portId &&
            !connectSourceId
          ) {
            event.preventDefault()
            svgRef.current?.focus()
            marquee.current = {
              pointer: event.pointerId,
              start: local(event),
              viewport: { ...snapshot.viewport },
              selection: snapshot.selection,
              additive: event.shiftKey,
              moved: false,
            }
            event.currentTarget.setPointerCapture(event.pointerId)
            return
          }
          event.preventDefault()
          svgRef.current?.focus()
          let resizeIds: string[] | undefined
          if (waypointEdge) {
            const route = snapshot.document.scene.routes[waypointEdge]
            if (!route || route.mode !== 'manual') return
            store.setSelection([{ kind: 'edge' as const, id: waypointEdge }])
            if (
              !store.beginGesture({
                id: globalThis.crypto.randomUUID(),
                label: 'Move waypoint',
                expectedRevision: snapshot.document.revision,
              }).ok
            )
              return
            setGestureEntities({ nodes: [], edges: [waypointEdge] })
            const startPoint = local(event)
            gesture.current = {
              pointer: event.pointerId,
              start: startPoint,
              viewport: { ...snapshot.viewport },
              positions: {},
              scene: materialize(snapshot.document),
              pan: false,
              waypoint: {
                edgeId: waypointEdge,
                index: waypointIndex,
                anchor: waypointAnchor,
                pointerWorld: screenToWorld(startPoint, snapshot.viewport),
              },
            }
            event.currentTarget.setPointerCapture(event.pointerId)
            return
          }
          if (portId && portNodeId && !pan) {
            store.setSelection([{ kind: 'node' as const, id: portNodeId }])
            if (
              !store.beginGesture({
                id: globalThis.crypto.randomUUID(),
                label: 'Move port',
                expectedRevision: snapshot.document.revision,
              }).ok
            )
              return
            setGestureEntities({ nodes: [], edges: [] })
            const startPoint = local(event)
            gesture.current = {
              pointer: event.pointerId,
              start: startPoint,
              viewport: { ...snapshot.viewport },
              positions: {},
              scene: materialize(snapshot.document),
              pan: false,
              port: {
                nodeId: portNodeId,
                portId,
                pointerWorld: screenToWorld(startPoint, snapshot.viewport),
              },
            }
            event.currentTarget.setPointerCapture(event.pointerId)
            return
          }
          if (connectSourceId && !pan) {
            store.setSelection([{ kind: 'node' as const, id: connectSourceId }])
            if (
              !store.beginGesture({
                id: globalThis.crypto.randomUUID(),
                label: 'Connect',
                expectedRevision: snapshot.document.revision,
              }).ok
            )
              return
            const startPoint = local(event)
            const scene = materialize(snapshot.document),
              source = scene.nodes[connectSourceId]
            const anchor = source
              ? anchorPoint(source, { side: 'right', offset: 0.5 })
              : { x: 0, y: 0 }
            const startWorld = screenToWorld(startPoint, snapshot.viewport)
            gesture.current = {
              pointer: event.pointerId,
              start: startPoint,
              viewport: { ...snapshot.viewport },
              positions: {},
              scene,
              pan: false,
              connect: { sourceId: connectSourceId },
            }
            setConnectLine({ x1: anchor.x, y1: anchor.y, x2: startWorld.x, y2: startWorld.y })
            event.currentTarget.setPointerCapture(event.pointerId)
            return
          }
          if (edgeId && !pan) {
            store.setSelection(
              event.shiftKey
                ? snapshot.selection.some((r) => r.kind === 'edge' && r.id === edgeId)
                  ? snapshot.selection.filter((r) => !(r.kind === 'edge' && r.id === edgeId))
                  : [...snapshot.selection, { kind: 'edge' as const, id: edgeId }]
                : [{ kind: 'edge' as const, id: edgeId }],
            )
            return
          }
          if (resizeSelection) {
            resizeIds = snapshot.selection.filter((r) => r.kind === 'node').map((r) => r.id)
            if (
              resizeIds.length < 2 ||
              resizeIds.some((nodeId) => isNodeLocked(snapshot.document, nodeId))
            )
              return
          } else if (id && !pan) {
            const selection = resizeId
              ? snapshot.selection.filter((r) => r.kind === 'node' && r.id !== id).length === 0 &&
                snapshot.selection.some((r) => r.kind === 'node' && r.id === id)
                ? [...snapshot.selection]
                : [{ kind: 'node' as const, id }]
              : event.shiftKey
                ? [
                    ...snapshot.selection.filter((r) => !(r.kind === 'node' && r.id === id)),
                    ...(!snapshot.selection.some((r) => r.kind === 'node' && r.id === id)
                      ? [{ kind: 'node' as const, id }]
                      : []),
                  ]
                : snapshot.selection.some((r) => r.kind === 'node' && r.id === id)
                  ? [...snapshot.selection]
                  : [{ kind: 'node' as const, id }]
            store.setSelection(selection)
            if (
              !getAdapter(snapshot.document.spec.type).capabilities.includes('move-free') ||
              isNodeLocked(snapshot.document, id)
            )
              return
            if (resizeId) resizeIds = [id]
          }
          const scene = materialize(snapshot.document),
            positions: Record<string, Point> = {}
          for (const ref of store.getSnapshot().selection)
            if (ref.kind === 'node' && scene.nodes[ref.id])
              positions[ref.id] = { x: scene.nodes[ref.id].x, y: scene.nodes[ref.id].y }
          if (
            !pan &&
            !store.beginGesture({
              id: globalThis.crypto.randomUUID(),
              label: resizeIds
                ? resizeIds.length > 1
                  ? 'Resize selection'
                  : 'Resize node'
                : 'Move selection',
              expectedRevision: snapshot.document.revision,
            }).ok
          )
            return
          const draggedIds = resizeIds ?? Object.keys(positions)
          setGestureEntities({ nodes: draggedIds, edges: incidentEdges(draggedIds) })
          gesture.current = {
            pointer: event.pointerId,
            start: local(event),
            viewport: { ...snapshot.viewport },
            positions,
            scene,
            pan,
            resize: resizeIds
              ? {
                  ids: resizeIds,
                  direction: (target?.getAttribute('data-resize-direction') ??
                    'se') as ResizeDirection,
                }
              : undefined,
          }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (touches.current.has(event.pointerId))
            touches.current.set(event.pointerId, local(event))
          if (pinch.current) {
            const points = [...touches.current.values()]
            if (points.length === 2)
              store.setViewport(
                pinchViewport(pinch.current.start, [points[0], points[1]], pinch.current.viewport),
              )
            return
          }
          if (!marquee.current && !gesture.current) return
          scheduleMove(local(event), event.pointerId)
        }}
        onPointerUp={(event) => finish(event)}
        onPointerCancel={(event) => finish(event, true)}
        onLostPointerCapture={(event) => {
          const lostTouch = touches.current.delete(event.pointerId)
          if (lostTouch && pinch.current) {
            store.setViewport(pinch.current.viewport)
            pinch.current = null
            touches.current.clear()
          }
          cancelMarquee()
          if (gesture.current) {
            store.cancelGesture()
            gesture.current = null
            setGestureEntities(null)
          }
        }}
      >
        <g
          transform={`translate(${snapshot.viewport.x} ${snapshot.viewport.y}) scale(${snapshot.viewport.zoom})`}
        >
          {/* Markup is generated exclusively by the internal escaped SVG serializer, never imported HTML. */}
          {gestureEntities && baseline !== null ? (
            <>
              <SceneMarkup markup={baseline} />
              <SceneMarkup markup={deltaMarkup ?? ''} />
            </>
          ) : (
            <SceneMarkup markup={markup} />
          )}
          <SceneHits
            nodes={hitBaseline.nodes}
            edges={hitBaseline.edges}
            selection={snapshot.selection}
            zoom={snapshot.viewport.zoom}
            color={activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt}
            connectionLabel={t('Connection', 'Conexión')}
            selectEdge={selectEdge}
            selectNode={selectNode}
            handleNodeKey={handleNodeKey}
          />
          {gestureEntities && (
            <SceneHits
              nodes={authoredNodes.filter((node) => gestureEntities.nodes.includes(node.id))}
              edges={authoredEdges.filter((edge) => gestureEntities.edges.includes(edge.id))}
              selection={snapshot.selection}
              zoom={snapshot.viewport.zoom}
              color={activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt}
              connectionLabel={t('Connection', 'Conexión')}
              selectEdge={selectEdge}
              selectNode={selectNode}
              handleNodeKey={handleNodeKey}
            />
          )}
          {snapshot.tool === 'select' &&
            snapshot.selection.length >= 1 &&
            getAdapter(activeDoc.spec.type).capabilities.includes('resize') &&
            (() => {
              const selected = authoredNodes.filter(
                (n) =>
                  snapshot.selection.some((r) => r.kind === 'node' && r.id === n.id) &&
                  !isNodeLocked(activeDoc, n.id),
              )
              if (!selected.length) return null
              const group = rectsUnion(
                selected.map((n) => ({ x: n.x, y: n.y, width: n.w, height: n.h })),
              )
              const resizeTarget = selected.length === 1 ? selected[0].id : undefined
              const name =
                selected.length === 1
                  ? `${t('Resize', 'Redimensionar')} ${selected[0].label}`
                  : t('Resize selection', 'Redimensionar selección')
              const apply = (direction: ResizeDirection, delta: Point, step: number) => {
                const scene = materialize(store.getSnapshot().document)
                const ids: string[] = resizeTarget
                  ? [resizeTarget]
                  : snapshot.selection.filter((r) => r.kind === 'node').map((r) => r.id)
                const rects = ids
                  .map((resizeId) => scene.nodes[resizeId])
                  .filter((node) => node)
                  .map((node) => ({
                    x: node.x,
                    y: node.y,
                    width: node.width,
                    height: node.height,
                  }))
                const finalRects = resizeRects(rects, direction, {
                  x: delta.x * step,
                  y: delta.y * step,
                })
                dispatch(
                  store,
                  [
                    { type: 'scene.set', scene },
                    ...finalRects.flatMap((rect, index) => {
                      const resizeId = ids[index]
                      return [
                        {
                          type: 'nodes.move',
                          positions: { [resizeId]: { x: rect.x, y: rect.y } },
                        },
                        {
                          type: 'node.resize',
                          id: resizeId,
                          size: { width: rect.width, height: rect.height },
                        },
                      ] as const
                    }),
                  ],
                  resizeTarget ? 'Resize node' : 'Resize selection',
                )
              }
              return RESIZE_HANDLES.map((handle) => (
                <g key={`resize-group-${handle.direction}`}>
                  <rect
                    x={group.x + group.width * handle.x - 5 / snapshot.viewport.zoom}
                    y={group.y + group.height * handle.y - 5 / snapshot.viewport.zoom}
                    width={10 / snapshot.viewport.zoom}
                    height={10 / snapshot.viewport.zoom}
                    fill={activeDoc.presentation.theme[activeDoc.presentation.theme.mode].card}
                    stroke={activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt}
                    strokeWidth={1 / snapshot.viewport.zoom}
                    pointerEvents="none"
                  />
                  <rect
                    {...(resizeTarget
                      ? { 'data-resize-node': resizeTarget }
                      : { 'data-resize-selection': '' })}
                    data-resize-direction={handle.direction}
                    x={group.x + group.width * handle.x - 22 / snapshot.viewport.zoom}
                    y={group.y + group.height * handle.y - 22 / snapshot.viewport.zoom}
                    width={44 / snapshot.viewport.zoom}
                    height={44 / snapshot.viewport.zoom}
                    fill="transparent"
                    style={{ cursor: handle.cursor }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${name}${handle.direction === 'se' ? '' : ` — ${t(handle.en, handle.es)}`}`}
                    aria-description={t(handle.en, handle.es)}
                    onKeyDown={(event) => {
                      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
                        return
                      event.preventDefault()
                      event.stopPropagation()
                      const delta: Point = {
                        x: event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0,
                        y: event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0,
                      }
                      apply(handle.direction, delta, event.shiftKey ? 16 : 1)
                    }}
                  />
                </g>
              ))
            })()}
          {snapshot.selection.length === 1 &&
            snapshot.selection[0].kind === 'edge' &&
            (() => {
              const edge = authoredEdges.find((e) => e.id === snapshot.selection[0].id)
              const route = edge ? activeDoc.scene.routes[edge.id] : undefined
              if (!edge || route?.mode !== 'manual') return null
              const from = activeDoc.scene.nodes[edge.from] ?? {
                x: edge.startX,
                y: edge.startY,
                width: 0,
                height: 0,
              }
              const to = activeDoc.scene.nodes[edge.to] ?? {
                x: edge.endX,
                y: edge.endY,
                width: 0,
                height: 0,
              }
              const source = anchorPoint(from, route.source)
              const target = anchorPoint(to, route.target)
              const palette = activeDoc.presentation.theme[activeDoc.presentation.theme.mode]
              const dot = (radius: number) => Math.max(5, radius / snapshot.viewport.zoom)
              return (
                <g>
                  {route.points.map((p, index) => (
                    <g key={`waypoint-${edge.id}-${index}`}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={dot(5)}
                        fill={palette.card}
                        stroke={palette.cobalt}
                        strokeWidth={1 / snapshot.viewport.zoom}
                        pointerEvents="none"
                      />
                      <circle
                        data-waypoint={edge.id}
                        data-waypoint-index={index}
                        cx={p.x}
                        cy={p.y}
                        r={Math.max(16, 22 / snapshot.viewport.zoom)}
                        fill="transparent"
                        style={{ cursor: 'move' }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${t('Waypoint', 'Punto intermedio')} ${index + 1}`}
                      />
                    </g>
                  ))}
                  {(
                    [
                      ['source', source, route.source],
                      ['target', target, route.target],
                    ] as const
                  ).map(([kind, position]) => (
                    <g key={`anchor-${edge.id}-${kind}`}>
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={dot(6)}
                        fill={palette.background}
                        stroke={palette.branch}
                        strokeWidth={1.5 / snapshot.viewport.zoom}
                        pointerEvents="none"
                      />
                      <circle
                        data-waypoint={edge.id}
                        data-waypoint-anchor={kind}
                        cx={position.x}
                        cy={position.y}
                        r={Math.max(16, 22 / snapshot.viewport.zoom)}
                        fill="transparent"
                        style={{ cursor: 'crosshair' }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${t('Anchor', 'Anclaje')} ${kind}`}
                      />
                    </g>
                  ))}
                </g>
              )
            })()}
          {snapshot.selection.length === 1 &&
            snapshot.selection[0].kind === 'node' &&
            getAdapter(activeDoc.spec.type).capabilities.includes('ports') &&
            (() => {
              const id = snapshot.selection[0].id
              if (isNodeLocked(activeDoc, id)) return null
              const authored = nodesOf(activeDoc.spec).find((n) => n.id === id) as
                GraphNode | undefined
              const authoredRect = activeDoc.scene.nodes[id]
              const laidOut = resolved.ok ? resolved.value.layout.nodeById[id] : undefined
              const rect =
                authoredRect ??
                (laidOut
                  ? { x: laidOut.x, y: laidOut.y, width: laidOut.w, height: laidOut.h }
                  : undefined)
              const ports = authored?.ports ?? []
              if (!rect || !ports.length) return null
              const palette = activeDoc.presentation.theme[activeDoc.presentation.theme.mode]
              const dot = (radius: number) => Math.max(5, radius / snapshot.viewport.zoom)
              return (
                <g>
                  {ports.map((port) => {
                    const position = anchorPoint(rect, port)
                    return (
                      <g key={`port-${id}-${port.id}`}>
                        <circle
                          cx={position.x}
                          cy={position.y}
                          r={dot(5)}
                          fill={palette.background}
                          stroke={palette.cobalt}
                          strokeWidth={1.5 / snapshot.viewport.zoom}
                          pointerEvents="none"
                        />
                        <circle
                          data-port={port.id}
                          data-port-node={id}
                          cx={position.x}
                          cy={position.y}
                          r={Math.max(16, 22 / snapshot.viewport.zoom)}
                          fill="transparent"
                          style={{ cursor: 'crosshair' }}
                          tabIndex={0}
                          role="button"
                          aria-label={`${t('Port', 'Puerto')}: ${port.id}`}
                        />
                      </g>
                    )
                  })}
                </g>
              )
            })()}
          {snapshot.tool === 'select' &&
            snapshot.selection.length === 1 &&
            snapshot.selection[0].kind === 'node' &&
            getAdapter(activeDoc.spec.type).capabilities.includes('connect') &&
            !isNodeLocked(activeDoc, snapshot.selection[0].id) &&
            (() => {
              const id = snapshot.selection[0].id
              const authored = authoredNodes.find((n) => n.id === id)
              const authoredRect = activeDoc.scene.nodes[id]
              const laidOut = resolved.ok ? resolved.value.layout.nodeById[id] : undefined
              const rect =
                authoredRect ??
                (laidOut
                  ? { x: laidOut.x, y: laidOut.y, width: laidOut.w, height: laidOut.h }
                  : undefined)
              if (!authored || !rect) return null
              const anchor = anchorPoint(rect, { side: 'right', offset: 0.5 })
              const palette = activeDoc.presentation.theme[activeDoc.presentation.theme.mode]
              const dot = (radius: number) => Math.max(5, radius / snapshot.viewport.zoom)
              return (
                <g>
                  <circle
                    cx={anchor.x}
                    cy={anchor.y}
                    r={dot(5)}
                    fill={palette.background}
                    stroke={palette.branch}
                    strokeWidth={1.5 / snapshot.viewport.zoom}
                    pointerEvents="none"
                  />
                  <circle
                    data-connect-source={id}
                    cx={anchor.x}
                    cy={anchor.y}
                    r={Math.max(16, 22 / snapshot.viewport.zoom)}
                    fill="transparent"
                    style={{ cursor: 'crosshair' }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${t('Connect', 'Conectar')}: ${authored.label}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        setConnectSource(id)
                      }
                    }}
                  />
                </g>
              )
            })()}
          {connectSource &&
            (() => {
              const palette = activeDoc.presentation.theme[activeDoc.presentation.theme.mode]
              return (
                <g pointerEvents="none">
                  {authoredNodes
                    .filter((n) => n.id !== connectSource)
                    .map((n) => (
                      <rect
                        key={`connect-target-${n.id}`}
                        x={nodeGeometry(n).hit.x}
                        y={nodeGeometry(n).hit.y}
                        width={nodeGeometry(n).hit.width}
                        height={nodeGeometry(n).hit.height}
                        rx={4}
                        fill="none"
                        stroke={palette.cobalt}
                        strokeWidth={1 / snapshot.viewport.zoom}
                        strokeDasharray="4 4"
                      />
                    ))}
                </g>
              )
            })()}
          {connectLine && (
            <line
              x1={connectLine.x1}
              y1={connectLine.y1}
              x2={connectLine.x2}
              y2={connectLine.y2}
              stroke={activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt}
              strokeWidth={2 / snapshot.viewport.zoom}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          )}
          {selectionBox && (
            <rect
              data-marquee="true"
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              fill={activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt}
              fillOpacity={0.08}
              stroke={activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt}
              strokeWidth={1 / snapshot.viewport.zoom}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
      <button
        className="adl-editor-fit"
        type="button"
        onClick={() => {
          if (resolved.ok) store.setViewport(fitViewport(resolved.value.worldBounds, size, 24))
        }}
      >
        {t('Fit diagram', 'Ajustar diagrama')}
      </button>
      {!resolved.ok && <p role="alert">{resolved.diagnostics.map((d) => d.code).join(', ')}</p>}
      {connectSource && (
        <p role="status" className="adl-editor-connect-hint">
          {t(
            'Press Enter on a target node to connect, or Escape to cancel.',
            'Pulsa Enter en un nodo destino para conectar, o Escape para cancelar.',
          )}
        </p>
      )}
    </div>
  )
}
export function EditorInspector() {
  const { store } = useEditor(),
    snapshot = useEditorSelector(
      (s) => ({ selection: s.selection, document: s.document }),
      shallowEqual,
    ),
    t = useLabels()
  const id = snapshot.selection.find((r) => r.kind === 'node')?.id,
    node = nodesOf(snapshot.document.spec).find((n) => n.id === id)
  const [label, setLabel] = useState(''),
    [error, setError] = useState('')
  useEffect(() => {
    setLabel(node?.label ?? '')
    setError('')
  }, [node])
  const free = getAdapter(snapshot.document.spec.type).capabilities.includes('move-free')
  const saveLabel = () => {
    if (!node) return
    const adapter = getAdapter(snapshot.document.spec.type)
    const result = adapter.replaceNode(snapshot.document.spec, {
      diagramType: snapshot.document.spec.type,
      node: { ...node, label },
    } as NodeInput)
    if (result.ok) {
      const commit = dispatch(
        store,
        [{ type: 'spec.replace', spec: result.value, references: 'reject' }],
        'Rename node',
      )
      setError(commit.diagnostics.map((d) => d.code).join(', '))
    } else setError(result.diagnostics.map((d) => d.code).join(', '))
  }
  function add() {
    const adapter = getAdapter(snapshot.document.spec.type),
      id = globalThis.crypto.randomUUID()
    if (!free) return
    const n =
      snapshot.document.spec.type === 'er'
        ? { id, label: t('New entity', 'Nueva entidad'), fields: [] }
        : { id, label: t('New node', 'Nuevo nodo'), description: '' }
    const result = adapter.insertNode(snapshot.document.spec, {
      diagramType: snapshot.document.spec.type,
      node: n,
    } as NodeInput)
    if (result.ok) {
      dispatch(
        store,
        [{ type: 'spec.replace', spec: result.value, references: 'reject' }],
        'Add node',
      )
      store.setSelection([{ kind: 'node', id }])
    }
  }
  return (
    <aside className="adl-editor-inspector" aria-label={t('Properties', 'Propiedades')}>
      <h2>{t('Properties', 'Propiedades')}</h2>
      {free && (
        <button type="button" onClick={add}>
          {t('Add node', 'Añadir nodo')}
        </button>
      )}
      {!node ? (
        <p>
          {t(
            'Select a node to edit its properties.',
            'Selecciona un nodo para editar sus propiedades.',
          )}
        </p>
      ) : (
        <>
          <p className="adl-editor-mono">{node.id}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              saveLabel()
            }}
          >
            <label>
              {t('Label', 'Etiqueta')}
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                maxLength={512}
              />
            </label>
            <button type="submit">{t('Apply label', 'Aplicar etiqueta')}</button>
          </form>
          {free && (
            <button
              type="button"
              onClick={() => {
                const scene = materialize(snapshot.document)
                dispatch(
                  store,
                  [
                    { type: 'scene.set', scene },
                    {
                      type: 'nodes.set-lock',
                      ids: [node.id],
                      locked: !isNodeLocked(snapshot.document, node.id),
                    },
                  ],
                  'Toggle lock',
                )
              }}
            >
              {isNodeLocked(snapshot.document, node.id)
                ? t('Unlock', 'Desbloquear')
                : t('Lock', 'Bloquear')}
            </button>
          )}
        </>
      )}
      {node && free && <EditorNodeGeometry nodeId={node.id} />}
      <EditorStructuredInspector />
      <EditorRelations />
      <EditorRoute />
      <h3>{t('Appearance', 'Apariencia')}</h3>
      <label>
        {t('Theme', 'Tema')}
        <select
          aria-label={t('Theme', 'Tema')}
          value={snapshot.document.presentation.theme.mode}
          onChange={(event) => {
            const presentation = structuredClone(snapshot.document.presentation)
            presentation.theme.mode = event.target.value as 'light' | 'dark'
            dispatch(store, [{ type: 'presentation.set', presentation }], 'Change theme')
          }}
        >
          <option value="light">{t('Light', 'Claro')}</option>
          <option value="dark">{t('Dark', 'Oscuro')}</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={snapshot.document.presentation.grid.snap}
          onChange={(event) => {
            const presentation = structuredClone(snapshot.document.presentation)
            presentation.grid.snap = event.target.checked
            dispatch(store, [{ type: 'presentation.set', presentation }], 'Toggle snap')
          }}
        />
        {t('Snap to grid', 'Ajustar a cuadrícula')}
      </label>
      <label>
        <input
          type="checkbox"
          checked={snapshot.document.presentation.grid.visible}
          onChange={(event) => {
            const presentation = structuredClone(snapshot.document.presentation)
            presentation.grid.visible = event.target.checked
            dispatch(store, [{ type: 'presentation.set', presentation }], 'Toggle grid')
          }}
        />
        {t('Show grid', 'Mostrar cuadrícula')}
      </label>
      {error && <p role="alert">{error}</p>}
    </aside>
  )
}
export function EditorJsonPanel() {
  const { store } = useEditor(),
    snapshot = useEditorSelector((s) => ({ document: s.document, draft: s.draft }), shallowEqual),
    t = useLabels()
  const serialized = useMemo(() => serializeDocument(snapshot.document), [snapshot.document])
  const text = snapshot.draft.kind === 'text' ? snapshot.draft.text : serialized
  return (
    <details className="adl-editor-json">
      <summary>{t('Document JSON', 'JSON del documento')}</summary>
      <textarea
        aria-label={t('Document JSON', 'JSON del documento')}
        value={text}
        onChange={(event) => store.setTextDraft(event.target.value)}
        spellCheck={false}
      />
      <div>
        <button
          type="button"
          disabled={snapshot.draft.kind !== 'text'}
          onClick={() => store.commitTextDraft()}
        >
          {t('Apply JSON', 'Aplicar JSON')}
        </button>
        <button type="button" onClick={() => store.cancelTextDraft()}>
          {t('Discard draft', 'Descartar borrador')}
        </button>
      </div>
      {snapshot.draft.kind === 'text' && snapshot.draft.diagnostics.length > 0 && (
        <p role="alert">{snapshot.draft.diagnostics.map((d) => d.code).join(', ')}</p>
      )}
    </details>
  )
}

export function EditorSelectionTools() {
  const { store } = useEditor(),
    snapshot = useEditorSelector(
      (s) => ({ document: s.document, selection: s.selection }),
      shallowEqual,
    ),
    t = useLabels()
  const fragment = useRef<DiagramFragment | null>(null),
    [hasCopy, setHasCopy] = useState(false),
    [clipboardBusy, setClipboardBusy] = useState(false),
    [arrangement, setArrangement] = useState<Arrangement>('left'),
    [error, setError] = useState('')
  const free = getAdapter(snapshot.document.spec.type).capabilities.includes('move-free')
  function copy() {
    const result = createFragment(snapshot.document, [...snapshot.selection])
    if (result.ok) {
      fragment.current = result.value
      setHasCopy(true)
      setError('')
    } else setError(result.diagnostics.map((d) => d.code).join(', '))
    return result
  }
  function paste(input: unknown = fragment.current) {
    if (input === undefined) return
    const result = pasteFragment(store.getSnapshot().document, input, {
      idFactory: () => crypto.randomUUID(),
      offset: { x: 32, y: 32 },
    })
    if (!result.ok) {
      setError(result.diagnostics.map((d) => d.code).join(', '))
      return
    }
    const previous = new Set(nodesOf(store.getSnapshot().document.spec).map((n) => n.id))
    const commit = dispatch(
      store,
      [{ type: 'document.replace-content', document: result.value }],
      'Paste selection',
    )
    if (commit.status === 'committed')
      store.setSelection(
        nodesOf(result.value.spec)
          .filter((n) => !previous.has(n.id))
          .map((n) => ({ kind: 'node', id: n.id })),
      )
    setError(commit.diagnostics.map((d) => d.code).join(', '))
  }
  async function systemClipboard(action: 'copy' | 'paste') {
    if (clipboardBusy) return
    setClipboardBusy(true)
    setError('')
    const revision = store.getSnapshot().document.revision
    const documentId = store.getSnapshot().document.id
    try {
      if (action === 'copy') {
        if (!navigator.clipboard?.writeText) {
          setError('clipboard.unavailable')
          return
        }
        const result = copy()
        if (result.ok) await navigator.clipboard.writeText(JSON.stringify(result.value))
      } else {
        if (!navigator.clipboard?.readText) {
          setError('clipboard.unavailable')
          return
        }
        const text = await navigator.clipboard.readText()
        const current = store.getSnapshot().document
        if (current.id !== documentId || current.revision !== revision) {
          setError('revision.stale')
          return
        }
        if (new TextEncoder().encode(text).length > 1048576) {
          setError('limit.bytes')
          return
        }
        let input: unknown
        try {
          input = JSON.parse(text)
        } catch {
          setError('clipboard.invalid')
          return
        }
        paste(input)
      }
    } catch {
      setError('clipboard.denied')
    } finally {
      setClipboardBusy(false)
    }
  }
  const nodeIds = snapshot.selection.filter((r) => r.kind === 'node').map((r) => r.id)
  return (
    <>
      <select
        aria-label={t('Arrangement', 'Alineación y distribución')}
        value={arrangement}
        onChange={(event) => setArrangement(event.target.value as Arrangement)}
      >
        {(
          [
            ['left', t('Align left', 'Alinear izquierda')],
            ['right', t('Align right', 'Alinear derecha')],
            ['top', t('Align top', 'Alinear arriba')],
            ['bottom', t('Align bottom', 'Alinear abajo')],
            ['center-x', t('Center horizontally', 'Centrar horizontalmente')],
            ['center-y', t('Center vertically', 'Centrar verticalmente')],
            ['horizontal', t('Distribute horizontally', 'Distribuir horizontalmente')],
            ['vertical', t('Distribute vertically', 'Distribuir verticalmente')],
          ] as const
        ).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={
          !free ||
          nodeIds.length < (arrangement === 'horizontal' || arrangement === 'vertical' ? 3 : 2) ||
          nodeIds.some((id) => isNodeLocked(snapshot.document, id))
        }
        onClick={() => {
          const current = store.getSnapshot().document
          const scene = materialize(current)
          const positions = arrangeRects(
            nodeIds.map((id) => ({ id, ...scene.nodes[id] })),
            arrangement,
          )
          const result = dispatch(
            store,
            [
              { type: 'scene.set', scene },
              { type: 'nodes.move', positions },
            ],
            'Arrange selection',
          )
          setError(result.diagnostics.map((d) => d.code).join(', '))
        }}
      >
        {t('Arrange selection', 'Organizar selección')}
      </button>
      <button type="button" disabled={!snapshot.selection.length} onClick={() => copy()}>
        {t('Copy', 'Copiar')}
      </button>
      <button type="button" disabled={!hasCopy || !free} onClick={() => paste()}>
        {t('Paste', 'Pegar')}
      </button>
      <button
        type="button"
        disabled={clipboardBusy || !snapshot.selection.length}
        onClick={() => void systemClipboard('copy')}
      >
        {t('Copy to clipboard', 'Copiar al portapapeles')}
      </button>
      <button
        type="button"
        disabled={clipboardBusy || !free}
        onClick={() => void systemClipboard('paste')}
      >
        {t('Paste from clipboard', 'Pegar del portapapeles')}
      </button>
      <button
        type="button"
        disabled={!snapshot.selection.length || !free}
        onClick={() => {
          const result = copy()
          if (result.ok) paste(result.value)
        }}
      >
        {t('Duplicate', 'Duplicar')}
      </button>
      <button
        type="button"
        disabled={nodeIds.length < 2 || !free}
        onClick={() => {
          const groups = structuredClone(snapshot.document.scene.groups)
          groups.forEach((g) => {
            g.nodeIds = g.nodeIds.filter((id) => !nodeIds.includes(id))
          })
          dispatch(
            store,
            [
              { type: 'scene.set', scene: { ...structuredClone(snapshot.document.scene), groups } },
              {
                type: 'group.upsert',
                group: {
                  id: crypto.randomUUID(),
                  label: t('Group', 'Grupo'),
                  kind: 'visual',
                  nodeIds,
                  locked: false,
                },
              },
            ],
            'Group selection',
          )
        }}
      >
        {t('Group', 'Agrupar')}
      </button>
      <button
        type="button"
        disabled={
          !nodeIds.length ||
          !snapshot.document.scene.groups.some((g) => g.nodeIds.some((id) => nodeIds.includes(id)))
        }
        onClick={() => {
          const scene = structuredClone(snapshot.document.scene)
          const removed = new Set(
            scene.groups
              .filter((g) => g.nodeIds.some((id) => nodeIds.includes(id)))
              .map((g) => g.id),
          )
          scene.groups = scene.groups.filter((g) => !removed.has(g.id))
          scene.groups.forEach((g) => {
            if (g.parentGroup && removed.has(g.parentGroup)) delete g.parentGroup
          })
          dispatch(store, [{ type: 'scene.set', scene }], 'Ungroup selection')
        }}
      >
        {t('Ungroup', 'Desagrupar')}
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  )
}
export function EditorStructuredInspector() {
  const { store } = useEditor(),
    snapshot = useEditorSelector(
      (s) => ({ selection: s.selection, document: s.document }),
      shallowEqual,
    ),
    t = useLabels()
  const type = snapshot.document.spec.type,
    ref = snapshot.selection.find((r) => r.kind === 'node'),
    node = ref ? nodesOf(snapshot.document.spec).find((n) => n.id === ref.id) : undefined
  const [error, setError] = useState('')
  if (!node) return null
  const commitNode = (next: NodeInput['node'], label: string) => {
    const result = getAdapter(type).replaceNode(snapshot.document.spec, {
      diagramType: type,
      node: next,
    } as NodeInput)
    if (!result.ok) {
      setError(result.diagnostics.map((d) => d.code).join(', '))
      return
    }
    const commit = dispatch(
      store,
      [{ type: 'spec.replace', spec: result.value, references: 'reject' }],
      label,
    )
    setError(commit.diagnostics.map((d) => d.code).join(', '))
  }
  if (type === 'er') {
    const entity = node as ErEntity
    return (
      <section aria-label={t('Table fields', 'Campos de la tabla')}>
        <h3>{t('Table fields', 'Campos de la tabla')}</h3>
        <ol className="adl-editor-fields">
          {entity.fields.map((field, index) => (
            <li key={index}>
              <input
                aria-label={`${t('Field name', 'Nombre del campo')} ${index + 1}`}
                value={field.name}
                onChange={(event) => {
                  const fields = entity.fields.map((f, i) =>
                    i === index ? { ...f, name: event.target.value } : f,
                  )
                  commitNode({ ...entity, fields }, 'Rename field')
                }}
              />
              <input
                aria-label={`${t('Field type', 'Tipo del campo')} ${index + 1}`}
                value={field.type ?? ''}
                placeholder={t('type', 'tipo')}
                onChange={(event) => {
                  const fields = entity.fields.map((f, i) =>
                    i === index ? { ...f, type: event.target.value || undefined } : f,
                  )
                  commitNode({ ...entity, fields }, 'Set field type')
                }}
              />
              <select
                aria-label={`${t('Field key', 'Clave del campo')} ${index + 1}`}
                value={field.key ?? ''}
                onChange={(event) => {
                  const key = (event.target.value || undefined) as TableField['key']
                  const fields = entity.fields.map((f, i) => (i === index ? { ...f, key } : f))
                  commitNode({ ...entity, fields }, 'Set field key')
                }}
              >
                <option value="">—</option>
                <option value="pk">pk</option>
                <option value="fk">fk</option>
                <option value="unique">unique</option>
              </select>
              <button
                type="button"
                aria-label={`${t('Remove field', 'Quitar campo')} ${index + 1}`}
                onClick={() =>
                  commitNode(
                    {
                      ...entity,
                      fields: entity.fields.filter(
                        (field: TableField, fieldIndex: number) => fieldIndex !== index,
                      ),
                    },
                    'Remove field',
                  )
                }
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() =>
            commitNode({ ...entity, fields: [...entity.fields, { name: '' }] }, 'Add field')
          }
        >
          {t('Add field', 'Añadir campo')}
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
    )
  }
  if (type === 'sequence') {
    const participants = nodesOf(snapshot.document.spec) as SequenceParticipant[]
    return (
      <section aria-label={t('Participants', 'Participantes')}>
        <h3>{t('Participants', 'Participantes')}</h3>
        <ol>
          {participants.map((participant) => (
            <li key={participant.id}>
              <span className="adl-editor-mono">{participant.label}</span>
              <button
                type="button"
                disabled={participants.length <= 1}
                aria-label={`${t('Remove participant', 'Quitar participante')}: ${participant.label}`}
                onClick={() => {
                  const result = getAdapter('sequence').removeNodes(snapshot.document.spec, [
                    participant.id,
                  ])
                  if (result.ok)
                    dispatch(
                      store,
                      [
                        {
                          type: 'spec.replace',
                          spec: result.value,
                          references: 'prune-references',
                        },
                      ],
                      'Remove participant',
                    )
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => {
            const id = globalThis.crypto.randomUUID()
            const result = getAdapter('sequence').insertNode(snapshot.document.spec, {
              diagramType: 'sequence',
              node: { id, label: t('New participant', 'Nuevo participante') },
            } as NodeInput)
            if (result.ok) {
              dispatch(
                store,
                [{ type: 'spec.replace', spec: result.value, references: 'reject' }],
                'Add participant',
              )
              store.setSelection([{ kind: 'node', id }])
            }
          }}
        >
          {t('Add participant', 'Añadir participante')}
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
    )
  }
  if (type === 'swimlane') {
    const spec = snapshot.document.spec
    if (spec.type !== 'swimlane') return null
    const swimNode = node as DiagramNode & { lane: string }
    const laneId = swimNode.lane
    const lanes = spec.lanes
    const replaceLanes = (
      nextLanes: SwimlaneLane[],
      assignment: (
        sourceLane: string,
        nodeId: string,
        swimNode: DiagramNode & { lane: string },
      ) => string,
      label: string,
    ) => {
      const nodes = nodesOf(spec) as Array<DiagramNode & { lane: string }>
      const assignments: Record<string, string> = {}
      for (const n of nodes) assignments[n.id] = assignment(n.lane, n.id, n)
      const result = getAdapter('swimlane').editStructure(spec, {
        type: 'lanes.replace',
        lanes: nextLanes,
        assignments,
        removeNodeIds: [],
      })
      if (result.ok)
        dispatch(store, [{ type: 'spec.replace', spec: result.value, references: 'reject' }], label)
      else setError(result.diagnostics.map((d) => d.code).join(', '))
    }
    return (
      <section aria-label={t('Swimlane lanes', 'Carriles')}>
        <h3>{t('Swimlane lanes', 'Carriles')}</h3>
        <label>
          {t('Lane', 'Carril')}
          <select
            aria-label={t('Lane', 'Carril')}
            value={laneId}
            onChange={(event) =>
              commitNode({ ...swimNode, lane: event.target.value } as typeof node, 'Assign lane')
            }
          >
            {lanes.map((lane) => (
              <option key={lane.id} value={lane.id}>
                {lane.label}
              </option>
            ))}
          </select>
        </label>
        <ol>
          {lanes.map((lane) => (
            <li key={lane.id}>
              <span className="adl-editor-mono">{lane.label}</span>
              <button
                type="button"
                disabled={lanes.length <= 1}
                aria-label={`${t('Remove lane', 'Quitar carril')}: ${lane.label}`}
                onClick={() => {
                  const first = lanes.find((candidate) => candidate.id !== lane.id)!
                  replaceLanes(
                    lanes.filter((candidate) => candidate.id !== lane.id),
                    (source) => (source === lane.id ? first.id : source),
                    'Remove lane',
                  )
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() =>
            replaceLanes(
              [
                ...lanes,
                { id: globalThis.crypto.randomUUID(), label: t('New lane', 'Nuevo carril') },
              ],
              (source) => source,
              'Add lane',
            )
          }
        >
          {t('Add lane', 'Añadir carril')}
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
    )
  }
  if (type === 'graph') {
    const graphNode = node as GraphNode
    const ports = graphNode.ports ?? []
    return (
      <section aria-label={t('Ports', 'Puertos')}>
        <h3>{t('Ports', 'Puertos')}</h3>
        <ol>
          {ports.map((port, index) => (
            <li key={port.id}>
              <span className="adl-editor-mono">{port.id}</span>
              <select
                aria-label={`${t('Port side', 'Lado del puerto')} ${index + 1}`}
                value={port.side}
                onChange={(event) => {
                  const next = ports.map((p, i) =>
                    i === index ? { ...p, side: event.target.value as PortSide } : p,
                  )
                  commitNode({ ...graphNode, ports: next } as typeof node, 'Set port side')
                }}
              >
                {['top', 'right', 'bottom', 'left'].map((side) => (
                  <option key={side} value={side}>
                    {side}
                  </option>
                ))}
              </select>
              <select
                aria-label={`${t('Port direction', 'Dirección del puerto')} ${index + 1}`}
                value={port.direction}
                onChange={(event) => {
                  const next = ports.map((p, i) =>
                    i === index
                      ? { ...p, direction: event.target.value as GraphPort['direction'] }
                      : p,
                  )
                  commitNode({ ...graphNode, ports: next } as typeof node, 'Set port direction')
                }}
              >
                {['in', 'out', 'both'].map((direction) => (
                  <option key={direction} value={direction}>
                    {direction}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`${t('Remove port', 'Quitar puerto')} ${index + 1}`}
                onClick={() =>
                  commitNode(
                    { ...graphNode, ports: ports.filter((_, i) => i !== index) } as typeof node,
                    'Remove port',
                  )
                }
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => {
            const id = globalThis.crypto.randomUUID()
            commitNode(
              {
                ...graphNode,
                ports: [...ports, { id, side: 'right', offset: 0.5, direction: 'both' }],
              } as typeof node,
              'Add port',
            )
          }}
        >
          {t('Add port', 'Añadir puerto')}
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
    )
  }
  return null
}

export function EditorNodeGeometry({ nodeId }: { nodeId: string }) {
  const { store } = useEditor(),
    snapshot = useEditorSelector(
      (s) => ({ document: s.document, selection: s.selection }),
      shallowEqual,
    ),
    t = useLabels()
  const scene = useMemo(() => materialize(snapshot.document), [snapshot.document])
  const placement = scene.nodes[nodeId]
  const [values, setValues] = useState({ x: '0', y: '0', width: '240', height: '64' }),
    [error, setError] = useState('')
  useEffect(() => {
    if (placement)
      setValues({
        x: String(placement.x),
        y: String(placement.y),
        width: String(placement.width),
        height: String(placement.height),
      })
  }, [placement?.x, placement?.y, placement?.width, placement?.height, nodeId])
  if (!placement) return null
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const scene = materialize(snapshot.document),
          result = dispatch(
            store,
            [
              { type: 'scene.set', scene },
              {
                type: 'nodes.move',
                positions: { [nodeId]: { x: Number(values.x), y: Number(values.y) } },
              },
              {
                type: 'node.resize',
                id: nodeId,
                size: { width: Number(values.width), height: Number(values.height) },
              },
            ],
            'Set node geometry',
          )
        setError(result.diagnostics.map((d) => d.code).join(', '))
      }}
    >
      <h3>{t('Position and size', 'Posición y tamaño')}</h3>
      <div className="adl-editor-geometry">
        {(['x', 'y', 'width', 'height'] as const).map((key) => (
          <label key={key}>
            {key === 'width'
              ? t('Width', 'Ancho')
              : key === 'height'
                ? t('Height', 'Alto')
                : key.toUpperCase()}
            <input
              type="number"
              aria-label={
                key === 'width'
                  ? t('Node width', 'Ancho del nodo')
                  : key === 'height'
                    ? t('Node height', 'Alto del nodo')
                    : key.toUpperCase()
              }
              value={values[key]}
              onChange={(event) => setValues({ ...values, [key]: event.target.value })}
            />
          </label>
        ))}
      </div>
      <button type="submit" disabled={isNodeLocked(snapshot.document, nodeId)}>
        {t('Apply geometry', 'Aplicar geometría')}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
export function EditorRelations() {
  const { store } = useEditor(),
    snapshot = useEditorSelector(
      (s) => ({ document: s.document, selection: s.selection }),
      shallowEqual,
    ),
    t = useLabels()
  const nodes = nodesOf(snapshot.document.spec),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [label, setLabel] = useState(''),
    [error, setError] = useState('')
  if (snapshot.document.spec.type === 'timeline') return null
  const adapter = getAdapter(snapshot.document.spec.type)
  const source = nodes.some((n) => n.id === from) ? from : (nodes[0]?.id ?? ''),
    target = nodes.some((n) => n.id === to) ? to : (nodes[1]?.id ?? source)
  return (
    <section>
      <h3>{t('Connections', 'Conexiones')}</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const result = adapter.insertRelation(snapshot.document.spec, {
            diagramType: snapshot.document.spec.type,
            relation: {
              id: crypto.randomUUID(),
              from: source,
              to: target,
              ...(label ? { label } : {}),
            },
          } as RelationInput)
          if (!result.ok) {
            setError(result.diagnostics.map((d) => d.code).join(', '))
            return
          }
          const commit = dispatch(
            store,
            [{ type: 'spec.replace', spec: result.value, references: 'reject' }],
            'Connect nodes',
          )
          setError(commit.diagnostics.map((d) => d.code).join(', '))
        }}
      >
        <label>
          {t('From', 'Origen')}
          <select
            aria-label={t('Connection source', 'Origen de conexión')}
            value={source}
            onChange={(e) => setFrom(e.target.value)}
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('To', 'Destino')}
          <select
            aria-label={t('Connection target', 'Destino de conexión')}
            value={target}
            onChange={(e) => setTo(e.target.value)}
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Connection label', 'Etiqueta de conexión')}
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={512} />
        </label>
        <button type="submit" disabled={!source || !target}>
          {t('Connect', 'Conectar')}
        </button>
      </form>
      <details>
        <summary>
          {t('Existing connections', 'Conexiones existentes')} (
          {edgesOf(snapshot.document.spec).length})
        </summary>
        {edgesOf(snapshot.document.spec).map((e) => (
          <div className="adl-editor-relation" key={e.id}>
            <span>{e.label || `${e.from} → ${e.to}`}</span>
            <button
              type="button"
              aria-label={t(`Delete connection ${e.id}`, `Eliminar conexión ${e.id}`)}
              onClick={() => {
                const result = adapter.removeRelations(snapshot.document.spec, [e.id!])
                if (result.ok)
                  dispatch(
                    store,
                    [{ type: 'spec.replace', spec: result.value, references: 'prune-references' }],
                    'Delete connection',
                  )
              }}
            >
              ×
            </button>
          </div>
        ))}
      </details>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}

export function EditorRoute() {
  const { store } = useEditor(),
    snapshot = useEditorSelector(
      (s) => ({ selection: s.selection, document: s.document }),
      shallowEqual,
    ),
    t = useLabels()
  const ref = snapshot.selection.find((r) => r.kind === 'edge'),
    edge = ref ? edgesOf(snapshot.document.spec).find((e) => e.id === ref.id) : undefined
  const [error, setError] = useState('')
  if (!edge || !edge.id || !freeTypes.has(snapshot.document.spec.type)) return null
  const edgeId = edge.id
  const route = snapshot.document.scene.routes[edgeId]
  const manual: Extract<RoutePlacement, { mode: 'manual' }> | undefined =
    route?.mode === 'manual' ? route : undefined
  const setRoute = (next: RoutePlacement, label: string) => {
    const scene = materialize(snapshot.document)
    const commit = dispatch(
      store,
      [
        { type: 'scene.set', scene },
        { type: 'route.set', id: edgeId, route: next },
      ],
      label,
    )
    setError(commit.diagnostics.map((d) => d.code).join(', '))
  }
  const toManual = () => {
    const result = resolveDocument(snapshot.document, {
      quality: 'edit',
      requestId: 'route-manual',
      skipValidation: true,
    })
    if (!result.ok) {
      setError(result.diagnostics.map((d) => d.code).join(', '))
      return
    }
    const placed = result.value.layout.edges.find((e) => e.id === edgeId)
    if (!placed) return
    setRoute(
      {
        mode: 'manual',
        source: { side: placed.fromSide, offset: 0.5 },
        target: { side: placed.toSide, offset: 0.5 },
        points: (placed.routePoints ?? [])
          .slice(1, -1)
          .map(([x, y]) => ({ x, y }))
          .filter((point, index, all) => {
            const previous = all[index - 1]
            return !previous || previous.x !== point.x || previous.y !== point.y
          }),
        label: placed.label ? { x: placed.labelX, y: placed.labelY } : undefined,
      },
      'Set manual route',
    )
  }
  return (
    <section aria-label={t('Connection route', 'Ruta de la conexión')}>
      <h3>{t('Connection route', 'Ruta de la conexión')}</h3>
      <p className="adl-editor-mono">{edge.id}</p>
      <button
        type="button"
        onClick={() =>
          route?.mode === 'manual' ? setRoute({ mode: 'auto' }, 'Set auto route') : toManual()
        }
      >
        {route?.mode === 'manual'
          ? t('Auto route', 'Ruta automática')
          : t('Manual route', 'Ruta manual')}
      </button>
      {manual && (
        <>
          <ol>
            {manual.points.map((point, index) => (
              <li key={index}>
                <span className="adl-editor-mono">
                  {point.x.toFixed(0)}, {point.y.toFixed(0)}
                </span>
                <button
                  type="button"
                  aria-label={`${t('Remove waypoint', 'Quitar punto intermedio')} ${index + 1}`}
                  onClick={() =>
                    setRoute(
                      { ...manual, points: manual.points.filter((_, i) => i !== index) },
                      'Remove waypoint',
                    )
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => {
              const points = manual.points
              const previous = points[points.length - 1]
              const next: RoutePlacement = {
                ...manual,
                points: [
                  ...points,
                  previous
                    ? { x: Math.round(previous.x + 24), y: Math.round(previous.y) }
                    : { x: 0, y: 0 },
                ],
              }
              setRoute(next, 'Add waypoint')
            }}
          >
            {t('Add waypoint', 'Añadir punto intermedio')}
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}

/** Own one store per mount; options are initial values, not controlled props. */
export function useEditorStore(options: StoreOptions): EditorStore {
  const [store] = useState(() => createEditorStore(options))
  const generation = useRef(0)
  useEffect(() => {
    const active = ++generation.current
    return () => {
      queueMicrotask(() => {
        if (generation.current === active) store.dispose()
      })
    }
  }, [store])
  return store
}

/** Keyboard-accessible authored entities; synthetic layout geometry is not listed. */
export function EditorOutline({ className }: { className?: string }) {
  const { store } = useEditor(),
    snapshot = useEditorSelector(
      (s) => ({ selection: s.selection, document: s.document }),
      shallowEqual,
    ),
    t = useLabels()
  const nodes = nodesOf(snapshot.document.spec)
  const labels = new Map(nodes.map((n) => [n.id, n.label]))
  const sections = [
    {
      label: t('Nodes', 'Nodos'),
      kind: 'node' as const,
      entities: nodes.map((n) => ({ id: n.id, label: n.label })),
    },
    {
      label: t('Connections', 'Conexiones'),
      kind: 'edge' as const,
      entities: edgesOf(snapshot.document.spec).map((e) => ({
        id: e.id!,
        label: `${labels.get(e.from)} → ${labels.get(e.to)}${e.label ? `: ${e.label}` : ''}`,
      })),
    },
    {
      label: t('Groups', 'Grupos'),
      kind: 'group' as const,
      entities: snapshot.document.scene.groups.map((g) => ({ id: g.id, label: g.label })),
    },
  ]
  return (
    <details className={`adl-editor-outline ${className ?? ''}`}>
      <summary>{t('Diagram outline', 'Estructura del diagrama')}</summary>
      <section role="region" aria-label={t('Diagram outline', 'Estructura del diagrama')}>
        {sections.map((section) => (
          <div key={section.kind}>
            <h3>
              {section.label} ({section.entities.length})
            </h3>
            <ul>
              {section.entities.map((entity) => (
                <li key={entity.id}>
                  <button
                    type="button"
                    aria-label={`${section.kind === 'node' ? t('Select node', 'Seleccionar nodo') : section.kind === 'edge' ? t('Select connection', 'Seleccionar conexión') : t('Select group', 'Seleccionar grupo')}: ${entity.label}`}
                    aria-pressed={snapshot.selection.some(
                      (r) => r.kind === section.kind && r.id === entity.id,
                    )}
                    onClick={(event) => {
                      const ref = { kind: section.kind, id: entity.id }
                      const current = store.getSnapshot().selection
                      store.setSelection(
                        event.shiftKey
                          ? current.some((r) => r.kind === ref.kind && r.id === ref.id)
                            ? current.filter((r) => !(r.kind === ref.kind && r.id === ref.id))
                            : [...current, ref]
                          : [ref],
                      )
                    }}
                  >
                    {entity.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </details>
  )
}
