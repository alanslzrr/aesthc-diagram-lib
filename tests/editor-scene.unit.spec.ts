import { describe, expect, it } from 'vitest'
import { resolveDocument, relayoutScene } from '../src/editor-core/scene'
import { createDocument, validateDocument, getAdapter } from '../src/editor-core'
import type { GraphDiagramSpec, BandDiagramSpec } from '../src/types'
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

describe('relayout with locked preservation', () => {
  function graphDoc() {
    const spec: GraphDiagramSpec = {
      type: 'graph',
      caption: 'Relayout',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'A', description: '' },
        { id: 'b', label: 'B', description: '' },
      ],
      edges: [],
    }
    const made = createDocument(spec, { id: 'relayout', locale: 'en' })
    if (!made.ok) throw Error('doc')
    const doc = made.value
    doc.scene.mode = 'manual'
    doc.scene.nodes.a = { x: 500, y: 500, width: 140, height: 56, locked: true }
    doc.scene.nodes.b = { x: 600, y: 500, width: 140, height: 56, locked: false }
    return doc
  }
  it('moves unlocked nodes to the seed and keeps locked placements without mutating input', () => {
    const doc = graphDoc()
    const before = JSON.stringify(doc)
    const seed = getAdapter('graph').seedLayout(doc.spec)
    if (!seed.ok) throw Error('seed')
    const expectedB = seed.value.nodes.find((n) => n.id === 'b')
    if (!expectedB) throw Error('node')
    const result = relayoutScene(doc)
    if (!result.ok) throw Error(JSON.stringify(result.diagnostics))
    expect(result.value.nodes.a).toEqual({ x: 500, y: 500, width: 140, height: 56, locked: true })
    expect(result.value.nodes.b.x).toBe(expectedB.x)
    expect(result.value.nodes.b.y).toBe(expectedB.y)
    expect(result.value.mode).toBe('manual')
    expect(result.value.routes).toEqual(doc.scene.routes)
    expect(result.value.zOrder).toEqual(doc.scene.zOrder)
    expect(JSON.stringify(doc)).toBe(before)
  })
  it('keeps the seed geometry for structured types whose placements are not authoritative', () => {
    const spec: BandDiagramSpec = {
      type: 'band',
      caption: 'Band',
      legend: { main: 'Main', branch: 'Branch' },
      bands: [{ title: 'In' }, { title: 'Out' }],
      nodes: [
        { id: 'a', label: 'A', description: '', band: 0 },
        { id: 'b', label: 'B', description: '', band: 1 },
      ],
      edges: [],
    }
    const made = createDocument(spec, { id: 'band', locale: 'en' })
    if (!made.ok) throw Error('doc')
    const result = relayoutScene(made.value)
    if (!result.ok) throw Error('relayout')
    expect(result.value).toEqual(made.value.scene)
  })
})
describe('geometric quality diagnostics', () => {
  function positioned(overlap: boolean) {
    const d = doc()
    if (d.spec.type !== 'graph') throw Error('fixture')
    d.scene.nodes.a = { x: 0, y: 0, width: 140, height: 56, locked: false }
    d.scene.nodes.b = {
      x: overlap ? 40 : 400,
      y: 0,
      width: 140,
      height: 56,
      locked: false,
    }
    return d
  }
  it('T36.1 reports node overlap, edge-through-node and label collisions with fixes', () => {
    const d = positioned(true)
    if (d.spec.type !== 'graph') throw Error('fixture')
    const result = resolveDocument(d, { quality: 'edit', requestId: 'quality' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const codes = result.diagnostics.map((x) => x.code)
    expect(codes).toContain('quality.node-overlap')
    const route = result.value.layout.edges.find((e) => e.id === 'ab-primary')
    expect(route).toBeTruthy()
    const through = result.diagnostics.find((x) => x.code === 'quality.edge-through-node')
    const collision = result.diagnostics.find((x) => x.code === 'quality.label-collision')
    expect([through, collision].some(Boolean)).toBe(true)
    for (const fix of (through ?? collision)?.supportedFixes ?? []) expect(fix).toBeTruthy()
  })
  it('T36.1 skips the geometric scans when diagnostics are not requested', () => {
    const d = positioned(true)
    const result = resolveDocument(d, {
      quality: 'edit',
      requestId: 'fast',
      skipDiagnostics: true,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.diagnostics.some((x) => x.code.startsWith('quality.'))).toBe(false)
  })
})
