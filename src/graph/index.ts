import type { DiagramEdge } from '../types'
import type { DiagramDocument, Result } from '../editor-core/types'
import { edgesOf, nodesOf } from '../editor-core/model'
import { failure, freezeData, success } from '../editor-core/data'
import { validateDocument } from '../editor-core/validation'
export interface GraphFilter {
  variants?: Array<'main' | 'branch'>
  nodeRoles?: string[]
}
export interface GraphNodeInfo {
  id: string
  label: string
  kind?: string
  description?: string
}
export interface GraphSnapshot {
  documentId: string
  revision: number
  nodeIds: string[]
  /** Authored order with the same role filter applied to `nodeIds`. */
  nodes: GraphNodeInfo[]
  edges: Array<DiagramEdge & { id: string }>
  filter?: GraphFilter
}
export interface RouteResult {
  status: 'found' | 'unreachable'
  documentId: string
  revision: number
  nodeIds: string[]
  edgeIds: string[]
  filter?: GraphFilter
}
export interface ReachResult {
  documentId: string
  revision: number
  origin: string
  direction: 'upstream' | 'downstream'
  nodeIds: string[]
  edgeIds: string[]
  depth: Record<string, number>
  truncated: boolean
  filter?: GraphFilter
}
export function graphSnapshot(document: DiagramDocument, filter?: GraphFilter): GraphSnapshot {
  const checked = validateDocument(document)
  if (!checked.ok) throw new TypeError(checked.diagnostics.map((d) => d.code).join(', '))
  const nodes = nodesOf(document.spec)
    .filter(
      (n) =>
        !filter?.nodeRoles?.length ||
        filter.nodeRoles.some((r) => document.metadata.nodes[n.id]?.roles.includes(r)),
    )
    .map((n) => n.id)
  const ids = new Set(nodes)
  const info = nodesOf(document.spec).filter((n) => ids.has(n.id))
  return freezeData({
    documentId: document.id,
    revision: document.revision,
    nodeIds: nodes,
    nodes: info.map((n) => ({
      id: n.id,
      label: n.label ?? '',
      ...(n.kind ? { kind: n.kind } : {}),
      ...((n as { description?: string }).description
        ? { description: (n as { description?: string }).description }
        : {}),
    })),
    edges: edgesOf(document.spec)
      .filter(
        (e) =>
          ids.has(e.from) &&
          ids.has(e.to) &&
          (!filter?.variants?.length || filter.variants.includes(e.variant ?? 'main')),
      )
      .map((e) => ({ ...e, id: e.id! })),
    ...(filter ? { filter: structuredClone(filter) } : {}),
  })
}
function identity(graph: GraphSnapshot) {
  return {
    documentId: graph.documentId,
    revision: graph.revision,
    ...(graph.filter ? { filter: structuredClone(graph.filter) } : {}),
  }
}
export function findRoute(graph: GraphSnapshot, from: string, to: string): Result<RouteResult> {
  if (!graph.nodeIds.includes(from) || !graph.nodeIds.includes(to))
    return failure('graph.unknown-node')
  const queue = [from],
    seen = new Set(queue),
    parents = new Map<string, { node: string; edge: string }>()
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i]
    if (node === to) {
      const nodeIds = [to],
        edgeIds: string[] = []
      let current = to
      while (current !== from) {
        const parent = parents.get(current)!
        edgeIds.push(parent.edge)
        nodeIds.push(parent.node)
        current = parent.node
      }
      return success({
        ...identity(graph),
        status: 'found',
        nodeIds: nodeIds.reverse(),
        edgeIds: edgeIds.reverse(),
      })
    }
    for (const edge of graph.edges)
      if (edge.from === node && !seen.has(edge.to)) {
        seen.add(edge.to)
        parents.set(edge.to, { node, edge: edge.id })
        queue.push(edge.to)
      }
  }
  return success({ ...identity(graph), status: 'unreachable', nodeIds: [], edgeIds: [] })
}
export function findReach(
  graph: GraphSnapshot,
  origin: string,
  direction: 'upstream' | 'downstream',
  maxHops = Number.MAX_SAFE_INTEGER,
): Result<ReachResult> {
  if (!graph.nodeIds.includes(origin)) return failure('graph.unknown-node')
  if (
    !Number.isSafeInteger(maxHops) ||
    maxHops < 0 ||
    !['upstream', 'downstream'].includes(direction)
  )
    return failure('query.invalid')
  const nodeIds = [origin],
    edgeIds: string[] = [],
    depth: Record<string, number> = Object.create(null),
    seenEdges = new Set<string>()
  depth[origin] = 0
  let truncated = false
  for (let i = 0; i < nodeIds.length; i++) {
    const node = nodeIds[i]
    for (const edge of graph.edges) {
      if ((direction === 'downstream' ? edge.from : edge.to) !== node) continue
      const next = direction === 'downstream' ? edge.to : edge.from
      if (depth[node] >= maxHops) {
        if (depth[next] === undefined) truncated = true
        continue
      }
      if (!seenEdges.has(edge.id)) {
        seenEdges.add(edge.id)
        edgeIds.push(edge.id)
      }
      if (depth[next] === undefined) {
        depth[next] = depth[node] + 1
        nodeIds.push(next)
      }
    }
  }
  return success({ ...identity(graph), origin, direction, nodeIds, edgeIds, depth, truncated })
}
export type SearchMatch =
  'exact-id' | 'label-prefix' | 'label-substring' | 'kind-prefix' | 'kind-substring'
