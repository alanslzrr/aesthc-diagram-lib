import { Fragment, useEffect, useRef, useState } from 'react'
import { CodeBlock, CopyCode, DocLink, Tokens } from './Markdown'
import type { DocPage } from './model'
import { ScrollArea } from '../components/primitives/ScrollArea'
import { CodeIcon, PreviewIcon } from '../components/primitives/icons'
import { useDocsRuntime } from './context'

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
        <a
          className="control"
          href={`${page.base}playground.html?only=example-${preview.playground ?? preview.type}`}
        >
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
          <div
            className="preview-canvas diagram-backdrop"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
        </ScrollArea>
        <p className="preview-caption">
          {page.file === 'docs/index.md' ? (
            'Band example'
          ) : (
            <>
              {page.label} ·{' '}
              {page.file.startsWith('docs/diagrams/') ? 'Minimal spec' : `${preview.type} example`}
            </>
          )}
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

export function DocsSearch() {
  const { page } = useDocsRuntime()
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
            const at = entry.url.indexOf(marker)
            return {
              ...entry,
              url: page.contentBase && at >= 0 ? page.base + entry.url.slice(at + 1) : entry.url,
            }
          }),
        ),
      )
      .catch((error) => {
        if (error.name !== 'AbortError') setFailed(true)
      })
    return () => controller.abort()
  }, [page.base, page.contentBase, page.version])
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

/** Explicit action instead of an arrow disclosure for the complete example. */
function CompleteExample({ page }: { page: DocPage }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="complete-example">
      <button
        type="button"
        className="complete-example-trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Hide complete React example' : 'Complete React example'}
      </button>
      {open && (
        <CodeBlock
          text={page.preview!.code}
          highlighted={page.preview!.highlighted}
          language="tsx"
          label="Complete React example"
        />
      )}
    </div>
  )
}

export function CopyMarkdown({ page }: { page: DocPage }) {
  const [status, setStatus] = useState('')
  return (
    <button
      type="button"
      className="control"
      onClick={() => {
        setStatus('')
        fetch(`${page.base}${page.destination}index.md`)
          .then((response) => {
            if (!response.ok) throw Error('Markdown unavailable')
            return response.text()
          })
          .then((text) => navigator.clipboard.writeText(text))
          .then(() => setStatus('Copied'))
          .catch(() => setStatus('Copy failed'))
      }}
    >
      {status || 'Copy Markdown'}
    </button>
  )
}

/**
 * The article body for one page. Heyo renders this through `DocsPage.content`,
 * so previews, metadata and the complete example stay inside the page model
 * instead of the theme chrome.
 */
export function ArticleBody({ page }: { page: DocPage }) {
  let inserted = false
  let metaInserted = false
  return (
    <>
      <div className="typeset typeset-docs">
        {page.blocks.map((token, index) => {
          const showPreview = !inserted && token.type === 'paragraph' && page.preview
          if (showPreview) inserted = true
          const showMeta = !metaInserted && token.type === 'heading' && token.depth === 1
          if (showMeta) metaInserted = true
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
              {showMeta && (
                <div className="page-meta not-typeset">
                  <span className="version-label">
                    {page.version} · {page.stable ? 'Stable' : 'Release candidate'}
                  </span>
                  <a href={`${page.base}${page.destination}index.md`}>Read Markdown ↗</a>
                  <CopyMarkdown page={page} />
                  <a
                    href={`https://github.com/alanslzrr/aesthc-diagram-lib/blob/${page.stable && page.destination.startsWith('versions/') ? `v${page.version}` : 'main'}/${page.file === 'docs/getting-started.md' || page.file.startsWith('docs/diagrams/') ? 'scripts/generate-docs.ts' : page.file}`}
                  >
                    {page.file === 'docs/getting-started.md' ||
                    page.file.startsWith('docs/diagrams/')
                      ? 'Edit generation source ↗'
                      : 'Edit this page ↗'}
                  </a>
                </div>
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
      {page.file.startsWith('docs/diagrams/') && <CompleteExample key={page.file} page={page} />}
    </>
  )
}
