import { describe, expect, it } from 'vitest'
import { createDocument, resolveDocument } from '../src/editor-core'
import { renderSceneMarkup } from '../src/render'
import {
  DECISION_PILL_H,
  DECISION_PILL_R,
  EDGE_STROKE_WIDTH,
  LANE_R,
  PILL_H,
  PILL_R,
} from '../src/theme'
import type { DiagramSpec } from '../src/types'
import fixtures from './fixtures/editor/legacy-specs.json'

function render(spec: DiagramSpec) {
  const d = createDocument(spec, { id: 'parity', locale: 'en' })
  if (!d.ok) throw Error(`document: ${d.diagnostics[0]?.message ?? 'invalid'}`)
  const s = resolveDocument(d.value, { quality: 'edit', requestId: 'parity' })
  if (!s.ok) throw Error(`scene: ${s.diagnostics[0]?.message ?? 'invalid'}`)
  return renderSceneMarkup(d.value, s.value, { instanceId: 'parity' })
}

function card(spec: DiagramSpec) {
  const doc = createDocument(spec, { id: 'parity', locale: 'en' })
  if (!doc.ok) throw Error('document')
  const scene = resolveDocument(doc.value, { quality: 'edit', requestId: 'parity' })
  if (!scene.ok) throw Error('scene')
  return {
    node: scene.value.layout.nodes[0],
    markup: renderSceneMarkup(doc.value, scene.value, { instanceId: 'parity' }),
  }
}

describe('editor renderer parity with the legacy canvas', () => {
  it('draws every edge with a shared stroke default, authored overrides and round caps, for all seven types', () => {
    for (const [name, spec] of Object.entries(fixtures) as Array<[string, DiagramSpec]>) {
      const markup = render(spec)
      expect(markup).toContain(`stroke-width="${name === 'timeline' ? 1.1 : EDGE_STROKE_WIDTH}"`)
      expect(markup).toContain('stroke-linecap="round"')
      expect(markup).not.toContain('markerUnits')
      expect(markup).toMatch(/data-edge-id="/)
    }
  })

  it('aligns swimlane containers with the legacy lane radius, uppercase mono label and kind line', () => {
    const { markup } = card(fixtures.swimlane as DiagramSpec)
    expect(markup).toContain(`rx="${LANE_R}"`)
    expect(markup).toContain('letter-spacing="1.6"')
    expect(markup).toContain('SUPPORT')
    expect(markup).toContain('ENGINEERING')
  })

  it('keeps sequence lifelines dashed exactly like the legacy canvas', () => {
    const markup = render(fixtures.sequence as DiagramSpec)
    expect(markup).toContain('stroke-dasharray="2 6"')
  })

  it('renders edge labels as mono pills sized by the shared pill constants', () => {
    for (const name of ['sequence', 'state-machine', 'er'] as const) {
      const markup = render(fixtures[name] as DiagramSpec)
      expect(markup).toMatch(/data-edge-label="/)
      expect(markup).toContain(`height="${PILL_H}"`)
      expect(markup).toContain(`rx="${PILL_R}"`)
      expect(markup).toContain('font-family="Geist Mono, monospace"')
    }
  })

  it('draws band decisions as pills and continuations with the same pill and arrowhead', () => {
    const markup = render({
      type: 'band',
      caption: 'Pipeline',
      legend: { main: 'Main', branch: 'Branch' },
      bands: [{ title: 'Input' }, { title: 'Output' }],
      nodes: [
        { id: 'a', label: 'Request', description: '', band: 0 },
        { id: 'b', label: 'Response', description: '', band: 1 },
      ],
      edges: [{ id: 'request', from: 'a', to: 'b' }],
      decisions: [{ id: 'check', source: 'a', label: 'approved?' }],
      continuations: [
        {
          id: 'again',
          from: 'a',
          label: 'again',
          destination: 'b',
          side: 'left',
          labelPlacement: 'above-source',
        },
      ],
    } as DiagramSpec)
    expect(markup).toContain(`height="${DECISION_PILL_H}"`)
    expect(markup).toContain(`rx="${DECISION_PILL_R}"`)
    expect(markup).toMatch(/data-continuation-label="/)
    expect(markup).toContain(`height="${PILL_H}"`)
  })

  it('draws the ER table header strip and field separators under the label', () => {
    const { markup } = card(fixtures.er as DiagramSpec)
    expect(markup).toMatch(/<path d="M /)
    expect(markup).toMatch(/data-field-name="/)
    expect(markup).toContain(`fill-opacity="0.06"`)
  })

  it('draws state final markers at the legacy opacities', () => {
    const markup = render(fixtures['state-machine'] as DiagramSpec)
    expect(markup).toContain('stroke-opacity="0.55"')
    expect(markup).toContain('fill-opacity="0.7"')
    expect(markup).toContain('r="6.5"')
  })

  it('draws muted nodes as a hairline, matching the legacy underline', () => {
    const { markup } = card({
      type: 'flowchart',
      caption: 'Muted',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [{ id: 'a', label: 'Hint', description: '', weight: 'muted' }],
      edges: [],
    } as DiagramSpec)
    expect(markup).toContain(`stroke-width="1"`)
    expect(markup).not.toContain('data-node-surface="true"')
  })

  it('draws activation bars with the legacy radius and translucent fill', () => {
    const { markup } = card({
      type: 'sequence',
      caption: 'Activation',
      legend: { main: 'Main', branch: 'Branch' },
      participants: [
        { id: 'a', label: 'Client' },
        { id: 'b', label: 'Server' },
      ],
      messages: [
        { id: 'one', from: 'a', to: 'b', label: 'POST /', activation: true },
        { id: 'two', from: 'b', to: 'a', label: '200 OK' },
      ],
    } as DiagramSpec)
    expect(markup).toContain('rx="2"')
    expect(markup).toContain('fill-opacity=".22"')
  })

  it('keeps timeline event connectors dashed like the legacy canvas', () => {
    const markup = render(fixtures.timeline as DiagramSpec)
    expect(markup).toContain('stroke-dasharray="2 7"')
  })

  it('renders authored card kinds in mono uppercase with the shared tracking', () => {
    const { markup } = card({
      type: 'flowchart',
      caption: 'Kinds',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [{ id: 'a', label: 'One', description: '', kind: 'api' }],
      edges: [],
    } as DiagramSpec)
    expect(markup).toContain('API')
    expect(markup).toContain('letter-spacing="1.6"')
  })
})
