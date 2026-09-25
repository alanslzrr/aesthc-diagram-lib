import { nodeGeometry } from '../geometry/node'
import { estimateTextWidth, type TextRole } from '../geometry/text'
import { labelPillWidth, roundedPolyline } from '../layout'
import type { DiagramLayout, PlacedNode, PlacedEdge } from '../layout'
import type { PortSide } from '../types'
import type {
  Diagnostic,
  DiagramDocument,
  EndpointAnchor,
  Point,
  ResolveContext,
  ResolvedScene,
  Result,
} from './types'
import { failure, issue, success } from './data'
import { getAdapter } from './adapters'
import { freeTypes, edgesOf } from './model'
import { validateDocument } from './validation'
import { isNodeLocked } from './commands'
import type { DiagramScene } from './types'

function anchor(node: PlacedNode, port: EndpointAnchor): Point {
  return {
    x:
      port.side === 'left'
        ? node.x
        : port.side === 'right'
          ? node.x + node.w
          : node.x + node.w * port.offset,
    y:
      port.side === 'top'
        ? node.y
        : port.side === 'bottom'
          ? node.y + node.h
          : node.y + node.h * port.offset,
  }
}

/** World-space anchor position for an authored placement rect. */
export function anchorPoint(
  rect: { x: number; y: number; width: number; height: number },
  port: EndpointAnchor,
): Point {
  return {
    x:
      port.side === 'left'
        ? rect.x
        : port.side === 'right'
          ? rect.x + rect.width
          : rect.x + rect.width * port.offset,
    y:
      port.side === 'top'
        ? rect.y
        : port.side === 'bottom'
          ? rect.y + rect.height
          : rect.y + rect.height * port.offset,
  }
}

/** Nearest side and proportional offset for a world point around a placement rect. */
export function anchorFromPoint(
  point: Point,
  rect: { x: number; y: number; width: number; height: number },
): EndpointAnchor {
  const clamp = (value: number) => Math.max(0, Math.min(1, value))
  const candidates: Array<{ side: PortSide; offset: number; distance: number }> = [
    {
      side: 'top',
      offset: clamp((point.x - rect.x) / rect.width),
      distance: Math.abs(point.y - rect.y),
    },
    {
      side: 'bottom',
      offset: clamp((point.x - rect.x) / rect.width),
      distance: Math.abs(point.y - (rect.y + rect.height)),
    },
    {
      side: 'left',
      offset: clamp((point.y - rect.y) / rect.height),
      distance: Math.abs(point.x - rect.x),
    },
    {
      side: 'right',
      offset: clamp((point.y - rect.y) / rect.height),
      distance: Math.abs(point.x - (rect.x + rect.width)),
    },
  ]
  candidates.sort((a, b) => a.distance - b.distance)
  return { side: candidates[0].side, offset: candidates[0].offset }
}
function nodeTextExtent(
  n: PlacedNode,
  document: DiagramDocument,
  context: ResolveContext,
): { width: number; left: number; right: number } {
  const measure = (value: string, role: TextRole) =>
    (context.measureText ?? estimateTextWidth)(value, role)
  const labelRole: TextRole = { size: 14.5, family: 'Geist', charFactor: 13 / 14.5 }
  const kindRole: TextRole = {
    size: 11.25,
    family: 'Geist Mono',
    charFactor: 10 / 11.25,
    tracking: 1.6,
  }
  const sublabelRole: TextRole = { size: 11.25, family: 'Geist Mono', charFactor: 11 / 11.25 }
  const fieldRole: TextRole = { size: 11, family: 'Geist Mono', charFactor: 1 }
  const fieldAnnotationRole: TextRole = { size: 10, family: 'Geist Mono', charFactor: 1 }
  const textWidth =
    Math.max(
      measure(n.label, labelRole),
      measure((n.kind ?? '').toUpperCase(), kindRole),
      measure(n.sublabel ?? '', sublabelRole),
      ...(n.fields ?? []).map((f) => {
        const annotation = [f.type, f.key === 'unique' ? 'unique' : null]
          .filter(Boolean)
          .join(' · ')
        return (
          measure(f.name, fieldRole) +
          (annotation ? measure(` ${annotation}`, fieldAnnotationRole) : 0)
        )
      }),
    ) * document.presentation.textScale
  const geometry = nodeGeometry(n, !!document.metadata.visuals[n.id])
  const textLeft =
    n.shape === 'table' ? n.x + 14 : geometry.centeredLabel ? n.cx - textWidth / 2 : geometry.textX
  return { width: textWidth, left: textLeft, right: textLeft + textWidth }
}

