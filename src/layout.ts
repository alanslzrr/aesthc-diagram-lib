// Common geometry contract for every diagram layout.
//
// Each per-type layout converts its authored spec into this normalized
// `DiagramLayout`: pixel geometry plus SVG path strings, with no React or DOM
// measurement. The SVG canvas only knows about this shape, so adding a new
// diagram type is a matter of writing one layout function.

import type {
  DiagramContinuation,
  DiagramDecision,
  DiagramEdge,
  DiagramNode,
  DiagramSpec,
  EdgeVariant,
  LegacyBandSpec,
  PortSide,
} from './types'
import {
  CARD_H_FULL,
  CARD_H_SLIM,
  DIMMED_OPACITY,
  LABEL_CHAR_WIDTH,
  LABEL_HORIZONTAL_PADDING,
  LANE_R,
} from './theme'

/** Vertical attachment point for a port on a given side. */
export interface NodePort {
  side: PortSide
  x: number
  y: number
  variant: EdgeVariant
}

export interface PlacedNode extends DiagramNode {
  slot?: number
  /** Logical column/group index: band column, flowchart level, swimlane row… */
  band: number
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
}

export interface PlacedEdge extends DiagramEdge {
  id: string
  variant: EdgeVariant
  d: string
  labelX: number
  labelY: number
  labelWidth: number
  startX: number
  startY: number
  endX: number
  endY: number
  fromSide: PortSide
  toSide: PortSide
  routePoints?: Array<[number, number]>
  /** Draw a chevron arrowhead at the path end (sequence messages, transitions…). */
  arrowEnd?: boolean
  /** Per-edge stroke override; defaults to EDGE_STROKE_WIDTH. */
  strokeWidth?: number
}

export interface PlacedDecision extends DiagramDecision {
  x: number
  y: number
  width: number
}

export interface PlacedContinuation extends DiagramContinuation {
  variant: EdgeVariant
  displayLabel: string
  d: string
  sourceX: number
  sourceY: number
  endX: number
  endY: number
  labelX: number
  labelY: number
  labelWidth: number
}

/** Labelled region drawn behind nodes, e.g. a swimlane row. */
export interface PlacedContainer {
  id: string
  label: string
  kind?: string
  x: number
  y: number
  w: number
  h: number
  variant?: EdgeVariant
}

/** Vertical dashed lifeline for sequence participants. */
export interface PlacedLifeline {
  id: string
  label: string
  kind?: string
  x: number
  y0: number
  y1: number
}

export interface Adjacency {
  out: Map<string, string[]>
  in: Map<string, string[]>
  /** Relation identities grouped by encoded endpoints. */
  relations?: Map<string, string[]>
}

export interface Highlight {
  nodes: Set<string>
  edges: Set<string>
}

export interface DiagramLayout {
  width: number
  height: number
  nodes: PlacedNode[]
  edges: PlacedEdge[]
  decisions: PlacedDecision[]
  continuations: PlacedContinuation[]
  containers?: PlacedContainer[]
  lifelines?: PlacedLifeline[]
  nodeById: Record<string, PlacedNode>
}

export const edgeId = (edge: Pick<DiagramEdge, 'from' | 'to' | 'id'>): string =>
  edge.id ?? `${encodeURIComponent(edge.from)}::${encodeURIComponent(edge.to)}`

/** Preserve explicit IDs; assign unique deterministic IDs to anonymous edges.
 * Anonymous parallel identities follow authored order. Use explicit IDs when reordering.
 */
export function identifyEdges<T extends DiagramEdge>(edges: T[]): Array<T & { id: string }> {
  const used = new Set<string>()
  for (const edge of edges) {
    if (edge.id === undefined) continue
    if (used.has(edge.id)) throw new Error(`Duplicate relation id: ${edge.id}`)
    used.add(edge.id)
  }
  return edges.map((edge) => {
    if (edge.id !== undefined) return { ...edge, id: edge.id }
    const base = edgeId(edge)
    let id = base
    let ordinal = 1
    while (used.has(id)) id = `${base}::${++ordinal}`
    used.add(id)
    return { ...edge, id }
  })
}

