import { describe, it, expect } from 'vitest'
import { createFragment, pasteFragment } from '../src/editor-core/clipboard'
import { validateDocument } from '../src/editor-core'
import fixture from './fixtures/editor/graph-document.json'
function doc() {
  const r = validateDocument(structuredClone(fixture))
  if (!r.ok) throw Error('fixture')
  return r.value
}
describe('isolated clipboard fragments', () => {
  it('retries transient id collisions and stops after 32 attempts', () => {
    const d = doc(),
      before = JSON.stringify(d)
    const copy = createFragment(d, [{ kind: 'node', id: 'a' }])
    if (!copy.ok) throw Error('copy')
    let attempts = 0
    expect(
      pasteFragment(d, copy.value, {
        idFactory: () => (++attempts < 3 ? 'a' : 'fresh'),
        offset: { x: 0, y: 0 },
      }).ok,
    ).toBe(true)
    expect(attempts).toBe(3)
    attempts = 0
    expect(
      pasteFragment(d, copy.value, {
        idFactory: () => {
          attempts++
          return 'a'
        },
        offset: { x: 0, y: 0 },
      }).ok,
    ).toBe(false)
    expect(attempts).toBe(32)
    expect(JSON.stringify(d)).toBe(before)
  })
  it('copies induced relations and allocates collision-free identities on paste', () => {
    const d = doc(),
      copy = createFragment(d, [
        { kind: 'node', id: 'a' },
        { kind: 'node', id: 'b' },
      ])
    expect(copy.ok).toBe(true)
    if (!copy.ok) return
    expect(
      copy.value.document.spec.type === 'graph' && copy.value.document.spec.edges.map((e) => e.id),
    ).toEqual(['ab-primary', 'ab-secondary'])
    let i = 0
    const pasted = pasteFragment(d, copy.value, {
      idFactory: (kind) => kind + '-' + ++i,
      offset: { x: 32, y: 32 },
    })
    expect(pasted.ok).toBe(true)
    if (!pasted.ok) return
    expect(pasted.value.spec.type === 'graph' && pasted.value.spec.nodes.length).toBe(7)
    expect(pasted.value.spec.type === 'graph' && pasted.value.spec.edges.length).toBe(9)
    expect(pasted.value.scene.nodes['node-1'].x).toBe(32)
    expect(validateDocument(pasted.value).ok).toBe(true)
    expect(d.spec.type === 'graph' && d.spec.nodes.length).toBe(5)
  })
  it('rejects empty fragments and host id collisions without mutation', () => {
    const d = doc()
    expect(createFragment(d, []).ok).toBe(false)
    const copy = createFragment(d, [{ kind: 'node', id: 'a' }])
    if (!copy.ok) throw Error('copy')
    expect(pasteFragment(d, copy.value, { idFactory: () => 'a', offset: { x: 0, y: 0 } }).ok).toBe(
      false,
    )
  })
})
import { createDocument } from '../src/editor-core'
describe('structured paste mappings', () => {
  function bandDocument(bands: number, extra = 0) {
    const result = createDocument(
      {
        type: 'band',
        caption: 'Pipeline',
        legend: { main: 'Main', branch: 'Branch' },
        bands: Array.from({ length: bands }, (_, i) => ({ title: i === 0 ? 'Input' : 'Output' })),
        nodes: [
          { id: 'one', label: 'One', description: '', band: 0 },
          { id: 'two', label: 'Two', description: '', band: 1 },
          { id: 'three', label: 'Three', description: '', band: 1 },
        ].slice(0, 2 + extra),
        edges: [{ id: 'request', from: 'one', to: 'two' }],
      } as never,
      { id: 'band-target', locale: 'en' },
    )
    if (!result.ok) throw Error(result.diagnostics.map((d) => d.code).join(','))
    return result.value
  }
  function bandFragment() {
    const result = createDocument(
      {
        type: 'band',
        caption: 'Source',
        legend: { main: 'Main', branch: 'Branch' },
        bands: [{ title: 'In' }, { title: 'Out' }, { title: 'Extra' }],
        nodes: [
          { id: 'one', label: 'One', description: '', band: 0 },
          { id: 'two', label: 'Two', description: '', band: 2 },
        ],
        edges: [{ id: 'e', from: 'one', to: 'two' }],
      } as never,
      { id: 'band-frag', locale: 'en' },
    )
    if (!result.ok) throw Error(result.diagnostics.map((d) => d.code).join(','))
    return {
      format: 'aesthc-diagram-fragment',
      schemaVersion: 1,
      sourceDocumentId: 'band-frag',
      document: result.value,
      selection: [{ kind: 'node', id: 'one' }],
    }
  }
  it('clamps band indices to the target band count by default', () => {
    let i = 0
    const pasted = pasteFragment(bandDocument(2), bandFragment(), {
      idFactory: () => 'n' + ++i,
      offset: { x: 0, y: 0 },
    })
    expect(pasted.ok).toBe(true)
    if (!pasted.ok) return
    if (pasted.value.spec.type !== 'band') throw Error('type')
    expect(pasted.value.spec.nodes.length).toBe(4)
    const one = pasted.value.spec.nodes.find((n) => n.id === 'n1')
    const two = pasted.value.spec.nodes.find((n) => n.id === 'n2')
    expect(one?.band).toBe(0)
    expect(two?.band).toBe(1)
    expect(pasted.value.spec.edges.length).toBe(2)
    expect(validateDocument(pasted.value).ok).toBe(true)
  })
  it('honours explicit band assignments over the clamp', () => {
    let i = 0
    const pasted = pasteFragment(bandDocument(3), bandFragment(), {
      idFactory: () => 'n' + ++i,
      offset: { x: 0, y: 0 },
      structured: { band: () => 2 },
    })
    expect(pasted.ok).toBe(true)
    if (!pasted.ok) return
    if (pasted.value.spec.type !== 'band') throw Error('type')
    for (const n of pasted.value.spec.nodes)
      if (n.id === 'n1' || n.id === 'n2') expect(n.band).toBe(2)
  })
  it('clamps pasted nodes into a single-band target without losing edges', () => {
    let i = 0
    const pasted = pasteFragment(bandDocument(2), bandFragment(), {
      idFactory: () => 'n' + ++i,
      offset: { x: 0, y: 0 },
    })
    expect(pasted.ok).toBe(true)
    if (!pasted.ok) return
    if (pasted.value.spec.type !== 'band') throw Error('type')
    const one = pasted.value.spec.nodes.find((n) => n.id === 'n1')
    const two = pasted.value.spec.nodes.find((n) => n.id === 'n2')
    expect(one?.band).toBe(0)
    expect(two?.band).toBe(1)
    expect(pasted.value.spec.edges.some((e) => e.from === 'n1' && e.to === 'n2')).toBe(true)
  })
  it('maps swimlane nodes onto lanes by label and falls back to the source lane index', () => {
    const target = createDocument(
      {
        type: 'swimlane',
        caption: 'Support',
        legend: { main: 'Main', branch: 'Branch' },
        lanes: [
          { id: 'sales', label: 'Sales' },
          { id: 'engineering', label: 'Engineering' },
        ],
        nodes: [{ id: 'base', label: 'Base', description: '', lane: 'sales' }],
        edges: [],
      } as never,
      { id: 'swim-target', locale: 'en' },
    )
    const source = createDocument(
      {
        type: 'swimlane',
        caption: 'Other',
        legend: { main: 'Main', branch: 'Branch' },
        lanes: [
          { id: 'l1', label: 'Support' },
          { id: 'l2', label: 'Engineering' },
        ],
        nodes: [
          { id: 'a', label: 'Agent', description: '', lane: 'l1' },
          { id: 'b', label: 'Worker', description: '', lane: 'l2' },
        ],
        edges: [{ id: 'e', from: 'a', to: 'b' }],
      } as never,
      { id: 'swim-frag', locale: 'en' },
    )
    if (!target.ok || !source.ok) throw Error('docs')
    const fragment = {
      format: 'aesthc-diagram-fragment',
      schemaVersion: 1,
      sourceDocumentId: 'swim-frag',
      document: source.value,
      selection: [{ kind: 'node', id: 'a' }],
    }
    let i = 0
    const pasted = pasteFragment(target.value, fragment, {
      idFactory: () => 's' + ++i,
      offset: { x: 0, y: 0 },
    })
    expect(pasted.ok).toBe(true)
    if (!pasted.ok) return
    if (pasted.value.spec.type !== 'swimlane') throw Error('type')
    expect(pasted.value.spec.nodes.length).toBe(3)
    const agent = pasted.value.spec.nodes.find((n) => n.id === 's1')
    const worker = pasted.value.spec.nodes.find((n) => n.id === 's2')
    expect(agent?.lane).toBe('sales')
    expect(worker?.lane).toBe('engineering')
    expect(validateDocument(pasted.value).ok).toBe(true)
  })
  it('rejects swimlane pastes when neither the label nor the index matches a target lane', () => {
    const target = createDocument(
      {
        type: 'swimlane',
        caption: 'Support',
        legend: { main: 'Main', branch: 'Branch' },
        lanes: [{ id: 'only', label: 'Only' }],
        nodes: [{ id: 'base', label: 'Base', description: '', lane: 'only' }],
        edges: [],
      } as never,
      { id: 'swim-reject', locale: 'en' },
    )
    const source = createDocument(
      {
        type: 'swimlane',
        caption: 'Other',
        legend: { main: 'Main', branch: 'Branch' },
        lanes: [
          { id: 'l1', label: 'Marketing' },
          { id: 'l2', label: 'Backoffice' },
        ],
        nodes: [
          { id: 'a', label: 'Campaign', description: '', lane: 'l1' },
          { id: 'b', label: 'Ledger', description: '', lane: 'l2' },
        ],
        edges: [],
      } as never,
      { id: 'swim-reject-frag', locale: 'en' },
    )
    if (!target.ok || !source.ok) throw Error('docs')
    const fragment = {
      format: 'aesthc-diagram-fragment',
      schemaVersion: 1,
      sourceDocumentId: 'swim-reject-frag',
      document: source.value,
      selection: [{ kind: 'node', id: 'a' }],
    }
    let i = 0
    const pasted = pasteFragment(target.value, fragment, {
      idFactory: () => 's' + ++i,
      offset: { x: 0, y: 0 },
    })
    expect(pasted.ok).toBe(false)
    if (!pasted.ok) {
      expect(pasted.diagnostics.map((d) => d.code)).toContain('lane.missing')
      return
    }
    throw Error('expected rejection')
  })
})
