import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DiagramShowcase } from '../src/showcase'
import { DEFAULT_SHOWCASE_ENTRIES } from '../src/showcase/entries'

describe('DiagramShowcase', () => {
  it('renders one interactive panel per entry', () => {
    const html = renderToStaticMarkup(
      createElement(DiagramShowcase, { locale: 'en', entries: DEFAULT_SHOWCASE_ENTRIES }),
    )

    expect(html).toContain('data-diagram-panel')
    expect(html.match(/data-diagram-panel=/g)?.length).toBe(DEFAULT_SHOWCASE_ENTRIES.length)
    expect(html).toContain('data-diagram-scroll')
    expect(html).toContain('data-node-id=')
    expect(html).toContain('data-lifeline-id=')
    expect(html).toContain('data-container-id=')
  })

  it('renders every supported type without throwing (band → swimlane)', () => {
    expect(() =>
      renderToStaticMarkup(
        createElement(DiagramShowcase, { locale: 'es', entries: DEFAULT_SHOWCASE_ENTRIES }),
      ),
    ).not.toThrow()
  })

  it('shows the localized caption + legend for each panel', () => {
    const html = renderToStaticMarkup(
      createElement(DiagramShowcase, { locale: 'es', entries: DEFAULT_SHOWCASE_ENTRIES }),
    )
    // Spanish captions from the example diagrams
    expect(html).toContain('un pipeline de solicitudes')
    expect(html).toContain('un pipeline de despliegue')
    expect(html).toContain('un flujo de checkout')
  })
})
