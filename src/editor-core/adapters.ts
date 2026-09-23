import { identifyEdges } from '../layout'
import { layoutByType, layoutFlowchart } from '../layouts'
import type { Capability, EditorDiagramType, EditorSpec, TypeAdapter } from './types'
import { edgesOf, edgeCollection, nodeCollection, nodesOf } from './model'
import { DEFAULT_LIMITS, failure, freezeData, inspectData, success } from './data'
import { validateEditorSpec } from './validation'

const capabilities: Record<EditorDiagramType, Capability[]> = {
  graph: ['move-free', 'resize', 'connect', 'ports', 'waypoints', 'groups'],
  flowchart: ['move-free', 'resize', 'connect', 'waypoints', 'groups'],
  'state-machine': ['move-free', 'resize', 'connect', 'waypoints', 'groups'],
  er: ['move-free', 'resize', 'connect', 'waypoints', 'groups', 'edit-fields'],
  sequence: ['connect', 'reorder-participants', 'reorder-messages'],
  timeline: ['reorder-events'],
  band: ['connect', 'reassign-band'],
  swimlane: ['connect', 'reassign-lane', 'reorder-lanes'],
}
function remove(spec: EditorSpec, ids: string[]): EditorSpec {
  const removed = new Set(ids)
  Object.assign(spec, { [nodeCollection(spec)]: nodesOf(spec).filter((n) => !removed.has(n.id)) })
  if (spec.type !== 'timeline')
    Object.assign(spec, {
      [edgeCollection(spec)]: edgesOf(spec).filter(
        (e) => !removed.has(e.from) && !removed.has(e.to),
      ),
    })
  if (spec.type === 'band') {
    if (spec.decisions) spec.decisions = spec.decisions.filter((d) => !removed.has(d.source))
    if (spec.continuations)
      spec.continuations = spec.continuations.filter((c) => !removed.has(c.from))
  }
  return spec
}
export function getAdapter(type: EditorDiagramType): TypeAdapter {
  if (!capabilities[type]) throw new TypeError('Unknown diagram type')
  const guard = (spec: EditorSpec) => spec.type === type
  const edit = (spec: EditorSpec, action: (draft: EditorSpec) => void) => {
    if (!guard(spec)) return failure<EditorSpec>('adapter.type')
    const checked = validateEditorSpec(spec)
    if (!checked.ok) return checked
    const draft = structuredClone(spec)
    action(draft)
    return validateEditorSpec(draft)
  }
  return freezeData({
    type,
    capabilities: [...capabilities[type]],
    nodeIds: (spec) => nodesOf(spec).map((n) => n.id),
    edges: (spec) => identifyEdges(edgesOf(spec)),
    insertNode(spec, input, index) {
      if (input.diagramType !== type) return failure('adapter.type')
      if (
        index !== undefined &&
        (!Number.isInteger(index) || index < 0 || index > nodesOf(spec).length)
      )
        return failure('index.invalid')
      return edit(spec, (draft) => {
        nodesOf(draft).splice(index ?? nodesOf(draft).length, 0, structuredClone(input.node))
      })
    },
    replaceNode(spec, input) {
      if (input.diagramType !== type) return failure('adapter.type')
      const index = nodesOf(spec).findIndex((n) => n.id === input.node.id)
      if (index < 0) return failure('reference.missing')
      return edit(spec, (draft) => {
        nodesOf(draft)[index] = structuredClone(input.node)
      })
    },
    removeNodes(spec, ids) {
      if (ids.some((id) => !nodesOf(spec).some((n) => n.id === id)))
        return failure('reference.missing')
      return edit(spec, (draft) => {
        remove(draft, ids)
      })
    },
    insertRelation(spec, input, index) {
      if (type === 'timeline' || input.diagramType !== type) return failure('adapter.type')
      if (
        index !== undefined &&
        (!Number.isInteger(index) || index < 0 || index > edgesOf(spec).length)
      )
        return failure('index.invalid')
      return edit(spec, (draft) => {
        edgesOf(draft).splice(index ?? edgesOf(draft).length, 0, structuredClone(input.relation))
      })
    },
    replaceRelation(spec, input) {
      if (type === 'timeline' || input.diagramType !== type) return failure('adapter.type')
      const index = edgesOf(spec).findIndex((e) => e.id === input.relation.id)
      if (index < 0) return failure('reference.missing')
      return edit(spec, (draft) => {
        edgesOf(draft)[index] = structuredClone(input.relation)
      })
    },
    removeRelations(spec, ids) {
      if (type === 'timeline') return failure('capability.unsupported')
      if (ids.some((id) => !edgesOf(spec).some((e) => e.id === id)))
        return failure('reference.missing')
      return edit(spec, (draft) => {
        Object.assign(draft, {
          [edgeCollection(draft)]: edgesOf(draft).filter((e) => !ids.includes(e.id!)),
        })
      })
    },
    reorder(spec, collection, ids) {
      if (
        ![
          nodeCollection(spec),
          edgeCollection(spec),
          ...(type === 'swimlane' ? ['lanes'] : []),
        ].includes(collection)
      )
        return failure('capability.unsupported')
      const values = (spec as unknown as Record<string, Array<{ id: string }>>)[collection]
      if (
        !Array.isArray(values) ||
        ids.length !== values.length ||
        new Set(ids).size !== ids.length ||
        ids.some((id) => !values.some((v) => v.id === id))
      )
        return failure('reorder.permutation')
      return edit(spec, (draft) => {
        Object.assign(draft, {
          [collection]: ids.map((id) => structuredClone(values.find((v) => v.id === id)!)),
        })
      })
    },
    seedLayout(spec) {
      const checked = validateEditorSpec(spec)
      if (!checked.ok) return checked
      if (!guard(spec)) return failure('adapter.type')
      return success(
        spec.type === 'graph'
          ? layoutFlowchart({
              type: 'flowchart',
              caption: spec.caption,
              legend: spec.legend,
              nodes: spec.nodes,
              edges: spec.edges,
            })
          : layoutByType(spec),
      )
    },
    editStructure(spec, operation) {
      if (!guard(spec)) return failure('adapter.type')
      if (
        (operation.type === 'bands.replace' && type === 'band') ||
        (operation.type === 'lanes.replace' && type === 'swimlane')
      ) {
        const checked = validateEditorSpec(spec)
        if (!checked.ok) return checked
        const diagnostics = inspectData(operation, DEFAULT_LIMITS)
        if (diagnostics.length) return { ok: false, diagnostics }
        const known = new Set(nodesOf(spec).map((node) => node.id))
        const assigned = new Set(Object.keys(operation.assignments))
        const removed = new Set(operation.removeNodeIds)
        if (removed.size !== operation.removeNodeIds.length)
          return failure('structure.mapping.duplicate', '/removeNodeIds')
        if ([...assigned, ...removed].some((id) => !known.has(id)))
          return failure('reference.missing', '/assignments')
        if ([...assigned].some((id) => removed.has(id)))
          return failure('structure.mapping.overlap', '/assignments')
        if ([...known].some((id) => !assigned.has(id) && !removed.has(id)))
          return failure('structure.mapping.incomplete', '/assignments')
      }
      if (operation.type === 'bands.replace' && type === 'band')
        return edit(spec, (draft) => {
          if (draft.type !== 'band') return
          remove(draft, operation.removeNodeIds)
          draft.bands = structuredClone(operation.bands)
          draft.nodes.forEach((n) => {
            if (n.id in operation.assignments) n.band = operation.assignments[n.id]
          })
        })
      if (operation.type === 'lanes.replace' && type === 'swimlane')
        return edit(spec, (draft) => {
          if (draft.type !== 'swimlane') return
          remove(draft, operation.removeNodeIds)
          draft.lanes = structuredClone(operation.lanes)
          draft.nodes.forEach((n) => {
            if (n.id in operation.assignments) n.lane = operation.assignments[n.id]
          })
        })
      if (operation.type === 'band-annotations.replace' && type === 'band')
        return edit(spec, (draft) => {
          if (draft.type === 'band') {
            draft.decisions = structuredClone(operation.decisions)
            draft.continuations = structuredClone(operation.continuations)
          }
        })
      return failure('capability.unsupported')
    },
  } satisfies TypeAdapter)
}
