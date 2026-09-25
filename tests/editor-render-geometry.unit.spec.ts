import { describe, expect, it } from 'vitest'
import { createDocument, resolveDocument } from '../src/editor-core'
import type { DiagramSpec } from '../src/types'
import { renderSceneMarkup } from '../src/render'
import { nodeGeometry } from '../src/geometry/node'
import fixtures from './fixtures/editor/legacy-specs.json'
function render(spec: DiagramSpec) {
  const d = createDocument(spec, { id: 'render', locale: 'en' })
  if (!d.ok) throw Error('document')
  const s = resolveDocument(d.value, { quality: 'edit', requestId: 'test' })
  if (!s.ok) throw Error('scene')
  return {
    markup: renderSceneMarkup(d.value, s.value, { instanceId: 'test' }),
    layout: s.value.layout,
  }
}
describe('editor renderer semantic geometry', () => {
  it('centers an unannotated card label on its true center', () => {
    const { markup, layout } = render({
      type: 'flowchart',
      caption: 'Cards',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [{ id: 'a', label: 'A', description: '' }],
      edges: [],
    })
    const n = layout.nodeById.a
    expect(markup).toContain(`data-node-label="true" x="${n.cx}" y="${n.cy}"`)
    expect(markup).toContain('dominant-baseline="central"')
  })
  it('places ER fields in the same rows as the existing canvas', () => {
    const { markup, layout } = render(fixtures.er as DiagramSpec),
      n = layout.nodes[0]
    expect(markup).toContain(
      `data-field-name="${n.fields![0].name}" x="${n.x + 34}" y="${n.y + 40.5}"`,
    )
    expect(markup).toContain('data-field-annotation=')
  })
  it('keeps timeline label and spine coordinates distinct and supplies a nonzero hit area', () => {
    const { markup, layout } = render(fixtures.timeline as DiagramSpec),
      n = layout.nodes[0]
    expect(nodeGeometry(n).hit.height).toBeGreaterThan(24)
    expect(markup).toContain(`x1="${n.cx}" y1="${n.cy}" x2="${n.cx}"`)
    expect(markup).toContain(`data-node-label="true" x="${n.cx}" y="${n.y}"`)
  })
  it('draws state final markers on the right at the vertical center', () => {
    const spec = {
      type: 'state-machine' as const,
      caption: 'States',
      legend: { main: 'Main', branch: 'Branch' },
      states: [{ id: 'end', label: 'End', final: true }],
      transitions: [],
    }
    const { markup, layout } = render(spec),
      n = layout.nodeById.end
    expect(markup).toContain(`cx="${n.x + n.w - 20}" cy="${n.cy}" r="6.5"`)
  })
})
