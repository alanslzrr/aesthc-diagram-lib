// Flowchart layout: topological levels rendered as rows (top-down, the
// default) or columns (left-right). Back edges — cycle closers such as a
// rollback returning to the trigger — are excluded from levelling and routed
// around the content on an outer feedback lane; skip edges (spanning more
// than one level) travel a side lane so they never cross intermediate cards.

import type { DiagramEdge, FlowchartDiagramSpec } from '../types'
import {
  CARD_W,
  CONTENT_TOP,
  EDGE_STROKE_WIDTH,
  FLOW_GAP_X,
  FLOW_GAP_Y,
  LANE_R,
} from '../theme'
import {
  connectY,
  edgeId,
  labelPillWidth,
  nodeHeight,
  roundedPolyline,
  splitBackEdges,
  type DiagramLayout,
  type PlacedEdge,
  type PlacedNode,
} from '../layout'

const MARGIN_X = 72
const BOTTOM_PAD = 64
/** Distance of the first outer lane (feedback / skip edges) from the content. */
const OUTER_LANE_GAP = 56
/** Spacing between stacked outer lanes. */
const OUTER_LANE_STEP = 26

/** Assign each node a level by longest path from the (acyclic) sources. */
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

  // Orphan nodes (isolated) end up in level 0; anything left over (should not
  // happen once back edges are split out) gets a level by authored order so
  // the layout never throws.
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
  const { forward, back } = splitBackEdges(spec.nodes, spec.edges)
  const levelOf =
    spec.level !== undefined
      ? new Map<string, number>(spec.nodes.map((node) => [node.id, spec.level as number]))
      : topologicalLevels(spec.nodes, forward)
  const direction = spec.direction ?? 'top-down'
  const horizontal = direction === 'left-right'

  // Group nodes into levels, preserving authored order inside each level.
  const levels = new Map<number, PlacedNode[]>()
  for (const node of spec.nodes) {
    const level = levelOf.get(node.id) ?? 0
    const members = levels.get(level) ?? []
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
    levels.set(level, members)
  }
  const levelIndices = [...levels.keys()].sort((a, b) => a - b)

  // Outer lanes: back edges on the near side (left / top), skip edges on the
  // far side (right / bottom). Reserve margin for however many lanes exist.
  const skipEdges = forward.filter(
    (edge) => Math.abs((levelOf.get(edge.to) ?? 0) - (levelOf.get(edge.from) ?? 0)) > 1,
  )
  const nearLaneSpan =
    back.length > 0 ? OUTER_LANE_GAP + (back.length - 1) * OUTER_LANE_STEP : 0
  const farLaneSpan =
    skipEdges.length > 0 ? OUTER_LANE_GAP + (skipEdges.length - 1) * OUTER_LANE_STEP : 0

  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}

  if (!horizontal) {
    // ── Top-down: levels are rows ────────────────────────────────────────────
    const rowWidth = (members: PlacedNode[]) =>
      members.length * CARD_W + (members.length - 1) * FLOW_GAP_X
    const contentW = Math.max(...levelIndices.map((index) => rowWidth(levels.get(index) ?? [])))
    const originX = MARGIN_X + nearLaneSpan
    const width = originX + contentW + farLaneSpan + MARGIN_X

    let y = CONTENT_TOP
    for (const index of levelIndices) {
      const members = levels.get(index) ?? []
      const rowH = Math.max(...members.map((member) => member.h))
      const totalW = rowWidth(members)
      members.forEach((member, position) => {
        const x = originX + (contentW - totalW) / 2 + position * (CARD_W + FLOW_GAP_X)
        const cy = y + rowH / 2 + (member.nudge ?? 0)
        const placed = {
          ...member,
          x,
          y: cy - member.h / 2,
          cx: x + CARD_W / 2,
          cy,
        }
        nodes.push(placed)
        nodeById[placed.id] = placed
      })
      y += rowH + FLOW_GAP_Y
    }
    const height = y - FLOW_GAP_Y + BOTTOM_PAD

    const edges = placeFlowEdges(spec, nodes, nodeById, levelOf, back, {
      horizontal: false,
      nearLaneX: originX - OUTER_LANE_GAP,
      farLaneX: originX + contentW + OUTER_LANE_GAP,
    })
    return { width, height, nodes, edges, decisions: [], continuations: [], nodeById }
  }

  // ── Left-right: levels are columns ─────────────────────────────────────────
  const columnHeight = (members: PlacedNode[]) =>
    members.reduce((sum, member) => sum + member.h, 0) + (members.length - 1) * FLOW_GAP_Y
  const contentH = Math.max(...levelIndices.map((index) => columnHeight(levels.get(index) ?? [])))
  const originY = CONTENT_TOP + nearLaneSpan
  const height = originY + contentH + farLaneSpan + BOTTOM_PAD

  let x = MARGIN_X
  for (const index of levelIndices) {
    const members = levels.get(index) ?? []
    const totalH = columnHeight(members)
    let memberY = originY + (contentH - totalH) / 2
    for (const member of members) {
      const cy = memberY + member.h / 2 + (member.nudge ?? 0)
      const placed = {
        ...member,
        x,
        y: cy - member.h / 2,
        cx: x + CARD_W / 2,
        cy,
      }
      nodes.push(placed)
      nodeById[placed.id] = placed
      memberY += member.h + FLOW_GAP_Y
    }
    x += CARD_W + FLOW_GAP_X
  }
  const width = x - FLOW_GAP_X + MARGIN_X

  const edges = placeFlowEdges(spec, nodes, nodeById, levelOf, back, {
    horizontal: true,
    nearLaneX: originY - OUTER_LANE_GAP,
    farLaneX: originY + contentH + OUTER_LANE_GAP,
  })
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById }
}

