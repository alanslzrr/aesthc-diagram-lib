// Timeline layout: a central horizontal spine with events alternating above
// and below it. Each event is a dot on the spine plus a label card offset
// into the open band.

import type { TimelineDiagramSpec } from '../types'
import { CANVAS_W, TIMELINE_ALT_OFFSET, TIMELINE_EVENT_GAP } from '../theme'
import type { DiagramLayout, PlacedEdge, PlacedNode } from '../layout'

const MARGIN = 100
const TOP_PAD = 64
const BOTTOM_PAD = 72
const EVENT_W = 240

export function layoutTimeline(spec: TimelineDiagramSpec): DiagramLayout {
  const n = Math.max(1, spec.events.length)
  const width = Math.max(CANVAS_W, n * TIMELINE_EVENT_GAP + MARGIN * 2)
  const spineY = TOP_PAD + TIMELINE_ALT_OFFSET + 56
  const height = spineY + TIMELINE_ALT_OFFSET + BOTTOM_PAD + 56

  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}

  spec.events.forEach((event, index) => {
    const above = index % 2 === 0
    const x = MARGIN + TIMELINE_EVENT_GAP * index + TIMELINE_EVENT_GAP / 2
    const labelY = above ? spineY - TIMELINE_ALT_OFFSET - 8 : spineY + TIMELINE_ALT_OFFSET + 8
    const placed: PlacedNode = {
      id: event.id,
      label: event.label,
      description: event.description,
      kind: event.kind,
      sublabel: event.sublabel,
      weight: event.weight ?? (event.variant === 'branch' ? 'secondary' : 'primary'),
      band: 0,
      w: EVENT_W,
      h: 0,
      x: x - EVENT_W / 2,
      y: labelY,
      cx: x,
      cy: spineY,
      shape: 'event',
      textAnchor: 'middle',
      nudge: above ? -1 : 1,
    }
    nodes.push(placed)
    nodeById[placed.id] = placed
  })

  const edges: PlacedEdge[] = []
  const spine: PlacedEdge = {
    id: 'timeline-spine',
    from: '',
    to: '',
    variant: 'main',
    dashed: true,
    d: `M ${MARGIN} ${spineY} L ${width - MARGIN} ${spineY}`,
    labelX: 0,
    labelY: 0,
    labelWidth: 0,
    startX: MARGIN,
    startY: spineY,
    endX: width - MARGIN,
    endY: spineY,
    fromSide: 'left',
    toSide: 'right',
  }
  edges.push(spine)

  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById }
}
