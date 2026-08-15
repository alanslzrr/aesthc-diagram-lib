// Shareable playground links: the edited spec travels in the URL hash,
// deflate-compressed (CompressionStream) with a plain-JSON fallback for
// older browsers. Format: #s=z<base64url> (compressed) | #s=j<base64url>.

const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

const fromBase64url = (payload: string): Uint8Array => {
  const base64 = payload.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export interface SharedSpec {
  key: string
  spec: unknown
}

export async function encodeShareHash(key: string, spec: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify({ k: key, s: spec }))
  if ('CompressionStream' in window) {
    const stream = new Blob([bytes as BlobPart])
      .stream()
      .pipeThrough(new CompressionStream('deflate-raw'))
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer())
    return `s=z${base64url(compressed)}`
  }
  return `s=j${base64url(bytes)}`
}

export async function decodeShareHash(hash: string): Promise<SharedSpec | null> {
  const match = /(?:^|[#&])s=([zj])([A-Za-z0-9_-]+)/.exec(hash)
  if (!match) return null
  try {
    const bytes = fromBase64url(match[2])
    let json: string
    if (match[1] === 'z') {
      if (!('DecompressionStream' in window)) return null
      const stream = new Blob([bytes as BlobPart])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'))
      json = await new Response(stream).text()
    } else {
      json = new TextDecoder().decode(bytes)
    }
    const parsed = JSON.parse(json) as { k?: unknown; s?: unknown }
    if (typeof parsed.k !== 'string' || parsed.s === null || typeof parsed.s !== 'object') {
      return null
    }
    return { key: parsed.k, spec: parsed.s }
  } catch {
    return null
  }
}
