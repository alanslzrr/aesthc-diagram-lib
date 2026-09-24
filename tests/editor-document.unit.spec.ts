import { describe, expect, it } from 'vitest'
import type { DiagramSpec, FlowchartDiagramSpec, GraphDiagramSpec } from '../src/types'
import { diagramEdges } from '../src/layout'
import {
  createDocument,
  importDocument,
  serializeDocument,
  exportLegacySpec,
} from '../src/editor-core'
import legacy from './fixtures/editor/legacy-specs.json'

describe('versioned editor document', () => {
  it.each(Object.entries(legacy))('T01.1 normalizes %s without mutating the spec', (_, input) => {
    const before = JSON.stringify(input)
    const result = createDocument(input as DiagramSpec, { id: 'doc-test', locale: 'en' })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    expect(result.value.format).toBe('aesthc-diagram')
    expect(result.value.schemaVersion).toBe(1)
    expect(result.value.id).toBe('doc-test')
    expect(result.value.revision).toBe(0)
    expect(result.value.spec.type).toBe(input.type)
    expect(JSON.stringify(input)).toBe(before)
    expect(result.value.spec).not.toBe(input)
  })

  it('T02.1 reserves explicit IDs before assigning anonymous parallel IDs', () => {
    const spec: FlowchartDiagramSpec = {
      type: 'flowchart',
      caption: 'Parallel identities',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'A', description: 'Source' },
        { id: 'b', label: 'B', description: 'Target' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' },
        { id: 'a::b', from: 'a', to: 'b' },
      ],
    }
    const result = createDocument(spec, { id: 'parallel', locale: 'en' })
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    expect(result.value.spec.type).toBe('flowchart')
    if (result.value.spec.type !== 'flowchart') throw new Error('Wrong spec type')
    expect(result.value.spec.edges.map((edge) => edge.id)).toEqual(['a::b::2', 'a::b::3', 'a::b'])
    expect(diagramEdges(spec).map((edge) => edge.id)).toEqual(
      result.value.spec.edges.map((edge) => edge.id),
    )
    expect(spec.edges[0].id).toBeUndefined()
  })

  it('T01.2 preserves canonical bytes and rejects future schema versions', () => {
    const made = createDocument(legacy.flowchart as DiagramSpec, { id: 'roundtrip', locale: 'en' })
    if (!made.ok) throw new Error(JSON.stringify(made.diagnostics))
    const first = serializeDocument(made.value)
    const decoded = importDocument(JSON.parse(first), { id: 'unused', locale: 'en' })
    if (!decoded.ok) throw new Error(JSON.stringify(decoded.diagnostics))
    expect(serializeDocument(decoded.value.document)).toBe(first)
    const future = importDocument(
      { ...JSON.parse(first), schemaVersion: 999 },
      { id: 'unused', locale: 'en' },
    )
    expect(future.ok).toBe(false)
    expect(future.diagnostics.some((issue) => issue.code === 'version.unsupported')).toBe(true)
  })

  it('T03.1 requires an explicit legacy-band policy', () => {
    const input = structuredClone(legacy.band) as Record<string, unknown>
    delete input.type
    expect(importDocument(input, { id: 'legacy', locale: 'en' }).ok).toBe(false)
    const result = importDocument(input, { id: 'legacy', locale: 'en', allowLegacyBand: true })
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    expect(result.value.source).toBe('legacy-band')
    expect(result.value.document.spec.type).toBe('band')
    expect(input.type).toBeUndefined()
  })

  it('T03.1 selects the requested locale and reports the omitted variant', () => {
    const localized = {
      en: {
        type: 'flowchart',
        caption: 'EN',
        legend: { main: 'M', branch: 'B' },
        nodes: [{ id: 'a', label: 'A', description: '' }],
        edges: [],
      },
      es: {
        type: 'flowchart',
        caption: 'ES',
        legend: { main: 'M', branch: 'B' },
        nodes: [{ id: 'a', label: 'A', description: '' }],
        edges: [],
      },
    }
    const spanish = importDocument(localized, { id: 'd', locale: 'es' })
    if (!spanish.ok) throw new Error(JSON.stringify(spanish.diagnostics))
    expect(spanish.value.source).toBe('localized')
    expect(spanish.value.document.locale).toBe('es')
    expect(spanish.value.document.spec.caption).toBe('ES')
    expect(spanish.value.omittedLocale).toBe('en')
    const english = importDocument(localized, { id: 'd', locale: 'en' })
    if (!english.ok) throw new Error(JSON.stringify(english.diagnostics))
    expect(english.value.document.spec.caption).toBe('EN')
    expect(english.value.omittedLocale).toBe('es')
  })

  it('T03.2 reports exact losses on legacy spec export without mutating the document', () => {
    const made = createDocument(legacy.flowchart as DiagramSpec, {
      id: 'legacy-export',
      locale: 'en',
    })
    if (!made.ok) throw new Error(JSON.stringify(made.diagnostics))
    const doc = made.value
    doc.scene.mode = 'manual'
    doc.scene.nodes.a = { x: 40, y: 60, width: 140, height: 56, locked: false }
    doc.scene.routes.request = {
      mode: 'manual',
      source: { side: 'right', offset: 0.5 },
      target: { side: 'left', offset: 0.5 },
      points: [],
    }
    doc.scene.groups = [{ id: 'g', label: 'Group', kind: 'visual', nodeIds: ['a'], locked: false }]
    doc.metadata.nodes.a = { roles: ['reader'], tags: [] }
    doc.views = [{ id: 'v', label: 'View', focus: { nodeIds: ['a'], edgeIds: [] } }]
    doc.revision = 3
    const before = JSON.stringify(doc)
    const result = exportLegacySpec(doc)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    const paths = result.value.losses.map((loss) => loss.path)
    for (const path of [
      '/scene/mode',
      '/scene/nodes',
      '/scene/routes',
      '/scene/groups',
      '/metadata',
      '/views',
      '/revision',
      '/locale',
    ])
      expect(paths).toContain(path)
    expect(result.value.spec.type).toBe('flowchart')
    expect(JSON.stringify(doc)).toBe(before)
  })

  it('T03.2 keeps serializeDocument lossless and reports no scene losses on a fresh document', () => {
    const made = createDocument(legacy.flowchart as DiagramSpec, { id: 'roundtrip', locale: 'en' })
    if (!made.ok) throw new Error(JSON.stringify(made.diagnostics))
    const exported = exportLegacySpec(made.value)
    if (!exported.ok) throw new Error(JSON.stringify(exported.diagnostics))
    expect(exported.value.losses.map((loss) => loss.path)).toEqual(['/locale'])
    const serialized = serializeDocument(made.value)
    const decoded = importDocument(JSON.parse(serialized), { id: 'unused', locale: 'en' })
    if (!decoded.ok) throw new Error(JSON.stringify(decoded.diagnostics))
    expect(serializeDocument(decoded.value.document)).toBe(serialized)
  })

  it('T03.2 rejects legacy export of graph documents without an invented shape', () => {
    const graph: GraphDiagramSpec = {
      type: 'graph',
      caption: 'Graph',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [{ id: 'a', label: 'A', description: '' }],
      edges: [],
    }
    const made = createDocument(graph, { id: 'graph', locale: 'en' })
    if (!made.ok) throw new Error(JSON.stringify(made.diagnostics))
    const result = exportLegacySpec(made.value)
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.diagnostics.map((d) => d.code)).toContain('conversion.unsupported')
  })
})
