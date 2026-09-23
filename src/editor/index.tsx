'use client'
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react'
import type {
  DiagramDocument,
  EditorCommand,
  EditorStore,
  Locale,
  NodeInput,
  Point,
} from '../editor-core/types'
import { getAdapter } from '../editor-core/adapters'
import { nodesOf } from '../editor-core/model'
import { isNodeLocked } from '../editor-core/commands'
import { resolveDocument } from '../editor-core/scene'
import { fitViewport, zoomAt, screenToWorld } from '../editor-core/viewport'
import { serializeDocument } from '../editor-core/document'
import { renderSceneMarkup } from '../render'
import { createFragment, pasteFragment } from '../editor-core/clipboard'
import type { DiagramFragment, RelationInput } from '../editor-core/types'
import { edgesOf } from '../editor-core/model'
import { createEditorStore } from '../editor-core/store'
import { arrangeRects, type Arrangement } from '../geometry/arrange'
import { RESIZE_HANDLES, resizeRect, type ResizeDirection } from '../geometry/resize'
import { pinchViewport } from '../geometry/pinch'
import { nodeGeometry } from '../geometry/node'
import { marqueeBounds, intersectsMarquee } from '../geometry/selection'
import type { StoreOptions } from '../editor-core/types'

const Context = createContext<{ store: EditorStore; locale: Locale } | null>(null)
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
export function useEditorSelector<T>(
  select: (snapshot: ReturnType<EditorStore['getSnapshot']>) => T,
): T {
  return select(useEditorSnapshot())
}
function useLabels() {
  const { locale } = useEditor()
  return (en: string, es: string) => (locale === 'es' ? es : en)
}
function dispatch(store: EditorStore, commands: EditorCommand[], label: string) {
  return store.dispatch({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    label,
    expectedRevision: store.getSnapshot().document.revision,
    commands,
  })
}
function materialize(document: DiagramDocument) {
  const result = resolveDocument(document, { quality: 'edit', requestId: 'gesture' })
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
export function EditorToolbar() {
  const { store } = useEditor(),
    snapshot = useEditorSnapshot(),
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
      <span className="adl-editor-status" role="status">
        {snapshot.dirty
          ? t('Unsaved changes', 'Cambios sin guardar')
          : t('No pending changes', 'Sin cambios pendientes')}
      </span>
    </div>
  )
}
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
  const resolved = useMemo(
    () => resolveDocument(activeDoc, { quality: 'edit', requestId: instanceId }),
    [activeDoc, instanceId],
  )
  const markup = useMemo(
    () => (resolved.ok ? renderSceneMarkup(activeDoc, resolved.value, { instanceId }) : ''),
    [activeDoc, resolved, instanceId],
  )
  const gesture = useRef<{
    pointer: number
    start: Point
    viewport: typeof snapshot.viewport
    positions: Record<string, Point>
    scene: DiagramDocument['scene']
    pan: boolean
    resize?: { id: string; direction: ResizeDirection }
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
  const authoredNodes = useMemo(() => {
    const ids = new Set(nodesOf(activeDoc.spec).map((n) => n.id))
    return resolved.ok ? resolved.value.layout.nodes.filter((n) => ids.has(n.id)) : []
  }, [activeDoc.spec, resolved])
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
    if (!gesture.current.pan) {
      if (cancel) store.cancelGesture()
      else store.commitGesture()
    }
    gesture.current = null
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
          const target = (event.target as Element).closest('[data-hit-node], [data-resize-node]'),
            resize = target?.getAttribute('data-resize-node') ?? undefined,
            id = resize ?? target?.getAttribute('data-hit-node')
          const pan = snapshot.tool === 'hand' || event.button === 1 || spacePan.current
          if (!pan && !id) {
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
          if (id && !pan) {
            const selection = resize
              ? [{ kind: 'node' as const, id }]
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
              label: resize ? 'Resize node' : 'Move selection',
              expectedRevision: snapshot.document.revision,
            }).ok
          )
            return
          gesture.current = {
            pointer: event.pointerId,
            start: local(event),
            viewport: { ...snapshot.viewport },
            positions,
            scene,
            pan,
            resize: resize
              ? {
                  id: resize,
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
          const selection = marquee.current
          if (selection?.pointer === event.pointerId) {
            const point = local(event)
            if (
              !selection.moved &&
              Math.hypot(point.x - selection.start.x, point.y - selection.start.y) < 3
            )
              return
            selection.moved = true
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
          if (!current || current.pointer !== event.pointerId) return
          const point = local(event),
            dx = point.x - current.start.x,
            dy = point.y - current.start.y
          if (current.pan) {
            store.setViewport({
              ...current.viewport,
              x: current.viewport.x + dx,
              y: current.viewport.y + dy,
            })
            return
          }
          const positions: Record<string, Point> = {},
            grid = snapshot.document.presentation.grid
          if (current.resize) {
            const initial = current.scene.nodes[current.resize.id]
            const rect = resizeRect(
              initial,
              current.resize.direction,
              {
                x: dx / current.viewport.zoom,
                y: dy / current.viewport.zoom,
              },
              grid.snap ? grid.size : undefined,
            )
            store.previewGesture([
              { type: 'scene.set', scene: current.scene },
              { type: 'nodes.move', positions: { [current.resize.id]: { x: rect.x, y: rect.y } } },
              {
                type: 'node.resize',
                id: current.resize.id,
                size: { width: rect.width, height: rect.height },
              },
            ])
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
          store.previewGesture([
            { type: 'scene.set', scene: current.scene },
            { type: 'nodes.move', positions },
          ])
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
          }
        }}
      >
        <g
          transform={`translate(${snapshot.viewport.x} ${snapshot.viewport.y}) scale(${snapshot.viewport.zoom})`}
        >
          {/* Markup is generated exclusively by the internal escaped SVG serializer, never imported HTML. */}
          <g dangerouslySetInnerHTML={{ __html: markup }} />
          {authoredNodes.map((n) => (
            <g key={n.id}>
              <rect
                data-hit-node={n.id}
                x={nodeGeometry(n).hit.x}
                y={nodeGeometry(n).hit.y}
                width={nodeGeometry(n).hit.width}
                height={nodeGeometry(n).hit.height}
                rx={4}
                fill="transparent"
                stroke={
                  snapshot.selection.some((r) => r.kind === 'node' && r.id === n.id)
                    ? activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt
                    : 'none'
                }
                strokeWidth={2 / snapshot.viewport.zoom}
                tabIndex={0}
                role="button"
                aria-label={n.label}
                aria-pressed={snapshot.selection.some((r) => r.kind === 'node' && r.id === n.id)}
                onFocus={() => store.setSelection([{ kind: 'node', id: n.id }])}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    store.setSelection([{ kind: 'node', id: n.id }])
                  }
                }}
              />
            </g>
          ))}
          {snapshot.tool === 'select' &&
            snapshot.selection.length === 1 &&
            getAdapter(activeDoc.spec.type).capabilities.includes('resize') &&
            authoredNodes
              .filter(
                (n) =>
                  snapshot.selection.some((r) => r.kind === 'node' && r.id === n.id) &&
                  !isNodeLocked(activeDoc, n.id),
              )
              .flatMap((n) =>
                RESIZE_HANDLES.map((handle) => (
                  <g key={`resize-${n.id}-${handle.direction}`}>
                    <rect
                      x={n.x + n.w * handle.x - 5 / snapshot.viewport.zoom}
                      y={n.y + n.h * handle.y - 5 / snapshot.viewport.zoom}
                      width={10 / snapshot.viewport.zoom}
                      height={10 / snapshot.viewport.zoom}
                      fill={activeDoc.presentation.theme[activeDoc.presentation.theme.mode].card}
                      stroke={
                        activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt
                      }
                      strokeWidth={1 / snapshot.viewport.zoom}
                      pointerEvents="none"
                    />
                    <rect
                      data-resize-node={n.id}
                      data-resize-direction={handle.direction}
                      x={n.x + n.w * handle.x - 22 / snapshot.viewport.zoom}
                      y={n.y + n.h * handle.y - 22 / snapshot.viewport.zoom}
                      width={44 / snapshot.viewport.zoom}
                      height={44 / snapshot.viewport.zoom}
                      fill="transparent"
                      style={{ cursor: handle.cursor }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${t('Resize', 'Redimensionar')} ${n.label}${handle.direction === 'se' ? '' : ` — ${t(handle.en, handle.es)}`}`}
                      aria-description={t(handle.en, handle.es)}
                      onKeyDown={(event) => {
                        if (
                          !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
                        )
                          return
                        event.preventDefault()
                        event.stopPropagation()
                        const step = event.shiftKey ? 16 : 1
                        const scene = materialize(store.getSnapshot().document)
                        const rect = resizeRect(scene.nodes[n.id], handle.direction, {
                          x:
                            event.key === 'ArrowLeft'
                              ? -step
                              : event.key === 'ArrowRight'
                                ? step
                                : 0,
                          y: event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
                        })
                        dispatch(
                          store,
                          [
                            { type: 'scene.set', scene },
                            { type: 'nodes.move', positions: { [n.id]: { x: rect.x, y: rect.y } } },
                            {
                              type: 'node.resize',
                              id: n.id,
                              size: { width: rect.width, height: rect.height },
                            },
                          ],
                          'Resize node',
                        )
                      }}
                    />
                  </g>
                )),
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
    </div>
  )
}
export function EditorInspector() {
  const { store } = useEditor(),
    snapshot = useEditorSnapshot(),
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
      <EditorRelations />
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
    snapshot = useEditorSnapshot(),
    t = useLabels()
  const text =
    snapshot.draft.kind === 'text' ? snapshot.draft.text : serializeDocument(snapshot.document)
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
    snapshot = useEditorSnapshot(),
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
export function EditorNodeGeometry({ nodeId }: { nodeId: string }) {
  const { store } = useEditor(),
    snapshot = useEditorSnapshot(),
    t = useLabels()
  const placement = materialize(snapshot.document).nodes[nodeId]
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
    snapshot = useEditorSnapshot(),
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
    snapshot = useEditorSnapshot(),
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
