import { createElement } from 'react'
import { registerDiagram, type FlowchartDiagramSpec } from '@aesthc/diagram-lib'
import { getDiagram } from '@aesthc/diagram-lib/registry'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
import { DiagramShowcase } from '@aesthc/diagram-lib/showcase'

const spec = {
  type: 'flowchart',
  caption: 'Published package consumer',
  legend: { main: 'Main path', branch: 'Alternative path' },
  nodes: [{ id: 'start', label: 'Start', description: 'The first step' }],
  edges: [],
} satisfies FlowchartDiagramSpec

registerDiagram('consumer', { diagram: { en: spec, es: spec } })
const layout = layoutDiagram(getDiagram('consumer', 'en'))

export const canvas = createElement(DiagramCanvas, {
  layout,
  highlight: null,
  activeNodeId: null,
  focusedNodeId: null,
  selectedNodeId: null,
  onTooltipNodeChange: () => {},
  onFocusNode: () => {},
  onSelectNode: () => {},
  onDismissNode: () => {},
  instanceId: 'package-consumer',
  ariaLabel: spec.caption,
  nodeVisuals: {},
})

export const showcase = createElement(DiagramShowcase, {
  entries: [{ key: 'consumer', title: 'Consumer', description: spec.caption }],
})
