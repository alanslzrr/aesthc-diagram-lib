import type { DiagramSpec, DiagramLayout } from '@aesthc/diagram-lib'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'

/** Illustrative framing only: never changes package layout or exported examples.
 * Compact primary shapes retain normal typography and complete relationships. */
export function galleryLayout(spec: DiagramSpec): DiagramLayout {
  const layout = layoutDiagram(spec)
  if (spec.type === 'sequence') {
    layout.nodes.forEach((node, index) => {
      node.x = 32 + index * 160
      node.w = 120
      node.cx = node.x + node.w / 2
    })
    layout.lifelines?.forEach((line) => {
      line.x = layout.nodeById[line.id].cx
    })
    layout.edges.forEach((edge) => {
      const a = layout.nodeById[edge.from].cx,
        b = layout.nodeById[edge.to].cx
      const direction = b > a ? 1 : -1
      edge.startX = a + direction * 5
      edge.endX = b - direction * 5
      edge.d = `M ${edge.startX} ${edge.startY} L ${edge.endX} ${edge.startY}`
      edge.labelX = (a + b) / 2
    })
    layout.width = 344
  } else if (spec.type === 'er') {
    layout.nodes.forEach((node, index) => {
      node.x = 72
      node.y = 64 + index * 180
      node.cx = node.x + node.w / 2
      node.cy = node.y + node.h / 2
    })
    layout.edges.forEach((edge) => {
      const a = layout.nodeById[edge.from],
        b = layout.nodeById[edge.to]
      edge.startX = a.cx
      edge.startY = a.y + a.h
      edge.endX = b.cx
      edge.endY = b.y
      edge.fromSide = 'bottom'
      edge.toSide = 'top'
      edge.d = `M ${a.cx} ${edge.startY} L ${edge.endX} ${edge.endY}`
      edge.labelX = a.cx
      edge.labelY = (edge.startY + edge.endY) / 2
    })
    layout.width = 384
    layout.height = 400
  } else if (spec.type === 'swimlane') {
    layout.nodes.forEach((node) => {
      node.x = 126
      node.w = 180
      node.cx = node.x + node.w / 2
    })
    layout.containers?.forEach((lane) => {
      lane.w = 314
    })
    layout.edges.forEach((edge) => {
      const a = layout.nodeById[edge.from],
        b = layout.nodeById[edge.to]
      edge.startX = a.cx
      edge.startY = a.y + a.h
      edge.endX = b.cx
      edge.endY = b.y
      edge.fromSide = 'bottom'
      edge.toSide = 'top'
      edge.d = `M ${a.cx} ${edge.startY} L ${edge.endX} ${edge.endY}`
      edge.labelX = a.cx
      edge.labelY = (edge.startY + edge.endY) / 2
    })
    layout.width = 314
  }
  return layout
}
