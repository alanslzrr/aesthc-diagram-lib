import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeShareDocument } from '../src/persistence/share'

function stalledDecompressor() {
  let cancelled = false
  class StalledDecompressionStream {
    readable: ReadableStream<Uint8Array>
    writable: WritableStream<Uint8Array>
    constructor() {
      this.readable = new ReadableStream<Uint8Array>({
        start() {
          /* Never enqueue and never close: the read stays pending. */
        },
        cancel() {
          cancelled = true
        },
      })
      this.writable = new WritableStream<Uint8Array>({
        write() {
          /* Swallow compressed bytes. */
        },
      })
    }
  }
  return { StalledDecompressionStream, wasCancelled: () => cancelled }
}

describe('F29 share pending-read deadline', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('a stalled pending read settles with share.timeout and releases the reader', async () => {
    const stalled = stalledDecompressor()
    vi.stubGlobal('DecompressionStream', stalled.StalledDecompressionStream)
    const release = vi.spyOn(ReadableStreamDefaultReader.prototype, 'releaseLock')
    const payload = Buffer.from('stub payload that never decompresses').toString('base64url')
    const started = Date.now()
    const result = await decodeShareDocument(`d=z${payload}`, { timeoutMs: 25 })
    const elapsed = Date.now() - started
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'share.timeout')).toBe(
        true,
      )
    // Bounded: a stalled reader cannot hang the decode.
    expect(elapsed).toBeLessThan(1000)
    // Cleanup is best-effort but must happen: cancel then release.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(stalled.wasCancelled()).toBe(true)
    expect(release).toHaveBeenCalled()
  })

  it('a read that settles normally is not cancelled by the deadline', async () => {
    const result = await decodeShareDocument(
      `d=j${Buffer.from(JSON.stringify({ v: 99, d: {} })).toString('base64url')}`,
      { timeoutMs: 25 },
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'share.future')).toBe(
        true,
      )
  })
})
