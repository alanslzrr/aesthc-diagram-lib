import { describe, expect, it } from 'vitest'
import { createDocument, validateDocument } from '../src/editor-core'
import { findReach, findRoute, graphSnapshot, relationsOf, searchNodes } from '../src/graph'
import fixture from './fixtures/editor/graph-document.json'
import expected from './fixtures/editor/graph-expected.json'

function graph() {
  const result = validateDocument(structuredClone(fixture))
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  return graphSnapshot(result.value)
}

describe('authored directed graph queries', () => {
  it('T30.1 chooses exact edge identity for equal-length paths', () => {
    const result = findRoute(graph(), 'a', 'c')
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    expect(result.value).toMatchObject({ status: 'found', ...expected.routeAC })
    expect(result.value.revision).toBe(0)
    expect(result.value.documentId).toBe('doc-fixture')
  })

  it('T30.1 distinguishes zero-edge self route and unreachable target', () => {
    const self = findRoute(graph(), 'a', 'a')
    const absent = findRoute(graph(), 'a', 'isolated')
    if (!self.ok || !absent.ok) throw new Error('Known nodes must be queryable')
    expect(self.value).toMatchObject({ status: 'found', ...expected.selfRoute })
    expect(absent.value).toMatchObject({ status: 'unreachable', nodeIds: [], edgeIds: [] })
  })

  it('T31.1 terminates cycles while preserving all parallel and self-loop edge IDs', () => {
    const result = findReach(graph(), 'a', 'downstream')
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    expect(result.value).toMatchObject(expected.downstreamA)
    expect(new Set(result.value.edgeIds).size).toBe(result.value.edgeIds.length)
    expect(result.value.truncated).toBe(false)
  })

  it('T30.2 rejects unknown endpoints without inventing a node', () => {
    const result = findRoute(graph(), 'missing', 'a')
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((issue) => issue.code === 'graph.unknown-node')).toBe(true)
  })

  it('T31.2 reports truncation when the hop limit cuts reachable scope', () => {
    const bounded = findReach(graph(), 'a', 'downstream', 1)
    if (!bounded.ok) throw new Error(JSON.stringify(bounded.diagnostics))
    expect(bounded.value.truncated).toBe(true)
    expect(bounded.value.depth.b).toBe(1)
    const full = findReach(graph(), 'a', 'downstream')
    if (!full.ok) throw new Error(JSON.stringify(full.diagnostics))
    expect(full.value.truncated).toBe(false)
    const zero = findReach(graph(), 'a', 'downstream', 0)
    if (!zero.ok) throw new Error(JSON.stringify(zero.diagnostics))
    expect(zero.value.nodeIds).toEqual(['a'])
    expect(zero.value.truncated).toBe(true)
  })

  it('T31.2 group membership never invents connectivity between members', () => {
    const result = validateDocument(structuredClone(fixture))
    if (!result.ok) throw new Error('fixture')
    result.value.scene.groups = [
      { id: 'g', label: 'Group', kind: 'visual', nodeIds: ['a', 'isolated'], locked: false },
    ]
    const route = findRoute(graphSnapshot(result.value), 'a', 'isolated')
    if (!route.ok) throw new Error(JSON.stringify(route.diagnostics))
    expect(route.value.status).toBe('unreachable')
  })

  it('T32.1 finder ordering is deterministic: exact ID, label prefix, substring, kind, authored order', () => {
    const made = createDocument(
      {
        type: 'graph',
        caption: 'Finder seed',
        legend: { main: 'Main', branch: 'Branch' },
        nodes: [
          { id: 'z', label: 'Café', description: '', kind: 'Service' },
          { id: 'a', label: 'café', description: '', kind: 'Database' },
          { id: 'm', label: 'Café Store', description: '', kind: 'Service' },
          { id: 'b', label: 'Other', description: '', kind: 'Cafe' },
        ],
        edges: [],
      },
      { id: 'finder-seed', locale: 'en' },
    )
    if (!made.ok) throw new Error('fixture')
    const graph = graphSnapshot(made.value)
    const results = searchNodes(graph, 'café')
    // Unicode case-insensitive: two label prefixes, then the longer label prefix,
    // all in authored order; the kind "Cafe" never matches the accented query.
    expect(results.map((entry) => entry.id)).toEqual(['z', 'a', 'm'])
    expect(results[0].match).toBe('label-prefix')
    expect(searchNodes(graph, 'CAFÉ').map((entry) => entry.id)).toEqual(['z', 'a', 'm'])
    // Exact ID wins over any label match.
    expect(searchNodes(graph, 'Z')[0]).toMatchObject({ id: 'z', match: 'exact-id' })
    // Kind prefix participates after every label match.
    const byKind = searchNodes(graph, 'cafe')
    expect(byKind[byKind.length - 1]).toMatchObject({ id: 'b', match: 'kind-prefix' })
    expect(searchNodes(graph, '')).toEqual([])
  })

  it('T32.1 relations preserve every parallel edge ID in authored order', () => {
    const result = relationsOf(graph(), 'b')
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    expect(result.value.incoming).toEqual([
      { edgeId: 'ab-primary', from: 'a' },
      { edgeId: 'ab-secondary', from: 'a' },
    ])
    expect(result.value.outgoing).toEqual([{ edgeId: 'bc', to: 'c' }])
    const unknown = relationsOf(graph(), 'missing')
    expect(unknown.ok).toBe(false)
  })
})
