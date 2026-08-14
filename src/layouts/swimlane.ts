// Swimlane layout: horizontal labelled lanes containing card nodes, with
// curved edges that may cross lanes. Lane rows are emitted as containers so
// the canvas can draw them behind the nodes.

import type { SwimlaneDiagramSpec } from '../types'
import { CANVAS_W, CARD_W, SWIMLANE_HEADER_W, SWIMLANE_PAD, SWIMLANE_ROW_PAD } from '../theme'
import {
  edgeId,
  labelPillWidth,
  nodeHeight,
  type DiagramLayout,
  type PlacedContainer,
  type PlacedEdge,
  type PlacedNode,
} from '../layout'

const TOP_PAD = 56
const BOTTOM_PAD = 56
const NODE_GAP = 48

export function layoutSwimlane(spec: SwimlaneDiagramSpec): DiagramLayout {
  const laneIds = spec.lanes.map((lane) => lane.id)
  const membersByLane = new Map<string, PlacedNode[]>()

  for (const node of spec.nodes) {
    const members = membersByLane.get(node.lane) ?? []
    members.push({
      ...node,
      band: 0,
      w: CARD_W,
      h: nodeHeight(node),
      x: 0,
      y: 0,
      cx: 0,
      cy: 0,
    })
    membersByLane.set(node.lane, members)
  }

  const laneHeights = laneIds.map((id) => {
    const members = membersByLane.get(id) ?? []
    const maxCardH = Math.max(0, ...members.map((member) => member.h))
    return Math.max(88, maxCardH + SWIMLANE_ROW_PAD)
  })

  let y = TOP_PAD
  const laneTop = new Map<string, number>()
  laneIds.forEach((id, index) => {
    laneTop.set(id, y)
    y += laneHeights[index]
  })
  const height = y + BOTTOM_PAD

  const containers: PlacedContainer[] = []
  spec.lanes.forEach((lane, index) => {
    containers.push({
      id: lane.id,
      label: lane.label,
      kind: lane.kind,
      x: 0,
      y: laneTop.get(lane.id) ?? 0,
      w: CANVAS_W,
      h: laneHeights[index],
    })
  })

  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}

  laneIds.forEach((laneId, laneIndex) => {
    const members = membersByLane.get(laneId) ?? []
    const top = laneTop.get(laneId) ?? 0
    const laneH = laneHeights[laneIds.indexOf(laneId)]
    let cursor = SWIMLANE_HEADER_W + SWIMLANE_PAD

    members.forEach((member) => {
      const x = cursor
      const cy = top + laneH / 2
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
      cursor += member.w + NODE_GAP
    })
  })

  const edges: PlacedEdge[] = []
  for (const edge of spec.edges) {
    const from = nodeById[edge.from]
    const to = nodeById[edge.to]
    if (!from || !to) continue

    const variant = edge.variant ?? 'main'
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0
    const fromLane = from.y
    const toLane = to.y

    let d: string
    let startX: number
    let startY: number
    let endX: number
    let endY: number

    if (fromLane === toLane) {
      startX = from.x + from.w
      startY = from.cy
      endX = to.x
      endY = to.cy
      d = `M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`
    } else {
      const movingDown = to.y > from.y
      const exitY = movingDown ? from.y + from.h : from.y
      const entryY = movingDown ? to.y : to.y + to.h
      startX = from.cx
      startY = exitY
      endX = to.cx
      endY = entryY
      d = `M ${startX} ${exitY} C ${startX} ${(exitY + entryY) / 2}, ${endX} ${(exitY + entryY) / 2}, ${endX} ${entryY}`
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
      fromSide: endX > startX ? 'right' : 'left',
      toSide: endX > startX ? 'left' : 'right',
    })
  }

  return {
    width: CANVAS_W,
    height,
    nodes,
    edges,
    decisions: [],
    continuations: [],
    containers,
    nodeById,
  }
}