interface FlowLaneContext {
  horizontal: boolean
  /** Outer lane coordinate on the near side (x for top-down, y for left-right). */
  nearLaneX: number
  /** Outer lane coordinate on the far side. */
  farLaneX: number
}

function placeFlowEdges(
  spec: FlowchartDiagramSpec,
  nodes: PlacedNode[],
  nodeById: Record<string, PlacedNode>,
  levelOf: Map<string, number>,
  back: DiagramEdge[],
  lanes: FlowLaneContext,
): PlacedEdge[] {
  const backSet = new Set(back)
  const edges: PlacedEdge[] = []
  let nearLaneUsed = 0
  let farLaneUsed = 0

  for (const edge of spec.edges) {
    const from = nodeById[edge.from]
    const to = nodeById[edge.to]
    if (!from || !to) continue

    const variant = edge.variant ?? 'main'
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0
    const levelDelta = (levelOf.get(to.id) ?? 0) - (levelOf.get(from.id) ?? 0)
    const isBack = backSet.has(edge)

    let placed: Omit<PlacedEdge, keyof DiagramEdge | 'id' | 'variant' | 'labelWidth'> & {
      labelX: number
      labelY: number
    }

    if (isBack) {
      const laneOffset = nearLaneUsed++ * -26
      placed = lanes.horizontal
        ? outerLaneHorizontal(from, to, lanes.nearLaneX + laneOffset, 'near')
        : outerLaneVertical(from, to, lanes.nearLaneX + laneOffset, 'near')
    } else if (Math.abs(levelDelta) > 1) {
      const laneOffset = farLaneUsed++ * 26
      placed = lanes.horizontal
        ? outerLaneHorizontal(from, to, lanes.farLaneX + laneOffset, 'far')
        : outerLaneVertical(from, to, lanes.farLaneX + laneOffset, 'far')
    } else if (levelDelta === 0) {
      // Same level: short bezier between facing sides.
      const rightward = to.cx > from.cx || (!lanes.horizontal && to.cy > from.cy)
      if (lanes.horizontal) {
        const movingDown = to.cy > from.cy
        const startY = movingDown ? from.y + from.h : from.y
        const endY = movingDown ? to.y : to.y + to.h
        const controlY = (startY + endY) / 2
        placed = {
          d: `M ${from.cx} ${startY} C ${from.cx} ${controlY}, ${to.cx} ${controlY}, ${to.cx} ${endY}`,
          labelX: (from.cx + to.cx) / 2,
          labelY: (startY + endY) / 2,
          startX: from.cx,
          startY,
          endX: to.cx,
          endY,
          fromSide: movingDown ? 'bottom' : 'top',
          toSide: movingDown ? 'top' : 'bottom',
        }
      } else {
        const startX = rightward ? from.x + from.w : from.x
        const endX = rightward ? to.x : to.x + to.w
        const controlX = (startX + endX) / 2
        placed = {
          d: `M ${startX} ${from.cy} C ${controlX} ${from.cy}, ${controlX} ${to.cy}, ${endX} ${to.cy}`,
          labelX: (startX + endX) / 2,
          labelY: (from.cy + to.cy) / 2,
          startX,
          startY: from.cy,
          endX,
          endY: to.cy,
          fromSide: rightward ? 'right' : 'left',
          toSide: rightward ? 'left' : 'right',
        }
      }
    } else if (lanes.horizontal) {
      // Adjacent columns: horizontal bezier.
      const startX = from.x + from.w
      const endX = to.x
      const controlX = (startX + endX) / 2
      placed = {
        d: `M ${startX} ${from.cy} C ${controlX} ${from.cy}, ${controlX} ${to.cy}, ${endX} ${to.cy}`,
        labelX: (startX + endX) / 2,
        labelY: (from.cy + to.cy) / 2,
        startX,
        startY: from.cy,
        endX,
        endY: to.cy,
        fromSide: 'right',
        toSide: 'left',
      }
    } else {
      // Adjacent rows: vertical bezier.
      const startY = from.y + from.h
      const endY = to.y
      const controlY = Math.abs(endY - startY) * 0.5
      placed = {
        d: `M ${from.cx} ${startY} C ${from.cx} ${startY + controlY}, ${to.cx} ${endY - controlY}, ${to.cx} ${endY}`,
        labelX: (from.cx + to.cx) / 2,
        labelY: (startY + endY) / 2,
        startX: from.cx,
        startY,
        endX: to.cx,
        endY,
        fromSide: 'bottom',
        toSide: 'top',
      }
    }

    edges.push({
      ...edge,
      id: edgeId(edge),
      variant,
      labelWidth,
      arrowEnd: isBack || Math.abs(levelDelta) > 1 ? true : undefined,
      ...placed,
    })
  }

  return edges
}

