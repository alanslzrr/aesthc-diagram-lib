import type { DiagramSpec, DiagramType } from '../src/types'
const legend = { main: 'Main path', branch: 'Alternative' }
const nodes = [{ id: 'a', label: 'Request', description: 'Receive a request.' }, { id: 'b', label: 'Response', description: 'Return a response.' }]
export const minimalSpecs = {
  band: { type: 'band', caption: 'Request pipeline', legend, bands: [{ title: 'Input' }, { title: 'Output' }], nodes: nodes.map((node, band) => ({ ...node, band })), edges: [{ id: 'request', from: 'a', to: 'b' }] },
  flowchart: { type: 'flowchart', caption: 'Request flow', legend, nodes, edges: [{ id: 'request', from: 'a', to: 'b' }], direction: 'top-down' },
  sequence: { type: 'sequence', caption: 'Request and response', legend, participants: [{ id: 'a', label: 'Client' }, { id: 'b', label: 'Server' }], messages: [{ id: 'request', from: 'a', to: 'b', label: 'GET /' }, { id: 'response', from: 'b', to: 'a', label: '200 OK' }] },
  'state-machine': { type: 'state-machine', caption: 'Job lifecycle', legend, states: [{ id: 'a', label: 'Pending', initial: true }, { id: 'b', label: 'Complete', final: true }], transitions: [{ id: 'finish', from: 'a', to: 'b', label: 'finish' }] },
  er: { type: 'er', caption: 'Users and orders', legend, entities: [{ id: 'a', label: 'User', fields: [{ name: 'id', type: 'uuid', key: 'pk' }] }, { id: 'b', label: 'Order', fields: [{ name: 'user_id', type: 'uuid', key: 'fk' }] }], relations: [{ id: 'orders', from: 'a', to: 'b', label: 'places' }] },
  timeline: { type: 'timeline', caption: 'Release history', legend, events: [{ id: 'a', label: 'Design', description: 'Agree on the contract.' }, { id: 'b', label: 'Release', description: 'Publish the verified package.' }] },
  swimlane: { type: 'swimlane', caption: 'Support handoff', legend, lanes: [{ id: 'support', label: 'Support' }, { id: 'engineering', label: 'Engineering' }], nodes: [{ ...nodes[0], lane: 'support' }, { ...nodes[1], lane: 'engineering' }], edges: [{ id: 'handoff', from: 'a', to: 'b' }] },
} satisfies Record<DiagramType, DiagramSpec>