/** Overflow warnings apply to every type, including structured layouts. */
function pushTextOverflow(
  layout: DiagramLayout,
  document: DiagramDocument,
  context: ResolveContext,
  diagnostics: Diagnostic[],
) {
  for (const n of layout.nodes) {
    const extent = nodeTextExtent(n, document, context)
    if (extent.left < n.x + 14 || extent.right > n.x + n.w - 14)
      diagnostics.push({
        ...issue('quality.text-overflow', '/spec'),
        severity: 'warning',
        subject: { kind: 'node', id: n.id },
        supportedFixes: ['resize', 'shorten-text-manually'],
      })
  }
}

// Only immutable store specs can be reused. Mutable public inputs always seed afresh.
const seedLayouts = new WeakMap<DiagramDocument['spec'], DiagramLayout>()

interface PreviewCache {
  document: DiagramDocument
  context: ResolveContext
  scene: ResolvedScene
  extents: WeakMap<PlacedNode, ReturnType<typeof nodeTextExtent>>
}

/** Internal, instance-scoped resolver. Only immutable, validated previews are reusable. */
export function createPreviewResolver() {
  let previous: PreviewCache | undefined
  return (document: DiagramDocument, context: ResolveContext): Result<ResolvedScene> => {
    const immutable = Object.isFrozen(document) && Object.isFrozen(document.scene)
    const reusable =
      immutable &&
      previous &&
      context.skipDiagnostics &&
      previous.context.skipDiagnostics &&
      document.spec === previous.document.spec &&
      document.presentation === previous.document.presentation &&
      document.metadata === previous.document.metadata &&
      context.measureText === previous.context.measureText &&
      context.quality === previous.context.quality
        ? previous
        : undefined
    const extents =
      reusable?.extents ?? new WeakMap<PlacedNode, ReturnType<typeof nodeTextExtent>>()
    const result = resolveScene(document, context, reusable, extents)
    previous =
      immutable && result.ok ? { document, context, scene: result.value, extents } : undefined
    return result
  }
}

export function resolveDocument(
  document: DiagramDocument,
  context: ResolveContext,
): Result<ResolvedScene> {
  return resolveScene(document, context)
}

