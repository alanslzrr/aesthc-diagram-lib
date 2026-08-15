// Timeline layout: a central horizontal spine with events alternating above
// and below it. Each event is a dot on the spine plus a label block offset
// into the open band; the spine carries a direction arrow at its end.

import type { TimelineDiagramSpec } from '../types'
import { TIMELINE_ALT_OFFSET, TIMELINE_EVENT_GAP } from '../theme'
import type { DiagramLayout, PlacedEdge, PlacedNode } from '../layout'

const MARGIN_X = 96
const TOP_PAD = 56
const BOTTOM_PAD = 64
const EVENT_W = 240
/** How far the spine extends past the first and last event dots. */
const SPINE_OVERHANG = 72

export function layoutTimeline(spec: TimelineDiagramSpec): DiagramLayout {
  const n = Math.max(1, spec.events.length)
  const edgePad = MARGIN_X + EVENT_W / 2
  const width = edgePad * 2 + TIMELINE_EVENT_GAP * (n - 1)
  const spineY = TOP_PAD + TIMELINE_ALT_OFFSET + 40
  const height = spineY + TIMELINE_ALT_OFFSET + 40 + BOTTOM_PAD

  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}

  spec.events.forEach((event, index) => {
    const above = index % 2 === 0
    const x = edgePad + TIMELINE_EVENT_GAP * index
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

  const firstX = edgePad - SPINE_OVERHANG
  const lastX = edgePad + TIMELINE_EVENT_GAP * (n - 1) + SPINE_OVERHANG

  const edges: PlacedEdge[] = []
  const spine: PlacedEdge = {
    id: 'timeline-spine',
    from: '',
    to: '',
    variant: 'main',
    dashed: true,
    d: `M ${firstX} ${spineY} L ${lastX} ${spineY}`,
    labelX: 0,
    labelY: 0,
    labelWidth: 0,
    startX: firstX,
    startY: spineY,
    endX: lastX,
    endY: spineY,
    fromSide: 'left',
    toSide: 'right',
    arrowEnd: true,
    strokeWidth: 1.1,
  }
  edges.push(spine)

  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById }
}
