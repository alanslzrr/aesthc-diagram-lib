import type { DiagramDocument, EditorStore, Result } from '../editor-core/types'
import { canonicalizeContent, importDocument, serializeDocument } from '../editor-core/document'
import { failure, success } from '../editor-core/data'
import { validateDocument } from '../editor-core/validation'
export interface StoredDocument {
  document: DiagramDocument
  token: string
}
export type SaveResult =
  | { status: 'saved'; token: string }
  | { status: 'conflict'; current: StoredDocument }
  | { status: 'unavailable'; reason: 'quota' | 'denied' | 'offline' | 'unknown' }
export interface StorageAdapter {
  load(key: string, signal?: AbortSignal): Promise<Result<StoredDocument | null>>
  save(
    key: string,
    document: DiagramDocument,
    expectedToken: string | null,
    signal?: AbortSignal,
  ): Promise<SaveResult>
  remove(key: string, expectedToken: string, signal?: AbortSignal): Promise<Result<void>>
  subscribe?(key: string, listener: (token: string | null) => void): () => void
}
export function createMemoryStorage(): StorageAdapter {
  const values = new Map<string, StoredDocument>(),
    listeners = new Map<string, Set<(token: string | null) => void>>()
  let ordinal = 0
  const emit = (key: string, token: string | null) => listeners.get(key)?.forEach((l) => l(token))
  return {
    async load(key, signal) {
      return signal?.aborted
        ? failure('operation.aborted')
        : success(structuredClone(values.get(key) ?? null))
    },
    async save(key, document, expectedToken, signal) {
      if (signal?.aborted || !validateDocument(document).ok)
        return { status: 'unavailable', reason: 'unknown' }
      const current = values.get(key)
      if ((current?.token ?? null) !== expectedToken)
        return current
          ? { status: 'conflict', current: structuredClone(current) }
          : { status: 'unavailable', reason: 'unknown' }
      const token = String(++ordinal)
      values.set(key, { token, document: structuredClone(document) })
      emit(key, token)
      return { status: 'saved', token }
    },
    async remove(key, expectedToken, signal) {
      if (signal?.aborted) return failure('operation.aborted')
      if (values.get(key)?.token !== expectedToken) return failure('storage.conflict')
      values.delete(key)
      emit(key, null)
      return success(undefined)
    },
    subscribe(key, listener) {
      const set = listeners.get(key) ?? new Set()
      set.add(listener)
      listeners.set(key, set)
      return () => {
        set.delete(listener)
        if (!set.size) listeners.delete(key)
      }
    },
  }
}
/** Browser writes require Web Locks: localStorage by itself does not provide cross-tab CAS. */
export function createLocalStorageAdapter(namespace: string): StorageAdapter {
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(namespace)) throw new TypeError('Invalid storage namespace')
  const keyFor = (key: string) => `adl-document-v1:${namespace}:${encodeURIComponent(key)}`
  const available = () =>
    typeof window !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.locks
  async function read(key: string): Promise<Result<StoredDocument | null>> {
    try {
      const text = window.localStorage.getItem(keyFor(key))
      if (text === null) return success(null)
      if (new TextEncoder().encode(text).length > 1048576 + 4096) return failure('storage.corrupt')
      const envelope = JSON.parse(text)
      if (envelope?.schemaVersion !== 1 || typeof envelope.token !== 'string' || !envelope.token)
        return failure('storage.corrupt')
      const parsed = importDocument(envelope.document, { id: 'storage', locale: 'en' })
      if (!parsed.ok) return failure('storage.corrupt')
      return success({ document: parsed.value.document, token: envelope.token })
    } catch {
      return failure('storage.denied')
    }
  }
  return {
    async load(key, signal) {
      if (signal?.aborted) return failure('operation.aborted')
      if (typeof window === 'undefined') return failure('storage.unavailable')
      return read(key)
    },
    async save(key, document, expectedToken, signal) {
      if (!available()) return { status: 'unavailable', reason: 'denied' }
      if (!validateDocument(document).ok) return { status: 'unavailable', reason: 'unknown' }
      try {
        return await navigator.locks.request(keyFor(key), signal ? { signal } : {}, async () => {
          const current = await read(key)
          if (!current.ok) return { status: 'unavailable' as const, reason: 'unknown' as const }
          if ((current.value?.token ?? null) !== expectedToken)
            return current.value
              ? { status: 'conflict' as const, current: current.value }
              : { status: 'unavailable' as const, reason: 'unknown' as const }
          if (signal?.aborted) return { status: 'unavailable' as const, reason: 'unknown' as const }
          const token = crypto.randomUUID()
          window.localStorage.setItem(
            keyFor(key),
            JSON.stringify({
              schemaVersion: 1,
              token,
              document: JSON.parse(serializeDocument(document)),
            }),
          )
          return { status: 'saved' as const, token }
        })
      } catch (error) {
        return {
          status: 'unavailable',
          reason:
            error instanceof DOMException && error.name === 'QuotaExceededError'
              ? 'quota'
              : 'denied',
        }
      }
    },
    async remove(key, expectedToken, signal) {
      if (!available()) return failure('storage.unavailable')
      try {
        return await navigator.locks.request(keyFor(key), signal ? { signal } : {}, async () => {
          const current = await read(key)
          if (!current.ok) return current
          if (current.value?.token !== expectedToken) return failure('storage.conflict')
          window.localStorage.removeItem(keyFor(key))
          return success(undefined)
        })
      } catch {
        return failure('storage.denied')
      }
    },
    subscribe(key, listener) {
      if (typeof window === 'undefined') return () => {}
      const handler = (event: StorageEvent) => {
        if (event.storageArea === window.localStorage && event.key === keyFor(key)) {
          void read(key).then((r) => {
            if (r.ok) listener(r.value?.token ?? null)
          })
        }
      }
      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    },
  }
}
export type AutosaveState =
  | { status: 'idle' | 'saving' }
  | { status: 'saved'; token: string }
  | { status: 'conflict'; current: StoredDocument }
  | { status: 'unavailable'; reason: string }
