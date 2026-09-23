import { describe, it, expect } from 'vitest'
import { exportDocument } from '../src/export'
import { validateDocument } from '../src/editor-core'
import fixture from './fixtures/editor/graph-document.json'
function doc() {
  const r = validateDocument(structuredClone(fixture))
  if (!r.ok) throw Error('fixture')
  return r.value
}
const options = {
  format: 'svg' as const,
  scope: { type: 'document' as const },
  theme: 'light' as const,
  quality: 'edit' as const,
  background: 'theme' as const,
  scale: 1,
  includeSource: false,
  metadata: 'minimal' as const,
  fontPolicy: 'fallback' as const,
}
describe('isolated canonical exports', () => {
  it('embeds opt-in source at the root, not inside a nested icon SVG', async () => {
    const d = doc()
    d.metadata.visuals.a = { source: 'phosphor', key: 'graph' }
    const result = await exportDocument(d, { ...options, includeSource: true })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const svg = new TextDecoder().decode(result.value.bytes)
    expect(svg).toMatch(/<\/g><metadata id="aesthc-source">[\s\S]*<\/metadata><\/svg>$/)
  })
  it('escapes hostile labels and never embeds hidden source by default', async () => {
    const d = doc()
    d.spec.caption = '</script><script>alert(1)</script>'
    d.spec.type === 'graph' && (d.spec.nodes[0].label = '<img onerror=alert(1)>')
    d.metadata.nodes.a = { roles: [], tags: [], notes: 'PRIVATE SECRET' }
    const before = JSON.stringify(d),
      r = await exportDocument(d, options)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const svg = new TextDecoder().decode(r.value.bytes)
    expect(svg).toContain('&lt;img')
    expect(svg).not.toContain('<script')
    expect(svg).not.toContain('PRIVATE SECRET')
    expect(r.value.receipt.sourceIncluded).toBe(false)
    expect(r.value.receipt.canonical).toBe(true)
    expect(JSON.stringify(d)).toBe(before)
  })
  it('returns deterministic JSON roundtrip and honors abort', async () => {
    const d = doc(),
      r = await exportDocument(d, { ...options, format: 'json' })
    expect(r.ok).toBe(true)
    if (r.ok)
      expect(validateDocument(JSON.parse(new TextDecoder().decode(r.value.bytes))).ok).toBe(true)
    const controller = new AbortController()
    controller.abort()
    expect((await exportDocument(d, { ...options, signal: controller.signal })).ok).toBe(false)
  })
  it('rejects empty selection and unsupported environment rather than fake success', async () => {
    expect(
      (await exportDocument(doc(), { ...options, scope: { type: 'selection', selection: [] } })).ok,
    ).toBe(false)
    expect((await exportDocument(doc(), { ...options, format: 'png' })).ok).toBe(false)
    expect(
      (await exportDocument(doc(), { ...options, format: 'jpeg', background: 'transparent' })).ok,
    ).toBe(false)
  })
})
