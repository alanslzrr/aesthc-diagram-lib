import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DocsApp } from '@heyo-sh/heyo-docs'
import { heyoDocs } from '@heyo-sh/heyo-docs/config'
import { grainTheme } from '@heyo-sh/heyo-docs/theme/grain'
import type { ClientHeyoDocsConfig, DocsPage } from '@heyo-sh/heyo-docs/types'
// @ts-expect-error - the canonical config is plain ESM so build scripts read it directly.
import userConfig from '../heyo-docs.config.mjs'

// Runtime contract for the pinned Heyo shell: `DocsApp` renders its article
// and navigation with React server rendering (no DOM) for canonical
// `/`-prefixed page slugs. The site mount under /docs reuses this runtime
// through site/src/docs/DocsApp.tsx + shell.tsx; see heyo-integration.md.
const config = heyoDocs(userConfig) as ClientHeyoDocsConfig
const IDS = config.groups
  .flatMap((group) => ('sections' in group ? (group.sections ?? []) : []))
  .flatMap((section) => ('pages' in section ? (section.pages ?? []) : []))
  .filter((id): id is string => typeof id === 'string')

function pages(): DocsPage[] {
  return IDS.map((id) => ({
    slug: `/${id}`,
    title: id,
    description: 'Spike page',
    content: (() => createElement('p', null, `CONTENT-${id}`)) as DocsPage['content'],
    tableOfContents: [],
    seo: { title: id, description: 'Spike page' },
  }))
}

function render(pathname: string) {
  return renderToStaticMarkup(
    createElement(DocsApp, {
      config,
      pages: pages(),
      pathname,
      theme: grainTheme,
    }),
  )
}

describe('heyo docs shell feasibility', () => {
  it('server-renders the requested article and navigation without DOM APIs', () => {
    const editor = render('/guides/editor')
    expect(editor).toContain('CONTENT-guides/editor')
    expect(editor).not.toContain('CONTENT-index')
    expect(editor).not.toContain('Page not found')
    // Navigation for the sibling pages is part of the static HTML.
    expect(editor).toContain('href="/guides/editor"')
    expect(editor).toContain('href="/guides/react"')

    const index = render('/index')
    expect(index).toContain('CONTENT-index')
    expect(index).not.toContain('CONTENT-guides/editor')
    expect(index).not.toContain('Page not found')
    expect(index).toContain('href="/getting-started"')
  })

  it('renders a not-found page for an unknown route', () => {
    const missing = render('/definitely/missing')
    expect(missing).toContain('Page not found')
    expect(missing).not.toContain('CONTENT-index')
  })
})
