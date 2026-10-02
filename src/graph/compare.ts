import type { DiagramDocument, Result } from '../editor-core/types'
import { canonical, issue, pointer, success } from '../editor-core/data'
import { edgeCollection, edgesOf, nodeCollection, nodesOf } from '../editor-core/model'
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
/** Per-entity metadata changes (roles/tags/notes/links/evidence/owner/
 * visibility/crossing), matched by exact entity ID. */
export interface MetadataDelta {
  kind: 'node' | 'edge'
  id: string
  status: 'added' | 'removed' | 'modified'
  changes: FieldChange[]
}
/** Group/view/story changes, matched by exact authored ID. */
export interface KeyedDelta {
  id: string
  status: 'added' | 'removed' | 'modified'
  changes: FieldChange[]
}
/** Unknown extension payloads are compared structurally as canonical JSON.
 * This library cannot interpret their meaning, so semantics stay `unknown`. */
export interface ExtensionDelta {
  namespace: string
  status: 'added' | 'removed' | 'modified'
  semantics: 'unknown'
  changes: FieldChange[]
  before?: unknown
  after?: unknown
}
export interface DocumentDelta {
  /** Non-entity document fields: spec scalars (caption, legend, profile...),
   * locale and document metadata outside the per-entity maps. */
  fields: FieldChange[]
  metadata: MetadataDelta[]
  groups: KeyedDelta[]
  views: KeyedDelta[]
  story: KeyedDelta[]
  /** Authored-order changes over unchanged group/view/story ID sets. */
  reorder: Array<{
    collection: 'groups' | 'views' | 'story'
    before: string[]
    after: string[]
  }>
  extensions: ExtensionDelta[]
  /** Every extension namespace present on either side, changed or not. These
   * payloads are only compared structurally, so even an empty extension list
   * does not claim their semantics were examined. */
  unknownNamespaces: string[]
  counts: {
    fields: number
    metadata: number
    groups: number
    views: number
    story: number
    extensions: number
  }
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
  /** Document-level deltas outside the node/edge collections. Revision and
   * document id stay provenance-only and are never reported here. */
  document: DocumentDelta
  counts: {
    added: number
    removed: number
    modified: number
    presentationOnly: number
    reorder: number
    /** Total document-level delta entries, never folded into entity counts. */
    document: number
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
function reorderSequence(
  beforeIds: string[],
  afterIds: string[],
): { before: string[]; after: string[] } | null {
  const beforeSet = new Set(beforeIds),
    afterSet = new Set(afterIds)
  const kept = beforeIds.filter((id) => afterSet.has(id))
  const keptAfter = afterIds.filter((id) => beforeSet.has(id))
  if (kept.length < 2 || orderOf(kept) === orderOf(keptAfter)) return null
  return { before: kept, after: keptAfter }
}
function reorderOf(
  collection: 'nodes' | 'edges',
  beforeIds: string[],
  afterIds: string[],
): Comparison['reorder'] {
  const order = reorderSequence(beforeIds, afterIds)
  return order ? [{ collection, ...order }] : []
}
function specScalars(spec: DiagramDocument['spec']): Record<string, unknown> {
  const scalars: Record<string, unknown> = { ...(spec as unknown as Record<string, unknown>) }
  delete scalars[nodeCollection(spec)]
  delete scalars[edgeCollection(spec)]
  return scalars
}
function keyedDeltas(
  beforeItems: ReadonlyArray<{ id: string }>,
  afterItems: ReadonlyArray<{ id: string }>,
  prefix: string,
): KeyedDelta[] {
  const beforeById = new Map(beforeItems.map((item) => [item.id, item]))
  const afterById = new Map(afterItems.map((item) => [item.id, item]))
  const entries: KeyedDelta[] = []
  for (const id of new Set([...beforeById.keys(), ...afterById.keys()])) {
    const left = beforeById.get(id)
    const right = afterById.get(id)
    if (left === undefined) entries.push({ id, status: 'added', changes: [] })
    else if (right === undefined) entries.push({ id, status: 'removed', changes: [] })
    else {
      const changes = diffValues(left, right, `${prefix}/${pointer(id)}`)
      if (changes.length) entries.push({ id, status: 'modified', changes })
    }
  }
  return entries
}
function metadataDeltas(
  before: DiagramDocument['metadata'],
  after: DiagramDocument['metadata'],
): MetadataDelta[] {
  const entries: MetadataDelta[] = []
  for (const kind of ['node', 'edge'] as const) {
    const collection = kind === 'node' ? 'nodes' : 'edges'
    const beforeEntries = before[collection] as Record<string, unknown>
    const afterEntries = after[collection] as Record<string, unknown>
    for (const id of new Set([...Object.keys(beforeEntries), ...Object.keys(afterEntries)])) {
      const left = beforeEntries[id]
      const right = afterEntries[id]
      if (left === undefined) entries.push({ kind, id, status: 'added', changes: [] })
      else if (right === undefined) entries.push({ kind, id, status: 'removed', changes: [] })
      else {
        const changes = diffValues(left, right, `/metadata/${collection}/${pointer(id)}`)
        if (changes.length) entries.push({ kind, id, status: 'modified', changes })
      }
    }
  }
  return entries
}
function extensionDeltas(
  before: DiagramDocument['extensions'],
  after: DiagramDocument['extensions'],
): { entries: ExtensionDelta[]; namespaces: string[] } {
  const namespaces = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  const entries: ExtensionDelta[] = []
  for (const namespace of namespaces) {
    const left = before[namespace]
    const right = after[namespace]
    if (left === undefined)
      entries.push({
        namespace,
        status: 'added',
        semantics: 'unknown',
        changes: [],
        after: right,
      })
    else if (right === undefined)
      entries.push({
        namespace,
        status: 'removed',
        semantics: 'unknown',
        changes: [],
        before: left,
      })
    else if (canonical(left) !== canonical(right))
      entries.push({
        namespace,
        status: 'modified',
        semantics: 'unknown',
        changes: diffValues(left, right, `/extensions/${pointer(namespace)}`),
        before: left,
        after: right,
      })
  }
  return { entries, namespaces }
}
function documentDelta(before: DiagramDocument, after: DiagramDocument): DocumentDelta {
  const fields = [
    ...diffValues(specScalars(before.spec), specScalars(after.spec), '/spec'),
    ...diffValues(before.locale, after.locale, '/locale'),
    ...diffValues(
      before.metadata.engineeringProfile,
      after.metadata.engineeringProfile,
      '/metadata/engineeringProfile',
    ),
    ...diffValues(before.metadata.visuals, after.metadata.visuals, '/metadata/visuals'),
  ]
  const metadata = metadataDeltas(before.metadata, after.metadata)
  const groups = keyedDeltas(before.scene.groups, after.scene.groups, '/groups')
  const views = keyedDeltas(before.views, after.views, '/views')
  const story = keyedDeltas(before.story, after.story, '/story')
  const reorder: DocumentDelta['reorder'] = []
  for (const [collection, beforeItems, afterItems] of [
    ['groups', before.scene.groups, after.scene.groups],
    ['views', before.views, after.views],
    ['story', before.story, after.story],
  ] as const) {
    const order = reorderSequence(
      beforeItems.map((item) => item.id),
      afterItems.map((item) => item.id),
    )
    if (order) reorder.push({ collection, ...order })
  }
  const { entries: extensions, namespaces } = extensionDeltas(
    before.extensions,
    after.extensions,
  )
  return {
    fields,
    metadata,
    groups,
    views,
    story,
    reorder,
    extensions,
    unknownNamespaces: namespaces,
    counts: {
      fields: fields.length,
      metadata: metadata.length,
      groups: groups.length,
      views: views.length,
      story: story.length,
      extensions: extensions.length,
    },
  }
}
/** Exact structural comparison. Entities are matched by their stable IDs only:
 * a renamed ID is a remove + add, never an inferred rename, and no merge
 * behavior is promised. Inputs are never mutated. Document-level categories
 * (caption, legend, metadata, groups, views, story, locale, extensions) are
 * reported separately; object key insertion order never creates a false
 * difference, while authored array order stays meaningful. */
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
  if (before.spec.type !== after.spec.type)
    return {
      ok: false,
      diagnostics: [
        issue('compare.incompatible', '/type'),
        issue('compare.incompatible-type', '/type'),
      ],
    }
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
  const document = documentDelta(before, after)
  const counts = {
    added: [...nodes, ...edges].filter((entry) => entry.status === 'added').length,
    removed: [...nodes, ...edges].filter((entry) => entry.status === 'removed').length,
    modified: [...nodes, ...edges].filter((entry) => entry.status === 'modified').length,
    presentationOnly: [...nodes, ...edges].filter(
      (entry) => entry.status === 'modified' && entry.semantic.length === 0,
    ).length,
    reorder: reorder.length,
    document:
      document.counts.fields +
      document.counts.metadata +
      document.counts.groups +
      document.counts.views +
      document.counts.story +
      document.counts.extensions +
      document.reorder.length,
  }
  return success({
    before: { documentId: before.id, revision: before.revision },
    after: { documentId: after.id, revision: after.revision },
    type: before.spec.type,
    nodes,
    edges,
    reorder,
    presentation,
    document,
    counts,
    mergeSafety: false,
  })
}