export interface SearchResult {
  id: string
  label: string
  kind?: string
  match: SearchMatch
}
/** Unicode case-insensitive search in authored order: exact ID, label prefix,
 * label substring, kind prefix, kind substring. The original text is kept. */
export function searchNodes(graph: GraphSnapshot, query: string, limit = 20): SearchResult[] {
  const needle = query.toLocaleLowerCase()
  if (!needle) return []
  const matched: SearchResult[] = []
  const rank: Record<SearchMatch, SearchResult[]> = {
    'exact-id': [],
    'label-prefix': [],
    'label-substring': [],
    'kind-prefix': [],
    'kind-substring': [],
  }
  for (const node of graph.nodes) {
    if (node.id.toLocaleLowerCase() === needle)
      rank['exact-id'].push({ ...node, match: 'exact-id' })
    else if (node.label.toLocaleLowerCase().startsWith(needle))
      rank['label-prefix'].push({ ...node, match: 'label-prefix' })
    else if (node.label.toLocaleLowerCase().includes(needle))
      rank['label-substring'].push({ ...node, match: 'label-substring' })
    else if (node.kind?.toLocaleLowerCase().startsWith(needle))
      rank['kind-prefix'].push({ ...node, match: 'kind-prefix' })
    else if (node.kind?.toLocaleLowerCase().includes(needle))
      rank['kind-substring'].push({ ...node, match: 'kind-substring' })
  }
  for (const key of Object.keys(rank) as SearchMatch[])
    for (const entry of rank[key]) {
      matched.push(entry)
      if (matched.length >= limit) return matched
    }
  return matched
}
export interface NodeRelations {
  incoming: Array<{ edgeId: string; from: string }>
  outgoing: Array<{ edgeId: string; to: string }>
}
/** Authored edge order; parallel relations keep their distinct IDs. */
export function relationsOf(graph: GraphSnapshot, nodeId: string): Result<NodeRelations> {
  if (!graph.nodeIds.includes(nodeId)) return failure('graph.unknown-node')
  const incoming: NodeRelations['incoming'] = [],
    outgoing: NodeRelations['outgoing'] = []
  for (const edge of graph.edges) {
    if (edge.to === nodeId) incoming.push({ edgeId: edge.id, from: edge.from })
    if (edge.from === nodeId) outgoing.push({ edgeId: edge.id, to: edge.to })
  }
  return success({ incoming, outgoing })
}
