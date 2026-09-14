import { validateDiagramSpec } from '@aesthc/diagram-lib/validation'
import type { DiagramSpec } from '@aesthc/diagram-lib'

export const SHARE_LIMITS = { encoded: 65536, expanded: 262144, nodes: 1000, relations: 2000 }
export interface SharedSpec {
  key: string
  spec: DiagramSpec
  locale: 'en' | 'es'
}
const base64url = (bytes: Uint8Array): string => {
  let binary = ''
  for (let start = 0; start < bytes.length; start += 8192)
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192))
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function checked(key: unknown, spec: unknown, locale: unknown): SharedSpec {
  const result = validateDiagramSpec(spec)
  if (!result.success)
    throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
  if (key !== `example-${result.data.type}`)
    throw new Error('Shared diagram key does not match its type')
  if (locale !== 'en' && locale !== 'es') throw new Error('Unsupported shared locale')
  const record = result.data as unknown as Record<string, unknown>
  for (const field of ['nodes', 'participants', 'states', 'entities', 'events', 'lanes']) {
    if (Array.isArray(record[field]) && record[field].length > SHARE_LIMITS.nodes)
      throw new Error('Too many diagram nodes')
  }
  for (const field of ['edges', 'messages', 'relations', 'transitions']) {
    if (Array.isArray(record[field]) && record[field].length > SHARE_LIMITS.relations)
      throw new Error('Too many diagram relations')
  }
  return { key: key as string, spec: result.data, locale }
}

async function readBounded(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  let timeout: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      void reader.cancel()
      reject(new Error('Share decoding timed out'))
    }, 5000)
  })
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline])
      if (done) break
      size += value.length
      if (size > SHARE_LIMITS.expanded) throw new Error('Expanded share exceeds 256 KiB')
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    return bytes
  } finally {
    clearTimeout(timeout)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

export async function encodeShareHash(
  key: string,
  spec: unknown,
  locale: 'en' | 'es' = 'en',
): Promise<string> {
  const data = checked(key, spec, locale)
  const bytes = new TextEncoder().encode(
    JSON.stringify({ v: 1, k: data.key, s: data.spec, l: data.locale }),
  )
  if (bytes.length > SHARE_LIMITS.expanded) throw new Error('Spec exceeds 256 KiB')
  let payload = `j${base64url(bytes)}`
  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([bytes as BlobPart])
        .stream()
        .pipeThrough(new CompressionStream('deflate-raw'))
      payload = `z${base64url(await readBounded(stream))}`
    } catch {
      /* The plain JSON fallback still obeys the URL limit. */
    }
  }
  if (payload.length > SHARE_LIMITS.encoded)
    throw new Error('Share URL is too long; download JSON instead')
  return `s=${payload}`
}

export async function decodeShareHash(hash: string): Promise<SharedSpec | null> {
  if (hash.length > SHARE_LIMITS.encoded + 4) return null
  const match = /^#?s=([zj])([A-Za-z0-9_-]+)$/.exec(hash)
  if (!match) return null
  try {
    const binary = atob(match[2].replaceAll('-', '+').replaceAll('_', '/'))
    let bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    if (match[1] === 'z') {
      if (typeof DecompressionStream === 'undefined') return null
      bytes = new Uint8Array(
        await readBounded(
          new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
        ),
      )
    }
    if (bytes.length > SHARE_LIMITS.expanded) return null
    const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!parsed || typeof parsed !== 'object' || (parsed.v !== undefined && parsed.v !== 1))
      return null
    return checked(parsed.k, parsed.s, parsed.v === undefined ? 'en' : parsed.l)
  } catch {
    return null
  }
}
