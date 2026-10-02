import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createDocument,
  createEditorStore,
  importDocument,
  canonicalizeContent,
  convertToGraph,
} from '@aesthc/diagram-lib/editor-core'
import type { ConversionReceipt } from '@aesthc/diagram-lib/editor-core'
import type { DiagramDocument, Locale } from '@aesthc/diagram-lib/editor-core'
import {
  EditorRoot,
  EditorToolbar,
  EditorSurface,
  EditorInspector,
  EditorJsonPanel,
  EditorOutline,
  useEditorSelector,
  shallowEqual,
} from '@aesthc/diagram-lib/editor'
import {
  createLocalStorageAdapter,
  createAutosave,
  decodeShareDocument,
  encodeShareDocument,
} from '@aesthc/diagram-lib/persistence'
import type { AutosaveState, StoredDocument, StoredEntry } from '@aesthc/diagram-lib/persistence'
import { ExportDialog } from '../components/ExportDialog'
import { clearHandoff, readHandoff } from '../lib/handoff'
import { MESSAGES } from '../lib/messages'
import { savedLocale, saveLocale } from '../lib/locale'
import { useThemePreference } from '../lib/theme'
import '@aesthc/diagram-lib/editor.css'
import '../design-system.css'
import './studio.css'

const initial = createDocument(
  {
    type: 'graph',
    profile: 'architecture',
    caption: 'Order platform',
    legend: { main: 'Request', branch: 'Async' },
    nodes: [
      {
        id: 'client',
        label: 'Web client',
        kind: 'Application',
        description: 'Places orders and displays their status.',
      },
      {
        id: 'api',
        label: 'Order API',
        kind: 'Service',
        description: 'Validates and records orders.',
        ports: [
          { id: 'inbound', side: 'left', offset: 0.5, direction: 'in' },
          { id: 'outbound', side: 'right', offset: 0.5, direction: 'out' },
        ],
      },
      {
        id: 'database',
        label: 'Orders',
        kind: 'Database',
        description: 'Stores the order lifecycle.',
      },
      {
        id: 'worker',
        label: 'Email worker',
        kind: 'Service',
        description: 'Sends order confirmations.',
      },
    ],
    edges: [
      { id: 'request', from: 'client', to: 'api', label: 'HTTPS' },
      { id: 'persist', from: 'api', to: 'database', label: 'Write' },
      { id: 'notify', from: 'api', to: 'worker', label: 'Queue', variant: 'branch' },
    ],
  },
  { id: 'studio-document', locale: 'en' },
)
if (!initial.ok) throw Error(initial.diagnostics.map((d) => d.code).join(', '))
const initialDocument = initial.value
const store = createEditorStore({
  document: initialDocument,
  permissions: { edit: true, save: true, export: true },
})
const storage = createLocalStorageAdapter('studio')
function Workbench() {
  const { theme: hostTheme, choose: chooseHostTheme } = useThemePreference()
  const snapshot = useEditorSelector(
      (state) => ({ document: state.document, dirty: state.dirty }),
      shallowEqual,
    ),
    [locale, setLocale] = useState<Locale>(savedLocale),
    [message, setMessage] = useState(''),
    [saving, setSaving] = useState<AutosaveState>({ status: 'idle' }),
    [autosave, setAutosave] = useState(false)
  const [draft, setDraft] = useState<StoredDocument | null>(null)
  const [quarantined, setQuarantined] = useState(false)
  const [copies, setCopies] = useState<StoredEntry[]>([])
  const [copiesOpen, setCopiesOpen] = useState(false)
  const [conversion, setConversion] = useState<{
    document: DiagramDocument
    losses: ConversionReceipt['losses']
    /** Identity and revision the snapshot was generated from. */
    documentId: string
    baseRevision: number
  } | null>(null)
  const [pendingHandoff, setPendingHandoff] = useState<DiagramDocument | null>(null)
  const [activeKey, setActiveKey] = useState(initialDocument.id)
  const token = useRef<string | null>(null),
    file = useRef<HTMLInputElement>(null),
    saveController = useRef<ReturnType<typeof createAutosave> | null>(null)
  // Every import read owns a sequence number and is bound to the document
  // identity/revision it started from. Committing any other document change
  // (edit, load, open copy, share, handoff, conversion) bumps the sequence so
  // the late result is discarded instead of overwriting the newer document.
  const readSequence = useRef(0)
  const mounted = useRef(true)
  const t = (en: string, es: string) => (locale === 'es' ? es : en)
  async function refreshCopies() {
    const result = await storage.list()
    setCopies(result.ok ? result.value : [])
  }
  async function openCopy(key: string) {
    const result = await storage.load(key)
    if (!result.ok || !result.value) {
      setMessage(t('The copy could not be opened.', 'La copia no se pudo abrir.'))
      return
    }
    if (
      store.getSnapshot().dirty &&
      !window.confirm(
        t(
          'Replace unsaved changes with this saved copy?',
          '¿Sustituir los cambios sin guardar por esta copia guardada?',
        ),
      )
    )
      return
    const commit = store.replaceDocument(result.value.document, {
      expectedRevision: store.getSnapshot().document.revision,
      history: 'reset',
    })
    if (commit.status !== 'rejected') {
      token.current = result.value.token
      setActiveKey(key)
      setDraft(null)
      setMessage(t('Saved copy opened.', 'Copia guardada abierta.'))
    }
  }
  useEffect(() => {
    document.documentElement.lang = locale
    saveLocale(locale)
  }, [locale])
  useEffect(() => {
    // A pending file read is only valid for the exact document it started
    // from; any committed edit or replacement invalidates it.
    readSequence.current += 1
  }, [snapshot.document])
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )
  useEffect(() => {
    // A shared link is read once on mount, validated before replacing the
    // document, and never overwrites a saved copy.
    const hash = location.hash
    if (!/^#(d|s)=/.test(hash)) return
    let cancelled = false
    void decodeShareDocument(hash).then((decoded) => {
      if (cancelled) return
      if (!decoded.ok) {
        setMessage(
          t(
            'The shared link could not be read. Showing the local document.',
            'No se pudo leer el enlace compartido. Se muestra el documento local.',
          ),
        )
        return
      }
      const commit = store.replaceDocument(decoded.value.document, {
        expectedRevision: store.getSnapshot().document.revision,
        history: 'reset',
      })
      if (commit.status !== 'rejected') {
        token.current = null
        setActiveKey(decoded.value.document.id)
        setMessage(t('Shared document loaded.', 'Documento compartido cargado.'))
      } else {
        setMessage(commit.diagnostics.map((diagnostic) => diagnostic.code).join(', '))
      }
    })
    return () => {
      cancelled = true
    }
    // Only the initial link matters; later edits do not re-read the hash.
  }, [])
  function applyHandoff(document: DiagramDocument) {
    setAutosave(false)
    token.current = null
    setActiveKey(document.id)
    store.cancelTextDraft()
    store.replaceDocument(document, {
      expectedRevision: store.getSnapshot().document.revision,
      history: 'reset',
    })
    setDraft(null)
    setPendingHandoff(null)
    setMessage(
      t('Opened the current Playground document.', 'Se abrió el documento actual del playground.'),
    )
  }
  useEffect(() => {
    // Consume the bounded, same-origin transfer once on mount. The document
    // keeps its own identity; the handoff record only says where it came from.
    const record = readHandoff()
    if (!record) return
    clearHandoff()
    const current = store.getSnapshot()
    if (current.draft.kind === 'text') {
      // Never drop an unapplied JSON buffer silently: Apply, Discard or Cancel.
      setPendingHandoff(record.document)
      return
    }
    if (
      current.dirty &&
      !window.confirm(
        t(
          'Replace unsaved Studio changes with the current Playground document?',
          '¿Sustituir los cambios sin guardar de Studio por el documento actual del playground?',
        ),
      )
    ) {
      setMessage(
        t('The Playground document was not opened.', 'No se abrió el documento del playground.'),
      )
      return
    }
    applyHandoff(record.document)
  }, [])
  useEffect(() => {
    let cancelled = false
    void storage.load(activeKey).then((result) => {
      if (cancelled || !result.ok) return
      if (!result.value) return
      if (canonicalizeContent(result.value.document) === canonicalizeContent(snapshot.document))
        return
      token.current = result.value.token
      setDraft(result.value)
    })
    return () => {
      cancelled = true
    }
    // Only the active storage identity matters; edits do not reopen the notice.
  }, [activeKey])
  useEffect(() => {
    if (!autosave) return
    const controller = createAutosave(store, storage, {
      key: activeKey,
      token: token.current,
      onState: (state) => {
        setSaving(state)
        if (state.status === 'saved') token.current = state.token
      },
    })
    saveController.current = controller
    return () => {
      controller.dispose()
      saveController.current = null
    }
  }, [autosave, activeKey])
  useEffect(() => {
    if (!snapshot.dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [snapshot.dirty])
  useEffect(() => {
    // A pending conversion belongs to the revision it rendered. Editing,
    // importing or undoing invalidates it instead of confirming stale content.
    if (!conversion) return
    const current = store.getSnapshot().document
    if (current.id === conversion.documentId && current.revision === conversion.baseRevision) return
    setConversion(null)
    setMessage(
      t(
        'The document changed after this conversion was prepared. Request a new conversion to review the current content.',
        'El documento cambió después de preparar esta conversión. Solicita una conversión nueva para revisar el contenido actual.',
      ),
    )
  }, [conversion, snapshot.document.id, snapshot.document.revision])
  async function share() {
    setMessage('')
    const encoded = await encodeShareDocument(snapshot.document)
    if (!encoded.ok) {
      setMessage(
        t(
          'The share link exceeds the URL limit. Download JSON instead.',
          'El enlace para compartir supera el límite de URL. Descarga JSON en su lugar.',
        ),
      )
      return
    }
    if (!navigator.clipboard?.writeText) {
      setMessage(
        t(
          'The clipboard is unavailable. Download JSON instead.',
          'El portapapeles no está disponible. Descarga JSON en su lugar.',
        ),
      )
      return
    }
    try {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}#${encoded.value}`)
      setMessage(t('Share link copied.', 'Enlace copiado.'))
    } catch {
      setMessage(
        t(
          'The clipboard was denied. Download JSON instead.',
          'El portapapeles fue denegado. Descarga JSON en su lugar.',
        ),
      )
    }
  }
  function requestConversion() {
    const current = store.getSnapshot().document
    if (current.spec.type === 'graph') return
    const converted = convertToGraph(current, { id: globalThis.crypto.randomUUID() })
    if (!converted.ok) {
      setMessage(converted.diagnostics.map((d) => d.code).join(', '))
      return
    }
    setConversion({
      document: converted.value.document,
      losses: converted.value.losses,
      documentId: current.id,
      baseRevision: current.revision,
    })
  }
  function confirmConversion() {
    if (!conversion) return
    const current = store.getSnapshot().document
    // The snapshot is only valid for the exact document revision it was
    // generated from. A fresh read must never authorize stale content.
    if (current.id !== conversion.documentId || current.revision !== conversion.baseRevision) {
      setConversion(null)
      setMessage(
        t(
          'The document changed after this conversion was prepared. Request a new conversion to review the current content.',
          'El documento cambió después de preparar esta conversión. Solicita una conversión nueva para revisar el contenido actual.',
        ),
      )
      return
    }
    const commit = store.replaceDocument(conversion.document, {
      expectedRevision: conversion.baseRevision,
      history: 'reset',
    })
    if (commit.status === 'rejected') {
      setConversion(null)
      setMessage(commit.diagnostics.map((d) => d.code).join(', '))
      return
    }
    token.current = null
    setActiveKey(conversion.document.id)
    setDraft(null)
    setConversion(null)
    setMessage(
      t(
        'Converted to a new graph document. The original saved copy is untouched.',
        'Convertido a un documento graph nuevo. La copia guardada original no se toca.',
      ),
    )
  }
  async function save() {
    if (autosave && saveController.current) {
      await saveController.current.flush()
      return
    }
    setSaving({ status: 'saving' })
    const document = snapshot.document
    const result = await storage.save(activeKey, document, token.current)
    if (result.status === 'saved') {
      token.current = result.token
      store.markSaved(document)
      setSaving({ status: 'saved', token: result.token })
    } else setSaving(result)
  }
  async function load() {
    const result = await storage.load(activeKey)
    if (!result.ok) {
      if (result.diagnostics.some((d) => d.code === 'storage.corrupt')) setQuarantined(true)
      else setMessage(result.diagnostics.map((d) => d.code).join(', '))
      return
    }
    setQuarantined(false)
    if (!result.value) {
      setMessage(t('No saved document.', 'No hay documento guardado.'))
      return
    }
    if (
      store.getSnapshot().dirty &&
      !window.confirm(
        t(
          'Replace unsaved changes with the saved document?',
          '¿Sustituir los cambios sin guardar por el documento guardado?',
        ),
      )
    )
      return
    const commit = store.replaceDocument(result.value.document, {
      expectedRevision: store.getSnapshot().document.revision,
      history: 'reset',
    })
    if (commit.status !== 'rejected') {
      token.current = result.value.token
      setDraft(null)
      setMessage(t('Saved document loaded.', 'Documento guardado cargado.'))
    }
  }
  async function saveAs() {
    const name = window.prompt(t('Save a copy as…', 'Guardar una copia como…'))
    if (!name) return
    const slug = name
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .slice(0, 60)
    if (!slug) {
      setMessage(t('Save-as name is invalid.', 'El nombre de guardar como no es válido.'))
      return
    }
    const key = `saveas:${slug}`
    const existing = await storage.load(key)
    let expectedToken: string | null = null
    if (existing.ok && existing.value) {
      if (
        !window.confirm(
          t(
            `A saved copy named ${slug} already exists. Overwrite it?`,
            `Ya existe una copia guardada llamada ${slug}. ¿Sobrescribirla?`,
          ),
        )
      )
        return
      expectedToken = existing.value.token
    }
    setSaving({ status: 'saving' })
    const result = await storage.save(key, snapshot.document, expectedToken)
    if (result.status === 'saved') {
      // Save as activates the copy: key, token and autosave ownership switch
      // together, the snapshot is marked saved and history stays intact.
      token.current = result.token
      setActiveKey(key)
      store.markSaved(snapshot.document)
      setDraft(null)
      setSaving({ status: 'saved', token: result.token })
      setMessage(t(`Saved a copy as ${slug}.`, `Copia guardada como ${slug}.`))
    } else {
      setSaving(result)
      setMessage(t('Save-as failed.', 'Guardar como falló.'))
    }
  }
  async function discardQuarantined() {
    if (
      !window.confirm(
        t(
          'Discard the corrupted copy? It cannot be opened and was never overwritten.',
          '¿Descartar la copia corrupta? No se puede abrir y nunca se sobrescribió.',
        ),
      )
    )
      return
    const result = await storage.purge(activeKey)
    if (result.ok) {
      setQuarantined(false)
      setMessage(t('Corrupted copy discarded.', 'Copia corrupta descartada.'))
    } else setMessage(result.diagnostics.map((d) => d.code).join(', '))
  }
  async function restoreDraft() {
    if (!draft) return
    if (
      store.getSnapshot().dirty &&
      !window.confirm(
        t(
          'Replace unsaved changes with the recovered draft?',
          '¿Sustituir los cambios sin guardar por el borrador recuperado?',
        ),
      )
    )
      return
    const commit = store.replaceDocument(draft.document, {
      expectedRevision: store.getSnapshot().document.revision,
      history: 'reset',
    })
    if (commit.status !== 'rejected') {
      token.current = null
      setActiveKey(draft.document.id)
      setDraft(null)
      setMessage(t('Draft restored.', 'Borrador restaurado.'))
    }
  }
  function imported(document: DiagramDocument) {
    if (
      store.getSnapshot().dirty &&
      !window.confirm(t('Replace unsaved changes?', '¿Sustituir los cambios sin guardar?'))
    )
      return
    setAutosave(false)
    token.current = null
    setActiveKey(document.id)
    store.replaceDocument(document, {
      expectedRevision: store.getSnapshot().document.revision,
      history: 'reset',
    })
  }
  async function importFile(upload: File) {
    // Capture the destination before the asynchronous read. The import may
    // only land on the identity/revision that authorized it; any later edit
    // or replacement cancels the pending result and keeps the live document.
    const request = ++readSequence.current
    const base = store.getSnapshot().document
    const baseId = base.id
    const baseRevision = base.revision
    if (upload.size > 1048576) {
      setMessage(MESSAGES.importTooLarge[locale])
      return
    }
    let text: string
    try {
      text = await upload.text()
    } catch {
      if (request === readSequence.current && mounted.current)
        setMessage(MESSAGES.readFailed[locale])
      return
    }
    if (request !== readSequence.current || !mounted.current) {
      if (mounted.current) setMessage(MESSAGES.importStale[locale])
      return
    }
    const current = store.getSnapshot().document
    if (current.id !== baseId || current.revision !== baseRevision) {
      setMessage(MESSAGES.importStale[locale])
      return
    }
    const result = importDocument(text, { id: crypto.randomUUID(), locale })
    if (result.ok) imported(result.value.document)
    else setMessage(result.diagnostics.map((d) => d.code).join(', '))
  }
  return (
    <EditorRoot store={store} locale={locale} theme={hostTheme}>
      <main className="adl-editor studio-shell" data-theme={hostTheme}>
        <header className="studio-header">
          <div>
            <a href="./">aesthc / diagram-lib</a>
            <h1>{MESSAGES.diagramStudio[locale]}</h1>
            <p className="studio-role">
              {t('Advanced tooling for the ', 'Herramienta avanzada para el ')}
              <a href="playground.html">{t('Playground document', 'documento del playground')}</a>
              {t('; the semantic viewer is read-only.', '; el visor semántico es de solo lectura.')}
            </p>
          </div>
          <label>
            {MESSAGES.language[locale]}
            <select
              aria-label={MESSAGES.language[locale]}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
          <label title={MESSAGES.hostAppearanceNote[locale]}>
            {MESSAGES.theme[locale]}
            <select
              aria-label={MESSAGES.theme[locale]}
              value={hostTheme}
              onChange={(e) => chooseHostTheme(e.target.value as 'light' | 'dark')}
            >
              <option value="light">{MESSAGES.light[locale]}</option>
              <option value="dark">{MESSAGES.dark[locale]}</option>
            </select>
          </label>
        </header>
        <div className="studio-actions">
          <button type="button" onClick={() => file.current?.click()}>
            {t('Import JSON', 'Importar JSON')}
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
          <button type="button" onClick={() => void save()}>
            {t('Save locally', 'Guardar localmente')}
          </button>
          <button type="button" onClick={() => void saveAs()}>
            {t('Save as…', 'Guardar como…')}
          </button>
          <button type="button" onClick={() => void load()}>
            {t('Load saved', 'Cargar guardado')}
          </button>
          <div className="studio-copies">
            <button
              type="button"
              aria-expanded={copiesOpen}
              aria-controls="studio-copies-list"
              onClick={() => {
                const next = !copiesOpen
                setCopiesOpen(next)
                if (next) void refreshCopies()
              }}
            >
              {t('Saved copies', 'Copias guardadas')}
            </button>
            {copiesOpen && (
              <div id="studio-copies-list">
                {copies.length ? (
                  <ul>
                    {copies.map((copy) => (
                      <li key={copy.key}>
                        <span className="adl-editor-mono">{copy.label}</span>
                        <button type="button" onClick={() => void openCopy(copy.key)}>
                          {t('Open', 'Abrir')}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{t('No saved copies.', 'No hay copias guardadas.')}</p>
                )}
              </div>
            )}
          </div>
          <label>
            <input
              type="checkbox"
              checked={autosave}
              onChange={(e) => setAutosave(e.target.checked)}
            />
            {t('Autosave', 'Autoguardado')}
          </label>
          <button type="button" onClick={() => void share()}>
            {t('Share link', 'Enlace para compartir')}
          </button>
          <button
            type="button"
            disabled={snapshot.document.spec.type === 'graph'}
            onClick={requestConversion}
          >
            {t('Convert to graph', 'Convertir a graph')}
          </button>
        </div>
        <ExportDialog variant="inline" locale={locale} filenameBase="diagram" />
        {conversion && (
          <div className="studio-notice" role="alert">
            <strong>
              {t(
                `Convert to a new graph document? ${conversion.losses.length} field${
                  conversion.losses.length === 1 ? '' : 's'
                } will not transfer.`,
                `¿Convertir a un documento graph nuevo? ${conversion.losses.length} campo${
                  conversion.losses.length === 1 ? '' : 's'
                } no se transferirá${conversion.losses.length === 1 ? '' : 'n'}.`,
              )}
            </strong>
            {conversion.losses.length > 0 && (
              <ul>
                {conversion.losses.map((loss) => (
                  <li key={loss.path}>
                    <code>{loss.path}</code> — {loss.reason}
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={confirmConversion}>
              {t('Confirm conversion', 'Confirmar conversión')}
            </button>
            <button type="button" onClick={() => setConversion(null)}>
              {t('Cancel', 'Cancelar')}
            </button>
          </div>
        )}
        {pendingHandoff && (
          <div className="studio-notice" role="alert">
            {t(
              'The Playground document is waiting, but the JSON panel has an unapplied draft.',
              'El documento del playground está esperando, pero el panel JSON tiene un borrador sin aplicar.',
            )}{' '}
            <button
              type="button"
              onClick={() => {
                const result = store.commitTextDraft()
                if (result.status === 'rejected') {
                  setMessage(result.diagnostics.map((d) => d.code).join(', '))
                  return
                }
                applyHandoff(pendingHandoff)
              }}
            >
              {t('Apply draft', 'Aplicar borrador')}
            </button>
            <button
              type="button"
              onClick={() => {
                store.cancelTextDraft()
                applyHandoff(pendingHandoff)
              }}
            >
              {t('Discard draft', 'Descartar borrador')}
            </button>
            <button type="button" onClick={() => setPendingHandoff(null)}>
              {t('Cancel', 'Cancelar')}
            </button>
          </div>
        )}
        {draft && (
          <div className="studio-notice" role="status">
            {t(
              'A saved draft from a previous session is available.',
              'Hay un borrador guardado de una sesión anterior.',
            )}
            <button type="button" onClick={() => void restoreDraft()}>
              {t('Restore draft', 'Restaurar borrador')}
            </button>
            <button type="button" onClick={() => setDraft(null)}>
              {t('Dismiss', 'Descartar aviso')}
            </button>
          </div>
        )}
        {quarantined && (
          <div className="studio-notice" role="alert">
            {t(
              'A corrupted copy was found and was not overwritten. Load it is not possible; you can discard it explicitly.',
              'Se encontró una copia corrupta y no se sobrescribió. No se puede cargar; puedes descartarla explícitamente.',
            )}
            <button type="button" onClick={() => void discardQuarantined()}>
              {t('Discard corrupted copy', 'Descartar copia corrupta')}
            </button>
          </div>
        )}
        {(message || saving.status !== 'idle') && (
          <div className="studio-message" role="status">
            {message}{' '}
            {saving.status === 'saved'
              ? t('Saved on this device.', 'Guardado en este dispositivo.')
              : saving.status === 'saving'
                ? t('Saving…', 'Guardando…')
                : saving.status === 'conflict'
                  ? t(
                      'Another tab saved a newer version. Download your work before loading the saved version.',
                      'Otra pestaña guardó una versión nueva. Descarga tu trabajo antes de cargarla.',
                    )
                  : saving.status === 'unavailable'
                    ? t(
                        'Local storage is unavailable. Download JSON to keep your work.',
                        'El guardado local no está disponible. Descarga JSON para conservar tu trabajo.',
                      )
                    : ''}
          </div>
        )}
        <EditorToolbar />
        <div className="adl-editor-body">
          <EditorSurface />
          <EditorInspector />
        </div>
        <EditorOutline />
        <EditorJsonPanel />
        <footer className="studio-footer">
          {t(
            'Local-first workspace. Import and export never upload your diagram.',
            'Espacio de trabajo local. Importar y exportar nunca sube tu diagrama.',
          )}{' '}
          · <a href="docs/">{t('Documentation', 'Documentación')}</a>
        </footer>
      </main>
    </EditorRoot>
  )
}
createRoot(document.getElementById('root')!).render(
  <EditorRoot store={store} locale="en">
    <Workbench />
  </EditorRoot>,
)
