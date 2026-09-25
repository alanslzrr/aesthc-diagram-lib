import type { DiagramDocument, DiagramScene, Result } from './types'
import { failure, success } from './data'
import { validateDocument } from './validation'
import { isNodeLocked } from './commands'

export interface LayoutProviderResult {
  requestId: string
  baseRevision: number
  scene: DiagramScene
}
export interface LayoutProvider {
  /** Stable request identity: a late result with an older requestId is ignored. */
  requestId: string
  baseRevision: number
  run(): Promise<LayoutProviderResult>
  cancel(): void
}
/**
 * Applies an asynchronous layout result under a strict contract: the requestId
 * must be the latest issued, the baseRevision must match the current document,
 * unknown node ids are rejected and locked nodes (directly or through their
 * group) can never move. A rejection never mutates the document or the history.
 */
export function applyLayoutResult(
  document: DiagramDocument,
  result: LayoutProviderResult,
  options: { expectedRevision: number },
): Result<DiagramDocument> {
  if (result.baseRevision !== options.expectedRevision) return failure('revision.stale')
  const checked = validateDocument(document)
  if (!checked.ok) return checked
  const current = checked.value
  const placed = result.scene.nodes
  const known = new Set(
    current.spec.type === 'graph' ? current.spec.nodes.map((n) => n.id) : current.scene.zOrder,
  )
  for (const id of Object.keys(placed)) {
    if (!known.has(id)) return failure('reference.missing')
    if (isNodeLocked(current, id)) return failure('entity.locked')
  }
  const next: DiagramDocument = structuredClone(current)
  next.scene = {
    ...next.scene,
    mode: 'manual',
    nodes: { ...next.scene.nodes, ...structuredClone(placed) },
    zOrder: result.scene.zOrder ?? next.scene.zOrder,
  }
  return success(next)
}
/** Runs a provider under the latest-wins policy: an older requestId or an
 * aborted provider never publishes its result. The document keeps its last
 * valid scene on rejection or cancellation. */
export async function runLayoutProvider(
  document: DiagramDocument,
  provider: LayoutProvider,
  options: {
    expectedRevision: number
    latestRequestId: () => string
    onResult: (document: DiagramDocument) => void
    onError: (diagnostic: string) => void
  },
): Promise<void> {
  const result = await provider.run()
  if (provider.requestId !== options.latestRequestId()) return
  if (result.requestId !== provider.requestId) return
  const applied = applyLayoutResult(document, result, {
    expectedRevision: options.expectedRevision,
  })
  if (applied.ok) options.onResult(applied.value)
  else options.onError(applied.diagnostics.map((d) => d.code).join(', '))
}
export function createLayoutProvider(
  requestId: string,
  baseRevision: number,
  work: (signal: { aborted: boolean }) => Promise<DiagramScene>,
): LayoutProvider {
  let aborted = false
  return {
    requestId,
    baseRevision,
    async run() {
      const scene = await work({
        get aborted() {
          return aborted
        },
      })
      if (aborted) throw new Error('operation.aborted')
      return { requestId, baseRevision, scene }
    },
    cancel() {
      aborted = true
    },
  }
}
