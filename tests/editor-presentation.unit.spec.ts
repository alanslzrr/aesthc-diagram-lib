import { describe, it, expect } from 'vitest'
import { validateDocument, resolveDocument } from '../src/editor-core'
import { renderSceneMarkup } from '../src/render'
import { exportDocument } from '../src/export'
import fixture from './fixtures/editor/graph-document.json'
function doc() {
  const r = validateDocument(structuredClone(fixture))
  if (!r.ok) throw Error('fixture')
  return r.value
}
describe('serializable presentation settings', () => {
  it('accepts valid tokens and grid values and rejects out-of-range textScale', () => {
    const d = doc()
    d.presentation.textScale = 0.75
    expect(validateDocument(d).ok).toBe(true)
    d.presentation.textScale = 1.5
    expect(validateDocument(d).ok).toBe(true)
    for (const textScale of [0.74, 1.51, -1, 3]) {
      const broken = doc()
      broken.presentation.textScale = textScale
      expect(validateDocument(broken).diagnostics.map((x) => x.code)).toContain(
        'presentation.range',
      )
    }
  })
  it('rejects out-of-range grid size and padding without truncating', () => {
    for (const size of [3, 65]) {
      const broken = doc()
      broken.presentation.grid.size = size
      expect(validateDocument(broken).diagnostics.map((x) => x.code)).toContain(
        'presentation.range',
      )
    }
    for (const padding of [-1, 257]) {
      const broken = doc()
      broken.presentation.padding = padding
      expect(validateDocument(broken).diagnostics.map((x) => x.code)).toContain(
        'presentation.range',
      )
    }
  })
  it('geometry respects textScale without changing layout bounds', () => {
    const base = doc(),
      scaled = doc()
    scaled.presentation.textScale = 1.5
    const baseResolved = resolveDocument(base, { quality: 'edit', requestId: 'base' }),
      scaledResolved = resolveDocument(scaled, { quality: 'edit', requestId: 'scaled' })
    if (!baseResolved.ok || !scaledResolved.ok) throw Error('resolve')
    const baseMarkup = renderSceneMarkup(base, baseResolved.value, { instanceId: 'scale-base' }),
      scaledMarkup = renderSceneMarkup(scaled, scaledResolved.value, {
        instanceId: 'scale-scaled',
      })
    const fontSize = (markup: string) =>
      Number([...markup.matchAll(/font-size="([0-9.]+)"/g)].at(-1)?.[1] ?? 0)
    expect(fontSize(scaledMarkup)).toBeGreaterThan(fontSize(baseMarkup))
    expect(scaledResolved.value.worldBounds.width).toBeGreaterThan(
      baseResolved.value.worldBounds.width,
    )
  })
})
describe('scoped document themes', () => {
  it('renders each document with its own palette and never mutates the other', () => {
    const light = doc(),
      dark = doc()
    dark.presentation.theme.mode = 'dark'
    const resolve = (d: ReturnType<typeof doc>) => {
      const r = resolveDocument(d, { quality: 'edit', requestId: 'isolation' })
      if (!r.ok) throw Error('resolve')
      return r.value
    }
    const lightMarkup = renderSceneMarkup(light, resolve(light), { instanceId: 'iso-light' }),
      darkMarkup = renderSceneMarkup(dark, resolve(dark), { instanceId: 'iso-dark' })
    expect(lightMarkup).toContain(light.presentation.theme.light.card)
    expect(lightMarkup).not.toContain(light.presentation.theme.dark.card)
    expect(darkMarkup).toContain(dark.presentation.theme.dark.card)
    expect(darkMarkup).not.toContain(dark.presentation.theme.light.card)
    expect(light.presentation.theme.mode).toBe('light')
    expect(dark.presentation.theme.mode).toBe('dark')
  })
  it('exports with the document palette instead of a host-wide style', async () => {
    const dark = doc()
    dark.presentation.theme.mode = 'dark'
    const result = await exportDocument(dark, {
      format: 'svg',
      scope: { type: 'document' },
      theme: 'dark',
      quality: 'edit',
      background: 'theme',
      scale: 1,
      includeSource: false,
      metadata: 'minimal',
      fontPolicy: 'fallback',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const svg = new TextDecoder().decode(result.value.bytes)
    expect(svg).toContain(dark.presentation.theme.dark.card)
    expect(svg).not.toContain(dark.presentation.theme.light.card)
    expect(svg).not.toContain('body{')
  })
})
