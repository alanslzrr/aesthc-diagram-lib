import { describe, expect, it } from 'vitest'
import { createDocument } from '../src/editor-core'
import type { DiagramDocument } from '../src/editor-core/types'
import { compareDocuments } from '../src/graph'
import type { Comparison } from '../src/graph'

const evidence = {
  id: 'ev-1',
  repository: 'https://github.com/example/repo',
  commit: '0123456789abcdef0123456789abcdef01234567',
  path: 'src/service.ts',
  startLine: 10,
  endLine: 20,
}
const extension = { accent: 'blue', density: 2 }
function seed(): DiagramDocument {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Document seed',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'Alpha', description: 'first' },
        { id: 'b', label: 'Beta', description: 'second' },
      ],
      edges: [{ id: 'ab', from: 'a', to: 'b' }],
    },
    { id: 'compare-document', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  const document = made.value
  document.scene = {
    ...document.scene,
    mode: 'manual',
    nodes: {
      a: { x: 0, y: 0, width: 140, height: 56, locked: false },
      b: { x: 200, y: 0, width: 140, height: 56, locked: false },
    },
    routes: {},
    zOrder: ['a', 'b'],
  }
  document.metadata.nodes = {
    a: {
      roles: ['api'],
      tags: ['core'],
      notes: 'Owned service',
      links: [{ label: 'Docs', href: 'https://example.com/a' }],
      evidence: [evidence],
      owner: 'team-a',
      visibility: 'private',
    },
  }
  document.metadata.edges = {
    ab: { roles: [], tags: [], crossing: 'vpn' },
  }
  document.scene.groups = [
    { id: 'g1', label: 'Group one', kind: 'system', nodeIds: ['a'], locked: false },
    { id: 'g2', label: 'Group two', kind: 'system', nodeIds: ['b'], locked: false },
  ]
  document.views = [
    {
      id: 'v1',
      label: 'View one',
      focus: { nodeIds: ['a'], edgeIds: [] },
      camera: { x: 0, y: 0, zoom: 1 },
    },
    { id: 'v2', label: 'View two', focus: { nodeIds: ['b'], edgeIds: [] } },
  ]
  document.story = [
    { id: 's1', viewId: 'v1', durationMs: 1000 },
    { id: 's2', viewId: 'v2', durationMs: 1500 },
  ]
  document.extensions = { 'acme.theme': structuredClone(extension) }
  return document
}
function compared(mutate: (after: DiagramDocument) => void): Comparison {
  const before = seed()
  const after = structuredClone(before)
  after.revision = before.revision + 1
  mutate(after)
  const result = compareDocuments(before, after)
  if (!result.ok) throw Error(JSON.stringify(result.diagnostics))
  return result.value
}

