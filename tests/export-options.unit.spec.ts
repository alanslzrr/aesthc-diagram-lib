import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EXPORT_CHOICE,
  choiceIssues,
  dimensionWarning,
  extensionFor,
  formatBytes,
  formatGate,
  normalizeChoice,
  scopeGate,
  type ExportFacts,
} from '../site/src/lib/export-options'

function facts(overrides: Partial<ExportFacts> = {}): ExportFacts {
  return {
    raster: { png: true, jpeg: true, webp: true },
    html: true,
    webm: true,
    storySteps: 2,
    nodeCount: 3,
    selectionCount: 1,
    reducedMotion: false,
    ...overrides,
  }
}
describe('capability and content gates', () => {
  it('keeps JSON and SVG available when every encoder is missing', () => {
    const none = facts({
      raster: { png: false, jpeg: false, webp: false },
      html: false,
      webm: false,
      storySteps: 0,
    })
    expect(formatGate('json', none)).toEqual({ available: true })
    expect(formatGate('svg', none)).toEqual({ available: true })
    expect(formatGate('png', none)).toEqual({ available: false, reason: 'raster.unavailable' })
    expect(formatGate('jpeg', none)).toEqual({ available: false, reason: 'raster.unavailable' })
    expect(formatGate('webp', none)).toEqual({ available: false, reason: 'raster.unavailable' })
  })
  it('requires an actual encoder result for WebP and content for cards and WebM', () => {
    expect(formatGate('webp', facts({ raster: { png: true, jpeg: true, webp: false } }))).toEqual({
      available: false,
      reason: 'raster.unavailable',
    })
    expect(formatGate('card', facts({ nodeCount: 0 }))).toEqual({
      available: false,
      reason: 'card.empty',
    })
    expect(formatGate('card', facts())).toEqual({ available: true })
    expect(formatGate('webm', facts({ webm: false }))).toEqual({
      available: false,
      reason: 'webm.unavailable',
    })
    expect(formatGate('webm', facts({ storySteps: 0 }))).toEqual({
      available: false,
      reason: 'webm.empty',
    })
    expect(formatGate('webm', facts({ reducedMotion: true }))).toEqual({
      available: false,
      reason: 'webm.reduced-motion',
    })
    expect(formatGate('webm', facts())).toEqual({ available: true })
  })
  it('only offers selection scope where the public API supports it', () => {
    for (const format of ['json', 'html', 'card', 'webm'] as const)
      expect(scopeGate(format, facts())).toEqual({
        available: false,
        reason: 'selection.unsupported',
      })
    expect(scopeGate('svg', facts({ selectionCount: 0 }))).toEqual({
      available: false,
      reason: 'selection.empty',
    })
    expect(scopeGate('png', facts())).toEqual({ available: true })
  })
})
describe('structural option rules', () => {
  it('never silently turns a selection into the whole document', () => {
    expect(
      choiceIssues({ ...DEFAULT_EXPORT_CHOICE, format: 'json', scope: 'selection' }, 2),
    ).toEqual(['selection.unsupported'])
    expect(choiceIssues({ ...DEFAULT_EXPORT_CHOICE, scope: 'selection' }, 0)).toEqual([
      'selection.empty',
    ])
    expect(choiceIssues({ ...DEFAULT_EXPORT_CHOICE, scope: 'selection' }, 1)).toEqual([])
  })
  it('rejects transparent JPEG and source on formats that cannot embed it', () => {
    expect(
      choiceIssues({ ...DEFAULT_EXPORT_CHOICE, format: 'jpeg', background: 'transparent' }, 0),
    ).toEqual(['background.jpeg'])
    expect(
      choiceIssues({ ...DEFAULT_EXPORT_CHOICE, format: 'png', includeSource: true }, 0),
    ).toEqual(['source.format'])
    expect(
      choiceIssues({ ...DEFAULT_EXPORT_CHOICE, format: 'svg', includeSource: true }, 0),
    ).toEqual([])
  })
  it('normalizes dependent choices instead of exporting something else', () => {
    expect(
      normalizeChoice({ ...DEFAULT_EXPORT_CHOICE, format: 'json', scope: 'selection' }).scope,
    ).toBe('document')
    expect(
      normalizeChoice({ ...DEFAULT_EXPORT_CHOICE, format: 'jpeg', background: 'transparent' })
        .background,
    ).toBe('theme')
    expect(
      normalizeChoice({ ...DEFAULT_EXPORT_CHOICE, format: 'png', includeSource: true })
        .includeSource,
    ).toBe(false)
    expect(normalizeChoice({ ...DEFAULT_EXPORT_CHOICE, format: 'card', scale: 4 }).scale).toBe(1)
  })
})
describe('receipt formatting', () => {
  it('uses the real extension and reports resource ceilings', () => {
    expect(extensionFor('jpeg')).toBe('jpg')
    expect(extensionFor('card')).toBe('png')
    expect(extensionFor('webm')).toBe('webm')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(dimensionWarning(4000, 3000)).toBe(false)
    expect(dimensionWarning(20000, 10)).toBe(true)
    expect(dimensionWarning(8000, 5000)).toBe(true)
  })
})
