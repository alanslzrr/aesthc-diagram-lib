import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type {
  DocsPageProps,
  HeyoDocsTheme,
  LayoutProps,
  SidebarProps,
  TableOfContentsProps,
} from '@heyo-sh/heyo-docs/types'
import type { DocsLinkComponent, DocsLinkProps } from '@heyo-sh/heyo-docs/link'
import { ArticleBody, DocsSearch } from './content'
import { useDocsRuntime } from './context'
import { DocLink } from './Markdown'
import { safeHref } from './model'
import { ScrollArea } from '../components/primitives/ScrollArea'
import { GitHubIcon } from '../components/primitives/icons'
import { ThemeSelector } from '../components/primitives/theme'

function SiteLayout({ children, sidebar, topNavigation }: LayoutProps) {
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      {topNavigation}
      <div className="docs-layout">
        {sidebar}
        {children}
      </div>
    </>
  )
}

function SiteTopNavigation() {
  const { page, hrefFor } = useDocsRuntime()
  const home = page.nav[0]?.pages[0]?.url ?? hrefFor('/index')
  const navigation = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    navigation.current?.close()
  }, [page.file])
  const closeNavigation = () => {
    navigation.current?.close()
    opener.current?.focus({ preventScroll: true })
  }
  return (
    <>
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
            <a className="playground-link" href={`${page.base}playground.html`}>
              Playground
            </a>
          </nav>
          <div className="header-actions">
            <DocsSearch />
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
      <div className="mobile-nav">
        <button
          ref={opener}
          type="button"
          className="control"
          aria-haspopup="dialog"
          onClick={() => navigation.current?.showModal()}
        >
          Browse documentation
        </button>
        <dialog
          ref={navigation}
          className="docs-navigation-dialog"
          aria-label="Documentation navigation"
          onCancel={(event) => {
            event.preventDefault()
            closeNavigation()
          }}
        >
          <div className="docs-navigation-heading">
            <strong>Documentation</strong>
            <button type="button" className="control" onClick={closeNavigation}>
              Close navigation
            </button>
          </div>
          <nav aria-label="Mobile documentation">
            {page.nav.map((group) => (
              <section className="nav-group" key={group.name}>
                <h2>{group.name}</h2>
                {group.pages.map((entry) => (
                  <DocLink
                    href={entry.url}
                    key={entry.file}
                    aria-current={entry.file === page.file ? 'page' : undefined}
                  >
                    {entry.label}
                  </DocLink>
                ))}
              </section>
            ))}
          </nav>
        </dialog>
      </div>
    </>
  )
}

/**
 * The site navigation lists every manifest group. Heyo filters its sidebar
 * prop down to the group that owns the current page (its default themes move
 * group switching to header tabs), so the theme renders the canonical
 * manifest groups instead and keeps the task navigation visible.
 */
function SiteSidebar({ currentPath }: SidebarProps) {
  void currentPath
  const { page } = useDocsRuntime()
  return (
    <aside className="sidebar">
      <ScrollArea className="sidebar-scroll" label="Documentation navigation">
        <nav aria-label="Documentation">
          {page.nav.map((group) => (
            <section className="nav-group" key={group.name}>
              <h2>{group.name}</h2>
              {group.pages.map((entry) => (
                <DocLink
                  href={entry.url}
                  key={entry.file}
                  aria-current={entry.file === page.file ? 'page' : undefined}
                >
                  {entry.label}
                </DocLink>
              ))}
            </section>
          ))}
        </nav>
        <SidebarNote />
      </ScrollArea>
    </aside>
  )
}

function SidebarNote() {
  const { page } = useDocsRuntime()
  return (
    <p className="sidebar-footer">
      <span className="sidebar-resources">
        <a href={`${page.base}playground.html`}>Open playground ↗</a>
        <a href={`${page.base}studio.html`}>Full studio ↗</a>
      </span>
      Seven layouts.
      <br />
      Your data. Your theme.
    </p>
  )
}

function SiteTableOfContents({ items }: TableOfContentsProps) {
  const { page, hrefFor } = useDocsRuntime()
  const [active, setActive] = useState('')
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const article = document.getElementById('content')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: '-100px 0px -65% 0px' },
    )
    article?.querySelectorAll('h2[id],h3[id]').forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [page.file])
  const integrate = page.nav
    .flatMap((group) => group.pages)
    .find((entry) => entry.file === 'docs/agents/integrate.md')
  const troubleshooting = page.nav
    .flatMap((group) => group.pages)
    .find((entry) => entry.file === 'docs/guides/troubleshooting.md')
  return (
    <ScrollArea className="toc-scroll" label="Page index">
      <nav aria-label="On this page">
        <p>On this page</p>
        {items.map((heading) => (
          <a
            key={heading.id}
            className={`level-${heading.depth}`}
            href={`#${heading.id}`}
            aria-current={heading.id === active ? 'location' : undefined}
          >
            {heading.title}
          </a>
        ))}
      </nav>
      <div className="toc-resource">
        {integrate && <DocLink href={integrate.url}>Integrate with your agent ↗</DocLink>}
        {troubleshooting && <DocLink href={troubleshooting.url}>Need help?</DocLink>}
        {!integrate && <DocLink href={hrefFor('/index')}>Documentation ↗</DocLink>}
      </div>
    </ScrollArea>
  )
}

function SiteDocsPage({ previous, next, tableOfContents }: DocsPageProps) {
  const runtime = useDocsRuntime()
  const home = runtime.page.nav[0]?.pages[0]?.url ?? runtime.hrefFor('/index')
  return (
    <>
      <main
        className="article"
        id="content"
        tabIndex={-1}
        ref={runtime.article}
        aria-busy={runtime.pending}
      >
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <DocLink href={home}>Docs</DocLink>
          <span aria-hidden="true">/</span>
          <span>{runtime.page.group}</span>
        </nav>
        <ArticleBody page={runtime.page} key={runtime.page.file} />
        <nav className="pagination" aria-label="Documentation pages">
          {previous && (
            <DocLink href={runtime.hrefFor(previous.href)}>
              <small>Previous</small>← {previous.title}
            </DocLink>
          )}
          {next && (
            <DocLink href={runtime.hrefFor(next.href)}>
              <small>Next</small>
              {next.title} →
            </DocLink>
          )}
        </nav>
        <footer className="docs-footer">
          <span>Maintained by Alan Salazar</span>
          <span>Docs in English · Playground in English / Español</span>
        </footer>
      </main>
      <aside className="toc">{tableOfContents}</aside>
    </>
  )
}

export function SiteLink({ href = '', children, ...rest }: DocsLinkProps) {
  const runtime = useDocsRuntime()
  const safe = safeHref(href)
  if (safe.startsWith('#') || !safe.startsWith('/'))
    return (
      <a href={safe} {...rest}>
        {children}
      </a>
    )
  const [path, fragment] = safe.split('#')
  return (
    <Link to={runtime.hrefFor(path) + (fragment ? `#${fragment}` : '')} {...rest}>
      {children}
    </Link>
  )
}

/** The site design system expressed through Heyo's theme component contract. */
export const siteTheme: HeyoDocsTheme = {
  name: 'grain',
  components: {
    Layout: SiteLayout,
    TopNavigation: SiteTopNavigation,
    Sidebar: SiteSidebar,
    DocsPage: SiteDocsPage,
    TableOfContents: SiteTableOfContents,
    Search: () => <DocsSearch />,
    ChangelogPage: () => null,
    OpenApiPage: () => null,
  },
}

export type SiteLinkComponent = DocsLinkComponent
