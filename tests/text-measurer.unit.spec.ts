import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCanvasTextMeasurer } from '../src/geometry/text'

describe('canvas text measurer cache', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('drops cached widths after the font environment changes', () => {
    let width = 100
    const context = { font: '', measureText: () => ({ width }) }
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) })
    const measurer = createCanvasTextMeasurer()
    expect(measurer).toBeDefined()
    const role = { size: 12, family: 'Geist' as const, charFactor: 0.6 }
    expect(measurer!('Ingress', role)).toBe(100)
    width = 130
    // The cached fallback-substituted width must not survive on its own.
    expect(measurer!('Ingress', role)).toBe(100)
    measurer!.clear?.()
    expect(measurer!('Ingress', role)).toBe(130)
  })
  it('returns undefined without a DOM canvas', () => {
    vi.stubGlobal('document', undefined)
    expect(createCanvasTextMeasurer()).toBeUndefined()
  })
})
