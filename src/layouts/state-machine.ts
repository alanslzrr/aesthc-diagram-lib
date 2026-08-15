// State machine layout: states on a compact ellipse, transitions as quadratic
// arcs trimmed at the pill borders (outward-bowed between ring neighbours,
// gently inward for cross-ring chords), self-loop arcs above the state.
// Initial states get a double outline, final states a hollow centre dot (both
// drawn by the canvas from node flags).

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
const MARGIN_X = 96
const MARGIN_Y = 64
/** Endpoint outset so arcs meet the pill hairline, not the text. */
const TRIM_GAP = 6

/** Point where the ray from a node's centre toward (tx, ty) leaves its rect. */
function borderPoint(node: PlacedNode, tx: number, ty: number): [number, number] {
  const dx = tx - node.cx
  const dy = ty - node.cy
  if (dx === 0 && dy === 0) return [node.cx, node.cy]
  const scale = 1 / Math.max(Math.abs(dx) / (node.w / 2 + TRIM_GAP), Math.abs(dy) / (node.h / 2 + TRIM_GAP))
  return [node.cx + dx * scale, node.cy + dy * scale]
}

export function layoutStateMachine(spec: StateMachineDiagramSpec): DiagramLayout {
  const states = spec.states.map((state) => ({ ...state }))
  const n = Math.max(1, states.length)

  // Ellipse sized from the ring circumference the states need, flattened so
  // wide pills read as a ring rather than a tall oval.
  const ringRadius = (n * (STATE_W + 64)) / (2 * Math.PI)
  const rx = Math.max(340, ringRadius * 1.7)
  const ry = Math.max(180, ringRadius * 0.88)

  const width = Math.round(2 * (rx + STATE_W / 2 + MARGIN_X))
  const height = Math.round(2 * (ry + 44 + MARGIN_Y))
  const centreX = width / 2
  const centreY = height / 2

  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}

  states.forEach((state, index) => {
    const angle = (index / n) * Math.PI * 2 - Math.PI / 2
    const h = nodeHeight(state)
    const w = state.sublabel ? CARD_W : STATE_W
    const x = centreX + Math.cos(angle) * rx - w / 2
    const y = centreY + Math.sin(angle) * ry - h / 2
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

  const angleOf = new Map<string, number>()
  states.forEach((state, index) => {
    angleOf.set(state.id, (index / n) * Math.PI * 2 - Math.PI / 2)
  })
  const ringStep = (Math.PI * 2) / n

  const edges: PlacedEdge[] = []
  for (const transition of spec.transitions) {
    const from = nodeById[transition.from]
    const to = nodeById[transition.to]
    if (!from || !to) continue

    const variant = transition.variant ?? 'main'
    const labelWidth = transition.label ? labelPillWidth(transition.label) : 0

    if (transition.from === transition.to) {
      // Self-loop arc above the state. The id stays `a::a` so highlight
      // traversal (which speaks from::to) still finds it.
      const startX = from.x + from.w * 0.35
      const endX = from.x + from.w * 0.65
      const loopY = from.y - 36
      edges.push({
        ...transition,
        id: edgeId(transition),
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
        arrowEnd: true,
      })
      continue
    }

    // Angular distance decides the bow: ring neighbours hug the outside of
    // the ellipse; longer chords cut the interior with a gentle inward bend.
    const a = angleOf.get(from.id) ?? 0
    const b = angleOf.get(to.id) ?? 0
    let delta = Math.abs(b - a)
    if (delta > Math.PI) delta = Math.PI * 2 - delta
    const isNeighbour = delta <= ringStep * 1.05

    const midX = (from.cx + to.cx) / 2
    const midY = (from.cy + to.cy) / 2
    const outX = midX - centreX
    const outY = midY - centreY
    const outLen = Math.hypot(outX, outY) || 1
    const bow = isNeighbour ? 72 : -Math.min(64, outLen * 0.22)
    // Perpendicular component (rotated chord): a→b and b→a bow to opposite
    // sides of the chord, so opposite transitions never overlap.
    const chordX = to.cx - from.cx
    const chordY = to.cy - from.cy
    const chordLen = Math.hypot(chordX, chordY) || 1
    const sideOffset = isNeighbour ? 18 : 30
    const controlX = midX + (outX / outLen) * bow + (-chordY / chordLen) * sideOffset
    const controlY = midY + (outY / outLen) * bow + (chordX / chordLen) * sideOffset

    const [startX, startY] = borderPoint(from, controlX, controlY)
    const [endX, endY] = borderPoint(to, controlX, controlY)

    // Quadratic midpoint (t = 0.5) for the label pill.
    const labelX = 0.25 * startX + 0.5 * controlX + 0.25 * endX
    const labelY = 0.25 * startY + 0.5 * controlY + 0.25 * endY

    edges.push({
      ...transition,
      id: edgeId(transition),
      variant,
      d: `M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`,
      labelX,
      labelY,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide: Math.abs(endX - startX) >= Math.abs(endY - startY) ? (endX > startX ? 'right' : 'left') : endY > startY ? 'bottom' : 'top',
      toSide: Math.abs(endX - startX) >= Math.abs(endY - startY) ? (endX > startX ? 'left' : 'right') : endY > startY ? 'top' : 'bottom',
      arrowEnd: true,
    })
  }

  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById }
}
