import { describe, expect, it } from 'vitest'
import { createDocument, getAdapter } from '../src/editor-core'
import type { DiagramSpec } from '../src/types'
import type { StructuralEdit } from '../src/editor-core/types'
import legacy from './fixtures/editor/legacy-specs.json'

describe.each(['band', 'swimlane'] as const)('%s structural mapping', (type) => {
  const created = createDocument(legacy[type] as DiagramSpec, { id: 'structure', locale: 'en' })
  if (!created.ok) throw Error('fixture')
  const spec = created.value.spec
  const adapter = getAdapter(type)
  const operation = (ids = ['a', 'b'], removeNodeIds: string[] = []): StructuralEdit =>
    type === 'band'
      ? {
          type: 'bands.replace',
          bands: [{ title: 'Merged' }],
          assignments: Object.fromEntries(ids.map((id) => [id, 0])),
          removeNodeIds,
        }
      : {
          type: 'lanes.replace',
          lanes: [{ id: 'merged', label: 'Merged' }],
          assignments: Object.fromEntries(ids.map((id) => [id, 'merged'])),
          removeNodeIds,
        }

  it.each([
    ['missing assignment', ['a'], [], 'structure.mapping.incomplete'],
    ['assigned and removed', ['a', 'b'], ['b'], 'structure.mapping.overlap'],
    ['unknown assignment', ['a', 'b', 'ghost'], [], 'reference.missing'],
    ['unknown removal', ['a', 'b'], ['ghost'], 'reference.missing'],
    ['duplicate removal', ['a'], ['b', 'b'], 'structure.mapping.duplicate'],
  ])('rejects %s without mutating the source', (_, ids, removed, code) => {
    const before = JSON.stringify(spec)
    // Keep the old destinations so missing mappings cannot fail incidentally on a dangling lane.
    const op = operation(ids as string[], removed as string[])
    if (op.type === 'bands.replace' && spec.type === 'band') {
      op.bands = structuredClone(spec.bands)
      op.assignments = Object.fromEntries((ids as string[]).map((id) => [id, 0]))
    }
    if (op.type === 'lanes.replace' && spec.type === 'swimlane') {
      op.lanes = structuredClone(spec.lanes)
      op.assignments = Object.fromEntries((ids as string[]).map((id) => [id, 'support']))
    }
    const result = adapter.editStructure(spec, op)
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0]?.code).toBe(code)
    expect(JSON.stringify(spec)).toBe(before)
  })

  it('reassigns all survivors and prunes dependent edges atomically', () => {
    const result = adapter.editStructure(spec, operation(['a'], ['b']))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(adapter.nodeIds(result.value)).toEqual(['a'])
    expect(adapter.edges(result.value)).toEqual([])
    expect(adapter.nodeIds(spec)).toEqual(['a', 'b'])
    expect(adapter.edges(spec)).toHaveLength(1)
  })

  it('accepts a complete merge without removing relations', () => {
    const result = adapter.editStructure(spec, operation())
    expect(result.ok).toBe(true)
    if (result.ok) expect(adapter.edges(result.value)).toHaveLength(1)
  })

  it('rejects an invalid destination', () => {
    const op = operation()
    if (op.type === 'bands.replace') op.assignments.b = 99
    if (op.type === 'lanes.replace') op.assignments.b = 'missing'
    expect(adapter.editStructure(spec, op).ok).toBe(false)
  })
})
