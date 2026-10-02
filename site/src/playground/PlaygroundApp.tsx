// Dedicated playground: an editable workspace backed by the public editor
// store. The shell is a higher-order component; the wrapped surface owns one
// editable session per example so history, dirty state and drafts survive
// switching.

import { useEffect, useRef, useState, type ComponentType } from 'react'

import {
  createDocument,
  createEditorStore,
  importDocument,
  serializeDocument,
} from '@aesthc/diagram-lib/editor-core'
import {
  EditorInspector,
  EditorPanelTabs,
  EditorRoot,
  EditorSurface,
  EditorToolbar,
  shallowEqual,
  useEditorSelector,
} from '@aesthc/diagram-lib/editor'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'

import { GITHUB_URL, STRINGS, SECTIONS, type Locale, type SectionEntry } from '../content'
import { saveLocale, savedLocale } from '../lib/locale'
import { useThemePreference } from '../lib/theme'

const DEFAULT_ENTRY = SECTIONS[0]
const STUDIO_URL = `${import.meta.env.BASE_URL}studio.html`

const COPY = {
  skip: { en: 'Skip to editor', es: 'Ir al editor' },
  importTooLarge: {
    en: 'The JSON file exceeds 1 MiB. Nothing was imported.',
    es: 'El archivo JSON supera 1 MiB. No se importó nada.',
  },
  importReadError: { en: 'Read failed.', es: 'Lectura fallida.' },
  importInvalid: {
    en: 'Invalid JSON or limit.',
    es: 'JSON inválido o límite.',
  },
  importStale: {
    en: 'Canceled: the example changed.',
    es: 'Cancelado: cambió el ejemplo.',
  },
  importConfirm: {
    en: 'Replace example? History resets.',
    es: '¿Sustituir? Se reinicia el historial.',
  },
  importDone: {
    en: 'Imported. History reset.',
    es: 'Importado. Historial reiniciado.',
  },
  importFailed: { en: 'Apply failed.', es: 'Error al aplicar.' },
  resetConfirm: {
    en: 'Discard changes and reset?',
    es: '¿Descartar cambios y reiniciar?',
  },
  themeLight: { en: 'Light', es: 'Claro' },
  themeDark: { en: 'Dark', es: 'Oscuro' },
} satisfies Record<string, Record<Locale, string>>

/** `?only=example-band`, `?type=band` or `#example-band`. */
export function entryFromLocation(): SectionEntry {
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('only') ?? params.get('type') ?? window.location.hash.slice(1)
  if (!raw) return DEFAULT_ENTRY
  const key = raw.startsWith('example-') ? raw : `example-${raw}`
  return SECTIONS.find((entry) => entry.key === key) ?? DEFAULT_ENTRY
}

export interface PlaygroundSurfaceProps {
  entry: SectionEntry
  locale: Locale
  hostTheme: 'light' | 'dark'
}

function documentFor(entry: SectionEntry, locale: Locale, hostTheme: 'light' | 'dark') {
  const spec = EXAMPLE_DIAGRAMS[entry.key].diagram[locale]
  const result = createDocument(spec, { id: `${entry.key}-${locale}`, locale })
  if (!result.ok) throw Error(result.diagnostics.map((d) => d.code).join(', '))
  // The artifact starts matching the host, then follows its own appearance control.
  result.value.presentation.theme.mode = hostTheme
  return result.value
}

/** Editor surface; must live inside EditorRoot to read the store context. */
function EditorWorkspace({
  sessionKey,
  entry,
  hostTheme,
  autoFit,
}: {
  sessionKey: string
  entry: SectionEntry
  hostTheme: 'light' | 'dark'
  autoFit: boolean
}) {
  const snapshot = useEditorSelector(
    (state) => ({ document: state.document, dirty: state.dirty }),
    shallowEqual,
  )
  return (
    <div
      className="adl-editor playground-editor"
      data-theme={hostTheme}
      data-dirty={snapshot.dirty ? '' : undefined}
    >
      <EditorToolbar />
      <div className="adl-editor-body">
        <EditorSurface
          key={sessionKey}
          autoFit={autoFit}
          ariaLabel={`${entry.type}: ${entry.title.en}`}
        />
        <EditorInspector />
      </div>
      <EditorPanelTabs />
    </div>
  )
}

