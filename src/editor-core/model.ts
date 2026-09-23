import type { DiagramEdge } from '../types'
import type { EditorSpec, NodeInput } from './types'

export const freeTypes = new Set<EditorSpec['type']>(['graph', 'flowchart', 'state-machine', 'er'])
export function nodesOf(spec: EditorSpec): Array<NodeInput['node']> {
  switch (spec.type) {
    case 'sequence':
      return spec.participants
    case 'state-machine':
      return spec.states
    case 'er':
      return spec.entities
    case 'timeline':
      return spec.events
    default:
      return spec.nodes
  }
}
export function edgesOf(spec: EditorSpec): DiagramEdge[] {
  switch (spec.type) {
    case 'sequence':
      return spec.messages
    case 'state-machine':
      return spec.transitions
    case 'er':
      return spec.relations
    case 'timeline':
      return []
    default:
      return spec.edges
  }
}
export function nodeCollection(spec: EditorSpec): string {
  return (
    (
      {
        sequence: 'participants',
        'state-machine': 'states',
        er: 'entities',
        timeline: 'events',
      } as Record<string, string>
    )[spec.type] ?? 'nodes'
  )
}
export function edgeCollection(spec: EditorSpec): string {
  return (
    (
      { sequence: 'messages', 'state-machine': 'transitions', er: 'relations' } as Record<
        string,
        string
      >
    )[spec.type] ?? 'edges'
  )
}
