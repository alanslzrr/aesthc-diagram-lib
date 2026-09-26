import type { DiagramDocument, NamedView, Result, StoryStep, Viewport } from '../editor-core/types'
import { failure, success } from '../editor-core/data'
import { graphSnapshot, findRoute } from '../graph'
import type { GraphSnapshot } from '../graph'

/** Reading-only lens: filters what is dimmed, never what queries traverse. */
export interface ViewerLens {
  nodeRoles?: string[]
  tags?: string[]
}
export function lensMatches(document: DiagramDocument, nodeId: string, lens: ViewerLens): boolean {
  const metadata = document.metadata.nodes[nodeId]
  const roles = metadata?.roles ?? []
  const tags = metadata?.tags ?? []
  if (lens.nodeRoles?.length && !lens.nodeRoles.some((role) => roles.includes(role))) return false
  if (lens.tags?.length && !lens.tags.some((tag) => tags.includes(tag))) return false
  return true
}
/** All authored roles and tags in the document, in first-appearance order. */
export function lensFacets(document: DiagramDocument): { roles: string[]; tags: string[] } {
  const roles: string[] = [],
    tags: string[] = []
  for (const id of Object.keys(document.metadata.nodes)) {
    const metadata = document.metadata.nodes[id]
    for (const role of metadata?.roles ?? []) if (!roles.includes(role)) roles.push(role)
    for (const tag of metadata?.tags ?? []) if (!tags.includes(tag)) tags.push(tag)
  }
  return { roles, tags }
}
export interface ResolvedView {
  view: NamedView
  focusNodes: Set<string>
  focusEdges: Set<string>
}
export function resolveView(document: DiagramDocument, viewId: string): Result<ResolvedView> {
  const view = document.views.find((candidate) => candidate.id === viewId)
  if (!view) return failure('view.reference')
  return success({
    view,
    focusNodes: new Set(view.focus.nodeIds),
    focusEdges: new Set(view.focus.edgeIds),
  })
}
export interface StoryTransition {
  step: StoryStep
  view: NamedView
  /** Authored direct route between the previous and next focus, when it exists.
   * Never inferred: no direct route is reported truthfully as `directRoute: null`. */
  directRoute: { nodeIds: string[]; edgeIds: string[] } | null
}
/** Truthful story description: transitions never invent edges; orphan steps
 * (missing view or broken route reference) are rejected by ID. */
export function describeStoryStep(
  document: DiagramDocument,
  graph: GraphSnapshot,
  step: StoryStep,
): Result<StoryTransition> {
  const view = document.views.find((candidate) => candidate.id === step.viewId)
  if (!view) return failure('view.reference')
  if (step.routeEdgeIds?.length) {
    const route = findRoute(graph, step.routeEdgeIds[0], step.routeEdgeIds[0])
    if (!route.ok) return route
  }
  const focusNodes = [...view.focus.nodeIds]
  if (focusNodes.length < 2) return success({ step, view, directRoute: null })
  const route = findRoute(graph, focusNodes[0], focusNodes[1])
  if (!route.ok) return route
  return success({
    step,
    view,
    directRoute: route.value.status === 'found' ? route.value : null,
  })
}
export interface ViewerState {
  viewId?: string
  focus?: { nodeIds: string[]; edgeIds: string[] }
  camera?: Viewport
}
/** URL-safe viewer state codec. Components are percent-escaped individually so
 * IDs with `~`, `%`, `/` and Unicode survive a round-trip. */
export function encodeViewerState(state: ViewerState): string {
  const parts: string[] = []
  if (state.viewId !== undefined) parts.push(`v=${encodeURIComponent(state.viewId)}`)
  if (state.focus !== undefined) {
    parts.push(
      `f=${encodeURIComponent([...state.focus.nodeIds, ...state.focus.edgeIds].join(','))}`,
    )
    parts.push(
      `k=${encodeURIComponent(`${state.focus.nodeIds.length}:${state.focus.edgeIds.length}`)}`,
    )
  }
  if (state.camera !== undefined)
    parts.push(
      `c=${encodeURIComponent(`${state.camera.x},${state.camera.y},${state.camera.zoom}`)}`,
    )
  return parts.join('&')
}
/**
 * Decode against the current document. Unknown views degrade to the overview
 * (focus/camera are dropped, never guessed). A contradiction — a viewId that
 * exists together with a focus that differs from the named view, or a focus
 * whose ids do not exist — is rejected instead of restoring ambiguously.
 */
export function decodeViewerState(text: string, document: DiagramDocument): Result<ViewerState> {
  if (!text) return success({})
  const parsed = new URLSearchParams(text)
  const viewId = parsed.get('v') ?? undefined
  const focusText = parsed.get('f')
  const kinds = parsed.get('k')
  const cameraText = parsed.get('c')
  let focus: ViewerState['focus']
  if (focusText !== null && focusText !== undefined) {
    const ids = focusText.split(',').filter(Boolean)
    let nodeCount = ids.length
    if (kinds !== null && kinds !== undefined) {
      const [nodes, edges] = kinds.split(':').map(Number)
      if (!Number.isInteger(nodes) || !Number.isInteger(edges) || nodes + edges !== ids.length)
        return failure('query.invalid')
      nodeCount = nodes
    }
    focus = { nodeIds: ids.slice(0, nodeCount), edgeIds: ids.slice(nodeCount) }
    const nodeIds = new Set(document.spec ? graphNodeIds(document) : [])
    const edgeIds = new Set(document.spec ? graphEdgeIds(document) : [])
    if (
      focus.nodeIds.some((id) => !nodeIds.has(id)) ||
      focus.edgeIds.some((id) => !edgeIds.has(id))
    )
      return failure('query.invalid')
  }
  let camera: Viewport | undefined
  if (cameraText !== null && cameraText !== undefined) {
    const [x, y, zoom] = cameraText.split(',').map(Number)
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(zoom) ||
      zoom < 0.1 ||
      zoom > 4
    )
      return failure('layout.range')
    camera = { x, y, zoom }
  }
  if (viewId !== undefined) {
    const view = document.views.find((candidate) => candidate.id === viewId)
    if (!view) {
      return success({ camera })
    }
    if (focus !== undefined) {
      const matches =
        view.focus.nodeIds.length === focus.nodeIds.length &&
        view.focus.edgeIds.length === focus.edgeIds.length &&
        [...view.focus.nodeIds].every((id, index) => id === focus!.nodeIds[index]) &&
        [...view.focus.edgeIds].every((id, index) => id === focus!.edgeIds[index])
      if (!matches) return failure('query.invalid')
    }
    return success({ viewId, focus: focus ?? { ...view.focus }, camera })
  }
  if (focus !== undefined) return success({ focus, camera })
  return success({ camera })
}
function graphNodeIds(document: DiagramDocument): string[] {
  return graphSnapshot(document).nodeIds
}
function graphEdgeIds(document: DiagramDocument): string[] {
  return graphSnapshot(document).edges.map((edge) => edge.id)
}