function PlaygroundSurface({ entry, locale, hostTheme }: PlaygroundSurfaceProps) {
  const sessions = useRef(new Map<string, ReturnType<typeof createEditorStore>>())
  const opened = useRef(new Set<string>())
  const file = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const sessionKey = `${entry.key}:${locale}`
  const currentSession = useRef(sessionKey)
  currentSession.current = sessionKey
  const firstOpen = !opened.current.has(sessionKey)

  function storeFor(key: string) {
    let store = sessions.current.get(key)
    if (!store) {
      const [keyName, keyLocale] = key.split(':') as [string, Locale]
      const source = SECTIONS.find((candidate) => candidate.key === keyName) ?? DEFAULT_ENTRY
      store = createEditorStore({
        document: documentFor(source, keyLocale, hostTheme),
        permissions: { edit: true, save: false, export: true },
      })
      sessions.current.set(key, store)
    }
    return store
  }

  const store = storeFor(sessionKey)

  useEffect(() => {
    opened.current.add(sessionKey)
    setMessage('')
  }, [sessionKey])

  function resetExample() {
    if (store.getSnapshot().dirty && !window.confirm(COPY.resetConfirm[locale])) return
    const current = store.getSnapshot()
    const original = documentFor(entry, locale, hostTheme)
    const result = store.replaceDocument(original, {
      expectedRevision: current.document.revision,
      history: 'reset',
    })
    setMessage(result.status === 'committed' ? '' : COPY.importFailed[locale])
  }

  function downloadJson() {
    const text = serializeDocument(store.getSnapshot().document)
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${entry.key}-${locale}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function importFile(upload: File) {
    // Capture the destination before the asynchronous read; the import must not
    // land on a different example or a document edited while it was reading.
    const target = sessionKey
    const targetStore = store
    const baseRevision = targetStore.getSnapshot().document.revision
    if (upload.size > 1048576) {
      setMessage(COPY.importTooLarge[locale])
      return
    }
    let text: string
    try {
      text = await upload.text()
    } catch {
      setMessage(COPY.importReadError[locale])
      return
    }
    if (target !== currentSession.current) {
      setMessage(COPY.importStale[locale])
      return
    }
    const parsed = importDocument(text, { id: crypto.randomUUID(), locale })
    if (!parsed.ok) {
      setMessage(
        `${COPY.importInvalid[locale]} ${parsed.diagnostics.map((d) => d.code).join(', ')}`,
      )
      return
    }
    if (!window.confirm(COPY.importConfirm[locale])) return
    const result = targetStore.replaceDocument(parsed.value.document, {
      expectedRevision: baseRevision,
      history: 'reset',
    })
    setMessage(
      result.status === 'committed'
        ? COPY.importDone[locale]
        : `${COPY.importFailed[locale]} ${result.diagnostics.map((d) => d.code).join(', ')}`,
    )
  }

  return (
    <div className="playground-workspace">
      <header className="playground-workspace-head">
        <div className="playground-intro">
          <p className="playground-kicker">
            {entry.type}
            <span aria-hidden="true"> / </span>
            {STRINGS.editable[locale]}
          </p>
          <h1>{entry.title[locale]}</h1>
          <p>{entry.description[locale]}</p>
        </div>
        <div className="playground-workspace-actions">
          <button type="button" onClick={() => file.current?.click()}>
            {locale === 'es' ? 'Importar JSON' : 'Import JSON'}
          </button>
          <input
            ref={file}
            hidden
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const upload = event.target.files?.[0]
              event.target.value = ''
              if (upload) void importFile(upload)
            }}
          />
          <button type="button" onClick={downloadJson}>
            {locale === 'es' ? 'Descargar JSON' : 'Download JSON'}
          </button>
          <button type="button" onClick={resetExample}>
            {locale === 'es' ? 'Restaurar ejemplo' : 'Reset example'}
          </button>
          <a className="playground-studio-link" href={STUDIO_URL}>
            {locale === 'es' ? 'Studio completo' : 'Full studio'} ↗
          </a>
        </div>
      </header>
      {message ? (
        <p className="playground-message" role="status">
          {message}
        </p>
      ) : null}
      <EditorRoot store={store} locale={locale} theme={hostTheme}>
        <EditorWorkspace
          sessionKey={sessionKey}
          entry={entry}
          hostTheme={hostTheme}
          autoFit={firstOpen}
        />
      </EditorRoot>
    </div>
  )
}

