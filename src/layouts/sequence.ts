// Sequence layout: participants as vertical lifelines with header cards,
// horizontal messages with arrow markers, and optional activation bars.

import type { SequenceDiagramSpec } from '../types'
import { CANVAS_W, LIFELINE_TOP, MESSAGE_PITCH, PILL_H } from '../theme'
import {
  edgeId,
  labelPillWidth,
  type DiagramLayout,
  type PlacedEdge,
  type PlacedLifeline,
  type PlacedNode,
} from '../layout'

const PARTICIPANT_PITCH = 280
const HEADER_W = 200
const HEADER_H = 44
const HEADER_TOP = 8
const MESSAGE_TOP = 64
const BOTTOM_PAD = 56
const ACTIVATION_W = 8

export function layoutSequence(spec: SequenceDiagramSpec): DiagramLayout {
  const count = Math.max(1, spec.participants.length)
  const pitch = Math.max(PARTICIPANT_PITCH, (CANVAS_W - 160) / count)
  const width = Math.max(CANVAS_W, count * pitch + 160)
  const y1 = MESSAGE_TOP + spec.messages.length * MESSAGE_PITCH
  const height = y1 + BOTTOM_PAD

  const lifelines: PlacedLifeline[] = []
  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}

  spec.participants.forEach((participant, index) => {
    const cx = 80 + pitch * index + pitch / 2
    lifelines.push({
      id: participant.id,
      label: participant.label,
      kind: participant.kind,
      x: cx,
      y0: LIFELINE_TOP,
      y1,
    })

    const header: PlacedNode = {
      id: participant.id,
      label: participant.label,
      description: participant.kind ? `${participant.kind}: ${participant.label}` : participant.label,
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

  const edges: PlacedEdge[] = []
  spec.messages.forEach((message, index) => {
    const from = nodeById[message.from]
    const to = nodeById[message.to]
    if (!from || !to) return

    const y = MESSAGE_TOP + index * MESSAGE_PITCH + MESSAGE_PITCH / 2
    const startX = message.from === message.to ? from.cx + 40 : from.cx
    const endX = message.from === message.to ? to.cx + 120 : to.cx
    const variant = message.variant ?? 'main'
    const labelWidth = message.label ? labelPillWidth(message.label) : 0
    const labelX = (startX + endX) / 2
    const labelY = y - 10

    edges.push({
      ...message,
      id: edgeId(message),
      variant,
      d:
        message.from === message.to
          ? `M ${from.cx + 30} ${y} Q ${startX + 60} ${y - 18}, ${endX} ${y}`
          : `M ${startX} ${y} L ${endX} ${y}`,
      labelX,
      labelY,
      labelWidth,
      startX,
      startY: y,
      endX,
      endY: y,
      fromSide: message.from === message.to ? 'right' : endX > startX ? 'right' : 'left',
      toSide: message.from === message.to ? 'right' : endX > startX ? 'left' : 'right',
    })

    if (message.activation && to) {
      const bar: PlacedNode = {
        id: `activation-${message.id}`,
        label: '',
        description: '',
        band: 0,
        w: ACTIVATION_W,
        h: MESSAGE_PITCH,
        x: to.cx - ACTIVATION_W / 2,
        y: y - MESSAGE_PITCH / 2 + 8,
        cx: to.cx,
        cy: y,
        shape: 'bar',
        weight: variant === 'branch' ? 'secondary' : 'primary',
      }
      nodes.push(bar)
      nodeById[bar.id] = bar
    }
  })

  return { width, height, nodes, edges, decisions: [], continuations: [], lifelines, nodeById }
}

export { PILL_H }
