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
describe('export failure and limit paths', () => {
  it('rejects invalid embedded fonts and required policies without fake fallback', async () => {
    const d = doc()
    expect(
      (
        await exportDocument(d, {
          ...options,
          fonts: {
            sans: new Uint8Array([1, 2, 3]),
            mono: new Uint8Array([4, 5, 6]),
          },
        })
      ).ok,
    ).toBe(false)
    const missing = await exportDocument(d, {
      ...options,
      fontPolicy: 'required',
      fonts: undefined,
    })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.diagnostics.map((x) => x.code)).toContain('export.font-missing')
  })
  it('warns on fallback fonts instead of failing, and still exports', async () => {
    const d = doc()
    const r = await exportDocument(d, { ...options, fontPolicy: 'fallback', fonts: undefined })
    expect(r.ok).toBe(true)
    if (r.ok)
      expect(r.value.receipt.diagnostics.map((x) => x.code)).toContain('export.font-fallback')
  })
  it('rejects unsafe scales and pixel limits', async () => {
    const d = doc()
    const huge = await exportDocument(d, { ...options, scale: 20000 })
    expect(huge.ok).toBe(false)
    if (!huge.ok) expect(huge.diagnostics.map((x) => x.code)).toContain('export.scale')
    d.scene.nodes.a = { x: 20000, y: 0, width: 240, height: 64, locked: false }
    const big = await exportDocument(d, { ...options, scale: 8 })
    expect(big.ok).toBe(false)
    if (!big.ok) expect(big.diagnostics.map((x) => x.code)).toContain('export.pixels')
  })
  it('blocks publish quality on measured overflow diagnostics', async () => {
    const d = doc()
    if (d.spec.type !== 'graph') throw Error('fixture')
    d.spec.nodes[0].label = 'W'.repeat(400)
    const r = await exportDocument(d, { ...options, quality: 'publish', fonts: undefined })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.diagnostics.map((x) => x.code)).toContain('export.quality')
    const edit = await exportDocument(d, { ...options, quality: 'edit', fonts: undefined })
    expect(edit.ok).toBe(true)
  })
  it('exports a selection scope with canonical receipt flags', async () => {
    const d = doc()
    const r = await exportDocument(d, {
      ...options,
      scope: { type: 'selection', selection: [{ kind: 'node', id: 'a' }] },
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.receipt.scope).toBe('selection')
      expect(r.value.receipt.canonical).toBe(false)
      const svg = new TextDecoder().decode(r.value.bytes)
      expect(svg).toMatch(/data-node-id="a"/)
    }
  })
  it('rejects JSON selection scopes and induces edges and groups into the raster scope', async () => {
    const d = doc()
    const json = await exportDocument(d, {
      ...options,
      format: 'json',
      scope: { type: 'selection', selection: [{ kind: 'node', id: 'a' }] },
    })
    expect(json.ok).toBe(false)
    if (!json.ok) expect(json.diagnostics.map((x) => x.code)).toContain('export.scope')
    const edge = await exportDocument(d, {
      ...options,
      scope: { type: 'selection', selection: [{ kind: 'edge', id: 'ab-primary' }] },
    })
    expect(edge.ok).toBe(true)
    if (edge.ok) {
      const svg = new TextDecoder().decode(edge.value.bytes)
      expect(svg).toMatch(/data-node-id="a"/)
      expect(svg).toMatch(/data-node-id="b"/)
    }
    const group = doc()
    group.scene.groups = [
      { id: 'g', label: 'Group', kind: 'visual', nodeIds: ['a', 'b'], locked: false },
    ]
    const grouped = await exportDocument(group, {
      ...options,
      scope: { type: 'selection', selection: [{ kind: 'group', id: 'g' }] },
    })
    expect(grouped.ok).toBe(true)
    if (grouped.ok) {
      const svg = new TextDecoder().decode(grouped.value.bytes)
      expect(svg).toMatch(/data-node-id="a"/)
      expect(svg).toMatch(/data-node-id="b"/)
    }
  })
})
