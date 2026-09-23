import { describe, expect, it } from 'vitest'
import { resolveDocument } from '../src/editor-core/scene'
import { validateDocument } from '../src/editor-core'
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
})