describe('F25 document-level comparison', () => {
  const matrix: Array<{
    name: string
    mutate: (after: DiagramDocument) => void
    assert: (comparison: Comparison) => void
  }> = [
    {
      name: 'caption',
      mutate: (after) => {
        after.spec.caption = 'Renamed caption'
      },
      assert: (comparison) => {
        expect(comparison.document.fields.map((change) => change.path)).toContain('/spec/caption')
        expect(comparison.counts.document).toBeGreaterThan(0)
      },
    },
    {
      name: 'legend',
      mutate: (after) => {
        after.spec.legend.branch = 'Renamed branch'
      },
      assert: (comparison) => {
        expect(comparison.document.fields.map((change) => change.path)).toContain(
          '/spec/legend/branch',
        )
      },
    },
    {
      name: 'locale',
      mutate: (after) => {
        after.locale = 'es'
      },
      assert: (comparison) => {
        expect(comparison.document.fields.map((change) => change.path)).toContain('/locale')
      },
    },
    {
      name: 'metadata owner',
      mutate: (after) => {
        after.metadata.nodes.a.owner = 'team-b'
      },
      assert: (comparison) => {
        expect(comparison.document.metadata).toHaveLength(1)
        expect(comparison.document.metadata[0]).toMatchObject({
          kind: 'node',
          id: 'a',
          status: 'modified',
        })
        expect(comparison.document.metadata[0].changes.map((change) => change.path)).toContain(
          '/metadata/nodes/a/owner',
        )
      },
    },
    {
      name: 'metadata roles',
      mutate: (after) => {
        after.metadata.nodes.a.roles = ['api', 'database']
      },
      assert: (comparison) => {
        expect(comparison.document.metadata[0].changes.map((change) => change.path)).toContain(
          '/metadata/nodes/a/roles',
        )
      },
    },
    {
      name: 'metadata tags',
      mutate: (after) => {
        after.metadata.nodes.a.tags = ['core', 'internal']
      },
      assert: (comparison) => {
        expect(comparison.document.metadata[0].changes.map((change) => change.path)).toContain(
          '/metadata/nodes/a/tags',
        )
      },
    },
    {
      name: 'metadata notes',
      mutate: (after) => {
        after.metadata.nodes.a.notes = 'Updated note'
      },
      assert: (comparison) => {
        expect(comparison.document.metadata[0].changes.map((change) => change.path)).toContain(
          '/metadata/nodes/a/notes',
        )
      },
    },
    {
      name: 'metadata links',
      mutate: (after) => {
        after.metadata.nodes.a.links = [{ label: 'Runbook', href: 'https://example.com/run' }]
      },
      assert: (comparison) => {
        expect(comparison.document.metadata[0].changes.map((change) => change.path)).toContain(
          '/metadata/nodes/a/links',
        )
      },
    },
    {
      name: 'metadata evidence',
      mutate: (after) => {
        after.metadata.nodes.a.evidence = [{ ...evidence, endLine: 30 }]
      },
      assert: (comparison) => {
        expect(comparison.document.metadata[0].changes.map((change) => change.path)).toContain(
          '/metadata/nodes/a/evidence',
        )
      },
    },
    {
      name: 'metadata visibility',
      mutate: (after) => {
        after.metadata.nodes.a.visibility = 'public'
      },
      assert: (comparison) => {
        expect(comparison.document.metadata[0].changes.map((change) => change.path)).toContain(
          '/metadata/nodes/a/visibility',
        )
      },
    },
    {
      name: 'edge metadata crossing',
      mutate: (after) => {
        after.metadata.edges.ab.crossing = 'public-internet'
      },
      assert: (comparison) => {
        expect(comparison.document.metadata).toHaveLength(1)
        expect(comparison.document.metadata[0]).toMatchObject({
          kind: 'edge',
          id: 'ab',
          status: 'modified',
        })
        expect(comparison.document.metadata[0].changes.map((change) => change.path)).toContain(
          '/metadata/edges/ab/crossing',
        )
      },
    },
    {
      name: 'group label',
      mutate: (after) => {
        after.scene.groups[0].label = 'Renamed group'
      },
      assert: (comparison) => {
        expect(comparison.document.groups).toHaveLength(1)
        expect(comparison.document.groups[0]).toMatchObject({ id: 'g1', status: 'modified' })
        expect(comparison.document.groups[0].changes.map((change) => change.path)).toContain(
          '/groups/g1/label',
        )
      },
    },
    {
      name: 'view camera',
      mutate: (after) => {
        after.views[0].camera = { x: 10, y: 20, zoom: 0.5 }
      },
      assert: (comparison) => {
        expect(comparison.document.views).toHaveLength(1)
        expect(comparison.document.views[0]).toMatchObject({ id: 'v1', status: 'modified' })
        expect(comparison.document.views[0].changes.map((change) => change.path)).toContain(
          '/views/v1/camera/zoom',
        )
      },
    },
    {
      name: 'story duration',
      mutate: (after) => {
        after.story[1].durationMs = 2000
      },
      assert: (comparison) => {
        expect(comparison.document.story).toHaveLength(1)
        expect(comparison.document.story[0]).toMatchObject({ id: 's2', status: 'modified' })
        expect(comparison.document.story[0].changes.map((change) => change.path)).toContain(
          '/story/s2/durationMs',
        )
      },
    },
    {
      name: 'extension payload',
      mutate: (after) => {
        after.extensions['acme.theme'] = { accent: 'red', density: 2 }
      },
      assert: (comparison) => {
        expect(comparison.document.extensions).toHaveLength(1)
        expect(comparison.document.extensions[0]).toMatchObject({
          namespace: 'acme.theme',
          status: 'modified',
          semantics: 'unknown',
        })
        expect(
          comparison.document.extensions[0].changes.map((change) => change.path),
        ).toContain('/extensions/acme.theme/accent')
      },
    },
    {
      name: 'node geometry stays presentation-only',
      mutate: (after) => {
        after.scene.nodes.a = { ...after.scene.nodes.a, x: 42 }
      },
      assert: (comparison) => {
        expect(comparison.counts.modified).toBe(1)
        expect(comparison.counts.presentationOnly).toBe(1)
        expect(comparison.counts.document).toBe(0)
      },
    },
    {
      name: 'edge geometry stays presentation-only',
      mutate: (after) => {
        after.scene.routes.ab = {
          mode: 'manual',
          source: { side: 'right', offset: 0.5 },
          target: { side: 'left', offset: 0.5 },
          points: [{ x: 100, y: 10 }],
        }
      },
      assert: (comparison) => {
        expect(comparison.edges).toHaveLength(1)
        expect(comparison.counts.document).toBe(0)
      },
    },
  ]
  for (const entry of matrix)
    it(`detects ${entry.name} without overloading node/edge counts`, () => {
      const comparison = compared(entry.mutate)
      entry.assert(comparison)
      if (!entry.name.includes('geometry')) {
        expect(comparison.nodes).toEqual([])
        expect(comparison.edges).toEqual([])
        expect(comparison.counts.modified).toBe(0)
      }
      expect(comparison.mergeSafety).toBe(false)
    })

  it('detects authored-order changes in groups, views and story', () => {
    const groups = compared((after) => {
      after.scene.groups.reverse()
    })
    expect(groups.document.reorder).toContainEqual({
      collection: 'groups',
      before: ['g1', 'g2'],
      after: ['g2', 'g1'],
    })
    const views = compared((after) => {
      after.views.reverse()
    })
    expect(views.document.reorder).toContainEqual({
      collection: 'views',
      before: ['v1', 'v2'],
      after: ['v2', 'v1'],
    })
    const story = compared((after) => {
      after.story.reverse()
    })
    expect(story.document.reorder).toContainEqual({
      collection: 'story',
      before: ['s1', 's2'],
      after: ['s2', 's1'],
    })
  })

  it('reports added and removed groups/views/story by exact ID without guessing renames', () => {
    const comparison = compared((after) => {
      after.scene.groups = [{ ...after.scene.groups[1] }]
      after.views = [{ ...after.views[1] }]
      after.story = []
    })
    expect(comparison.document.groups).toEqual([
      { id: 'g1', status: 'removed', changes: [] },
    ])
    expect(comparison.document.views).toEqual([
      { id: 'v1', status: 'removed', changes: [] },
    ])
    expect(comparison.document.story).toHaveLength(2)
    expect(comparison.document.story.map((entry) => entry.status)).toEqual([
      'removed',
      'removed',
    ])
  })

  it('object key insertion order never creates false document differences', () => {
    const comparison = compared((after) => {
      after.metadata.nodes.a = {
        owner: 'team-a',
        visibility: 'private',
        evidence: [evidence],
        links: [{ label: 'Docs', href: 'https://example.com/a' }],
        notes: 'Owned service',
        tags: ['core'],
        roles: ['api'],
      }
      after.extensions['acme.theme'] = { density: 2, accent: 'blue' }
    })
    expect(comparison.counts.document).toBe(0)
    expect(comparison.document.fields).toEqual([])
    expect(comparison.document.metadata).toEqual([])
    expect(comparison.document.extensions).toEqual([])
  })

  it('distinguishes genuine equality from unexamined extension content', () => {
    const equal = compared(() => {})
    expect(equal.counts.document).toBe(0)
    expect(equal.nodes).toEqual([])
    expect(equal.edges).toEqual([])
    // The payload is structurally equal but its semantics remain unknown.
    expect(equal.document.unknownNamespaces).toEqual(['acme.theme'])
  })

  it('keeps revision and document provenance out of semantic deltas', () => {
    const before = seed()
    const after = structuredClone(before)
    after.id = 'another-document'
    after.revision = 7
    const result = compareDocuments(before, after)
    if (!result.ok) throw Error(JSON.stringify(result.diagnostics))
    expect(result.value.before).toEqual({ documentId: 'compare-document', revision: 0 })
    expect(result.value.after).toEqual({ documentId: 'another-document', revision: 7 })
    expect(result.value.counts.document).toBe(0)
  })

  it('keeps incompatible types rejected under both compatibility codes', () => {
    const before = seed()
    const sequence = createDocument(
      {
        type: 'sequence',
        caption: 'Sequence',
        legend: { main: 'Main', branch: 'Branch' },
        participants: [{ id: 'client', label: 'Client' }],
        messages: [],
      },
      { id: 'sequence-doc', locale: 'en' },
    )
    if (!sequence.ok) throw Error(JSON.stringify(sequence.diagnostics))
    const result = compareDocuments(before, sequence.value)
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'compare.incompatible')).toBe(
      true,
    )
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === 'compare.incompatible-type'),
    ).toBe(true)
  })
})
