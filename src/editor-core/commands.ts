import type { DiagramDocument, EditorCommand, Result } from './types'
import { edgesOf, freeTypes, nodesOf } from './model'
import { failure, success } from './data'
import { validateDocument } from './validation'
import { createDocument } from './document'
import { getAdapter } from './adapters'

export function isNodeLocked(doc: DiagramDocument, id: string): boolean {
  if (doc.scene.nodes[id]?.locked) return true
  const groups = new Map(doc.scene.groups.map((g) => [g.id, g]))
  let group = doc.scene.groups.find((g) => g.nodeIds.includes(id))
  while (group) {
    if (group.locked) return true
    group = group.parentGroup ? groups.get(group.parentGroup) : undefined
  }
  return false
}
export function pruneReferences(doc: DiagramDocument): void {
  const nodes = new Set(nodesOf(doc.spec).map((n) => n.id)),
    edges = new Set(edgesOf(doc.spec).map((e) => e.id!))
  for (const key of Object.keys(doc.scene.nodes)) if (!nodes.has(key)) delete doc.scene.nodes[key]
  for (const key of Object.keys(doc.scene.routes)) if (!edges.has(key)) delete doc.scene.routes[key]
  for (const collection of [doc.metadata.nodes, doc.metadata.visuals])
    for (const key of Object.keys(collection)) if (!nodes.has(key)) delete collection[key]
  for (const key of Object.keys(doc.metadata.edges))
    if (!edges.has(key)) delete doc.metadata.edges[key]
  doc.scene.zOrder = [
    ...doc.scene.zOrder.filter((id) => nodes.has(id)),
    ...[...nodes].filter((id) => !doc.scene.zOrder.includes(id)),
  ]
  doc.scene.groups.forEach((g) => {
    g.nodeIds = g.nodeIds.filter((id) => nodes.has(id))
  })
  doc.views.forEach((v) => {
    v.focus.nodeIds = v.focus.nodeIds.filter((id) => nodes.has(id))
    v.focus.edgeIds = v.focus.edgeIds.filter((id) => edges.has(id))
  })
  doc.views = doc.views.filter((v) => v.focus.nodeIds.length || v.focus.edgeIds.length)
  doc.story = doc.story.filter(
    (s) =>
      doc.views.some((v) => v.id === s.viewId) &&
      (s.routeEdgeIds ?? []).every((id) => edges.has(id)),
  )
}
/**
 * Lock invariants for whole-document replacement. The candidate must preserve
 * every baseline node whose effective lock is active: same authored content,
 * same placement and the same direct lock flag. Lock transitions are only
 * legal through an explicit `nodes.set-lock` command earlier in the batch, so
 * a standalone replacement can never clear a lock or move locked geometry.
 * Locked groups keep their membership and lock state through a replacement.
 */
