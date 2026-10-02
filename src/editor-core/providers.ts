import type { DiagramDocument, DiagramScene, Result } from './types'
import { failure, freezeData, success } from './data'
import { applyLayoutResult } from './layout-provider'
import { validateDocument } from './validation'

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
 * Settles when either the provider settles or the signal aborts. A provider
 * that never settles cannot hang the caller: an abort produces a bounded
 * `operation.aborted` rejection and the provider promise is left running with
 * its now-aborted signal. Listeners are always detached.
 */
function raceWithAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error('operation.aborted'))
  return new Promise<T>((resolve, reject) => {
    function onAbort() {
      cleanup()
      reject(new Error('operation.aborted'))
    }
    function cleanup() {
      signal.removeEventListener('abort', onAbort)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    work.then(
      (value) => {
        cleanup()
        resolve(value)
      },
      (error) => {
        cleanup()
        reject(error)
      },
    )
  })
}
const isProduction = () => typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
/**
 * Runs a registered provider under the strict apply contract: the requestId
 * must be the latest, the baseRevision must match, foreign node ids are
 * rejected and locked nodes can never move. Rejections are isolated: the input
 * document is returned untouched (last-good) so the caller can retry with
 * another provider or the same one.
 *
 * Hardening: a request aborted before invocation performs zero provider work;
 * the provider only receives an isolated, development-frozen snapshot of the
 * validated document; cancellation is forwarded to the provider signal; and
 * the returned scene is published only after the whole result document
 * validates. Listeners are detached on every exit path.
 */
export async function runRegisteredLayout(
  document: DiagramDocument,
  registry: LayoutProviderRegistry,
  providerId: string,
  options: RegisteredLayoutOptions,
): Promise<Result<RegisteredLayoutOutcome>> {
  const provider = registry.get(providerId)
  if (!provider) return failure('provider.unknown')
  // Validate the caller's document before any provider code can run.
  const checked = validateDocument(document)
  if (!checked.ok) return checked
  if (options.signal?.aborted) return failure('operation.aborted')
  const requestId = options.requestId ?? `${providerId}:${document.revision}`
  const controller = new AbortController()
  const forwardAbort = () => controller.abort()
  options.signal?.addEventListener('abort', forwardAbort, { once: true })
  try {
    if (controller.signal.aborted) return failure('operation.aborted')
    // The provider works on an isolated snapshot: mutating it can no longer
    // touch the caller's document. Development builds freeze it to fail fast.
    const snapshot = structuredClone(checked.value)
    if (!isProduction()) freezeData(snapshot)
    const scene = await raceWithAbort(
      provider.run({ document: snapshot, requestId, signal: controller.signal }),
      controller.signal,
    )
    if (options.signal?.aborted || controller.signal.aborted)
      return failure('operation.aborted')
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
  } catch (error) {
    if (controller.signal.aborted) return failure('operation.aborted')
    return success({
      status: 'rejected',
      document,
      diagnostics: [
        error instanceof Error && error.message === 'operation.aborted'
          ? 'operation.aborted'
          : 'provider.failed',
      ],
    })
  } finally {
    options.signal?.removeEventListener('abort', forwardAbort)
  }
}
