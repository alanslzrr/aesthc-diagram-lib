import { describe, expect, it } from 'vitest'
import { createDocument } from '../src/editor-core'
import type { DiagramDocument } from '../src/editor-core/types'
import { compareDocuments } from '../src/graph'

function graphDocument(): DiagramDocument {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Compare seed',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'Alpha', description: 'first' },
        { id: 'b', label: 'Beta', description: 'second' },
        { id: 'c', label: 'Gamma', description: 'third' },
      ],
      edges: [
        { id: 'ab', from: 'a', to: 'b' },
        { id: 'bc', from: 'b', to: 'c' },
      ],
    },
    { id: 'compare-seed', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  const document = made.value
  document.scene = {
    ...document.scene,
    mode: 'manual',
    nodes: {
      a: { x: 0, y: 0, width: 140, height: 56, locked: false },
      b: { x: 200, y: 0, width: 140, height: 56, locked: false },
      c: { x: 400, y: 0, width: 140, height: 56, locked: false },
    },
    routes: {},
    groups: [],
    zOrder: ['a', 'b', 'c'],
  }
  return document
}
function sequenceDocument(messages: Array<{ id: string; from: string; to: string }>) {
  const made = createDocument(
    {
      type: 'sequence',
      caption: 'Sequence seed',
      legend: { main: 'Main', branch: 'Branch' },
      participants: [
        { id: 'client', label: 'Client' },
        { id: 'server', label: 'Server' },
      ],
      messages,
    },
    { id: 'sequence-seed', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  return made.value
}

describe('E22 exact document comparison', () => {
  it('T49.1 label change is semantic, movement is presentation-only and inputs stay immutable', () => {
    const before = graphDocument()
    const snapshot = structuredClone(before)
    const after = structuredClone(before)
    after.revision = 1
    if (after.spec.type !== 'graph') throw Error('type')
    after.spec.nodes[0].label = 'Alpha renamed'
    after.scene.nodes.b = { ...after.scene.nodes.b, x: 260, y: 40 }
    const result = compareDocuments(before, after)
    if (!result.ok) throw Error(JSON.stringify(result.diagnostics))
    expect(result.value.mergeSafety).toBe(false)
    const alpha = result.value.nodes.find((entry) => entry.id === 'a')
    expect(alpha).toMatchObject({ status: 'modified' })
    expect(alpha?.semantic).toContain('/label')
    expect(alpha?.presentation).toEqual([])
    const beta = result.value.nodes.find((entry) => entry.id === 'b')
    expect(beta).toMatchObject({ status: 'modified', semantic: [] })
    expect(beta?.presentation.join(',')).toContain('/x')
    expect(result.value.counts.presentationOnly).toBe(1)
    // Inputs are read-only: the comparison never mutates them.
    expect(before).toEqual(snapshot)
  })

  it('T49.1 a renamed ID is remove + add, never an inferred rename', () => {
    const before = graphDocument()
    const after = structuredClone(before)
    after.revision = 1
    if (after.spec.type !== 'graph' || before.spec.type !== 'graph') throw Error('type')
    after.spec.nodes[1] = { ...after.spec.nodes[1], id: 'b-renamed' }
    after.spec.edges[0] = { ...after.spec.edges[0], to: 'b-renamed' }
    after.spec.edges[1] = { ...after.spec.edges[1], from: 'b-renamed' }
    after.scene.nodes['b-renamed'] = after.scene.nodes.b
    delete after.scene.nodes.b
    after.scene.zOrder = ['a', 'b-renamed', 'c']
    const result = compareDocuments(before, after)
    if (!result.ok) throw Error(JSON.stringify(result.diagnostics))
    expect(result.value.nodes.find((entry) => entry.id === 'b')).toMatchObject({
      status: 'removed',
    })
    expect(result.value.nodes.find((entry) => entry.id === 'b-renamed')).toMatchObject({
      status: 'added',
    })
    expect(result.value.counts).toMatchObject({ added: 1, removed: 1 })
  })

  it('T49.1 sequence message reorder is semantic', () => {
    const before = sequenceDocument([
      { id: 'm1', from: 'client', to: 'server' },
      { id: 'm2', from: 'server', to: 'client' },
    ])
    const after = structuredClone(before)
    after.revision = 1
    if (after.spec.type !== 'sequence') throw Error('type')
    after.spec.messages.reverse()
    const result = compareDocuments(before, after)
    if (!result.ok) throw Error(JSON.stringify(result.diagnostics))
    expect(result.value.reorder).toEqual([
      { collection: 'edges', before: ['m1', 'm2'], after: ['m2', 'm1'] },
    ])
    expect(result.value.counts.reorder).toBe(1)
  })

  it('T49.1 different diagram types are rejected without mutation', () => {
    const before = graphDocument()
    const after = sequenceDocument([{ id: 'm1', from: 'client', to: 'server' }])
    const snapshot = structuredClone(before)
    const result = compareDocuments(before, after)
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((d) => d.code === 'compare.incompatible')).toBe(true)
    expect(before).toEqual(snapshot)
  })
})
