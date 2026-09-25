import type { DiagramDocument, Result } from '../editor-core/types'
import { createDocument } from '../editor-core/document'
import { canonical, failure, success } from '../editor-core/data'
import { validateDocument } from '../editor-core/validation'
import type { DiagramSpec } from '../types'

/** Bounded share envelopes: `d=` carries a versioned document, `s=` stays
 * readable for legacy spec links. Expansion and time are capped; every reader
 * is released, even on abort. */
export const SHARE_LIMITS = {
  encoded: 65536,
  expanded: 262144,
  timeoutMs: 5000,
  version: 1,
}
export interface ShareDecodeOptions {
  clock?: () => number
  timeoutMs?: number
  limits?: { encoded: number; expanded: number }
}
export interface DecodedShare {
  document: DiagramDocument
  source: 'd' | 's'
  version: number
}
const base64url = (bytes: Uint8Array): string => {
  let binary = ''
  for (let start = 0; start < bytes.length; start += 8192)
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192))
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
const fromBase64url = (text: string): Uint8Array => {
  const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}
async function readBounded(
  stream: ReadableStream<Uint8Array>,
  limits: { expanded: number },
  timeoutMs: number,
  clock: () => number,
): Promise<Result<Uint8Array>> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  const start = clock()
  try {
    while (true) {
      if (clock() - start > timeoutMs) {
        await reader.cancel().catch(() => {})
        return failure('share.timeout')
      }
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limits.expanded) {
        await reader.cancel().catch(() => {})
        return failure('share.expansion')
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    return success(bytes)
  } catch {
    await reader.cancel().catch(() => {})
    return failure('share.malformed')
  } finally {
    reader.releaseLock()
  }
}
/** Encodes the canonical document. Returns `share.too-large`/`share.too-long`
 * instead of producing an ambiguous link; callers offer a JSON download. */
export async function encodeShareDocument(
  input: DiagramDocument,
  options: { limits?: { encoded: number; expanded: number } } = {},
): Promise<Result<string>> {
  const limits = options.limits ?? SHARE_LIMITS
  const checked = validateDocument(input)
  if (!checked.ok) return checked
  const bytes = new TextEncoder().encode(
    JSON.stringify({ v: SHARE_LIMITS.version, d: JSON.parse(canonical(checked.value)) }),
  )
  if (bytes.length > limits.expanded) return failure('share.too-large')
  let marker = 'j',
    payload = base64url(bytes)
  if (typeof CompressionStream !== 'undefined') {
    try {
      const bounded = await readBounded(
        new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw')),
        limits,
        SHARE_LIMITS.timeoutMs,
        () => performance.now(),
      )
      if (bounded.ok && bounded.value.length < bytes.length) {
        marker = 'z'
        payload = base64url(bounded.value)
      }
    } catch {
      /* The plain JSON fallback still obeys the URL limit. */
    }
  }
  if (payload.length + 2 > limits.encoded) return failure('share.too-long')
  return success(`d=${marker}${payload}`)
}
/**
 * Decodes a `d=` document or an `s=` legacy spec link. Malformed input,
 * unsupported future versions, expansion bombs and timeouts are rejected
 * without inventing a document.
 */
export async function decodeShareDocument(
  hash: string,
  options: ShareDecodeOptions = {},
): Promise<Result<DecodedShare>> {
  const limits = options.limits ?? SHARE_LIMITS
  const clock = options.clock ?? (() => performance.now())
  const timeoutMs = options.timeoutMs ?? SHARE_LIMITS.timeoutMs
  if (hash.length > limits.encoded + 4) return failure('share.malformed')
  const match = /^#?(d|s)=([zj])([A-Za-z0-9_-]+)$/.exec(hash)
  if (!match) return failure('share.malformed')
  let bytes: Uint8Array
  try {
    bytes = fromBase64url(match[3])
  } catch {
    return failure('share.malformed')
  }
  if (match[2] === 'z') {
    if (typeof DecompressionStream === 'undefined') return failure('share.unsupported')
    const bounded = await readBounded(
      new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
      limits,
      timeoutMs,
      clock,
    )
    if (!bounded.ok) return bounded
    bytes = bounded.value
  }
  if (bytes.length > limits.expanded) return failure('share.expansion')
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    return failure('share.malformed')
  }
  if (!parsed || typeof parsed !== 'object') return failure('share.malformed')
  const envelope = parsed as Record<string, unknown>
  if (match[1] === 'd') {
    if (envelope.v !== SHARE_LIMITS.version) return failure('share.future')
    const imported = validateDocument(envelope.d as never)
    if (!imported.ok) return failure('share.malformed')
    return success({ document: imported.value, source: 'd', version: envelope.v })
  }
  const version = envelope.v === undefined ? 0 : envelope.v
  if (version !== 0 && version !== 1) return failure('share.future')
  const spec = envelope.s as DiagramSpec
  const locale = version === 0 ? 'en' : envelope.l
  if (locale !== 'en' && locale !== 'es') return failure('share.malformed')
  const created = createDocument(spec, {
    id: typeof envelope.k === 'string' ? envelope.k : 'shared-document',
    locale,
  })
  if (!created.ok) return failure('share.malformed')
  return success({ document: created.value, source: 's', version })
}
