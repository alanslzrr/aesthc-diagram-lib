import { DocumentConfiguration } from '../components/DocumentConfiguration'
// Dedicated playground: an editable workspace backed by the public editor
// store. The shell is a higher-order component; the wrapped surface owns one
// editable session per example so history, dirty state and drafts survive
// switching.

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
} from 'react'

import { createDocument, createEditorStore, importDocument } from '@aesthc/diagram-lib/editor-core'
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
import { ExportDialog } from '../components/EditorExportDialog'
import { saveLocale, savedLocale } from '../lib/locale'
import { writeHandoff } from '../lib/handoff'
import { clearSessionDraft, readSessionDraft, writeSessionDraft } from '../lib/session-draft'
import { useThemePreference } from '../lib/theme'
import { MovementPanel } from './MovementPanel'

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
  recovered: {
    en: 'Recovered unsaved work from this device.',
    es: 'Se recuperó trabajo sin guardar de este dispositivo.',
  },
  recoveryUnavailable: {
    en: 'Local recovery is unavailable; this session stays in memory.',
    es: 'La recuperación local no está disponible; esta sesión permanece en memoria.',
  },
  leaveConfirm: {
    en: 'Leave with unsaved changes?',
    es: '¿Salir con cambios sin guardar?',
  },
  draftPending: {
    en: 'The JSON panel has an unapplied draft.',
    es: 'El panel JSON tiene un borrador sin aplicar.',
  },
  resetDraftPending: {
    en: 'Reset discards the unapplied JSON draft.',
    es: 'Restaurar descarta el borrador JSON sin aplicar.',
  },
  draftApply: { en: 'Apply draft', es: 'Aplicar borrador' },
  draftDiscard: { en: 'Discard draft', es: 'Descartar borrador' },
  handoffTooLarge: {
    en: 'The document is too large to hand off automatically. Download JSON instead.',
    es: 'El documento es demasiado grande para transferirlo automáticamente. Descargá el JSON.',
  },
} satisfies Record<string, Record<Locale, string>>

/**
 * Internal links intercept only unmodified primary activations. Modified and
 * non-primary clicks keep the browser's native link behavior (new tab/window)
 * and never run the in-page session switch or leave guard.
 */
function isPlainPrimaryClick(event: ReactMouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

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
  /** Registers the current-document Studio handoff with the shell. */
  registerStudio?: (request: () => void) => void
  /** Registers the leave guard so internal links warn before dropping work. */
  registerGuard?: (guard: (action: () => void) => void) => void
  /** Reports whether any session has unsaved work, for `beforeunload`. */
  onGuardChange?: (guarded: boolean) => void
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
      <MovementPanel />
      <div className="adl-editor-body">
        <EditorSurface
          key={sessionKey}
          autoFit={autoFit}
          ariaLabel={`${entry.type}: ${entry.title.en}`}
        />
        <EditorInspector />
      </div>
      <DocumentConfiguration />
      <EditorPanelTabs />
    </div>
  )
}

