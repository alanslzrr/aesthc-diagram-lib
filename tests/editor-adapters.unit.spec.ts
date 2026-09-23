import { describe, it, expect } from 'vitest'
import { getAdapter } from '../src/editor-core/adapters'
import { createDocument, validateDocument } from '../src/editor-core'
import { nodeCollection, nodesOf } from '../src/editor-core/model'
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
describe('adapter CRUD matrix across all seven types', () => {
  const specs = legacy as unknown as Record<string, DiagramSpec>
  it.each(Object.keys(specs))(
    'inserts, replaces, removes and reorders %s without breaking validation',
    (type) => {
      const input = specs[type]
      const d = createDocument(input, { id: 'matrix', locale: 'en' })
      if (!d.ok) throw Error('fixture')
      const a = getAdapter(d.value.spec.type)
      const nodeInput: never = {
        id: 'matrix-node',
        label: 'Matrix',
        ...(!['sequence', 'er'].includes(d.value.spec.type) ? { description: '' } : {}),
        ...(d.value.spec.type === 'band' ? { band: 0 } : {}),
        ...(d.value.spec.type === 'swimlane'
          ? { lane: (d.value.spec as { lanes: Array<{ id: string }> }).lanes[0].id }
          : {}),
        ...(d.value.spec.type === 'er' ? { fields: [] } : {}),
      } as never
      const inserted = a.insertNode(d.value.spec, {
        diagramType: d.value.spec.type,
        node: nodeInput,
      } as never)
      expect(inserted.ok).toBe(true)
      if (!inserted.ok) return
      expect(a.nodeIds(inserted.value)).toContain('matrix-node')
      const replaced = a.replaceNode(inserted.value, {
        diagramType: d.value.spec.type,
        node: { ...nodeInput, label: 'Renamed' } as never,
      } as never)
      expect(replaced.ok).toBe(true)
      if (!replaced.ok) return
      expect(nodesOf(replaced.value).find((n) => n.id === 'matrix-node')?.label).toBe('Renamed')
      const reordered = a.reorder(replaced.value, nodeCollection(replaced.value), [
        a.nodeIds(replaced.value).at(-1)!,
        ...a.nodeIds(replaced.value).slice(0, -1),
      ])
      expect(reordered.ok).toBe(true)
      if (!reordered.ok) return
      const removed = a.removeNodes(reordered.value, ['matrix-node'])
      expect(removed.ok).toBe(true)
      if (removed.ok) expect(a.nodeIds(removed.value)).not.toContain('matrix-node')
      expect(validateDocument(d.value).ok).toBe(true)
    },
  )
  it('removes relations only for the affected endpoints and keeps others', () => {
    const d = createDocument(specs.band as DiagramSpec, { id: 'm', locale: 'en' })
    if (!d.ok) throw Error('fixture')
    const a = getAdapter('band')
    const withEdge = a.insertRelation(d.value.spec, {
      diagramType: 'band',
      relation: { id: 'x', from: 'a', to: 'b' },
    } as never)
    expect(withEdge.ok).toBe(true)
    if (!withEdge.ok) return
    const pruned = a.removeNodes(withEdge.value, ['a'])
    expect(pruned.ok).toBe(true)
    if (pruned.ok) {
      expect(a.edges(pruned.value).some((e) => e.id === 'x')).toBe(false)
      expect(a.edges(pruned.value).some((e) => e.id === 'request')).toBe(false)
    }
  })
})