export function withPlaygroundShell(Surface: ComponentType<PlaygroundSurfaceProps>) {
  return function PlaygroundShell() {
    const { theme, choose } = useThemePreference()
    const [locale, setLocale] = useState<Locale>(savedLocale)
    const [entry, setEntry] = useState<SectionEntry>(entryFromLocation)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
      document.documentElement.lang = locale
      saveLocale(locale)
    }, [locale])

    useEffect(() => {
      document.title = `${entry.title[locale]} editor · @aesthc/diagram-lib`
    }, [entry, locale])

    function select(next: SectionEntry) {
      setEntry(next)
      setMobileOpen(false)
      const url = new URL(window.location.href)
      url.searchParams.set('only', next.key)
      url.hash = ''
      window.history.replaceState(null, '', url)
      requestAnimationFrame(() => {
        document.getElementById('main')?.scrollIntoView({ block: 'start', behavior: 'instant' })
      })
    }

    const dark = theme === 'dark'
    const themeLabel = dark ? COPY.themeLight[locale] : COPY.themeDark[locale]

    return (
      <div className="playground-shell" data-theme={theme}>
        <a href="#main" className="skip">
          {COPY.skip[locale]}
        </a>
        <header className="playground-header">
          <div className="playground-header-inner">
            <a
              className="brand"
              href={import.meta.env.BASE_URL}
              title={locale === 'es' ? 'Volver al inicio' : 'Back to the landing page'}
            >
              <span className="brand-short">aesthc</span>
              <span className="brand-full">aesthc / playground</span>
            </a>
            <nav className="header-nav" aria-label={locale === 'es' ? 'Principal' : 'Main'}>
              <a href={`${import.meta.env.BASE_URL}docs/`}>Docs</a>
              <a href={STUDIO_URL}>Studio</a>
            </nav>
            <div className="header-actions">
              <a className="header-nav-link" href={GITHUB_URL} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <button
                type="button"
                className="control"
                title={STRINGS.localeTooltip[locale]}
                onClick={() => setLocale((current) => (current === 'en' ? 'es' : 'en'))}
              >
                {locale === 'en' ? 'EN' : 'ES'}
              </button>
              <button
                type="button"
                className="control playground-theme"
                aria-label={themeLabel}
                onClick={() => choose(dark ? 'light' : 'dark')}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {dark ? (
                    <path d="M21 12.8A9 9 0 0 1 11.2 3a9 9 0 1 0 9.8 9.8Z" />
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                    </>
                  )}
                </svg>
              </button>
              <button
                type="button"
                className="control playground-menu-trigger"
                aria-expanded={mobileOpen}
                aria-controls="playground-nav"
                onClick={() => setMobileOpen((open) => !open)}
              >
                {locale === 'es' ? 'Diagramas' : 'Diagrams'}
              </button>
            </div>
          </div>
        </header>
        <div className="playground-body">
          <aside className="playground-sidebar" data-open={mobileOpen ? '' : undefined}>
            <nav id="playground-nav" aria-label={locale === 'es' ? 'Diagramas' : 'Diagrams'}>
              <p className="playground-nav-label">
                {locale === 'es' ? 'Tipos de diagrama' : 'Diagram types'}
              </p>
              {SECTIONS.map((candidate) => (
                <a
                  key={candidate.key}
                  href={`?only=${candidate.key}`}
                  aria-current={candidate.key === entry.key ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault()
                    select(candidate)
                  }}
                >
                  {candidate.title[locale]}
                </a>
              ))}
            </nav>
            <p className="playground-sidebar-footer">
              {locale === 'es'
                ? 'Seleccioná, mové, editá etiquetas, conectá nodos y deshacé. Cada ejemplo conserva su propia sesión de edición.'
                : 'Select, move, edit labels, connect nodes and undo. Each example keeps its own editing session.'}
            </p>
          </aside>
          <main id="main" tabIndex={-1} className="playground-main">
            <Surface entry={entry} locale={locale} hostTheme={theme} />
            <footer className="playground-footer">
              <span>© 2026 Alan Salazar · {STRINGS.footerNote[locale]}</span>
              <span className="inline-flex flex-wrap items-center gap-5 font-medium">
                <a href={`${GITHUB_URL}#readme`} target="_blank" rel="noreferrer">
                  {STRINGS.readme[locale]} ↗
                </a>
                <a href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
                  {STRINGS.license[locale]} ↗
                </a>
              </span>
            </footer>
          </main>
        </div>
      </div>
    )
  }
}

export const PlaygroundApp = withPlaygroundShell(PlaygroundSurface)