export const labelPillWidth = (label: string): number =>
  label.length * LABEL_CHAR_WIDTH + LABEL_HORIZONTAL_PADDING

export const nodeHeight = (node: Pick<DiagramNode, 'sublabel'>): number =>
  node.sublabel ? CARD_H_FULL : CARD_H_SLIM

export const isMutedNode = (node: Pick<PlacedNode, 'weight'>): boolean => node.weight === 'muted'

/**
 * Vertical attachment point for a port on a given side. A muted node has no
 * card rect — only a bottom rule — so a horizontal (`left`/`right`) approach,
 * and a vertical approach from below (a `bottom` port), both land on that
 * rule (`y + h`): it is the only thing actually drawn there. A vertical
 * approach from above (a `top` port) must stop at the top of the node's own
 * text block (`y`) instead — continuing down to the rule would draw straight
 * through the card's kind label and title.
 */
export const connectY = (node: PlacedNode, side: PortSide): number => {
  if (isMutedNode(node)) return side === 'top' ? node.y : node.y + node.h
  if (side === 'top') return node.y
  if (side === 'bottom') return node.y + node.h
  return node.cy
}

/** Orthogonal polyline through waypoints with rounded corners. */
export function roundedPolyline(pts: Array<[number, number]>, r = LANE_R): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [px, py] = pts[i - 1]
    const [cx, cy] = pts[i]
    const [nx, ny] = pts[i + 1]
    const inLen = Math.hypot(cx - px, cy - py)
    const outLen = Math.hypot(nx - cx, ny - cy)
    if (inLen === 0 || outLen === 0) continue
    const rr = Math.min(r, inLen / 2, outLen / 2)
    const t1x = cx + ((px - cx) / inLen) * rr
    const t1y = cy + ((py - cy) / inLen) * rr
    const t2x = cx + ((nx - cx) / outLen) * rr
    const t2y = cy + ((ny - cy) / outLen) * rr
    d += ` L ${t1x} ${t1y} Q ${cx} ${cy}, ${t2x} ${t2y}`
  }
  const last = pts[pts.length - 1]
  d += ` L ${last[0]} ${last[1]}`
  return d
}

/**
 * Splits an edge list into forward edges and back edges (cycle closers),
 * detected with a DFS in authored order. Levelled layouts (flowchart,
 * swimlane) keep the topology acyclic for placement and route the back
 * edges around the content as feedback lanes.
 */
export function splitBackEdges(
  nodes: Array<{ id: string }>,
  edges: DiagramEdge[],
): { forward: DiagramEdge[]; back: DiagramEdge[] } {
  const out = new Map<string, DiagramEdge[]>()
  for (const node of nodes) out.set(node.id, [])
  for (const edge of edges) out.get(edge.from)?.push(edge)

  const state = new Map<string, 0 | 1 | 2>()
  const back = new Set<DiagramEdge>()

  const visit = (id: string) => {
    state.set(id, 1)
    for (const edge of out.get(id) ?? []) {
      const targetState = state.get(edge.to) ?? 0
      if (targetState === 1) back.add(edge)
      else if (targetState === 0 && out.has(edge.to)) visit(edge.to)
    }
    state.set(id, 2)
  }

  for (const node of nodes) {
    if ((state.get(node.id) ?? 0) === 0) visit(node.id)
  }

  return {
    forward: edges.filter((edge) => !back.has(edge)),
    back: edges.filter((edge) => back.has(edge)),
  }
}

