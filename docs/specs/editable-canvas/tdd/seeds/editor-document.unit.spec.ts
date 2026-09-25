import { describe, expect, it } from 'vitest'
import type { DiagramSpec, FlowchartDiagramSpec } from '../src/types'
import { diagramEdges } from '../src/layout'
import { createDocument, importDocument, serializeDocument } from '../src/editor-core'
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
})
