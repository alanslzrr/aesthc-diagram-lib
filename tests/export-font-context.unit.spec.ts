import { describe, expect, it } from 'vitest'
import { prepareExportFonts } from '../src/export/fonts'

describe('portable font preparation', () => {
  it('rejects malformed font bytes before allocation', async () => {
    const result = await prepareExportFonts({
      fonts: { sans: new Uint8Array(4), mono: new Uint8Array(4) },
      fontPolicy: 'required',
    })
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0].code).toBe('export.font-invalid')
  })
  it('does not claim embedded measurement without a browser', async () => {
    const result = await prepareExportFonts({ fontPolicy: 'fallback' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.typography.measurement).toBe('fallback')
      expect(result.diagnostics[0].code).toBe('export.font-fallback')
      result.value.dispose()
    }
  })
  it('fails required fonts when bytes are absent', async () => {
    const result = await prepareExportFonts({ fontPolicy: 'required' })
    expect(result.diagnostics[0].code).toBe('export.font-missing')
  })
  it('honors pre-abort before validation or allocation', async () => {
    const controller = new AbortController()
    controller.abort()
    const result = await prepareExportFonts({ signal: controller.signal })
    expect(result.diagnostics[0].code).toBe('operation.aborted')
  })
})