export function createAutosave(
  store: EditorStore,
  adapter: StorageAdapter,
  options: {
    key: string
    token: string | null
    delay?: number
    onState?: (state: AutosaveState) => void
  },
) {
  let token = options.token,
    timer: ReturnType<typeof setTimeout> | undefined,
    disposed = false,
    saving = false,
    blocked = false,
    pending: DiagramDocument | undefined
  const controller = new AbortController()
  const publish = (state: AutosaveState) => {
    if (!disposed) options.onState?.(state)
  }
  async function flush() {
    if (disposed || blocked || saving || !pending) return
    const document = pending
    pending = undefined
    saving = true
    publish({ status: 'saving' })
    try {
      const result = await adapter.save(options.key, document, token, controller.signal)
      if (disposed) return
      if (result.status === 'saved') {
        token = result.token
        store.markSaved(document)
        publish({ status: 'saved', token })
      } else {
        blocked = true
        publish(result)
      }
    } catch {
      blocked = true
      publish({ status: 'unavailable', reason: 'unknown' })
    } finally {
      saving = false
      if (!disposed && !blocked && pending) void flush()
    }
  }
  const unsubscribe = store.onCommit((result) => {
    if (disposed || blocked) return
    pending = structuredClone(result.document)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      void flush()
    }, options.delay ?? 750)
  })
  return {
    async flush() {
      if (timer) clearTimeout(timer)
      timer = undefined
      await flush()
    },
    retry(nextToken = token) {
      token = nextToken
      blocked = false
      pending = structuredClone(store.getSnapshot().document)
      void flush()
    },
    isCurrent(document: DiagramDocument) {
      return canonicalizeContent(document) === canonicalizeContent(store.getSnapshot().document)
    },
    dispose() {
      disposed = true
      controller.abort()
      if (timer) clearTimeout(timer)
      unsubscribe()
      pending = undefined
    },
  }
}
