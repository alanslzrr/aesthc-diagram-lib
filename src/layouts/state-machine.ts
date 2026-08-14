// State machine layout: states placed on a ring, curved transitions, and
// self-loop arcs. Initial states get a double outline, final states a hollow
// centre (both drawn by the canvas from node flags).

import type { StateMachineDiagramSpec } from '../types'
import { CARD_W } from '../theme'
import {
  edgeId,
  labelPillWidth,
  nodeHeight,
  type DiagramLayout,
  type PlacedEdge,
  type PlacedNode,
} from '../layout'

const STATE_W = 220
const RING_MARGIN = 200
const TOP_PAD = 48
const BOTTOM_PAD = 48

export function layoutStateMachine(spec: StateMachineDiagramSpec): DiagramLayout {
  const states = spec.states.map((state) => ({ ...state }))
  const n = Math.max(1, states.length)

  // Ring geometry: big enough to hold the widest stack, wide enough for labels.
  const width = Math.max(720, n * 240 + RING_MARGIN * 2)
  const height = Math.max(520, n * 200 + TOP_PAD + BOTTOM_PAD)
  const cx = width / 2
  const cy = height / 2 + 12
  const radius = Math.min(width, height) / 2 - RING_MARGIN / 2

  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}

  states.forEach((state, index) => {
    const angle = (index / n) * Math.PI * 2 - Math.PI / 2
    const h = nodeHeight(state)
    const w = state.sublabel ? CARD_W : STATE_W
    const x = cx + Math.cos(angle) * radius - w / 2
    const y = cy + Math.sin(angle) * radius - h / 2
    const placed: PlacedNode = {
      ...state,
      description: state.description ?? `${state.kind ? `${state.kind}: ` : ''}${state.label}`,
      band: 0,
      w,
      h,
      x,
      y,
      cx: x + w / 2,
      cy: y + h / 2,
      shape: 'state',
    }
    nodes.push(placed)
    nodeById[placed.id] = placed
  })

  const edges: PlacedEdge[] = []
  for (const transition of spec.transitions) {
    const from = nodeById[transition.from]
    const to = nodeById[transition.to]
    if (!from || !to) continue

    const variant = transition.variant ?? 'main'
    const labelWidth = transition.label ? labelPillWidth(transition.label) : 0

    if (transition.from === transition.to) {
      // Self-loop arc above the state.
      const startX = from.x + from.w * 0.35
      const endX = from.x + from.w * 0.65
      const loopY = from.y - 36
      edges.push({
        ...transition,
        id: `${transition.from}::self::${from.id}`,
        variant,
        d: `M ${startX} ${from.y} C ${startX} ${loopY - 14}, ${endX} ${loopY - 14}, ${endX} ${from.y}`,
        labelX: from.cx,
        labelY: loopY - 24,
        labelWidth,
        startX,
        startY: from.y,
        endX,
        endY: from.y,
        fromSide: 'top',
        toSide: 'top',
      })
      continue
    }

    const midX = (from.cx + to.cx) / 2
    const midY = (from.cy + to.cy) / 2
    const bulge = 28
    edges.push({
      ...transition,
      id: edgeId(transition),
      variant,
      d: `M ${from.cx} ${from.cy} Q ${midX + bulge} ${midY - bulge}, ${to.cx} ${to.cy}`,
      labelX: midX,
      labelY: midY,
      labelWidth,
      startX: from.cx,
      startY: from.cy,
      endX: to.cx,
      endY: to.cy,
      fromSide: 'right',
      toSide: 'left',
    })
  }

  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById }
}
