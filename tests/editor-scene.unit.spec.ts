import { describe, expect, it } from 'vitest'
import { resolveDocument } from '../src/editor-core/scene'
import { createDocument, validateDocument } from '../src/editor-core'
import { CARD_TEXT_X } from '../src/theme'
import fixture from './fixtures/editor/graph-document.json'
function doc() {
  const r = validateDocument(structuredClone(fixture))
  if (!r.ok) throw Error('fixture')
  return r.value
}
describe('resolved authored scene', () => {
  it('preserves positions and edge identities without mutating the document', () => {
    const d = doc()
    d.scene.nodes.a.x = -300
    const before = JSON.stringify(d)
    const r = resolveDocument(d, { quality: 'edit', requestId: 'test' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.layout.nodeById.a.x).toBe(-300)
    expect(r.value.origin.x).toBeGreaterThan(300)
    expect(new Set(r.value.layout.edges.map((e) => e.id)).size).toBe(7)
    expect(r.value.layout.edges.find((e) => e.id === 'cc')?.d).not.toContain('NaN')
    expect(JSON.stringify(d)).toBe(before)
  })
  it('includes manual route bends and labels in bounds', () => {
    const d = doc()
    d.scene.routes['ab-primary'] = {
      mode: 'manual',
      source: { side: 'bottom', offset: 0.5 },
      target: { side: 'top', offset: 0.5 },
      points: [{ x: -800, y: -700 }],
      label: { x: -900, y: -800 },
    }
    const r = resolveDocument(d, { quality: 'edit', requestId: 'test' })
    if (!r.ok) throw Error('resolve')
    expect(r.value.worldBounds.x).toBeLessThan(-900)
    expect(r.value.worldBounds.y).toBeLessThan(-800)
  })
  it('rejects aborted jobs and structural errors before geometry', () => {
    const controller = new AbortController()
    controller.abort()
    expect(
      resolveDocument(doc(), { quality: 'edit', requestId: 'test', signal: controller.signal }).ok,
    ).toBe(false)
    const d = doc()
    d.spec.caption = 'ok'
    d.scene.nodes.a.width = -3
    expect(resolveDocument(d, { quality: 'edit', requestId: 'test' }).ok).toBe(false)
  })
})

describe('text extent diagnostics', () => {
  it('includes the left extent of centered labels and the icon gutter for aligned labels', () => {
    const d = doc()
    if (d.spec.type !== 'graph') throw Error('fixture')
    d.spec.nodes[0].label = 'W'.repeat(200)
    delete d.spec.nodes[0].kind
    delete d.spec.nodes[0].sublabel
    d.presentation.padding = 0
    const centered = resolveDocument(d, { quality: 'edit', requestId: 'centered' })
    if (!centered.ok) throw Error('resolve')
    const n = centered.value.layout.nodeById.a
    expect(centered.value.worldBounds.x).toBeLessThanOrEqual(n.cx - 1300)
    d.metadata.visuals.a = { source: 'phosphor', key: 'graph' }
    const icon = resolveDocument(d, { quality: 'edit', requestId: 'icon' })
    if (!icon.ok) throw Error('resolve')
    expect(icon.value.worldBounds.x + icon.value.worldBounds.width).toBeGreaterThanOrEqual(
      n.x + CARD_TEXT_X + 2600,
    )
  })
  it('does not silently crop long node text from free-scene export bounds', () => {
    const d = doc()
    if (d.spec.type !== 'graph') throw Error('fixture')
    d.spec.nodes[0].label = 'W'.repeat(200)
    const result = resolveDocument(d, { quality: 'edit', requestId: 'long-label' })
    if (!result.ok) throw Error('resolve')
    expect(result.value.worldBounds.width).toBeGreaterThan(2000)
    expect(result.diagnostics.map((d) => d.code)).toContain('quality.text-overflow')
  })
  it('prefers the provided text measurer over the conservative estimate', () => {
    const d = doc()
    if (d.spec.type !== 'graph') throw Error('fixture')
    d.spec.nodes[0].label = 'W'.repeat(200)
    d.presentation.padding = 0
    const narrow = resolveDocument(d, {
      quality: 'edit',
      requestId: 'measured',
      measureText: () => 0,
    })
    if (!narrow.ok) throw Error('resolve')
    expect(narrow.diagnostics.map((d) => d.code)).not.toContain('quality.text-overflow')
    const wide = resolveDocument(d, {
      quality: 'edit',
      requestId: 'wide',
      measureText: (text) => text.length * 1000,
    })
    if (!wide.ok) throw Error('resolve')
    expect(wide.diagnostics.map((d) => d.code)).toContain('quality.text-overflow')
    expect(wide.value.worldBounds.width).toBeGreaterThan(narrow.value.worldBounds.width)
  })
  it('reports measured overflow for structured layouts without changing their bounds', () => {
    const result = createDocument(
      {
        type: 'band',
        caption: 'Overflow',
        legend: { main: 'Main', branch: 'Branch' },
        bands: [{ title: 'In' }, { title: 'Out' }],
        nodes: [
          { id: 'a', label: 'Short', description: '', band: 0 },
          { id: 'b', label: 'W'.repeat(60), description: '', band: 1 },
        ],
        edges: [],
      } as never,
      { id: 'band-overflow', locale: 'en' },
    )
    if (!result.ok) throw Error('doc')
    const resolved = resolveDocument(result.value, {
      quality: 'edit',
      requestId: 'band-overflow',
      measureText: (text) => text.length * 100,
    })
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    const codes = resolved.diagnostics.map((d) => d.code)
    expect(codes).toContain('quality.text-overflow')
    const subject = resolved.diagnostics.find((d) => d.subject?.id === 'b')
    expect(subject?.subject?.id).toBe('b')
    expect(resolved.value.worldBounds.width).toBe(resolved.value.layout.width)
  })
})