function PlaygroundSurface({
  entry,
  locale,
  hostTheme,
  registerStudio,
  registerGuard,
  onGuardChange,
}: PlaygroundSurfaceProps) {
  const sessions = useRef(new Map<string, ReturnType<typeof createEditorStore>>())
  const opened = useRef(new Set<string>())
  const recovered = useRef(new Set<string>())
  const recoveryWarned = useRef(false)
  const file = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null)
  const [pendingReason, setPendingReason] = useState<'leave' | 'reset'>('leave')
  const [exportOpen, setExportOpen] = useState(false)
  const sessionKey = `${entry.key}:${locale}`
  const currentSession = useRef(sessionKey)
  currentSession.current = sessionKey
  const firstOpen = !opened.current.has(sessionKey)

  function storeFor(key: string) {
    let store = sessions.current.get(key)
    if (!store) {
      const [keyName, keyLocale] = key.split(':') as [string, Locale]
      const source = SECTIONS.find((candidate) => candidate.key === keyName) ?? DEFAULT_ENTRY
      const draft = readSessionDraft(key, keyLocale)
      // The pristine example is always the saved baseline; a recovered document
      // is applied as an unsaved edit so it stays dirty, guardable and
      // undoable instead of masquerading as a clean document.
      const original = documentFor(source, keyLocale, hostTheme)
      store = createEditorStore({
        document: original,
        permissions: { edit: true, save: false, export: true },
      })
      if (draft) {
        const restored = store.dispatch({
          id: 'restore-session-draft',
          label: 'Restore session draft',
          expectedRevision: store.getSnapshot().document.revision,
          commands: [{ type: 'document.replace-content', document: draft.document }],
        })
        if (restored.status === 'committed') recovered.current.add(key)
      }
      if (draft?.text) {
        store.setTextDraft(draft.text)
        recovered.current.add(key)
      }
      sessions.current.set(key, store)
      // Persist only real unsaved work (dirty document or unapplied buffer).
      // A pristine session clears its record so camera/selection notices are
      // never advertised as recovered edits. Guards remain primary.
      const session = store
      let timer: ReturnType<typeof setTimeout> | undefined
      session.subscribe(() => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          const snapshot = session.getSnapshot()
          if (!snapshot.dirty && snapshot.draft.kind !== 'text') {
            clearSessionDraft(key)
            return
          }
          const outcome = writeSessionDraft(
            key,
            snapshot.document,
            snapshot.draft.kind === 'text' ? snapshot.draft.text : undefined,
          )
          if (outcome === 'unavailable' && !recoveryWarned.current) {
            recoveryWarned.current = true
            setMessage(COPY.recoveryUnavailable[locale])
          }
        }, 300)
      })
    }
    return store
  }

  const store = storeFor(sessionKey)

  useEffect(() => {
    opened.current.add(sessionKey)
    setMessage(recovered.current.has(sessionKey) ? COPY.recovered[locale] : '')
  }, [sessionKey])

  const anyGuarded = () =>
    [...sessions.current.values()].some((session) => {
      const snapshot = session.getSnapshot()
      return snapshot.dirty || snapshot.draft.kind === 'text'
    })

  const guardRef = useRef<(action: () => void) => void>(() => {})
  guardRef.current = (action) => {
    if (!anyGuarded()) {
      action()
      return
    }
    // An unapplied JSON buffer always offers an explicit decision instead of
    // being discarded by a generic confirmation.
    if (store.getSnapshot().draft.kind === 'text') {
      setPendingReason('leave')
      setPendingLeave(() => action)
      return
    }
    if (!window.confirm(COPY.leaveConfirm[locale])) return
    action()
  }
  useEffect(() => {
    registerGuard?.(guardRef.current)
  }, [registerGuard])
  useEffect(() => {
    const report = () => onGuardChange?.(anyGuarded())
    report()
    const unsubscribers = [...sessions.current.values()].map((session) => session.subscribe(report))
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
    // Sessions are created lazily per entry and locale switch.
  }, [sessionKey, onGuardChange])

  const performHandoff = () => {
    const written = writeHandoff(store.getSnapshot().document, {
      locale,
      hostTheme,
      sessionKey,
      entryKey: entry.key,
    })
    if (!written) {
      setMessage(COPY.handoffTooLarge[locale])
      return
    }
    window.location.assign(STUDIO_URL)
  }
  const studioRequest = useRef<() => void>(() => {})
  studioRequest.current = () => {
    // A text buffer is not part of the handoff; decide explicitly first.
    if (store.getSnapshot().draft.kind === 'text') {
      setPendingReason('leave')
      setPendingLeave(() => performHandoff)
      return
    }
    // Other sessions stay behind, so their unsaved work still needs consent.
    const others = [...sessions.current.values()].some((session) => {
      if (session === store) return false
      const snapshot = session.getSnapshot()
      return snapshot.dirty || snapshot.draft.kind === 'text'
    })
    if (others && !window.confirm(COPY.leaveConfirm[locale])) return
    performHandoff()
  }
  useEffect(() => {
    registerStudio?.(() => studioRequest.current())
  }, [registerStudio])

  function performReset() {
    const current = store.getSnapshot()
    const original = documentFor(entry, locale, hostTheme)
    const result = store.replaceDocument(original, {
      expectedRevision: current.document.revision,
      history: 'reset',
    })
    if (result.status !== 'committed') {
      // A rejected replacement preserves the document, the draft and the
      // recovery record byte-for-byte.
      setMessage(
        result.diagnostics.map((diagnostic) => diagnostic.code).join(', ') ||
          COPY.importFailed[locale],
      )
      return
    }
    // Recovery storage is cleared only after the confirmed replacement landed.
    clearSessionDraft(sessionKey)
    recovered.current.delete(sessionKey)
    setMessage('')
  }
  function resetExample() {
    const snapshot = store.getSnapshot()
    // An unapplied JSON buffer gets the explicit Apply/Discard/Cancel decision
    // instead of being silently replaced by Reset.
    if (snapshot.draft.kind === 'text') {
      setPendingReason('reset')
      setPendingLeave(() => performReset)
      return
    }
    if (snapshot.dirty && !window.confirm(COPY.resetConfirm[locale])) return
    performReset()
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
          <button
            type="button"
            onClick={(event) => {
              // Safari does not focus buttons on click; capture the opener so
              // the dialog can restore focus on close.
              event.currentTarget.focus()
              setExportOpen(true)
            }}
          >
            {locale === 'es' ? 'Exportar' : 'Export'}
          </button>
          <button type="button" onClick={resetExample}>
            {locale === 'es' ? 'Restaurar ejemplo' : 'Reset example'}
          </button>
          <a
            className="playground-studio-link"
            href={STUDIO_URL}
            onClick={(event) => {
              if (!isPlainPrimaryClick(event)) return
              event.preventDefault()
              studioRequest.current()
            }}
          >
            {locale === 'es' ? 'Studio completo' : 'Full studio'} ↗
          </a>
        </div>
      </header>
      {message ? (
        <p className="playground-message" role="status">
          {message}
        </p>
      ) : null}
      {pendingLeave ? (
        <div className="playground-message" role="alert">
          {(pendingReason === 'reset' ? COPY.resetDraftPending : COPY.draftPending)[locale]}{' '}
          <button
            type="button"
            onClick={() => {
              const result = store.commitTextDraft()
              if (result.status !== 'rejected') {
                const action = pendingLeave
                setPendingLeave(null)
                setPendingReason('leave')
                action()
              } else {
                setMessage(result.diagnostics.map((d) => d.code).join(', '))
              }
            }}
          >
            {COPY.draftApply[locale]}
          </button>
          <button
            type="button"
            onClick={() => {
              store.cancelTextDraft()
              const action = pendingLeave
              setPendingLeave(null)
              setPendingReason('leave')
              action()
            }}
          >
            {COPY.draftDiscard[locale]}
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingLeave(null)
              setPendingReason('leave')
            }}
          >
            {locale === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
        </div>
      ) : null}
      <EditorRoot store={store} locale={locale} theme={hostTheme}>
        <EditorWorkspace
          sessionKey={sessionKey}
          entry={entry}
          hostTheme={hostTheme}
          autoFit={firstOpen}
        />
        <ExportDialog
          locale={locale}
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          filenameBase={`${entry.key}-${locale}`}
          appearance={hostTheme}
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
    const [guarded, setGuarded] = useState(false)
    const guardRef = useRef<((action: () => void) => void) | null>(null)
    const studioRef = useRef<(() => void) | null>(null)

    useEffect(() => {
      document.documentElement.lang = locale
      saveLocale(locale)
    }, [locale])

    useEffect(() => {
      // Secondary protection only; the internal guard decides first.
      if (!guarded) return
      const handler = (event: BeforeUnloadEvent) => {
        event.preventDefault()
        event.returnValue = ''
      }
      window.addEventListener('beforeunload', handler)
      return () => window.removeEventListener('beforeunload', handler)
    }, [guarded])

    const leave = (action: () => void) => {
      if (guardRef.current) guardRef.current(action)
      else action()
    }
    const leaveTo = (href: string) => () => leave(() => window.location.assign(href))
    const openStudio = () => {
      // The playground surface owns the draft decision and the handoff itself.
      if (studioRef.current) studioRef.current()
      else leave(() => window.location.assign(STUDIO_URL))
    }

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
              onClick={(event) => {
                if (!isPlainPrimaryClick(event)) return
                event.preventDefault()
                leaveTo(import.meta.env.BASE_URL)()
              }}
            >
              <span className="brand-short">aesthc</span>
              <span className="brand-full">aesthc / playground</span>
            </a>
            <nav className="header-nav" aria-label={locale === 'es' ? 'Principal' : 'Main'}>
              <a
                href={`${import.meta.env.BASE_URL}docs/`}
                onClick={(event) => {
                  if (!isPlainPrimaryClick(event)) return
                  event.preventDefault()
                  leaveTo(`${import.meta.env.BASE_URL}docs/`)()
                }}
              >
                Docs
              </a>
              <a
                href={STUDIO_URL}
                onClick={(event) => {
                  if (!isPlainPrimaryClick(event)) return
                  event.preventDefault()
                  openStudio()
                }}
              >
                Studio
              </a>
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
                    if (!isPlainPrimaryClick(event)) return
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
                ? 'El playground es el editor principal de este documento; Studio es la herramienta avanzada del mismo documento; el visor semántico es de solo lectura. Cada ejemplo conserva su propia sesión.'
                : 'The playground is the primary editor of this document; Studio is advanced tooling for the same document; the semantic viewer is read-only. Each example keeps its own session.'}
            </p>
          </aside>
          <main id="main" tabIndex={-1} className="playground-main">
            <Surface
              entry={entry}
              locale={locale}
              hostTheme={theme}
              registerStudio={(request) => {
                studioRef.current = request
              }}
              registerGuard={(guard) => {
                guardRef.current = guard
              }}
              onGuardChange={setGuarded}
            />
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