function lockedTransition(baseline: DiagramDocument, candidate: DiagramDocument): Result<void> {
  const baselineNodes = new Map(nodesOf(baseline.spec).map((node) => [node.id, node]))
  const candidateNodes = new Map(nodesOf(candidate.spec).map((node) => [node.id, node]))
  for (const [id, node] of baselineNodes) {
    const locked = isNodeLocked(baseline, id)
    const next = candidateNodes.get(id)
    if (locked) {
      if (!next) return failure('entity.locked', `/spec/${id}`, 'locked node cannot be removed')
      if (JSON.stringify(node) !== JSON.stringify(next))
        return failure('entity.locked', `/spec/${id}`, 'locked node content cannot change')
    }
    const before = baseline.scene.nodes[id]
    const after = candidate.scene.nodes[id]
    if (before && after) {
      if ((before.locked === true) !== (after.locked === true))
        return failure(
          'entity.locked',
          `/scene/nodes/${id}`,
          'lock transitions require nodes.set-lock',
        )
      if (
        locked &&
        (before.x !== after.x ||
          before.y !== after.y ||
          before.width !== after.width ||
          before.height !== after.height)
      )
        return failure('entity.locked', `/scene/nodes/${id}`, 'locked node cannot move')
    } else if (locked && before && !after) {
      return failure('entity.locked', `/scene/nodes/${id}`, 'locked node cannot lose its placement')
    }
  }
  const candidateGroups = new Map(candidate.scene.groups.map((group) => [group.id, group]))
  for (const group of baseline.scene.groups) {
    const next = candidateGroups.get(group.id)
    if (!next) {
      if (group.locked) return failure('entity.locked', `/scene/groups/${group.id}`)
      continue
    }
    if (group.locked !== next.locked) return failure('entity.locked', `/scene/groups/${group.id}`)
    if (group.locked) {
      const before = [...group.nodeIds].sort()
      const after = [...next.nodeIds].sort()
      if (before.length !== after.length || before.some((id, index) => id !== after[index]))
        return failure(
          'entity.locked',
          `/scene/groups/${group.id}`,
          'locked group keeps its members',
        )
    }
  }
  return success(undefined)
}
/** Mutates only the transaction's private candidate; the store validates the final batch. */
export function applyCommand(
  doc: DiagramDocument,
  command: EditorCommand,
): Result<DiagramDocument> {
  switch (command.type) {
    case 'document.replace-content': {
      const result = validateDocument(command.document)
      if (!result.ok) return result
      const candidate = result.value
      // Apply JSON edits the current document. Import/Open owns identity and
      // type changes, so a mismatched payload is rejected instead of rebound.
      if (candidate.format !== doc.format || candidate.schemaVersion !== doc.schemaVersion)
        return failure('replacement.schema-mismatch', '/format', 'Use import for another schema')
      if (candidate.spec.type !== doc.spec.type)
        return failure(
          'replacement.type-mismatch',
          '/spec/type',
          'Use import for another diagram type',
        )
      if (candidate.id !== doc.id)
        return failure('replacement.id-mismatch', '/id', 'Use import for another document id')
      const guarded = lockedTransition(doc, candidate)
      if (!guarded.ok) return guarded
      return success({ ...structuredClone(candidate), id: doc.id, revision: doc.revision })
    }
    case 'spec.replace': {
      const result = createDocument(command.spec, { id: doc.id, locale: doc.locale })
      if (!result.ok) return result
      const next = nodesOf(result.value.spec),
        previous = nodesOf(doc.spec)
      for (const id of new Set([...next.map((n) => n.id), ...previous.map((n) => n.id)])) {
        if (!isNodeLocked(doc, id)) continue
        const before = previous.find((n) => n.id === id),
          after = next.find((n) => n.id === id)
        if (!after) return failure('entity.locked', `/spec/${id}`, 'locked node cannot be removed')
        if (before && after && JSON.stringify(before) !== JSON.stringify(after))
          return failure('entity.locked', `/spec/${id}`)
      }
      doc.spec = result.value.spec
      if (command.references === 'prune-references') pruneReferences(doc)
      else {
        const ids = nodesOf(doc.spec).map((n) => n.id)
        doc.scene.zOrder = [
          ...doc.scene.zOrder,
          ...ids.filter((id) => !doc.scene.zOrder.includes(id)),
        ]
      }
      break
    }
    case 'nodes.move':
      if (!freeTypes.has(doc.spec.type)) return failure('capability.unsupported')
      for (const [id, point] of Object.entries(command.positions)) {
        const placement = doc.scene.nodes[id]
        if (!placement) return failure('placement.missing')
        if (isNodeLocked(doc, id)) return failure('entity.locked')
        Object.assign(placement, point)
      }
      break
    case 'nodes.set-lock':
      for (const id of command.ids) {
        if (!doc.scene.nodes[id]) return failure('placement.missing')
        doc.scene.nodes[id].locked = command.locked
      }
      break
    case 'node.resize':
      if (!freeTypes.has(doc.spec.type)) return failure('capability.unsupported')
      if (!doc.scene.nodes[command.id]) return failure('placement.missing')
      if (isNodeLocked(doc, command.id)) return failure('entity.locked')
      Object.assign(doc.scene.nodes[command.id], command.size)
      break
    case 'route.set':
      if (!freeTypes.has(doc.spec.type)) return failure('capability.unsupported')
      if (!edgesOf(doc.spec).some((e) => e.id === command.id)) return failure('reference.missing')
      doc.scene.routes[command.id] = structuredClone(command.route)
      break
    case 'group.upsert': {
      const index = doc.scene.groups.findIndex((g) => g.id === command.group.id)
      if (index < 0) doc.scene.groups.push(structuredClone(command.group))
      else doc.scene.groups[index] = structuredClone(command.group)
      break
    }
    case 'group.remove': {
      const group = doc.scene.groups.find((g) => g.id === command.id)
      if (!group) return failure('reference.missing')
      if (command.members === 'delete') {
        const groupIds = new Set([group.id]),
          queue = [group.id],
          nodeIds = new Set(group.nodeIds)
        for (let i = 0; i < queue.length; i++) {
          for (const child of doc.scene.groups.filter((g) => g.parentGroup === queue[i])) {
            if (child.locked) return failure('entity.locked')
            groupIds.add(child.id)
            queue.push(child.id)
            child.nodeIds.forEach((id) => nodeIds.add(id))
          }
        }
        if (group.locked || [...nodeIds].some((id) => isNodeLocked(doc, id)))
          return failure('entity.locked')
        const removed = getAdapter(doc.spec.type).removeNodes(doc.spec, [...nodeIds])
        if (!removed.ok) return removed
        doc.spec = removed.value
        doc.scene.groups = doc.scene.groups.filter((g) => !groupIds.has(g.id))
        pruneReferences(doc)
        break
      }
      const keptMembers = new Set(group.nodeIds)
      for (const child of doc.scene.groups.filter((g) => g.parentGroup === command.id))
        child.nodeIds.forEach((id) => keptMembers.add(id))
      if (group.locked || [...keptMembers].some((id) => isNodeLocked(doc, id)))
        return failure('entity.locked')
      doc.scene.groups = doc.scene.groups.filter((g) => g.id !== command.id)
      doc.scene.groups.forEach((g) => {
        if (g.parentGroup === command.id) {
          if (group.parentGroup) g.parentGroup = group.parentGroup
          else delete g.parentGroup
        }
      })
      break
    }
    case 'presentation.set':
      doc.presentation = structuredClone(command.presentation)
      break
    case 'metadata.set':
      doc.metadata = structuredClone(command.metadata)
      break
    case 'views.set':
      doc.views = structuredClone(command.views)
      doc.story = structuredClone(command.story)
      break
    case 'scene.set': {
      // A whole-scene write must preserve locked placements, lock flags and
      // locked group membership exactly like a content replacement would.
      const next = structuredClone(command.scene)
      const baseline = { ...doc, scene: next }
      const guarded = lockedTransition(doc, baseline)
      if (!guarded.ok) return guarded
      doc.scene = next
      break
    }
  }
  return success(doc)
}
