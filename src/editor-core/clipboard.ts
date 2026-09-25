import fragmentStructural from '../validation/fragment-structural.js'
import type {
  DiagramDocument,
  DiagramFragment,
  EntityRef,
  NodeInput,
  Point,
  RelationInput,
  Result,
} from './types'
import { failure, inspectData, limitsWith, success, validId } from './data'
import { getAdapter } from './adapters'
import { edgesOf, freeTypes, nodesOf } from './model'
import { pruneReferences } from './commands'
import { resolveDocument } from './scene'
import { validateDocument } from './validation'
export function createFragment(
  document: DiagramDocument,
  selection: EntityRef[],
): Result<DiagramFragment> {
  const checked = validateDocument(document)
  if (!checked.ok) return checked
  const doc = structuredClone(document),
    ids = new Set(selection.filter((r) => r.kind === 'node').map((r) => r.id))
  const groups = new Set<string>()
  for (const ref of selection) {
    if (ref.kind === 'edge') {
      const e = edgesOf(doc.spec).find((e) => e.id === ref.id)
      if (!e) return failure('reference.missing')
      ids.add(e.from)
      ids.add(e.to)
    }
    if (ref.kind === 'group') {
      if (!doc.scene.groups.some((g) => g.id === ref.id)) return failure('reference.missing')
      const queue = [ref.id]
      for (let i = 0; i < queue.length; i++) {
        groups.add(queue[i])
        doc.scene.groups.find((g) => g.id === queue[i])?.nodeIds.forEach((id) => ids.add(id))
        doc.scene.groups.filter((g) => g.parentGroup === queue[i]).forEach((g) => queue.push(g.id))
      }
    }
  }
  if (!ids.size) return failure('clipboard.empty')
  if ([...ids].some((id) => !nodesOf(doc.spec).some((n) => n.id === id)))
    return failure('reference.missing')
  const removed = getAdapter(doc.spec.type).removeNodes(
    doc.spec,
    nodesOf(doc.spec)
      .filter((n) => !ids.has(n.id))
      .map((n) => n.id),
  )
  if (!removed.ok) return removed
  doc.spec = removed.value
  pruneReferences(doc)
  doc.scene.groups = doc.scene.groups.filter((g) => groups.has(g.id))
  doc.scene.groups.forEach((g) => {
    if (g.parentGroup && !groups.has(g.parentGroup)) delete g.parentGroup
  })
  doc.views = []
  doc.story = []
  doc.extensions = {}
  return success({
    format: 'aesthc-diagram-fragment',
    schemaVersion: 1,
    sourceDocumentId: document.id,
    document: doc,
    selection: [...ids].map((id) => ({ kind: 'node', id })),
  })
}
export interface PasteOptions {
  idFactory: (kind: 'node' | 'edge' | 'group') => string
  offset: Point
  /** Explicit structured assignment for band/swimlane pastes. */
  structured?: {
    band?: (sourceIndex: number) => number
    lane?: (sourceLaneId: string, sourceLabel: string) => string | undefined
  }
}
export function pasteFragment(
  document: DiagramDocument,
  input: unknown,
  options: PasteOptions,
): Result<DiagramDocument> {
  const checked = validateDocument(document)
  if (!checked.ok) return checked
  const unsafe = inspectData(input, limitsWith())
  if (unsafe.length) return { ok: false, diagnostics: unsafe }
  if (!fragmentStructural(input)) return failure('clipboard.invalid')
  const fragment = input as DiagramFragment,
    validated = validateDocument(fragment.document)
  if (!validated.ok) return validated
  if (document.spec.type !== fragment.document.spec.type) return failure('clipboard.type')
  if (!Number.isFinite(options.offset.x) || !Number.isFinite(options.offset.y))
    return failure('layout.range')
  const free = freeTypes.has(document.spec.type)
  const doc = structuredClone(document),
    adapter = getAdapter(doc.spec.type),
    source = fragment.document
  const scene = free ? resolveDocument(source, { quality: 'edit', requestId: 'paste' }) : null
  if (free && !scene!.ok) return scene!
  const nodeIds = new Map<string, string>(),
    groupIds = new Map<string, string>()
  const used = new Set([
    ...nodesOf(doc.spec).map((n) => n.id),
    ...edgesOf(doc.spec).map((e) => e.id!),
    ...doc.scene.groups.map((g) => g.id),
  ])
  function allocate(kind: 'node' | 'edge' | 'group'): string | undefined {
    for (let attempt = 0; attempt < 32; attempt++) {
      const id = options.idFactory(kind)
      if (!validId(id) || used.has(id)) continue
      used.add(id)
      return id
    }
  }
  const targetBands =
    doc.spec.type === 'band' ? (doc.spec.bands as Array<{ title: string }>).length : 0
  const sourceLanes =
    source.spec.type === 'swimlane'
      ? (source.spec.lanes as Array<{ id: string; label: string }>)
      : []
  const targetLanes =
    doc.spec.type === 'swimlane' ? (doc.spec.lanes as Array<{ id: string; label: string }>) : []
  const laneMatch = (sourceLaneId: string, sourceLabel: string): string | undefined => {
    if (options.structured?.lane) return options.structured.lane(sourceLaneId, sourceLabel)
    if (!targetLanes.length) return undefined
    const byLabel = targetLanes.find((lane) => lane.label === sourceLabel)
    if (byLabel) return byLabel.id
    const sourceIndex = sourceLanes.findIndex((lane) => lane.id === sourceLaneId)
    if (sourceIndex >= 0 && sourceIndex < targetLanes.length) return targetLanes[sourceIndex].id
    return undefined
  }
  for (const node of nodesOf(source.spec)) {
    const id = allocate('node')
    if (!id) return failure('id.collision')
    nodeIds.set(node.id, id)
    const copy = structuredClone(node) as typeof node & { band?: number; lane?: string }
    copy.id = id
    if (doc.spec.type === 'band') {
      const band = node as unknown as { band: number }
      copy.band =
        options.structured?.band?.(band.band) ?? Math.min(band.band, Math.max(0, targetBands - 1))
    }
    if (doc.spec.type === 'swimlane') {
      const laneId = (node as unknown as { lane: string }).lane
      const sourceLane = sourceLanes.find((lane) => lane.id === laneId)
      const mapped = laneMatch(laneId, sourceLane?.label ?? '')
      if (!mapped) return failure('lane.missing')
      copy.lane = mapped
    }
    const inserted = adapter.insertNode(doc.spec, {
      diagramType: doc.spec.type,
      node: copy,
    } as NodeInput)
    if (!inserted.ok) return inserted
    doc.spec = inserted.value
    if (free) {
      const placement = (scene as Extract<typeof scene, { ok: true }>).value.layout.nodeById[
        node.id
      ]
      doc.scene.nodes[id] = {
        x: placement.x + options.offset.x,
        y: placement.y + options.offset.y,
        width: placement.w,
        height: placement.h,
        locked: false,
      }
    }
    doc.scene.zOrder.push(id)
    if (source.metadata.nodes[node.id])
      doc.metadata.nodes[id] = structuredClone(source.metadata.nodes[node.id])
    if (source.metadata.visuals[node.id])
      doc.metadata.visuals[id] = structuredClone(source.metadata.visuals[node.id])
  }
  for (const edge of edgesOf(source.spec)) {
    const id = allocate('edge')
    if (!id) return failure('id.collision')
    const inserted = adapter.insertRelation(doc.spec, {
      diagramType: doc.spec.type,
      relation: {
        ...structuredClone(edge),
        id,
        from: nodeIds.get(edge.from)!,
        to: nodeIds.get(edge.to)!,
      },
    } as RelationInput)
    if (!inserted.ok) return inserted
    doc.spec = inserted.value
    if (source.metadata.edges[edge.id!])
      doc.metadata.edges[id] = structuredClone(source.metadata.edges[edge.id!])
    const route = source.scene.routes[edge.id!]
    if (route && free) {
      const copy = structuredClone(route)
      if (copy.mode === 'manual') {
        copy.points = copy.points.map((p) => ({
          x: p.x + options.offset.x,
          y: p.y + options.offset.y,
        }))
        if (copy.label) {
          copy.label.x += options.offset.x
          copy.label.y += options.offset.y
        }
      }
      doc.scene.routes[id] = copy
    }
  }
  for (const group of source.scene.groups) {
    const id = allocate('group')
    if (!id) return failure('id.collision')
    groupIds.set(group.id, id)
  }
  if (free)
    for (const group of source.scene.groups)
      doc.scene.groups.push({
        ...structuredClone(group),
        id: groupIds.get(group.id)!,
        nodeIds: group.nodeIds.map((id) => nodeIds.get(id)!),
        ...(group.parentGroup ? { parentGroup: groupIds.get(group.parentGroup)! } : {}),
        locked: false,
      })
  if (free) doc.scene.mode = 'hybrid'
  return validateDocument(doc)
}
