import { describe, expect, it } from 'vitest'
import { layoutDiagram } from '../src/layouts'
import { previewBounds } from '../scripts/docs/preview-bounds'
import { readFileSync } from 'node:fs'
import type { DiagramSpec } from '../src/types'

describe('documentation preview framing', () => {
  for (const type of [
    'band',
    'flowchart',
    'sequence',
    'state-machine',
    'er',
    'timeline',
    'swimlane',
  ]) {
    it(`keeps ${type} node geometry inside the focused artboard`, () => {
      const spec = JSON.parse(readFileSync(`examples/${type}.json`, 'utf8')) as DiagramSpec
      const layout = layoutDiagram(spec)
      const bounds = previewBounds(layout)
      for (const node of layout.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(bounds.x)
        expect(node.y).toBeGreaterThanOrEqual(bounds.y)
        expect(node.x + node.w).toBeLessThanOrEqual(bounds.x + bounds.width)
        expect(node.y + node.h).toBeLessThanOrEqual(bounds.y + bounds.height)
      }
      if (type === 'state-machine') expect(bounds.width).toBeLessThan(400)
    })
  }
  it('retains the full artboard for unsupported path commands', () => {
    const spec = JSON.parse(readFileSync('examples/flowchart.json', 'utf8')) as DiagramSpec
    const layout = layoutDiagram(spec)
    layout.edges[0].d = 'M 10 10 H 20'
    expect(previewBounds(layout)).toEqual({
      x: 0,
      y: 0,
      width: layout.width,
      height: layout.height,
    })
  })
})
