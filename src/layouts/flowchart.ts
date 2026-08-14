// Flowchart layout: nodes arranged in columns ("levels"), main flow top-down
// (or left-right), with vertical bezier links between levels. Levels are
// computed by a topological pass unless the author pins `level` explicitly.

import type { DiagramEdge, FlowchartDiagramSpec } from '../types'
import {
  CANVAS_W,
  CARD_W,
  FLOW_GAP_X,
  FLOW_GAP_Y,
  CONTENT_TOP,
  EDGE_STROKE_WIDTH,
} from '../theme'
import {
  connectY,
  edgeId,
  labelPillWidth,
  nodeHeight,
  type DiagramLayout,
  type PlacedEdge,
  type PlacedNode,
} from '../layout'

const MARGIN = 80
const BOTTOM_PAD = 64

/** Assign each node a column index by topological order from the sources. */
export function topologicalLevels(
  nodes: Array<{ id: string }>,
  edges: DiagramEdge[],
): Map<string, number> {
  const indegree = new Map<string, number>()
  const out = new Map<string, string[]>()

  for (const node of nodes) {
    indegree.set(node.id, 0)
    out.set(node.id, [])
  }
  for (const edge of edges) {
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1)
    const targets = out.get(edge.from)
    if (targets) targets.push(edge.to)
    else out.set(edge.from, [edge.to])
  }

  const level = new Map<string, number>()
  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0)
  let assigned = 0

  while (queue.length > 0) {
    const current = queue.shift() as { id: string }
    const currentLevel = level.get(current.id) ?? 0
    assigned += 1

    for (const target of out.get(current.id) ?? []) {
      const next = indegree.get(target) ?? 0
      indegree.set(target, next - 1)
      const existing = level.get(target)
      if (existing === undefined || currentLevel + 1 > existing) {
        level.set(target, currentLevel + 1)
      }
      if (next - 1 === 0) queue.push({ id: target })
    }
  }

  // Orphan nodes (isolated) end up in level 0; nodes in cycles get a level
  // assigned by the first visit order so the layout never throws.
  if (assigned < nodes.length) {
    const seen = new Set(level.keys())
    let fallback = 0
    for (const node of nodes) {
      if (!seen.has(node.id)) level.set(node.id, fallback++)
    }
  }

  return level
}

export function layoutFlowchart(spec: FlowchartDiagramSpec): DiagramLayout {
  const levelOf =
    spec.level !== undefined
      ? new Map<string, number>(spec.nodes.map((node) => [node.id, spec.level as number]))
      : topologicalLevels(spec.nodes, spec.edges)
  const direction = spec.direction ?? 'top-down'
  const horizontal = direction === 'left-right'

  const columns = new Map<number, PlacedNode[]>()
  for (const node of spec.nodes) {
    const level = levelOf.get(node.id) ?? 0
    const members = columns.get(level) ?? []
    members.push({
      ...node,
      band: level,
      w: CARD_W,
      h: nodeHeight(node),
      x: 0,
      y: 0,
      cx: 0,
      cy: 0,
    })
    columns.set(level, members)
  }

  const columnCount = Math.max(1, ...columns.keys()) + 1
  const rowsPerColumn = (index: number) => columns.get(index)?.length ?? 0
  const maxRow = Math.max(1, ...[...columns.keys()].map(rowsPerColumn))

  const mainSpan = columnCount * (CARD_W + FLOW_GAP_X)
  const crossSpan = maxRow * (CARD_W + FLOW_GAP_Y)
  const width = horizontal ? crossSpan + FLOW_GAP_X + MARGIN * 2 : Math.max(CANVAS_W, mainSpan + MARGIN * 2)
  const height = horizontal
    ? Math.max(CANVAS_W * 0.55, mainSpan + BOTTOM_PAD + CONTENT_TOP)
    : crossSpan + FLOW_GAP_Y + BOTTOM_PAD + CONTENT_TOP

  const nodes: PlacedNode[] = []
  for (const [level, members] of columns) {
    members.forEach((node, index) => {
      const origin = horizontal ? level * (CARD_W + FLOW_GAP_Y) : level * (CARD_W + FLOW_GAP_X)
      const cross = horizontal ? index * (CARD_W + FLOW_GAP_X) : index * (CARD_W + FLOW_GAP_Y)
      const crossCentre = horizontal
        ? MARGIN + (crossSpan - CARD_W) / 2
        : CONTENT_TOP + (crossSpan - CARD_W) / 2

      const x = horizontal ? crossCentre + cross - CARD_W / 2 : MARGIN + origin
      const y = horizontal ? MARGIN + origin - node.h / 2 : crossCentre + cross - node.h / 2
      const cx = x + CARD_W / 2
      const cy = y + node.h / 2
      nodes.push({ ...node, x, y, cx, cy })
    })
  }

  const nodeById: Record<string, PlacedNode> = {}
  for (const node of nodes) nodeById[node.id] = node

  const edges: PlacedEdge[] = []
  for (const edge of spec.edges) {
    const from = nodeById[edge.from]
    const to = nodeById[edge.to]
    if (!from || !to) continue

    const variant = edge.variant ?? 'main'
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0
    let d: string
    let startX: number
    let startY: number
    let endX: number
    let endY: number

    if ((levelOf.get(from.id) ?? 0) === (levelOf.get(to.id) ?? 0)) {
      // Same column: side loop.
      const rightward = to.x > from.x
      startX = rightward ? from.x + from.w : from.x
      startY = from.cy
      endX = rightward ? to.x : to.x + to.w
      endY = to.cy
      const lane = rightward ? Math.max(from.x + from.w, to.x) + FLOW_GAP_X / 2 : Math.min(from.x, to.x + to.w) - FLOW_GAP_X / 2
      d = `M ${startX} ${startY} Q ${lane} ${startY}, ${lane} ${endY} T ${endX} ${endY}`
    } else {
      // Different columns: vertical bezier through the gap midpoint.
      const moving = to.x > from.x
      if (horizontal) {
        startX = moving ? from.x + from.w : from.x
        startY = from.cy
        endX = moving ? to.x : to.x + to.w
        endY = to.cy
        const controlX = (startX + endX) / 2
        d = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`
      } else {
        const movingDown = to.y > from.y
        startX = from.cx
        startY = movingDown ? from.y + from.h : from.y
        endX = to.cx
        endY = movingDown ? to.y : to.y + to.h
        const controlY = Math.abs(endY - startY) * 0.5
        d = `M ${startX} ${startY} C ${startX} ${startY + controlY}, ${endX} ${endY - controlY}, ${endX} ${endY}`
      }
    }

    edges.push({
      ...edge,
      id: edgeId(edge),
      variant,
      d,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide: horizontal ? (endX > startX ? 'right' : 'left') : endY > startY ? 'bottom' : 'top',
      toSide: horizontal ? (endX > startX ? 'left' : 'right') : endY > startY ? 'top' : 'bottom',
    })
  }

  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById }
}

export { connectY, EDGE_STROKE_WIDTH }
