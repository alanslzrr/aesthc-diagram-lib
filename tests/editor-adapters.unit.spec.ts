import { describe, it, expect } from 'vitest'
import { getAdapter } from '../src/editor-core/adapters'
import { createDocument } from '../src/editor-core'
import type { DiagramSpec } from '../src/types'
import legacy from './fixtures/editor/legacy-specs.json'
describe('semantic type adapters', () => {
  it.each(Object.entries(legacy))('normalizes and lays out %s independently', (_, input) => {
    const d = createDocument(input as DiagramSpec, { id: 'd', locale: 'en' })
    if (!d.ok) throw Error('fixture')
    const a = getAdapter(d.value.spec.type)
    expect(a.nodeIds(d.value.spec).length).toBeGreaterThan(0)
    expect(a.seedLayout(d.value.spec).ok).toBe(true)
    const before = JSON.stringify(d.value.spec)
    const removed = a.removeNodes(d.value.spec, [a.nodeIds(d.value.spec)[0]])
    expect(removed.ok).toBe(true)
    expect(JSON.stringify(d.value.spec)).toBe(before)
    if (removed.ok)
      expect(
        a
          .edges(removed.value)
          .every(
            (e) =>
              a.nodeIds(removed.value).includes(e.from) && a.nodeIds(removed.value).includes(e.to),
          ),
      ).toBe(true)
  })
  it('rejects free motion capability for sequence and mismatched insertions', () => {
    const a = getAdapter('sequence')
    expect(a.capabilities).not.toContain('move-free')
    expect(
      a.insertNode(legacy.sequence as DiagramSpec, {
        diagramType: 'flowchart',
        node: { id: 'x', label: 'X', description: '' },
      }).ok,
    ).toBe(false)
  })
  it('requires a permutation for reorder', () => {
    const a = getAdapter('timeline'),
      spec = legacy.timeline as DiagramSpec
    expect(a.reorder(spec, 'events', ['absent']).ok).toBe(false)
    const ids = a.nodeIds(spec).reverse(),
      r = a.reorder(spec, 'events', ids)
    expect(r.ok).toBe(true)
    if (r.ok) expect(a.nodeIds(r.value)).toEqual(ids)
  })
})