function resolveScene(
  document: DiagramDocument,
  context: ResolveContext,
  previous?: PreviewCache,
  extents?: WeakMap<PlacedNode, ReturnType<typeof nodeTextExtent>>,
): Result<ResolvedScene> {
  if (context.signal?.aborted) return failure('operation.aborted')
  const checked = context.skipValidation ? success(document) : validateDocument(document)
  if (!checked.ok) return checked
  let template = Object.isFrozen(document.spec) ? seedLayouts.get(document.spec) : undefined
  if (!template) {
    const seed = getAdapter(document.spec.type).seedLayout(document.spec)
    if (!seed.ok) return seed
    template = seed.value
    if (Object.isFrozen(document.spec)) seedLayouts.set(document.spec, template)
  }
  const layout = {
      ...template,
      nodes: template.nodes.map((node) =>
        previous && previous.document.scene.nodes[node.id] === document.scene.nodes[node.id]
          ? previous.scene.layout.nodeById[node.id]
          : { ...node },
      ),
    },
    diagnostics: Diagnostic[] = []
  if (!freeTypes.has(document.spec.type)) {
    if (!context.skipDiagnostics) pushTextOverflow(layout, document, context, diagnostics)
    return success(
      {
        layout,
        worldBounds: { x: 0, y: 0, width: layout.width, height: layout.height },
        origin: { x: 0, y: 0 },
        diagnostics,
      },
      diagnostics,
    )
  }
  for (const node of layout.nodes) {
    const placement = document.scene.nodes[node.id]
    if (placement && node !== previous?.scene.layout.nodeById[node.id])
      Object.assign(node, {
        x: placement.x,
        y: placement.y,
        w: placement.width,
        h: placement.height,
        cx: placement.x + placement.width / 2,
        cy: placement.y + placement.height / 2,
      })
  }
  const zOrder = new Map(document.scene.zOrder.map((id, index) => [id, index]))
  layout.nodes.sort((a, b) => (zOrder.get(a.id) ?? -1) - (zOrder.get(b.id) ?? -1))
  layout.nodeById = Object.fromEntries(layout.nodes.map((n) => [n.id, n]))
  const graphNodes =
    document.spec.type === 'graph'
      ? new Map(document.spec.nodes.map((node) => [node.id, node]))
      : undefined
  const graphEdges =
    document.spec.type === 'graph'
      ? new Map(document.spec.edges.map((edge) => [edge.id, edge]))
      : undefined
  const previousEdges = new Map(previous?.scene.layout.edges.map((edge) => [edge.id, edge]))
  const parallel = new Map<string, number>()
  layout.edges = edgesOf(document.spec).map((edge): PlacedEdge => {
    const from = layout.nodeById[edge.from],
      to = layout.nodeById[edge.to],
      route = document.scene.routes[edge.id!]
    const key = JSON.stringify([edge.from, edge.to]),
      ordinal = parallel.get(key) ?? 0
    parallel.set(key, ordinal + 1)
    if (
      previous &&
      from === previous.scene.layout.nodeById[edge.from] &&
      to === previous.scene.layout.nodeById[edge.to] &&
      route === previous.document.scene.routes[edge.id!]
    ) {
      const cached = previousEdges.get(edge.id!)
      if (cached) return cached
    }
    const horizontal = Math.abs(to.cx - from.cx) >= Math.abs(to.cy - from.cy)
    let source: EndpointAnchor = {
      side: horizontal
        ? to.cx >= from.cx
          ? 'right'
          : 'left'
        : to.cy >= from.cy
          ? 'bottom'
          : 'top',
      offset: 0.5,
    }
    let target: EndpointAnchor = {
      side: horizontal
        ? to.cx >= from.cx
          ? 'left'
          : 'right'
        : to.cy >= from.cy
          ? 'top'
          : 'bottom',
      offset: 0.5,
    }
    if (route?.mode === 'manual') {
      source = route.source
      target = route.target
    } else if (document.spec.type === 'graph') {
      const authored = graphEdges!.get(edge.id)!
      const sp = graphNodes!.get(edge.from)?.ports?.find((p) => p.id === authored.sourcePort)
      const tp = graphNodes!.get(edge.to)?.ports?.find((p) => p.id === authored.targetPort)
      if (sp) source = sp
      if (tp) target = tp
    }
    if (edge.from === edge.to && route?.mode !== 'manual') {
      source = { side: 'right', offset: 0.3 }
      target = { side: 'right', offset: 0.7 }
    }
    const start = anchor(from, source),
      end = anchor(to, target)
    const offset = ordinal * 20
    let points: Array<[number, number]>
    if (route?.mode === 'manual')
      points = [
        [start.x, start.y],
        ...route.points.map((p) => [p.x, p.y] as [number, number]),
        [end.x, end.y],
      ]
    else if (edge.from === edge.to)
      points = [
        [start.x, start.y],
        [start.x + 48 + offset, start.y],
        [end.x + 48 + offset, end.y],
        [end.x, end.y],
      ]
    else if (document.presentation.edgeStyle === 'straight' && !ordinal)
      points = [
        [start.x, start.y],
        [end.x, end.y],
      ]
    else if (source.side === 'left' || source.side === 'right') {
      const mid = (start.x + end.x) / 2 + offset
      points = [
        [start.x, start.y],
        [mid, start.y],
        [mid, end.y],
        [end.x, end.y],
      ]
    } else {
      const mid = (start.y + end.y) / 2 + offset
      points = [
        [start.x, start.y],
        [start.x, mid],
        [end.x, mid],
        [end.x, end.y],
      ]
    }
    const midIndex = Math.floor((points.length - 1) / 2)
    const middle = [
      (points[midIndex][0] + points[midIndex + 1][0]) / 2,
      (points[midIndex][1] + points[midIndex + 1][1]) / 2,
    ]
    return {
      ...edge,
      id: edge.id!,
      variant: edge.variant ?? 'main',
      d: roundedPolyline(points, 6),
      routePoints: points,
      labelX: route?.mode === 'manual' && route.label ? route.label.x : middle[0],
      labelY: route?.mode === 'manual' && route.label ? route.label.y : middle[1] - 12,
      labelWidth: labelPillWidth(edge.label ?? ''),
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      fromSide: source.side,
      toSide: target.side,
      arrowEnd: true,
    }
  })
  const descendantNodes = (id: string): PlacedNode[] => {
    const ids = new Set<string>(),
      pending = [id]
    for (let i = 0; i < pending.length; i++) {
      const g = document.scene.groups.find((g) => g.id === pending[i])
      g?.nodeIds.forEach((n) => ids.add(n))
      document.scene.groups
        .filter((g) => g.parentGroup === pending[i])
        .forEach((g) => pending.push(g.id))
    }
    return [...ids].map((id) => layout.nodeById[id])
  }
  layout.containers = document.scene.groups.flatMap((g) => {
    const nodes = descendantNodes(g.id)
    if (!nodes.length) return []
    const x = Math.min(...nodes.map((n) => n.x)) - 16,
      y = Math.min(...nodes.map((n) => n.y)) - 36
    return [
      {
        id: g.id,
        label: g.label,
        kind: g.kind,
        x,
        y,
        w: Math.max(...nodes.map((n) => n.x + n.w)) - x + 16,
        h: Math.max(...nodes.map((n) => n.y + n.h)) - y + 16,
      },
    ]
  })
  const points: Array<[number, number]> = []
  for (const n of layout.nodes) {
    points.push([n.x, n.y], [n.x + n.w, n.y + n.h])
    const extent = extents?.get(n) ?? nodeTextExtent(n, document, context)
    extents?.set(n, extent)
    if (extent.left < n.x + 14 || extent.right > n.x + n.w - 14) {
      points.push([extent.left, n.y], [extent.right, n.y + n.h])
      if (!context.skipDiagnostics)
        diagnostics.push({
          ...issue('quality.text-overflow', '/spec'),
          severity: 'warning',
          subject: { kind: 'node', id: n.id },
          supportedFixes: ['resize', 'shorten-text-manually'],
        })
    }
  }
  for (const e of layout.edges) {
    points.push(...(e.routePoints ?? []), [e.startX - 8, e.startY - 8], [e.endX + 8, e.endY + 8])
    if (e.label || document.scene.routes[e.id]?.mode === 'manual')
      points.push(
        [e.labelX - e.labelWidth / 2, e.labelY - 12],
        [e.labelX + e.labelWidth / 2, e.labelY + 12],
      )
  }
  for (const c of layout.containers) points.push([c.x, c.y], [c.x + c.w, c.y + c.h])
  if (!points.length) points.push([0, 0], [160, 96])
  const padding = document.presentation.padding + 8
  const x = points.reduce((bound, p) => Math.min(bound, p[0]), Infinity) - padding,
    y = points.reduce((bound, p) => Math.min(bound, p[1]), Infinity) - padding
  const width = points.reduce((bound, p) => Math.max(bound, p[0]), -Infinity) - x + padding,
    height = points.reduce((bound, p) => Math.max(bound, p[1]), -Infinity) - y + padding
  layout.width = width
  layout.height = height
  if (!context.skipDiagnostics) {
    for (let i = 0; i < layout.nodes.length; i++) {
      const a = layout.nodes[i]
      for (let j = i + 1; j < layout.nodes.length; j++) {
        const b = layout.nodes[j]
        if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y)
          diagnostics.push({
            ...issue('quality.node-overlap', '/scene/nodes'),
            severity: 'warning',
            subject: { kind: 'node', id: a.id },
            supportedFixes: ['move'],
          })
      }
    }
    const rects = new Map(
      layout.nodes.map((n) => [n.id, { x: n.x, y: n.y, width: n.w, height: n.h } as const]),
    )
    const overlaps = (
      a: { x: number; y: number; width: number; height: number },
      b: { x: number; y: number; width: number; height: number },
    ) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    const cross = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
      (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    const segmentIntersects = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      r: { x: number; y: number; width: number; height: number },
    ) => {
      const inside = x1 >= r.x && x1 <= r.x + r.width && y1 >= r.y && y1 <= r.y + r.height
      if (inside) return true
      const corners = [
        [r.x, r.y],
        [r.x + r.width, r.y],
        [r.x + r.width, r.y + r.height],
        [r.x, r.y + r.height],
      ]
      for (let i = 0; i < 4; i++) {
        const [x3, y3] = corners[i],
          [x4, y4] = corners[(i + 1) % 4]
        const d1 = cross(x3, y3, x4, y4, x1, y1),
          d2 = cross(x3, y3, x4, y4, x2, y2),
          d3 = cross(x1, y1, x2, y2, x3, y3),
          d4 = cross(x1, y1, x2, y2, x4, y4)
        if (
          ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
          ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
        )
          return true
      }
      return false
    }
    for (const e of layout.edges) {
      const from = rects.get(e.from),
        to = rects.get(e.to)
      const points = e.routePoints ?? []
      for (let i = 1; i < points.length && from && to; i++) {
        const [x1, y1] = points[i - 1],
          [x2, y2] = points[i]
        for (const [id, rect] of rects) {
          if (id === e.from || id === e.to) continue
          if (segmentIntersects(x1, y1, x2, y2, rect)) {
            diagnostics.push({
              ...issue('quality.edge-through-node', '/scene/routes'),
              severity: 'warning',
              subject: { kind: 'edge', id: e.id },
              supportedFixes: ['move', 'set-waypoints'],
            })
            break
          }
        }
      }
      if (from && to) {
        const eps = 2
        const touches = (
          p: { x: number; y: number },
          r: { x: number; y: number; width: number; height: number },
        ) =>
          p.x >= r.x - eps &&
          p.x <= r.x + r.width + eps &&
          p.y >= r.y - eps &&
          p.y <= r.y + r.height + eps &&
          (Math.abs(p.x - r.x) <= eps ||
            Math.abs(p.x - (r.x + r.width)) <= eps ||
            Math.abs(p.y - r.y) <= eps ||
            Math.abs(p.y - (r.y + r.height)) <= eps)
        if (!touches({ x: e.startX, y: e.startY }, from) || !touches({ x: e.endX, y: e.endY }, to))
          diagnostics.push({
            ...issue('quality.edge-endpoint', '/scene/routes'),
            severity: 'warning',
            subject: { kind: 'edge', id: e.id },
            supportedFixes: ['set-waypoints'],
          })
      }
    }
    const extents = new Map(
      layout.nodes.map((n) => [n.id, nodeTextExtent(n, document, context)] as const),
    )
    for (const [id, extent] of extents) {
      const a = rects.get(id)
      if (!a) continue
      const labelRect = {
        x: extent.left,
        y: a.y,
        width: extent.right - extent.left,
        height: a.height,
      }
      for (const [other, b] of rects) {
        if (other === id || !a) continue
        if (overlaps(labelRect, b)) {
          diagnostics.push({
            ...issue('quality.label-collision', '/spec'),
            severity: 'warning',
            subject: { kind: 'node', id },
            supportedFixes: ['resize', 'move'],
          })
          break
        }
      }
    }
  }
  if (context.signal?.aborted) return failure('operation.aborted')
  return success(
    { layout, worldBounds: { x, y, width, height }, origin: { x: -x, y: -y }, diagnostics },
    diagnostics,
  )
}

