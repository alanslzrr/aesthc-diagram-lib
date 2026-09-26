import type { DiagramDocument, Result } from '../editor-core/types'
import { failure, success } from '../editor-core/data'
import { edgesOf, nodesOf } from '../editor-core/model'
import { validateDocument } from '../editor-core/validation'

export interface FieldChange {
  path: string
  before: unknown
  after: unknown
}
export interface EntityDelta {
  kind: 'node' | 'edge'
  id: string
  status: 'added' | 'removed' | 'modified'
  /** Changed semantic field paths; empty for presentation-only changes. */
  semantic: string[]
  /** Changed presentation fields (placement, route points). */
  presentation: string[]
}
export interface Comparison {
  before: { documentId: string; revision: number }
  after: { documentId: string; revision: number }
  type: string
  nodes: EntityDelta[]
  edges: EntityDelta[]
  /** Authored-order changes over an unchanged id set. Authored order is
   * semantic: anonymous identity and sequence meaning follow it. */
  reorder: Array<{ collection: 'nodes' | 'edges'; before: string[]; after: string[] }>
  presentation: FieldChange[]
  counts: {
    added: number
    removed: number
    modified: number
    presentationOnly: number
    reorder: number
  }
  /** Never implies merge safety: the comparison is read-only evidence. */
  mergeSafety: false
}
function diffValues(before: unknown, after: unknown, prefix: string): FieldChange[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return []
  if (
    before === null ||
    after === null ||
    typeof before !== 'object' ||
    typeof after !== 'object' ||
    Array.isArray(before) ||
    Array.isArray(after)
  )
    return [{ path: prefix, before, after }]
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changes: FieldChange[] = []
  for (const key of keys) {
    const left = (before as Record<string, unknown>)[key]
    const right = (after as Record<string, unknown>)[key]
    changes.push(...diffValues(left, right, `${prefix}/${key}`))
  }
  return changes
}
function orderOf(ids: string[]): string {
  return ids.join('\u0000')
}
function reorderOf(
  collection: 'nodes' | 'edges',
  beforeIds: string[],
  afterIds: string[],
): Comparison['reorder'] {
  const beforeSet = new Set(beforeIds),
    afterSet = new Set(afterIds)
  const kept = beforeIds.filter((id) => afterSet.has(id))
  const keptAfter = afterIds.filter((id) => beforeSet.has(id))
  if (kept.length < 2 || orderOf(kept) === orderOf(keptAfter)) return []
  return [{ collection, before: kept, after: keptAfter }]
}
/** Exact structural comparison. Entities are matched by their stable IDs only:
 * a renamed ID is a remove + add, never an inferred rename, and no merge
 * behavior is promised. Inputs are never mutated. */
export function compareDocuments(
  beforeInput: DiagramDocument,
  afterInput: DiagramDocument,
): Result<Comparison> {
  const beforeChecked = validateDocument(beforeInput)
  if (!beforeChecked.ok) return beforeChecked
  const afterChecked = validateDocument(afterInput)
  if (!afterChecked.ok) return afterChecked
  const before = beforeChecked.value,
    after = afterChecked.value
  if (before.spec.type !== after.spec.type) return failure('compare.incompatible')
  const beforeNodes = new Map(nodesOf(before.spec).map((node) => [node.id, node]))
  const afterNodes = new Map(nodesOf(after.spec).map((node) => [node.id, node]))
  const beforeEdges = new Map(edgesOf(before.spec).map((edge) => [edge.id!, edge]))
  const afterEdges = new Map(edgesOf(after.spec).map((edge) => [edge.id!, edge]))
  const nodes: EntityDelta[] = []
  const edges: EntityDelta[] = []
  function delta(
    kind: 'node' | 'edge',
    id: string,
    beforeEntity: unknown,
    afterEntity: unknown,
    beforePlacement: unknown,
    afterPlacement: unknown,
  ): EntityDelta | null {
    if (beforeEntity === undefined)
      return { kind, id, status: 'added', semantic: [], presentation: [] }
    if (afterEntity === undefined)
      return { kind, id, status: 'removed', semantic: [], presentation: [] }
    const semantic = diffValues(beforeEntity, afterEntity, '').map((change) => change.path)
    const presentation = diffValues(beforePlacement, afterPlacement, '').map(
      (change) => change.path,
    )
    if (semantic.length === 0 && presentation.length === 0) return null
    return { kind, id, status: 'modified', semantic, presentation }
  }
  for (const id of new Set([...beforeNodes.keys(), ...afterNodes.keys()])) {
    const entry = delta(
      'node',
      id,
      beforeNodes.get(id),
      afterNodes.get(id),
      before.scene.nodes[id],
      after.scene.nodes[id],
    )
    if (entry) nodes.push(entry)
  }
  for (const id of new Set([...beforeEdges.keys(), ...afterEdges.keys()])) {
    const entry = delta(
      'edge',
      id,
      beforeEdges.get(id),
      afterEdges.get(id),
      before.scene.routes[id],
      after.scene.routes[id],
    )
    if (entry) edges.push(entry)
  }
  const presentation = diffValues(
    {
      presentation: before.presentation,
      mode: before.scene.mode,
      zOrder: before.scene.zOrder,
    },
    {
      presentation: after.presentation,
      mode: after.scene.mode,
      zOrder: after.scene.zOrder,
    },
    '',
  )
  const reorder = [
    ...reorderOf(
      'nodes',
      nodesOf(before.spec).map((node) => node.id),
      nodesOf(after.spec).map((node) => node.id),
    ),
    ...reorderOf(
      'edges',
      edgesOf(before.spec).map((edge) => edge.id!),
      edgesOf(after.spec).map((edge) => edge.id!),
    ),
  ]
  const counts = {
    added: [...nodes, ...edges].filter((entry) => entry.status === 'added').length,
    removed: [...nodes, ...edges].filter((entry) => entry.status === 'removed').length,
    modified: [...nodes, ...edges].filter((entry) => entry.status === 'modified').length,
    presentationOnly: [...nodes, ...edges].filter(
      (entry) => entry.status === 'modified' && entry.semantic.length === 0,
    ).length,
    reorder: reorder.length,
  }
  return success({
    before: { documentId: before.id, revision: before.revision },
    after: { documentId: after.id, revision: after.revision },
    type: before.spec.type,
    nodes,
    edges,
    reorder,
    presentation,
    counts,
    mergeSafety: false,
  })
}
