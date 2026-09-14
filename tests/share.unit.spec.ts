import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeShareHash, encodeShareHash, SHARE_LIMITS } from '../site/src/lib/share'
import { EXAMPLE_DIAGRAMS } from '../src/examples'

const key = 'example-flowchart'
const spec = EXAMPLE_DIAGRAMS[key].diagram.en
const plain = (value: unknown) => `#s=j${Buffer.from(JSON.stringify(value)).toString('base64url')}`
afterEach(() => vi.unstubAllGlobals())

describe('untrusted share envelopes', () => {
  it('roundtrips Unicode and the selected locale', async () => {
    const input = { ...spec, caption: 'Árbol → 日本語 🌳' }
    expect(await decodeShareHash(await encodeShareHash(key, input, 'es'))).toEqual({
      key,
      spec: input,
      locale: 'es',
    })
  })
  it('supports browsers without compression', async () => {
    vi.stubGlobal('CompressionStream', undefined)
    const hash = await encodeShareHash(key, spec)
    expect(hash).toMatch(/^s=j/)
    expect((await decodeShareHash(hash))?.spec).toEqual(spec)
  })
  it('reads legacy envelopes', async () => {
    expect((await decodeShareHash(plain({ k: key, s: spec })))?.locale).toBe('en')
  })
  it.each([
    { v: 2, k: key, s: spec, l: 'en' },
    { v: 1, k: 'example-band', s: spec, l: 'en' },
    { v: 1, k: key, s: spec, l: 'fr' },
    { v: 1, k: key, s: { ...spec, legend: null }, l: 'en' },
  ])('rejects invalid envelopes', async (input) => {
    expect(await decodeShareHash(plain(input))).toBeNull()
  })
  it('rejects corrupt and oversized inputs', async () => {
    for (const hash of ['#s=zbroken', '#s=j@@', `#s=j${'a'.repeat(SHARE_LIMITS.encoded + 1)}`]) {
      expect(await decodeShareHash(hash)).toBeNull()
    }
  })
  it('rejects oversized specs before encoding', async () => {
    await expect(
      encodeShareHash(key, { ...spec, caption: 'x'.repeat(SHARE_LIMITS.expanded) }),
    ).rejects.toThrow('256 KiB')
  })
})
