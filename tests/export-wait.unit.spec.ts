import { afterEach, expect, it, vi } from 'vitest'
import { waitForExport } from '../src/export/wait'
import { rasterizeSvg } from '../src/export/raster'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('bounds never-settling work and clears timers after success or cancellation', async () => {
  vi.useFakeTimers()
  const stalled = waitForExport(new Promise(() => {}))
  const rejected = expect(stalled).rejects.toThrow('export.timeout')
  await vi.advanceTimersByTimeAsync(10_000)
  await rejected
  expect(vi.getTimerCount()).toBe(0)
  await expect(waitForExport(Promise.resolve(42))).resolves.toBe(42)
  const controller = new AbortController()
  const canceled = waitForExport(new Promise(() => {}), controller.signal)
  controller.abort()
  await expect(canceled).rejects.toThrow('operation.aborted')
  expect(vi.getTimerCount()).toBe(0)
})

for (const phase of ['image', 'encode'] as const)
  for (const cancel of [false, true])
    it(`releases raster resources when ${phase} stalls (${cancel ? 'cancel' : 'timeout'})`, async () => {
      vi.useFakeTimers()
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toBlob: vi.fn(),
      }
      class MockImage {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(value: string) {
          if (value && phase === 'encode') queueMicrotask(() => this.onload?.())
        }
      }
      const revokeObjectURL = vi.fn()
      vi.stubGlobal('document', { createElement: () => canvas })
      vi.stubGlobal('Image', MockImage)
      vi.stubGlobal('URL', { createObjectURL: () => 'blob:test', revokeObjectURL })
      const controller = new AbortController()
      const result = rasterizeSvg('<svg/>', 'image/png', 100, 100, controller.signal)
      await vi.advanceTimersByTimeAsync(1)
      if (cancel) controller.abort()
      else await vi.advanceTimersByTimeAsync(10_000)
      const outcome = await result
      expect(outcome.ok).toBe(false)
      expect(outcome.diagnostics[0].code).toBe(cancel ? 'operation.aborted' : 'export.timeout')
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
      expect(canvas.width).toBe(0)
      expect(canvas.height).toBe(0)
      expect(vi.getTimerCount()).toBe(0)
    })

it('cancels font readiness and removes the isolated font declaration', async () => {
  const { exportDocument } = await import('../src/export')
  const { createDocument } = await import('../src/editor-core')
  const made = createDocument(
    { type: 'graph', caption: 'Fonts', legend: { main: 'M', branch: 'B' }, nodes: [], edges: [] },
    { id: 'fonts', locale: 'en' },
  )
  if (!made.ok) throw Error('fixture')
  const remove = vi.fn()
  vi.stubGlobal('document', {
    head: { appendChild: vi.fn() },
    createElement: (tag: string) =>
      tag === 'style'
        ? { textContent: '', remove }
        : { getContext: () => ({ measureText: () => ({ width: 8 }) }) },
    fonts: { load: () => new Promise(() => {}) },
  })
  const controller = new AbortController()
  const bytes = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0, 0, 0, 0])
  const result = exportDocument(made.value, {
    format: 'svg',
    scope: { type: 'document' },
    theme: 'light',
    quality: 'edit',
    background: 'theme',
    scale: 1,
    includeSource: false,
    metadata: 'minimal',
    fontPolicy: 'required',
    fonts: { sans: bytes, mono: bytes },
    signal: controller.signal,
  })
  controller.abort()
  const outcome = await result
  expect(outcome.ok).toBe(false)
  expect(outcome.diagnostics[0].code).toBe('operation.aborted')
  expect(remove).toHaveBeenCalledOnce()
})