/** Top-down outer lane: exit the side of the source, travel a vertical lane, enter the side of the target. */
function outerLaneVertical(
  from: PlacedNode,
  to: PlacedNode,
  laneX: number,
  side: 'near' | 'far',
): ReturnType<typeof laneShape> {
  const left = side === 'near'
  const startX = left ? from.x : from.x + from.w
  const endX = left ? to.x : to.x + to.w
  const startY = connectY(from, left ? 'left' : 'right')
  const endY = connectY(to, left ? 'left' : 'right')
  return laneShape(
    [
      [startX, startY],
      [laneX, startY],
      [laneX, endY],
      [endX, endY],
    ],
    left ? 'left' : 'right',
    left ? 'left' : 'right',
    laneX,
    (startY + endY) / 2,
  )
}

/** Left-right outer lane: exit top/bottom, travel a horizontal lane, enter top/bottom. */
function outerLaneHorizontal(
  from: PlacedNode,
  to: PlacedNode,
  laneY: number,
  side: 'near' | 'far',
): ReturnType<typeof laneShape> {
  const top = side === 'near'
  const startY = top ? from.y : from.y + from.h
  const endY = top ? to.y : to.y + to.h
  return laneShape(
    [
      [from.cx, startY],
      [from.cx, laneY],
      [to.cx, laneY],
      [to.cx, endY],
    ],
    top ? 'top' : 'bottom',
    top ? 'top' : 'bottom',
    (from.cx + to.cx) / 2,
    laneY,
  )
}

function laneShape(
  points: Array<[number, number]>,
  fromSide: PlacedEdge['fromSide'],
  toSide: PlacedEdge['toSide'],
  labelX: number,
  labelY: number,
) {
  const [startX, startY] = points[0]
  const [endX, endY] = points[points.length - 1]
  return {
    d: roundedPolyline(points, LANE_R),
    labelX,
    labelY,
    startX,
    startY,
    endX,
    endY,
    fromSide,
    toSide,
    routePoints: points,
  }
}

export { connectY, EDGE_STROKE_WIDTH }
