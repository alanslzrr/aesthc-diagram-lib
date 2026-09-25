import type { DiagramDocument, DiagramScene, Result } from './types'
import { failure, success } from './data'
import { applyLayoutResult } from './layout-provider'

/** Explicitly registered async layout provider. Registration is per instance;
 * a provider is never discovered from the document or the network. */
export interface RegisteredLayoutProvider {
  id: string
  run(input: {
    document: DiagramDocument
    requestId: string
    signal: AbortSignal
  }): Promise<DiagramScene>
}
export interface LayoutProviderRegistry {
  register(provider: RegisteredLayoutProvider): Result<void>
  get(id: string): RegisteredLayoutProvider | undefined
  ids(): string[]
}
export function createLayoutProviderRegistry(): LayoutProviderRegistry {
  const providers = new Map<string, RegisteredLayoutProvider>()
  return {
    register(provider) {
      if (!provider.id || typeof provider.run !== 'function') return failure('provider.invalid')
      if (providers.has(provider.id)) return failure('provider.duplicate')
      providers.set(provider.id, provider)
      return success(undefined)
    },
    get(id) {
      return providers.get(id)
    },
    ids() {
      return [...providers.keys()]
    },
  }
}
export interface RegisteredLayoutOptions {
  expectedRevision: number
  /** Latest issued request id; an older request never publishes. */
  latestRequestId: () => string
  /** Current document revision; a change while the provider was pending
   * rejects the result even if the request id still matches. */
  latestRevision?: () => number
  requestId?: string
  signal?: AbortSignal
}
export interface RegisteredLayoutOutcome {
  status: 'applied' | 'rejected'
  document: DiagramDocument
  diagnostics: string[]
}
/**
 * Runs a registered provider under the strict apply contract: the requestId
 * must be the latest, the baseRevision must match, foreign node ids are
 * rejected and locked nodes can never move. Rejections are isolated: the input
 * document is returned untouched (last-good) so the caller can retry with
 * another provider or the same one.
 */
export async function runRegisteredLayout(
  document: DiagramDocument,
  registry: LayoutProviderRegistry,
  providerId: string,
  options: RegisteredLayoutOptions,
): Promise<Result<RegisteredLayoutOutcome>> {
  const provider = registry.get(providerId)
  if (!provider) return failure('provider.unknown')
  const requestId = options.requestId ?? `${providerId}:${document.revision}`
  const controller = new AbortController()
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true })
  let scene: DiagramScene
  try {
    scene = await provider.run({
      document,
      requestId,
      signal: controller.signal,
    })
  } catch (error) {
    return success({
      status: 'rejected',
      document,
      diagnostics: [
        error instanceof Error && error.message === 'operation.aborted'
          ? 'operation.aborted'
          : 'provider.failed',
      ],
    })
  }
  if (options.signal?.aborted) return failure('operation.aborted')
  const currentRevision = options.latestRevision?.() ?? document.revision
  if (currentRevision !== options.expectedRevision)
    return success({ status: 'rejected', document, diagnostics: ['revision.stale'] })
  if (requestId !== options.latestRequestId())
    return success({ status: 'rejected', document, diagnostics: ['provider.stale'] })
  const applied = applyLayoutResult(
    document,
    { requestId, baseRevision: options.expectedRevision, scene },
    { expectedRevision: options.expectedRevision },
  )
  if (!applied.ok)
    return success({
      status: 'rejected',
      document,
      diagnostics: applied.diagnostics.map((diagnostic) => diagnostic.code),
    })
  return success({ status: 'applied', document: applied.value, diagnostics: [] })
}
