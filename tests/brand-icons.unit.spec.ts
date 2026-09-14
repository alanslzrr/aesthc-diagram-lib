import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BrandIcon } from '../src/brand-icons'
import { brandIcons } from '../src/brand-icons/data'
import { ArchitectureNodeIcon } from '../src/canvas/ArchitectureNodeIcon'
import { CLOUD_ARCHITECTURE_SPEC, CLOUD_ARCHITECTURE_VISUALS } from '../src/examples'
import { validateDiagramSpec } from '../src/validation'

describe('selected TheSVG artwork', () => {
  it('contains only local non-executable artwork with matching theme viewBoxes', () => {
    for (const variants of Object.values(brandIcons)) {
      for (const data of Object.values(variants)) {
        expect(data.body).not.toMatch(
          /<(?:script|style|foreignObject|image)\b|\bon[a-z]+\s*=|(?:href|src)="(?!#)|url\((?!#)/i,
        )
        expect(data.viewBox.split(' ').map(Number).every(Number.isFinite)).toBe(true)
        expect(data.viewBox).toBe(variants.default.viewBox)
      }
    }
  })
  it('namespaces local definitions and references independently for repeated marks', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(BrandIcon, { name: 'pnpm' }),
        createElement(BrandIcon, { name: 'pnpm' }),
      ),
    )
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    for (const match of html.matchAll(/(?:xlink:)?href="#([^"]+)"/g))
      expect(ids).toContain(match[1])
  })
  it('renders color provider icons without remote image requests', () => {
    for (const key of ['google-cloud', 'azure'] as const) {
      const html = renderToStaticMarkup(
        createElement(ArchitectureNodeIcon, {
          visual: { source: 'thesvg', key },
          x: 10,
          y: 20,
          size: 24,
        }),
      )
      expect(html).toContain('width="24"')
      expect(html).toMatch(/fill="#[\da-f]+"/i)
      expect(html).not.toContain('<image')
    }
  })
  it('keeps the original svgl keys as aliases for the new artwork', () => {
    for (const key of ['google-cloud', 'nextjs', 'postgresql', 'mcp'] as const) {
      const props = { x: 0, y: 0, size: 20 }
      expect(
        renderToStaticMarkup(
          createElement(ArchitectureNodeIcon, { ...props, visual: { source: 'svgl', key } }),
        ),
      ).toBe(
        renderToStaticMarkup(
          createElement(ArchitectureNodeIcon, { ...props, visual: { source: 'thesvg', key } }),
        ),
      )
    }
  })
  it('keeps cloud provider mappings separate from a valid authored spec', () => {
    expect(validateDiagramSpec(CLOUD_ARCHITECTURE_SPEC).success).toBe(true)
    expect(CLOUD_ARCHITECTURE_VISUALS.gcp).toEqual({ source: 'thesvg', key: 'google-cloud' })
    expect(CLOUD_ARCHITECTURE_VISUALS.azure).toEqual({ source: 'thesvg', key: 'azure' })
  })
})
