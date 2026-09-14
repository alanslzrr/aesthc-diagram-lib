// Flowchart layout: topological levels rendered as rows (top-down, the
// default) or columns (left-right). Back edges — cycle closers such as a
// rollback returning to the trigger — are excluded from levelling and routed
// around the content on an outer feedback lane; skip edges (spanning more
// than one level) travel a side lane so they never cross intermediate cards.

import type { DiagramEdge, FlowchartDiagramSpec } from '../types'
import { CARD_W, CONTENT_TOP, EDGE_STROKE_WIDTH, FLOW_GAP_X, FLOW_GAP_Y, LANE_R } from '../theme'
import {
  connectY,
  edgeId,
  identifyEdges,
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
  spec = { ...spec, edges: identifyEdges(spec.edges) }
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
  const nearLaneSpan = back.length > 0 ? OUTER_LANE_GAP + (back.length - 1) * OUTER_LANE_STEP : 0
  const farLaneSpan =
    skipEdges.length > 0 ? OUTER_LANE_GAP + (skipEdges.length - 1) * OUTER_LANE_STEP : 0

  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}

  if (!horizontal) {
    // ── Top-down: levels are rows ────────────────────────────────────────────
    const rowWidth = (members: PlacedNode[]) =>
      members.length * CARD_W + (members.length - 1) * FLOW_GAP_X
    const contentW = Math.max(
      CARD_W,
      ...levelIndices.map((index) => rowWidth(levels.get(index) ?? [])),
    )
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
  const contentH = Math.max(
    CARD_W / 2,
    ...levelIndices.map((index) => columnHeight(levels.get(index) ?? [])),
  )
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
        ? outerLaneHorizontal(from, to, lanes.nearLaneX + laneOffset, 'near', nodes)
        : outerLaneVertical(from, to, lanes.nearLaneX + laneOffset, 'near', nodes)
    } else if (Math.abs(levelDelta) > 1) {
      const laneOffset = farLaneUsed++ * 26
      placed = lanes.horizontal
        ? outerLaneHorizontal(from, to, lanes.farLaneX + laneOffset, 'far', nodes)
        : outerLaneVertical(from, to, lanes.farLaneX + laneOffset, 'far', nodes)
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

const JOG = 28

/** Does any other node in `node`'s row sit horizontally between x1 and x2? */
function rowBlocked(node: PlacedNode, nodes: PlacedNode[], x1: number, x2: number): boolean {
  const [lo, hi] = x1 < x2 ? [x1, x2] : [x2, x1]
  return nodes.some(
    (other) =>
      other.id !== node.id &&
      Math.abs(other.cy - node.cy) < (other.h + node.h) / 2 &&
      other.x + other.w > lo &&
      other.x < hi,
  )
}

/** Does any other node in `node`'s column sit vertically between y1 and y2? */
function columnBlocked(node: PlacedNode, nodes: PlacedNode[], y1: number, y2: number): boolean {
  const [lo, hi] = y1 < y2 ? [y1, y2] : [y2, y1]
  return nodes.some(
    (other) =>
      other.id !== node.id &&
      Math.abs(other.cx - node.cx) < (other.w + node.w) / 2 &&
      other.y + other.h > lo &&
      other.y < hi,
  )
}

/**
 * Top-down outer lane: exit the source toward a vertical lane, travel it,
 * enter the target. When a same-row sibling blocks the straight exit or
 * entry, the path jogs through the clear corridor above/below the row first.
 */
function outerLaneVertical(
  from: PlacedNode,
  to: PlacedNode,
  laneX: number,
  side: 'near' | 'far',
  nodes: PlacedNode[],
): ReturnType<typeof laneShape> {
  const left = side === 'near'
  const movingUp = to.cy < from.cy
  const sideOf = left ? 'left' : ('right' as const)

  const exitX = left ? from.x : from.x + from.w
  const exitY = connectY(from, sideOf)
  let head: Array<[number, number]>
  let fromSide: PlacedEdge['fromSide'] = sideOf
  if (rowBlocked(from, nodes, exitX, laneX)) {
    const jogY = movingUp ? from.y - JOG : from.y + from.h + JOG
    head = [
      [from.cx, movingUp ? from.y : from.y + from.h],
      [from.cx, jogY],
      [laneX, jogY],
    ]
    fromSide = movingUp ? 'top' : 'bottom'
  } else {
    head = [
      [exitX, exitY],
      [laneX, exitY],
    ]
  }

  const entryX = left ? to.x : to.x + to.w
  const entryY = connectY(to, sideOf)
  let tail: Array<[number, number]>
  let toSide: PlacedEdge['toSide'] = sideOf
  if (rowBlocked(to, nodes, laneX, entryX)) {
    const jogY = movingUp ? to.y + to.h + JOG : to.y - JOG
    tail = [
      [laneX, jogY],
      [to.cx, jogY],
      [to.cx, movingUp ? to.y + to.h : to.y],
    ]
    toSide = movingUp ? 'bottom' : 'top'
  } else {
    tail = [
      [laneX, entryY],
      [entryX, entryY],
    ]
  }

  return laneShape(
    [...head, ...tail],
    fromSide,
    toSide,
    laneX,
    (head[head.length - 1][1] + tail[0][1]) / 2,
  )
}

/** Left-right outer lane: the transposed twin of outerLaneVertical. */
function outerLaneHorizontal(
  from: PlacedNode,
  to: PlacedNode,
  laneY: number,
  side: 'near' | 'far',
  nodes: PlacedNode[],
): ReturnType<typeof laneShape> {
  const top = side === 'near'
  const movingLeft = to.cx < from.cx
  const sideOf = top ? 'top' : ('bottom' as const)

  const exitY = top ? from.y : from.y + from.h
  let head: Array<[number, number]>
  let fromSide: PlacedEdge['fromSide'] = sideOf
  if (columnBlocked(from, nodes, exitY, laneY)) {
    const jogX = movingLeft ? from.x - JOG : from.x + from.w + JOG
    head = [
      [movingLeft ? from.x : from.x + from.w, from.cy],
      [jogX, from.cy],
      [jogX, laneY],
    ]
    fromSide = movingLeft ? 'left' : 'right'
  } else {
    head = [
      [from.cx, exitY],
      [from.cx, laneY],
    ]
  }

  const entryY = top ? to.y : to.y + to.h
  let tail: Array<[number, number]>
  let toSide: PlacedEdge['toSide'] = sideOf
  if (columnBlocked(to, nodes, laneY, entryY)) {
    const jogX = movingLeft ? to.x + to.w + JOG : to.x - JOG
    tail = [
      [jogX, laneY],
      [jogX, to.cy],
      [movingLeft ? to.x + to.w : to.x, to.cy],
    ]
    toSide = movingLeft ? 'right' : 'left'
  } else {
    tail = [
      [to.cx, laneY],
      [to.cx, entryY],
    ]
  }

  return laneShape(
    [...head, ...tail],
    fromSide,
    toSide,
    (head[head.length - 1][0] + tail[0][0]) / 2,
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
