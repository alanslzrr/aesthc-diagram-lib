import { describe, expect, it } from 'vitest'
import { createDocument, resolveDocument } from '../src/editor-core'
import { renderSvg } from '../src/render'
import type { DiagramNodeVisual } from '../src/types'
import { brandIcons } from '../src/brand-icons/data'
import { scopeIconMarkup } from '../src/brand-icons/scope'
import { CARD_TEXT_X } from '../src/theme'

function render(
  visual: DiagramNodeVisual,
  instanceId = 'icons',
  theme: 'light' | 'dark' = 'light',
) {
  const result = createDocument(
    {
      type: 'flowchart',
      caption: 'Icons',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'one', label: 'One', description: '' },
        { id: 'two', label: 'Two', description: '' },
      ],
      edges: [],
    },
    { id: 'icons', locale: 'en' },
  )
  if (!result.ok) throw Error('document')
  const doc = structuredClone(result.value)
  doc.metadata.visuals = { one: visual, two: visual }
  const scene = resolveDocument(doc, { quality: 'edit', requestId: 'icons' })
  if (!scene.ok) throw Error('scene')
  return {
    svg: renderSvg(doc, scene.value, { instanceId, theme }),
    node: scene.value.layout.nodes[0],
  }
}

describe('self-contained document icons', () => {
  it('scopes bundled definitions and xlink references without changing artwork', () => {
    const body = scopeIconMarkup(brandIcons.pnpm.light.body, 'node-a')
    const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
    const refs = [...body.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])
    expect(ids.length).toBeGreaterThan(0)
    expect(refs.length).toBe(ids.length)
    for (const ref of refs) {
      expect(ids).toContain(ref)
      expect(ref).toMatch(/^node-a-/)
    }
  })
  it('renders semantic icons with the shared icon gutter', () => {
    const { svg, node } = render({ source: 'phosphor', key: 'graph' })
    expect(svg).toContain('data-node-icon="graph"')
    expect(svg).toContain('viewBox="0 0 256 256"')
    expect(svg).toContain(`data-node-label="true" x="${node.x + CARD_TEXT_X}"`)
    expect(svg).toContain('MIT License')
  })
  it('embeds brand artwork and resolves local references uniquely per node and instance', () => {
    const a = render({ source: 'thesvg', key: 'google-cloud' }).svg
    const b = render({ source: 'thesvg', key: 'google-cloud' }, 'another').svg
    expect(a).toContain('data-node-icon="google-cloud"')
    const ids = [...a.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(ids).size).toBe(ids.length)
    const references = [...a.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)].map((m) => m[1])
    expect(references.length).toBeGreaterThan(0)
    for (const ref of references) expect(ids).toContain(ref)
    expect(ids.some((id) => b.includes(`id="${id}"`))).toBe(false)
    expect(a).not.toMatch(/(?:href|src)="https?:/)
  })
  it('resolves dark monochrome assets without depending on host CSS', () => {
    const { svg } = render({ source: 'thesvg', key: 'nextjs' }, 'dark', 'dark')
    expect(svg).toContain('data-node-icon="nextjs"')
    expect(svg).toContain('style="filter:invert(1)"')
  })
})
