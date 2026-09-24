import { describe, expect, it } from 'vitest'
import { validateDocument } from '../src/editor-core'
import { findReach, findRoute, graphSnapshot } from '../src/graph'
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
})
