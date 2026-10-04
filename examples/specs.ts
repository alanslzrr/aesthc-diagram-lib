import type { DiagramSpec, DiagramType } from '../src/types'
const legend = { main: 'Main path', branch: 'Alternative' }
const nodes = [{ id: 'a', label: 'Request', description: 'Receive a request.' }, { id: 'b', label: 'Response', description: 'Return a response.' }]
export const minimalSpecs = {
  band: { type: 'band', caption: 'Request pipeline', legend, bands: [{ title: 'Pipeline' }], nodes: nodes.map((node) => ({ ...node, band: 0 })), edges: [{ id: 'request', from: 'a', to: 'b' }] },
  flowchart: { type: 'flowchart', caption: 'Request flow', legend, nodes, edges: [{ id: 'request', from: 'a', to: 'b' }], direction: 'top-down' },
  sequence: { type: 'sequence', caption: 'Client retry', legend, participants: [{ id: 'a', label: 'Client' }], messages: [{ id: 'retry', from: 'a', to: 'a', label: 'retry' }] },
  'state-machine': { type: 'state-machine', caption: 'Job lifecycle', legend, states: [{ id: 'a', label: 'Pending', initial: true }, { id: 'b', label: 'Complete', final: true }], transitions: [{ id: 'finish', from: 'a', to: 'b', label: 'finish' }] },
  er: { type: 'er', caption: 'Order rows', legend, entities: [{ id: 'a', label: 'Order', fields: [{ name: 'id', type: 'uuid', key: 'pk' }, { name: 'user_id', type: 'uuid', key: 'fk' }] }], relations: [] },
  timeline: { type: 'timeline', caption: 'Release history', legend, events: [{ id: 'a', label: 'Release', description: 'Publish the verified package.' }] },
  swimlane: { type: 'swimlane', caption: 'Support lane', legend, lanes: [{ id: 'support', label: 'Support' }], nodes: [{ ...nodes[0], lane: 'support' }], edges: [] },
} satisfies Record<DiagramType, DiagramSpec>