export function buildAdjacency(edges: DiagramEdge[]): Adjacency {
  const out = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()
  const relations = new Map<string, string[]>()

  for (const edge of identifyEdges(edges)) {
    const key = edgeId({ from: edge.from, to: edge.to })
    const identities = relations.get(key) ?? []
    identities.push(edge.id)
    relations.set(key, identities)
    const forward = out.get(edge.from)
    if (forward) forward.push(edge.to)
    else out.set(edge.from, [edge.to])

    const backward = incoming.get(edge.to)
    if (backward) backward.push(edge.from)
    else incoming.set(edge.to, [edge.from])
  }

  return { out, in: incoming, relations }
}

/**
 * Normalizes the authored relation list of any spec type into plain edges.
 * Band/flowchart/swimlane use `edges`, sequence uses `messages`,
 * state-machine uses `transitions`, er uses `relations`, timeline has none.
 */
export function diagramEdges(spec: DiagramSpec | LegacyBandSpec): DiagramEdge[] {
  // Tolerate hand-authored specs (e.g. a live editor) where the relation
  // list is missing entirely — treat it as empty rather than crashing the
  // adjacency build downstream.
  const list = (candidate: DiagramEdge[] | undefined): DiagramEdge[] =>
    Array.isArray(candidate) ? identifyEdges(candidate) : []

  if (!('type' in spec)) return list(spec.edges)
  switch (spec.type) {
    case 'sequence':
      return list(spec.messages)
    case 'state-machine':
      return list(spec.transitions)
    case 'er':
      return list(spec.relations)
    case 'timeline':
      return []
    case 'band':
    case 'flowchart':
    case 'swimlane':
      return list(spec.edges)
    default:
      return list((spec as LegacyBandSpec).edges)
  }
}

/** Collect the full upstream and downstream control-flow path through a node. */
export function connectedIds(nodeId: string, adjacency: Adjacency): Highlight {
  const nodes = new Set<string>([nodeId])
  const edges = new Set<string>()

  const walk = (direction: 'out' | 'in') => {
    const queue = [nodeId]
    const seen = new Set<string>([nodeId])

    while (queue.length > 0) {
      const current = queue.shift() as string
      const neighbours = adjacency[direction].get(current) ?? []

      for (const next of neighbours) {
        const key =
          direction === 'out'
            ? edgeId({ from: current, to: next })
            : edgeId({ from: next, to: current })
        for (const id of adjacency.relations?.get(key) ?? [key]) edges.add(id)
        nodes.add(next)
        if (seen.has(next)) continue
        seen.add(next)
        queue.push(next)
      }
    }
  }

  walk('out')
  walk('in')

  return { nodes, edges }
}

/** Returns only real connection points; unused/hollow ports are intentionally absent. */
export function nodePorts(
  node: PlacedNode,
  edges: PlacedEdge[],
  continuations: PlacedContinuation[] = [],
): NodePort[] {
  const pointForSide = (side: PortSide): Pick<NodePort, 'side' | 'x' | 'y'> => {
    const y = connectY(node, side)
    if (side === 'left') return { side, x: node.x, y }
    if (side === 'right') return { side, x: node.x + node.w, y }
    return { side, x: node.cx, y }
  }

  const hits = new Map<string, NodePort>()
  const record = (point: Pick<NodePort, 'side' | 'x' | 'y'>, variant: EdgeVariant) => {
    const key = `${point.x}:${point.y}`
    const existing = hits.get(key)
    if (!existing || (existing.variant === 'branch' && variant === 'main')) {
      hits.set(key, { ...point, variant })
    }
  }

  for (const edge of edges) {
    if (edge.from === node.id) record(pointForSide(edge.fromSide), edge.variant)
    if (edge.to === node.id) record(pointForSide(edge.toSide), edge.variant)
  }

  for (const continuation of continuations) {
    if (continuation.from !== node.id) continue
    record(
      {
        side: continuation.side,
        x: continuation.sourceX,
        y: continuation.sourceY,
      },
      continuation.variant,
    )
  }

  return [...hits.values()]
}

/** Re-exported so consumers keep a single import site for dimming. */
export { DIMMED_OPACITY }