/**
 * Recomputes authored placements from the seed layout. Unlocked free-layout nodes
 * move to their seeded geometry; locked nodes and their groups keep their current
 * position. Structured types keep their seed geometry (scene placements are not
 * authoritative for them) and are returned unchanged. Routes, groups and zOrder
 * are preserved. The input document is never mutated.
 */
export function relayoutScene(document: DiagramDocument): Result<DiagramScene> {
  const checked = validateDocument(document)
  if (!checked.ok) return checked
  const scene = checked.value.scene
  if (!freeTypes.has(checked.value.spec.type)) return success(structuredClone(scene))
  const seed = getAdapter(checked.value.spec.type).seedLayout(checked.value.spec)
  if (!seed.ok) return seed
  const nodes: DiagramScene['nodes'] = {}
  for (const node of seed.value.nodes) {
    const placement = scene.nodes[node.id]
    nodes[node.id] = isNodeLocked(checked.value, node.id)
      ? placement
        ? { ...placement }
        : { x: node.x, y: node.y, width: node.w, height: node.h, locked: false }
      : { x: node.x, y: node.y, width: node.w, height: node.h, locked: placement?.locked ?? false }
  }
  return success({
    mode: 'manual',
    nodes,
    routes: structuredClone(scene.routes),
    groups: structuredClone(scene.groups),
    zOrder: [...scene.zOrder],
  })
}
