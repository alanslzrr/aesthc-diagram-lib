import { describe, expect, it } from 'vitest'
import { createDocument, validateDocument } from '../src/editor-core'
import type { DiagramDocument, NamedView, StoryStep } from '../src/editor-core/types'
import { describeStoryStep, lensFacets, lensMatches, resolveView } from '../src/viewer/views'
import { graphSnapshot, findRoute } from '../src/graph'

function document(
  views: NamedView[] = [],
  story: StoryStep[] = [],
  roles: Record<string, string[]> = {},
): DiagramDocument {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Views seed',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'Alpha', description: '' },
        { id: 'b', label: 'Beta', description: '' },
        { id: 'c', label: 'Gamma', description: '' },
        { id: 'isolated', label: 'Isolated', description: '' },
      ],
      edges: [
        { id: 'ab', from: 'a', to: 'b' },
        { id: 'bc', from: 'b', to: 'c' },
      ],
    },
    { id: 'views-seed', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  made.value.views = views
  made.value.story = story
  made.value.metadata.nodes = Object.fromEntries(
    Object.entries(roles).map(([id, nodeRoles]) => [id, { roles: nodeRoles, tags: [] }]),
  )
  const checked = validateDocument(made.value)
  if (!checked.ok) throw Error(JSON.stringify(checked.diagnostics))
  return checked.value
}

describe('E14 lenses, views and story', () => {
  it('T33.2 a lens hiding a needed node never changes the global route; an explicit filter lands in the receipt', () => {
    const doc = document(undefined, undefined, { c: ['hidden'] })
    const base = graphSnapshot(doc)
    const route = findRoute(base, 'a', 'c')
    if (!route.ok) throw Error(JSON.stringify(route.diagnostics))
    // The global route still traverses the dimmed node: lenses are display-only.
    expect(route.value.nodeIds).toEqual(['a', 'b', 'c'])
    expect(route.value.filter).toBeUndefined()
    // Explicit filtered query: topology restricted and the receipt records the filter.
    const filtered = graphSnapshot(doc, { nodeRoles: ['hidden'] })
    expect(filtered.nodeIds).toEqual(['c'])
    const explicit = findRoute(filtered, 'c', 'c')
    if (!explicit.ok) throw Error(JSON.stringify(explicit.diagnostics))
    expect(explicit.value.filter).toEqual({ nodeRoles: ['hidden'] })
    expect(lensMatches(doc, 'c', { nodeRoles: ['hidden'] })).toBe(true)
    expect(lensMatches(doc, 'a', { nodeRoles: ['hidden'] })).toBe(false)
    expect(lensFacets(doc).roles).toEqual(['hidden'])
  })

  it('T34.1 story transitions never invent a relation; orphans and broken routes are rejected by ID', () => {
    // Focus on two disconnected nodes: no direct relation exists.
    const viewAC = {
      id: 'v-ac',
      label: 'A to isolated',
      focus: { nodeIds: ['a', 'isolated'], edgeIds: [] },
    }
    const viewAB = { id: 'v-ab', label: 'A to B', focus: { nodeIds: ['a', 'b'], edgeIds: ['ab'] } }
    const doc = document([viewAC, viewAB])
    const graph = graphSnapshot(doc)
    // No authored route a->isolated exists: the transition is truthful, not invented.
    const truth = describeStoryStep(doc, graph, {
      id: 's1',
      viewId: 'v-ac',
      durationMs: 2000,
    })
    if (!truth.ok) throw Error(JSON.stringify(truth.diagnostics))
    expect(truth.value.directRoute).toBeNull()
    const direct = describeStoryStep(doc, graph, {
      id: 's2',
      viewId: 'v-ab',
      durationMs: 2000,
    })
    if (!direct.ok) throw Error(JSON.stringify(direct.diagnostics))
    expect(direct.value.directRoute).toMatchObject({ edgeIds: ['ab'] })
    // A story step referencing a view that does not exist is blocked by ID.
    const missingView = describeStoryStep(doc, graph, {
      id: 's4',
      viewId: 'v-missing',
      durationMs: 2000,
    })
    expect(missingView.ok).toBe(false)
    expect(missingView.diagnostics.some((d) => d.code === 'view.reference')).toBe(true)
    expect(resolveView(doc, 'v-missing').ok).toBe(false)
  })
})
