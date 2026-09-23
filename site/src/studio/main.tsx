import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createDocument,
  createEditorStore,
  importDocument,
  canonicalizeContent,
} from '@aesthc/diagram-lib/editor-core'
import type { DiagramDocument, Locale } from '@aesthc/diagram-lib/editor-core'
import {
  EditorRoot,
  EditorToolbar,
  EditorSurface,
  EditorInspector,
  EditorJsonPanel,
  EditorOutline,
  useEditorSnapshot,
} from '@aesthc/diagram-lib/editor'
import { downloadArtifact, exportDocument } from '@aesthc/diagram-lib/export'
import type { ExportFormat } from '@aesthc/diagram-lib/export'
import { createLocalStorageAdapter, createAutosave } from '@aesthc/diagram-lib/persistence'
import type { AutosaveState, StoredDocument, StoredEntry } from '@aesthc/diagram-lib/persistence'
import sansUrl from '@aesthc/diagram-lib/fonts/geist-sans.woff2?url'
import monoUrl from '@aesthc/diagram-lib/fonts/geist-mono.woff2?url'
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
const store = createEditorStore({
  document: initial.value,
  permissions: { edit: true, save: true, export: true },
})
const storage = createLocalStorageAdapter('studio')
function Workbench() {
  const snapshot = useEditorSnapshot(),
    [locale, setLocale] = useState<Locale>('en'),
    [message, setMessage] = useState(''),
    [saving, setSaving] = useState<AutosaveState>({ status: 'idle' }),
    [autosave, setAutosave] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('svg'),
    [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<StoredDocument | null>(null)
  const [quarantined, setQuarantined] = useState(false)
  const [copies, setCopies] = useState<StoredEntry[]>([])
  const token = useRef<string | null>(null),
    file = useRef<HTMLInputElement>(null),
    saveController = useRef<ReturnType<typeof createAutosave> | null>(null)
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
      setDraft(null)
      setMessage(t('Saved copy opened.', 'Copia guardada abierta.'))
    }
  }
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  useEffect(() => {
    let cancelled = false
    void storage.load(snapshot.document.id).then((result) => {
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
    // Only the initial document identity matters; edits do not reopen the notice.
  }, [snapshot.document.id])
  useEffect(() => {
    if (!autosave) return
    const controller = createAutosave(store, storage, {
      key: snapshot.document.id,
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
  }, [autosave, snapshot.document.id])
  useEffect(() => {
    if (!snapshot.dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [snapshot.dirty])
  async function exportFile() {
    setBusy(true)
    setMessage('')
    try {
      const fonts =
        format === 'json'
          ? undefined
          : {
              sans: new Uint8Array(await (await fetch(sansUrl)).arrayBuffer()),
              mono: new Uint8Array(await (await fetch(monoUrl)).arrayBuffer()),
            }
      const result = await exportDocument(snapshot.document, {
        format,
        scope: { type: 'document' },
        theme: snapshot.document.presentation.theme.mode,
        quality: 'edit',
        background: 'theme',
        scale: 2,
        includeSource: false,
        metadata: 'minimal',
        fonts,
      })
      if (!result.ok) {
        setMessage(result.diagnostics.map((d) => d.code).join(', '))
        return
      }
      const download = downloadArtifact(result.value, `diagram.${format}`)
      setMessage(
        download.ok
          ? t(
              `Exported revision ${result.value.receipt.revision}`,
              `Revisión ${result.value.receipt.revision} exportada`,
            )
          : download.diagnostics.map((d) => d.code).join(', '),
      )
    } catch {
      setMessage(t('Export failed. Please retry.', 'La exportación falló. Vuelve a intentarlo.'))
    } finally {
      setBusy(false)
    }
  }
  async function save() {
    if (autosave && saveController.current) {
      await saveController.current.flush()
      return
    }
    setSaving({ status: 'saving' })
    const document = snapshot.document
    const result = await storage.save(document.id, document, token.current)
    if (result.status === 'saved') {
      token.current = result.token
      store.markSaved(document)
      setSaving({ status: 'saved', token: result.token })
    } else setSaving(result)
  }
  async function load() {
    const result = await storage.load(snapshot.document.id)
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
    setSaving({ status: 'saving' })
    const result = await storage.save(`saveas:${slug}`, snapshot.document, null)
    setSaving(result.status === 'saved' ? { status: 'saved', token: result.token } : result)
    setMessage(
      result.status === 'saved'
        ? t(`Saved a copy as ${slug}.`, `Copia guardada como ${slug}.`)
        : t('Save-as failed.', 'Guardar como falló.'),
    )
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
    const result = await storage.purge(snapshot.document.id)
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
    store.replaceDocument(document, {
      expectedRevision: store.getSnapshot().document.revision,
      history: 'reset',
    })
  }
  return (
    <EditorRoot store={store} locale={locale}>
      <main
        className="adl-editor studio-shell"
        data-theme={snapshot.document.presentation.theme.mode}
      >
        <header className="studio-header">
          <div>
            <a href="./">aesthc / diagram-lib</a>
            <h1>Diagram Studio</h1>
          </div>
          <label>
            {t('Language', 'Idioma')}
            <select
              aria-label={t('Language', 'Idioma')}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
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
            onChange={async (e) => {
              const upload = e.target.files?.[0]
              e.target.value = ''
              if (!upload) return
              if (upload.size > 1048576) {
                setMessage('limit.bytes')
                return
              }
              const result = importDocument(await upload.text(), {
                id: crypto.randomUUID(),
                locale,
              })
              if (result.ok) imported(result.value.document)
              else setMessage(result.diagnostics.map((d) => d.code).join(', '))
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
          <details
            className="studio-copies"
            onToggle={(event) => {
              if ((event.target as HTMLDetailsElement).open) void refreshCopies()
            }}
          >
            <summary>{t('Saved copies', 'Copias guardadas')}</summary>
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
          </details>
          <label>
            <input
              type="checkbox"
              checked={autosave}
              onChange={(e) => setAutosave(e.target.checked)}
            />
            {t('Autosave', 'Autoguardado')}
          </label>
          <label>
            {t('Format', 'Formato')}{' '}
            <select
              aria-label={t('Export format', 'Formato de exportación')}
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
            >
              {['json', 'svg', 'png', 'jpeg', 'webp'].map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={busy} onClick={() => void exportFile()}>
            {busy ? t('Exporting…', 'Exportando…') : t('Download', 'Descargar')}
          </button>
        </div>
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
