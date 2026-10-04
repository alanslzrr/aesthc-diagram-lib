import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router'
import { DocsApp as HeyoDocsApp } from '@heyo-sh/heyo-docs'
import type { DocsPage, TableOfContentsItem } from '@heyo-sh/heyo-docs/types'
// @ts-expect-error - the canonical config is plain ESM so the docs pipeline reads it directly.
import userConfig from '../../../heyo-docs.config.mjs'
import { ArticleBody } from './content'
import { DocsRuntimeContext } from './context'
import { rebaseDocPage, type DocPage } from './model'
import { SiteLink, siteTheme } from './shell'

const config = userConfig

/** Heyo page slugs are mount-relative and match the canonical config ids. */
const slugFor = (file: string) => '/' + file.replace(/^docs\//, '').replace(/\.md$/, '')

function EmptyPageContent() {
  return null
}

const positions = new Map<string, number>()

/**
 * Mounts the real Heyo Docs shell. The runtime keeps this repository's
 * `page.json` navigation and browser history behavior; the shell, navigation
 * model, page lookup and search slots come from `@heyo-sh/heyo-docs`.
 */
export default function DocsApp({ initial }: { initial: DocPage }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [page, setPage] = useState(initial)
  const [pending, setPending] = useState(false)
  const article = useRef<HTMLElement>(null)
  const first = useRef(true)
  useEffect(() => {
    document.documentElement.dataset.enhanced = 'true'
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    const expected = page.base + page.destination
    if (location.pathname === expected) setPending(false)
    if (location.pathname !== expected) {
      const known = page.nav.some((group) =>
        group.pages.some((entry) => entry.url === location.pathname),
      )
      if (!known) {
        setPage({
          ...page,
          file: '404',
          title: 'Page not found',
          label: 'Page not found',
          destination: location.pathname.slice(page.base.length),
          headings: [],
          preview: null,
          previous: null,
          next: null,
          blocks: [
            { type: 'heading', depth: 1, text: 'Page not found', id: 'page-not-found' },
            {
              type: 'paragraph',
              text: 'This address does not match a documentation page. Use the navigation to return to the guides.',
            },
          ],
        })
        setPending(false)
        return
      }
      setPending(true)
      fetch(`${location.pathname.replace(/\/?$/, '/')}page.json`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw Error('Page unavailable')
          return response.json()
        })
        .then((next: DocPage) => {
          setPage(rebaseDocPage(next, location.pathname))
          setPending(false)
        })
        .catch((error) => {
          if (error.name !== 'AbortError') window.location.assign(location.pathname + location.hash)
        })
    }
    return () => controller.abort()
  }, [location.pathname, page.base, page.destination, location.hash])
  useEffect(() => {
    if (page.base + page.destination !== location.pathname) return
    document.title = `${page.title} · @aesthc/diagram-lib`
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        page.description ?? `${page.title} for @aesthc/diagram-lib ${page.version}`,
      )
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute('content', page.description ?? page.title)
    document
      .querySelector('meta[property="og:url"]')
      ?.setAttribute('content', page.origin + page.destination)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', page.title)
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', page.origin + page.destination)
    document
      .querySelector('link[rel="alternate"]')
      ?.setAttribute('href', `${page.base}${page.destination}index.md`)
    let anchor: HTMLElement | null = null
    try {
      anchor = location.hash
        ? document.getElementById(decodeURIComponent(location.hash.slice(1)))
        : null
    } catch {
      /* Malformed fragments do not invalidate the page. */
    }
    if (anchor) {
      anchor.scrollIntoView({ block: 'start' })
    } else if (!first.current) {
      article.current?.focus({ preventScroll: true })
      window.scrollTo(0, navigationType === 'POP' ? (positions.get(location.key) ?? 0) : 0)
    }
    first.current = false
    return () => {
      positions.set(location.key, window.scrollY)
    }
  }, [page, location.pathname, location.hash, location.key, navigationType])

  const hrefBySlug = useMemo(() => {
    const map = new Map<string, string>()
    for (const group of page.nav)
      for (const entry of group.pages) map.set(slugFor(entry.file), entry.url)
    return map
  }, [page])
  const hrefFor = useMemo(
    () => (slug: string) => {
      const direct = hrefBySlug.get(slug)
      if (direct) return direct
      const prefix = page.base + 'docs/'
      if (slug === '/index' || slug === '/' || !slug) return prefix
      return `${prefix}${slug.replace(/^\//, '')}/`
    },
    [hrefBySlug, page.base],
  )
  const slug = slugFor(page.file)
  const heyoPages = useMemo(() => {
    const stubs: DocsPage[] = page.nav
      .flatMap((group) => group.pages)
      .filter((entry) => entry.file !== page.file)
      .map((entry) => ({
        slug: slugFor(entry.file),
        title: entry.label,
        description: '',
        content: EmptyPageContent,
        tableOfContents: [],
        seo: { title: entry.label, description: '' },
      }))
    const current: DocsPage = {
      slug,
      title: page.title,
      description: page.description ?? '',
      content: function PageContent() {
        return <ArticleBody page={page} />
      },
      tableOfContents: page.headings.map(
        (heading) =>
          ({
            id: heading.id,
            title: heading.text,
            depth: Math.min(6, Math.max(2, heading.depth)) as TableOfContentsItem['depth'],
          }) satisfies TableOfContentsItem,
      ),
      seo: { title: page.title, description: page.description ?? '' },
    }
    return [...stubs, current]
  }, [page, slug])

  return (
    <DocsRuntimeContext.Provider value={{ page, pending, slug, hrefFor, article }}>
      <HeyoDocsApp
        config={config}
        pages={heyoPages}
        pathname={slug}
        theme={siteTheme}
        link={SiteLink}
      />
    </DocsRuntimeContext.Provider>
  )
}
