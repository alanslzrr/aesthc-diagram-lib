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
