import { nodeGeometry } from '../geometry/node'
import { estimateTextWidth, type TextRole } from '../geometry/text'
import { labelPillWidth, roundedPolyline } from '../layout'
import type { PlacedNode, PlacedEdge } from '../layout'
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
export function anchorPoint(rect: { x: number; y: number; width: number; height: number }, port: EndpointAnchor): Point {
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
    { side: 'top', offset: clamp((point.x - rect.x) / rect.width), distance: Math.abs(point.y - rect.y) },
    {
      side: 'bottom',
      offset: clamp((point.x - rect.x) / rect.width),
      distance: Math.abs(point.y - (rect.y + rect.height)),
    },
    { side: 'left', offset: clamp((point.y - rect.y) / rect.height), distance: Math.abs(point.x - rect.x) },
    {
      side: 'right',
      offset: clamp((point.y - rect.y) / rect.height),
      distance: Math.abs(point.x - (rect.x + rect.width)),
    },
  ]
  candidates.sort((a, b) => a.distance - b.distance)
  return { side: candidates[0].side, offset: candidates[0].offset }
}
export function resolveDocument(
  document: DiagramDocument,
  context: ResolveContext,
): Result<ResolvedScene> {
  if (context.signal?.aborted) return failure('operation.aborted')
  const checked = validateDocument(document)
  if (!checked.ok) return checked
  const seed = getAdapter(document.spec.type).seedLayout(document.spec)
  if (!seed.ok) return seed
  const layout = seed.value,
    diagnostics: Diagnostic[] = []
  if (!freeTypes.has(document.spec.type))
    return success({
      layout,
      worldBounds: { x: 0, y: 0, width: layout.width, height: layout.height },
      origin: { x: 0, y: 0 },
      diagnostics,
    })
  for (const node of layout.nodes) {
    const placement = document.scene.nodes[node.id]
    if (placement)
      Object.assign(node, {
        x: placement.x,
        y: placement.y,
        w: placement.width,
        h: placement.height,
        cx: placement.x + placement.width / 2,
        cy: placement.y + placement.height / 2,
      })
  }
  layout.nodes.sort(
    (a, b) => document.scene.zOrder.indexOf(a.id) - document.scene.zOrder.indexOf(b.id),
  )
  layout.nodeById = Object.fromEntries(layout.nodes.map((n) => [n.id, n]))
  const parallel = new Map<string, number>()
  layout.edges = edgesOf(document.spec).map((edge): PlacedEdge => {
    const from = layout.nodeById[edge.from],
      to = layout.nodeById[edge.to],
      route = document.scene.routes[edge.id!]
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
      const authored = document.spec.edges.find((e) => e.id === edge.id)!
      const sp = document.spec.nodes
        .find((n) => n.id === edge.from)
        ?.ports?.find((p) => p.id === authored.sourcePort)
      const tp = document.spec.nodes
        .find((n) => n.id === edge.to)
        ?.ports?.find((p) => p.id === authored.targetPort)
      if (sp) source = sp
      if (tp) target = tp
    }
    if (edge.from === edge.to && route?.mode !== 'manual') {
      source = { side: 'right', offset: 0.3 }
      target = { side: 'right', offset: 0.7 }
    }
    const start = anchor(from, source),
      end = anchor(to, target)
    const key = JSON.stringify([edge.from, edge.to]),
      ordinal = parallel.get(key) ?? 0
    parallel.set(key, ordinal + 1)
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
  const measure = (value: string, role: TextRole) =>
    (context.measureText ?? estimateTextWidth)(value, role)
  for (const n of layout.nodes) {
    points.push([n.x, n.y], [n.x + n.w, n.y + n.h])
    const labelRole: TextRole = { size: 14.5, family: 'Geist', charFactor: 13 / 14.5 }
    const kindRole: TextRole = { size: 11.25, family: 'Geist Mono', charFactor: 10 / 11.25, tracking: 1.6 }
    const sublabelRole: TextRole = { size: 11.25, family: 'Geist Mono', charFactor: 11 / 11.25 }
    const fieldRole: TextRole = { size: 11, family: 'Geist Mono', charFactor: 1 }
    const fieldAnnotationRole: TextRole = { size: 10, family: 'Geist Mono', charFactor: 1 }
    const textWidth = Math.max(
      measure(n.label, labelRole),
      measure((n.kind ?? '').toUpperCase(), kindRole),
      measure(n.sublabel ?? '', sublabelRole),
      ...(n.fields ?? []).map((f) => {
        const annotation = [f.type, f.key === 'unique' ? 'unique' : null].filter(Boolean).join(' · ')
        return (
          measure(f.name, fieldRole) +
          (annotation ? measure(` ${annotation}`, fieldAnnotationRole) : 0)
        )
      }),
    ) * document.presentation.textScale
    const geometry = nodeGeometry(n, !!document.metadata.visuals[n.id])
    const textLeft =
      n.shape === 'table'
        ? n.x + 14
        : geometry.centeredLabel
          ? n.cx - textWidth / 2
          : geometry.textX
    const textRight = textLeft + textWidth
    if (textLeft < n.x + 14 || textRight > n.x + n.w - 14) {
      points.push([textLeft, n.y], [textRight, n.y + n.h])
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
  if (context.signal?.aborted) return failure('operation.aborted')
  return success(
    { layout, worldBounds: { x, y, width, height }, origin: { x: -x, y: -y }, diagnostics },
    diagnostics,
  )
}
