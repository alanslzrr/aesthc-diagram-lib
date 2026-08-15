// Swimlane layout: horizontal labelled lanes whose nodes advance through
// global columns assigned by topological order, so the flow reads left to
// right across every lane and cross-lane handoffs are short S-curves instead
// of long backward sweeps. Lane rows are emitted as containers so the canvas
// can draw them behind the nodes.

import type { SwimlaneDiagramSpec } from '../types'
import { CARD_W, SWIMLANE_HEADER_W, SWIMLANE_PAD, SWIMLANE_ROW_PAD } from '../theme'
import {
  edgeId,
  labelPillWidth,
  nodeHeight,
  splitBackEdges,
  type DiagramLayout,
  type PlacedContainer,
  type PlacedEdge,
  type PlacedNode,
} from '../layout'
import { topologicalLevels } from './flowchart'

const TOP_PAD = 56
const BOTTOM_PAD = 56
const NODE_GAP = 96
/** Vertical spacing between stacked nodes that share a lane and a column. */
const STACK_GAP = 24

export function layoutSwimlane(spec: SwimlaneDiagramSpec): DiagramLayout {
  const laneIds = spec.lanes.map((lane) => lane.id)
  const { forward } = splitBackEdges(spec.nodes, spec.edges)
  const columnOf = topologicalLevels(spec.nodes, forward)
  const maxColumn = Math.max(0, ...columnOf.values())

  const xForColumn = (column: number): number =>
    SWIMLANE_HEADER_W + SWIMLANE_PAD + column * (CARD_W + NODE_GAP)
  const width = xForColumn(maxColumn) + CARD_W + SWIMLANE_PAD * 2

  // Group nodes by lane, then by column, so stacked cells grow the lane.
  const byLane = new Map<string, Map<number, PlacedNode[]>>()
  for (const node of spec.nodes) {
    const column = columnOf.get(node.id) ?? 0
    const laneColumns = byLane.get(node.lane) ?? new Map<number, PlacedNode[]>()
    const cell = laneColumns.get(column) ?? []
    cell.push({
      ...node,
      band: 0,
      w: CARD_W,
      h: nodeHeight(node),
      x: 0,
      y: 0,
      cx: 0,
      cy: 0,
    })
    laneColumns.set(column, cell)
    byLane.set(node.lane, laneColumns)
  }

  const laneHeights = laneIds.map((id) => {
    const laneColumns = byLane.get(id)
    if (!laneColumns) return 88
    let tallest = 0
    for (const cell of laneColumns.values()) {
      const stackH =
        cell.reduce((sum, member) => sum + member.h, 0) + (cell.length - 1) * STACK_GAP
      tallest = Math.max(tallest, stackH)
    }
    return Math.max(88, tallest + SWIMLANE_ROW_PAD)
  })

  let cursorY = TOP_PAD
  const laneTop = new Map<string, number>()
  laneIds.forEach((id, index) => {
    laneTop.set(id, cursorY)
    cursorY += laneHeights[index]
  })
  const height = cursorY + BOTTOM_PAD

  const containers: PlacedContainer[] = []
  spec.lanes.forEach((lane, index) => {
    containers.push({
      id: lane.id,
      label: lane.label,
      kind: lane.kind,
      x: 0,
      y: laneTop.get(lane.id) ?? 0,
      w: width,
      h: laneHeights[index],
    })
  })

  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}

  laneIds.forEach((laneId, laneIndex) => {
    const laneColumns = byLane.get(laneId)
    if (!laneColumns) return
    const top = laneTop.get(laneId) ?? 0
    const laneH = laneHeights[laneIndex]

    for (const [column, cell] of laneColumns) {
      const x = xForColumn(column)
      const stackH =
        cell.reduce((sum, member) => sum + member.h, 0) + (cell.length - 1) * STACK_GAP
      let memberY = top + (laneH - stackH) / 2
      for (const member of cell) {
        const cy = memberY + member.h / 2 + (member.nudge ?? 0)
        const placed: PlacedNode = {
          ...member,
          band: laneIndex,
          x,
          y: cy - member.h / 2,
          cx: x + member.w / 2,
          cy,
        }
        nodes.push(placed)
        nodeById[placed.id] = placed
        memberY += member.h + STACK_GAP
      }
    }
  })

  const edges: PlacedEdge[] = []
  for (const edge of spec.edges) {
    const from = nodeById[edge.from]
    const to = nodeById[edge.to]
    if (!from || !to) continue

    const variant = edge.variant ?? 'main'
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0
    const sameLane = from.band === to.band
    const sameColumn = (columnOf.get(edge.from) ?? 0) === (columnOf.get(edge.to) ?? 0)
    const crossesLane = !sameLane

    let d: string
    let startX: number
    let startY: number
    let endX: number
    let endY: number
    let fromSide: PlacedEdge['fromSide']
    let toSide: PlacedEdge['toSide']

    if (sameColumn && crossesLane) {
      // Straight handoff down (or up) the same column.
      const movingDown = to.cy > from.cy
      startX = from.cx
      startY = movingDown ? from.y + from.h : from.y
      endX = to.cx
      endY = movingDown ? to.y : to.y + to.h
      const controlY = (startY + endY) / 2
      d = `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`
      fromSide = movingDown ? 'bottom' : 'top'
      toSide = movingDown ? 'top' : 'bottom'
    } else {
      // Side-to-side S-curve — flat inside a lane, diagonal across lanes.
      const rightward = to.cx > from.cx
      startX = rightward ? from.x + from.w : from.x
      startY = from.cy
      endX = rightward ? to.x : to.x + to.w
      endY = to.cy
      const controlX = (startX + endX) / 2
      d = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`
      fromSide = rightward ? 'right' : 'left'
      toSide = rightward ? 'left' : 'right'
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
      fromSide,
      toSide,
      arrowEnd: crossesLane ? true : undefined,
    })
  }

  return {
    width,
    height,
    nodes,
    edges,
    decisions: [],
    continuations: [],
    containers,
    nodeById,
  }
}
