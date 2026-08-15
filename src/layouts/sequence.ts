// Sequence layout: participants as vertical lifelines with header cards,
// horizontal arrowed messages, and activation bars that span from the
// message that opens them to the next message the participant sends.

import type { SequenceDiagramSpec } from '../types'
import { CARD_H_SLIM, MESSAGE_PITCH, PILL_H } from '../theme'
import {
  edgeId,
  labelPillWidth,
  type DiagramLayout,
  type PlacedEdge,
  type PlacedLifeline,
  type PlacedNode,
} from '../layout'

const PARTICIPANT_PITCH = 300
const HEADER_W = 200
const HEADER_H = CARD_H_SLIM
const HEADER_TOP = 8
const MARGIN_X = 72
const BOTTOM_PAD = 48
const ACTIVATION_W = 8
/** Pull message endpoints off the lifeline so arrowheads read clearly. */
const END_TRIM = 5

export function layoutSequence(spec: SequenceDiagramSpec): DiagramLayout {
  const count = Math.max(1, spec.participants.length)
  const width = 2 * (MARGIN_X + HEADER_W / 2) + PARTICIPANT_PITCH * (count - 1)
  const headerBottom = HEADER_TOP + HEADER_H
  const messageTop = headerBottom + 48
  const y1 = messageTop + spec.messages.length * MESSAGE_PITCH
  const height = y1 + BOTTOM_PAD

  const lifelines: PlacedLifeline[] = []
  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}

  spec.participants.forEach((participant, index) => {
    const cx = MARGIN_X + HEADER_W / 2 + PARTICIPANT_PITCH * index
    lifelines.push({
      id: participant.id,
      label: participant.label,
      kind: participant.kind,
      x: cx,
      y0: headerBottom,
      y1,
    })

    const header: PlacedNode = {
      id: participant.id,
      label: participant.label,
      description: participant.kind
        ? `${participant.kind}: ${participant.label}`
        : participant.label,
      kind: participant.kind,
      band: 0,
      w: HEADER_W,
      h: HEADER_H,
      x: cx - HEADER_W / 2,
      y: HEADER_TOP,
      cx,
      cy: HEADER_TOP + HEADER_H / 2,
      shape: 'card',
    }
    nodes.push(header)
    nodeById[header.id] = header
  })

  const messageY = (index: number): number =>
    messageTop + index * MESSAGE_PITCH + MESSAGE_PITCH / 2

  const edges: PlacedEdge[] = []
  spec.messages.forEach((message, index) => {
    const from = nodeById[message.from]
    const to = nodeById[message.to]
    if (!from || !to) return

    const y = messageY(index)
    const variant = message.variant ?? 'main'
    const labelWidth = message.label ? labelPillWidth(message.label) : 0

    if (message.from === message.to) {
      // Self-message: a small loop to the right of the lifeline.
      const startX = from.cx + END_TRIM
      const endX = from.cx + END_TRIM
      edges.push({
        ...message,
        id: edgeId(message),
        variant,
        d: `M ${startX} ${y - 10} C ${startX + 84} ${y - 12}, ${startX + 84} ${y + 12}, ${endX} ${y + 10}`,
        labelX: from.cx + 104 + labelWidth / 2,
        labelY: y,
        labelWidth,
        startX,
        startY: y,
        endX,
        endY: y,
        fromSide: 'right',
        toSide: 'right',
        arrowEnd: true,
      })
      return
    }

    const rightward = to.cx > from.cx
    const startX = from.cx + (rightward ? END_TRIM : -END_TRIM)
    const endX = to.cx - (rightward ? END_TRIM : -END_TRIM)

    edges.push({
      ...message,
      id: edgeId(message),
      variant,
      d: `M ${startX} ${y} L ${endX} ${y}`,
      labelX: (startX + endX) / 2,
      labelY: y - 14,
      labelWidth,
      startX,
      startY: y,
      endX,
      endY: y,
      fromSide: rightward ? 'right' : 'left',
      toSide: rightward ? 'left' : 'right',
      arrowEnd: true,
    })
  })

  // Activation bars: open at the arrival of an `activation` message, close at
  // the next message the receiving participant sends (or shortly after).
  spec.messages.forEach((message, index) => {
    if (!message.activation) return
    const receiver = nodeById[message.to]
    if (!receiver) return

    const opensAt = messageY(index)
    const reply = spec.messages.findIndex(
      (candidate, candidateIndex) => candidateIndex > index && candidate.from === message.to,
    )
    const closesAt = reply >= 0 ? messageY(reply) : opensAt + MESSAGE_PITCH * 0.72

    const bar: PlacedNode = {
      id: `activation-${message.id}`,
      label: '',
      description: '',
      band: 0,
      w: ACTIVATION_W,
      h: closesAt - opensAt + 8,
      x: receiver.cx - ACTIVATION_W / 2,
      y: opensAt - 4,
      cx: receiver.cx,
      cy: (opensAt + closesAt) / 2,
      shape: 'bar',
      weight: (message.variant ?? 'main') === 'branch' ? 'secondary' : 'primary',
    }
    nodes.push(bar)
    nodeById[bar.id] = bar
  })

  return { width, height, nodes, edges, decisions: [], continuations: [], lifelines, nodeById }
}

export { PILL_H }
