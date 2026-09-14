import { rebaseDocPage } from './model'
import { GitHubIcon, PreviewIcon, CodeIcon } from '../components/primitives/icons'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router'
import type { DocPage } from './model'
import { CodeBlock, CopyCode, DocLink, Tokens } from './Markdown'
import { ScrollArea } from '../components/primitives/ScrollArea'
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from '../components/primitives/Disclosure'
import { ThemeSelector } from '../components/primitives/theme'

function Preview({ page }: { page: DocPage }) {
  const [selected, setSelected] = useState('canvas')
  const tabs = useRef<HTMLDivElement>(null)
  const preview = page.preview!
  return (
    <section className="preview not-typeset" aria-label={`${preview.type} preview`}>
      <div className="preview-head">
        <div className="preview-tabs js-only" role="tablist" aria-label="Example view" ref={tabs}>
          {['canvas', 'code'].map((name, index) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-label={name === 'canvas' ? 'Preview' : 'Code'}
              title={name === 'canvas' ? 'Preview' : 'Code'}
              id={`${preview.type}-tab-${name}`}
              data-preview-tab={name}
              aria-controls={`${preview.type}-preview-${name}`}
              aria-selected={selected === name}
              tabIndex={selected === name ? 0 : -1}
              onClick={() => setSelected(name)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index
                setSelected(next ? 'code' : 'canvas')
                tabs.current?.querySelectorAll('button')[next].focus()
              }}
            >
              {name === 'canvas' ? <PreviewIcon /> : <CodeIcon />}
            </button>
          ))}
        </div>
        <a className="control" href={`${page.base}?only=example-${preview.type}#main`}>
          Open playground ↗
        </a>
      </div>
      <div
        className="preview-pane"
        id={`${preview.type}-preview-canvas`}
        data-preview-panel="canvas"
        role="tabpanel"
        aria-labelledby={`${preview.type}-tab-canvas`}
        hidden={selected !== 'canvas'}
      >
        <ScrollArea orientation="horizontal" label={`Scrollable ${preview.type} illustration`}>
          <div className="preview-canvas" dangerouslySetInnerHTML={{ __html: preview.html }} />
        </ScrollArea>
        <p className="preview-caption">
          {page.file === 'docs/index.md' ? 'Band layout' : page.label} ·{' '}
          {page.file.startsWith('docs/diagrams/') ? 'Minimal spec' : `${preview.type} example`}
        </p>
      </div>
      <div
        className="preview-pane preview-code"
        id={`${preview.type}-preview-code`}
        data-preview-panel="code"
        role="tabpanel"
        aria-labelledby={`${preview.type}-tab-code`}
        hidden={selected !== 'code'}
      >
        <CodeBlock
          text={preview.code}
          highlighted={preview.highlighted}
          language={`${preview.type}.tsx`}
          label="Preview React example"
        />
      </div>
    </section>
  )
}
function Search({ page }: { page: DocPage }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<
    { title: string; url: string; description: string; text: string }[]
  >([])
  const [failed, setFailed] = useState(false)
  function open() {
    dialog.current?.showModal()
    input.current?.focus()
  }
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${page.contentBase ?? page.base}docs-assets/search.json`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error('Search unavailable')
        return r.json()
      })
      .then((items: typeof entries) =>
        setEntries(
          items.map((entry) => {
            const marker = `/versions/${page.version}/`
            const index = entry.url.indexOf(marker)
            return {
              ...entry,
              url:
                page.contentBase && index >= 0 ? page.base + entry.url.slice(index + 1) : entry.url,
            }
          }),
        ),
      )
      .catch((e) => {
        if (e.name !== 'AbortError') setFailed(true)
      })
    return () => controller.abort()
  }, [page.base, page.contentBase])
  useEffect(() => {
    function keys(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        open()
      }
      if (!dialog.current?.open) return
      if (event.key === 'Escape') {
        event.preventDefault()
        dialog.current.close()
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const links = Array.from(
          dialog.current.querySelectorAll<HTMLAnchorElement>('.search-results a'),
        )
        const index = links.indexOf(document.activeElement as HTMLAnchorElement)
        if (event.key === 'ArrowUp' && index <= 0) input.current?.focus()
        else links[event.key === 'ArrowDown' ? (index + 1) % links.length : index - 1]?.focus()
      }
    }
    document.addEventListener('keydown', keys)
    return () => document.removeEventListener('keydown', keys)
  }, [])
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const score = (entry: (typeof entries)[number]) =>
    terms.reduce((sum, term) => sum + Number(entry.title.toLowerCase().includes(term)), 0)
  const found = entries
    .filter((entry) =>
      terms.every((term) => `${entry.title} ${entry.text}`.toLowerCase().includes(term)),
    )
    .sort((a, b) => score(b) - score(a))
    .slice(0, 12)
  return (
    <>
      <button
        className="control search-trigger js-only"
        type="button"
        data-open-search
        aria-label="Search documentation"
        data-search-index={`${page.contentBase ?? page.base}docs-assets/search.json`}
        onClick={open}
      >
        <span>Search</span>
        <kbd>⌘ K</kbd>
      </button>
      <dialog ref={dialog} className="search-dialog" aria-label="Search documentation">
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault()
            dialog.current?.querySelector<HTMLAnchorElement>('.search-results a')?.click()
          }}
        >
          <label className="sr-only" htmlFor="docs-search">
            Search documentation
          </label>
          <input
            ref={input}
            id="docs-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search layouts, guides, API…"
            autoComplete="off"
          />
          <button
            type="button"
            className="control"
            data-close-search
            aria-label="Close search"
            onClick={() => dialog.current?.close()}
          >
            Esc
          </button>
        </form>
        <ScrollArea className="search-scroll" label="Search results">
          <div className="search-results">
            {found.map((entry) => (
              <DocLink key={entry.url} href={entry.url} onClick={() => dialog.current?.close()}>
                <span>{entry.title}</span>
                <small>{entry.description}</small>
              </DocLink>
            ))}
          </div>
        </ScrollArea>
        <p className="search-status" role="status">
          {failed
            ? 'Search is unavailable. Use the navigation to browse documentation.'
            : query
              ? `${found.length} results`
              : 'Browse documentation or type to search'}
        </p>
      </dialog>
    </>
  )
}
const positions = new Map<string, number>()
export default function DocsApp({ initial }: { initial: DocPage }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [page, setPage] = useState(initial)
  const [pending, setPending] = useState(false)
  const [active, setActive] = useState('')
  const [mobileKey, setMobileKey] = useState(0)
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
          setMobileKey((key) => key + 1)
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
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: '-100px 0px -65% 0px' },
    )
    article.current
      ?.querySelectorAll('h2[id],h3[id]')
      .forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [page])
  const home = page.nav[0].pages[0].url
  const navLinks = (pages: DocPage['nav'][number]['pages']) =>
    pages.map((entry) => (
      <DocLink
        href={entry.url}
        key={entry.file}
        aria-current={entry.file === page.file ? 'page' : undefined}
      >
        {entry.label}
      </DocLink>
    ))
  let inserted = false
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="docs-header">
        <div className="header-inner">
          <a className="brand" href={page.base}>
            <span className="brand-short">aesthc</span>
            <span className="brand-full">aesthc / diagrams</span>
          </a>
          <nav className="header-nav" aria-label="Main navigation">
            <DocLink href={home} aria-current="page">
              Docs
            </DocLink>
            <a className="playground-link" href={`${page.base}#main`}>
              Playground
            </a>
          </nav>
          <div className="header-actions">
            <Search page={page} />
            <a
              className="control github-link"
              aria-label="GitHub"
              title="GitHub"
              href="https://github.com/alanslzrr/aesthc-diagram-lib"
              target="_blank"
              rel="noreferrer"
            >
              <GitHubIcon />
            </a>
            <div className="js-only">
              <ThemeSelector />
            </div>
          </div>
        </div>
      </header>
      <Disclosure className="mobile-nav" key={mobileKey}>
        <DisclosureTrigger>
          <span className="mobile-nav-label">
            <span>Browse docs</span>
            <span className="current-doc">{page.label}</span>
          </span>
        </DisclosureTrigger>
        <DisclosureContent>
          <ScrollArea className="mobile-scroll" label="Mobile documentation">
            <nav
              aria-label="Mobile documentation"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('a')) setMobileKey((key) => key + 1)
              }}
            >
              {navLinks(page.nav.flatMap((group) => group.pages))}
            </nav>
          </ScrollArea>
        </DisclosureContent>
      </Disclosure>
      <div className="docs-layout">
        <aside className="sidebar">
          <ScrollArea className="sidebar-scroll" label="Documentation navigation">
            <nav aria-label="Documentation">
              {page.nav.map((group) => (
                <section className="nav-group" key={group.name}>
                  <h2>{group.name}</h2>
                  {navLinks(group.pages)}
                </section>
              ))}
            </nav>
            <p className="sidebar-footer">
              Seven layouts.
              <br />
              Your data. Your theme.
            </p>
          </ScrollArea>
        </aside>
        <main className="article" id="content" tabIndex={-1} ref={article} aria-busy={pending}>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <DocLink href={home}>Docs</DocLink>
            <span aria-hidden="true">›</span>
            <span>{page.group}</span>
          </nav>
          <div className="page-meta">
            <span className="version-label">
              {page.version} · {page.stable ? 'Stable' : 'Release candidate'}
            </span>
            <a href={`${page.base}${page.destination}index.md`}>Read Markdown ↗</a>
            <a
              href={`https://github.com/alanslzrr/aesthc-diagram-lib/blob/${page.stable && page.destination.startsWith('versions/') ? `v${page.version}` : 'main'}/${page.file === 'docs/getting-started.md' || page.file.startsWith('docs/diagrams/') ? 'scripts/generate-docs.ts' : page.file}`}
            >
              {page.file === 'docs/getting-started.md' || page.file.startsWith('docs/diagrams/')
                ? 'Edit generation source ↗'
                : 'Edit this page ↗'}
            </a>
          </div>
          <div className="typeset typeset-docs">
            {page.blocks.map((token, index) => {
              const showPreview = !inserted && token.type === 'paragraph' && page.preview
              if (showPreview) inserted = true
              return (
                <Fragment key={index}>
                  {page.file === 'docs/agents/integrate.md' && token.type === 'blockquote' ? (
                    <section className="agent-request not-typeset">
                      <div className="preview-head">
                        <span>Ready for your agent</span>
                        <CopyCode
                          text={(token.tokens ?? []).map((entry) => entry.text ?? '').join('\n')}
                          label="Copy integration request"
                        />
                      </div>
                      <Tokens tokens={[token]} />
                    </section>
                  ) : (
                    <Tokens tokens={[token]} />
                  )}
                  {showPreview && (
                    <>
                      <Preview page={page} key={page.file} />
                      {page.file.startsWith('docs/diagrams/') && (
                        <div className="page-meta not-typeset">
                          <a
                            className="control"
                            href={`${page.contentBase ?? page.base}examples/${page.preview!.type}.tsx`}
                            download
                          >
                            React example ↓
                          </a>
                          <a
                            className="control"
                            href={`${page.contentBase ?? page.base}examples/${page.preview!.type}.json`}
                            download
                          >
                            JSON spec ↓
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </Fragment>
              )
            })}
          </div>
          {page.file.startsWith('docs/diagrams/') && (
            <Disclosure className="complete-example" key={page.file}>
              <DisclosureTrigger>Complete React example</DisclosureTrigger>
              <DisclosureContent>
                <CodeBlock
                  text={page.preview!.code}
                  highlighted={page.preview!.highlighted}
                  language="tsx"
                  label="Complete React example"
                />
              </DisclosureContent>
            </Disclosure>
          )}
          <nav className="pagination" aria-label="Documentation pages">
            {page.previous && (
              <DocLink href={page.previous.url}>
                <small>Previous</small>← {page.previous.label}
              </DocLink>
            )}
            {page.next && (
              <DocLink href={page.next.url}>
                <small>Next</small>
                {page.next.label} →
              </DocLink>
            )}
          </nav>
          <footer className="docs-footer">
            <span>Maintained by Alan Salazar</span>
            <span>Docs in English · Playground in English / Español</span>
          </footer>
        </main>
        <aside className="toc">
          <ScrollArea className="toc-scroll" label="Page index">
            <nav aria-label="On this page">
              <p>On this page</p>
              {page.headings.map((heading) => (
                <a
                  key={heading.id}
                  className={`level-${heading.depth}`}
                  href={`#${heading.id}`}
                  aria-current={heading.id === active ? 'location' : undefined}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
            <div className="toc-resource">
              <DocLink
                href={
                  page.nav
                    .flatMap((group) => group.pages)
                    .find((entry) => entry.file === 'docs/agents/integrate.md')!.url
                }
              >
                Integrate with your agent ↗
              </DocLink>
              <DocLink
                href={
                  page.nav
                    .flatMap((group) => group.pages)
                    .find((entry) => entry.file === 'docs/guides/troubleshooting.md')!.url
                }
              >
                Need help?
              </DocLink>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </>
  )
}
