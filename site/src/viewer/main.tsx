import { ExportDialog } from '../components/ExportDialog'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import { createDocument, importDocument } from '@aesthc/diagram-lib/editor-core'
import type { DiagramDocument, Locale } from '@aesthc/diagram-lib/editor-core'
import { Comparison, DiagramViewer, type ViewerExportRequest } from '@aesthc/diagram-lib/viewer'
import { MESSAGES } from '../lib/messages'
import { savedLocale, saveLocale } from '../lib/locale'
import { useThemePreference } from '../lib/theme'
import '@aesthc/diagram-lib/viewer.css'
import '../fonts.css'
import '../design-system.css'
import '../generated/palette.css'
import '../theme-tokens.css'
import './viewer.css'

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
  { id: 'viewer-document', locale: 'en' },
)
if (!initial.ok) throw Error(initial.diagnostics.map((d) => d.code).join(', '))
const initialDocument: DiagramDocument = initial.value
initialDocument.metadata.nodes = {
  client: { roles: ['frontend'], tags: ['ui'], links: [] },
  api: { roles: ['backend'], tags: ['core'], links: [] },
  database: { roles: ['backend'], tags: ['core'], links: [] },
  worker: { roles: ['backend'], tags: ['async'], links: [] },
}
initialDocument.scene.groups = [
  {
    id: 'platform',
    label: 'Platform',
    kind: 'visual',
    nodeIds: ['api', 'database'],
    locked: false,
  },
]
initialDocument.views = [
  {
    id: 'v-client',
    label: 'Client entry',
    focus: { nodeIds: ['client'], edgeIds: [] },
    camera: { x: 150, y: 150, zoom: 1.5 },
  },
  {
    id: 'v-orders',
    label: 'Orders',
    focus: { nodeIds: ['api', 'database'], edgeIds: ['persist'] },
  },
  {
    id: 'v-worker',
    label: 'Worker',
    focus: { nodeIds: ['worker'], edgeIds: [] },
    camera: { x: 700, y: 150, zoom: 1.5 },
  },
]
initialDocument.story = [
  { id: 'st1', viewId: 'v-client', durationMs: 1000 },
  { id: 'st2', viewId: 'v-orders', durationMs: 1000 },
  { id: 'st3', viewId: 'v-worker', durationMs: 1000 },
]

/** Host chrome tokens. The viewer component keeps its own document theme. */
const HOST_TOKENS: Record<'light' | 'dark', CSSProperties> = {
  light: {
    '--adl-bg': '#ffffff',
    '--adl-fg': '#0a0a0a',
    '--adl-card': '#fafafa',
    '--adl-border': '#eaeaea',
    '--adl-muted': '#666666',
    '--adl-cobalt': '#0070f3',
  } as CSSProperties,
  dark: {
    '--adl-bg': '#000000',
    '--adl-fg': '#ededed',
    '--adl-card': '#0a0a0a',
    '--adl-border': '#1f1f1f',
    '--adl-muted': '#a1a1a1',
    '--adl-cobalt': '#3291ff',
  } as CSSProperties,
}

function ViewerApp() {
  const [exportRequest, setExportRequest] = useState<ViewerExportRequest | null>(null)
  const { theme: hostTheme } = useThemePreference()
  const [document, setDocument] = useState<DiagramDocument>(initialDocument)
  const [afterDocument, setAfterDocument] = useState<DiagramDocument | null>(null)
  const [locale, setLocale] = useState<Locale>(savedLocale)
  const [message, setMessage] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const compareFile = useRef<HTMLInputElement>(null)
  // One monotonically increasing read id per host: the newest read owns the
  // result, and reset/replacement/unmount bump it so late reads are discarded.
  const readSequence = useRef(0)
  const mounted = useRef(true)
  const documentRef = useRef(document)
  documentRef.current = document
  const afterRef = useRef(afterDocument)
  afterRef.current = afterDocument

  useEffect(() => {
    window.document.documentElement.lang = locale
    saveLocale(locale)
  }, [locale])
  useEffect(() => {
    readSequence.current += 1
  }, [document, afterDocument])
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )

  async function importFile(upload: File, target: 'document' | 'comparison') {
    const request = ++readSequence.current
    const base = target === 'document' ? documentRef.current : afterRef.current
    const baseId = base?.id ?? null
    const baseRevision = base?.revision ?? null
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
    const current = target === 'document' ? documentRef.current : afterRef.current
    if ((current?.id ?? null) !== baseId || (current?.revision ?? null) !== baseRevision) {
      setMessage(MESSAGES.importStale[locale])
      return
    }
    const result = importDocument(text, { id: crypto.randomUUID(), locale })
    if (!result.ok) {
      setMessage(result.diagnostics.map((d) => d.code).join(', '))
      return
    }
    if (target === 'document') setDocument(result.value.document)
    else setAfterDocument(result.value.document)
    setMessage('')
  }

  return (
    <main className="viewer-shell" data-theme={hostTheme} style={HOST_TOKENS[hostTheme]}>
      <header className="viewer-header">
        <a href="./">aesthc / diagram-lib</a>
        <h1>{MESSAGES.semanticViewer[locale]}</h1>
        <div className="viewer-actions">
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
          <button type="button" onClick={() => file.current?.click()}>
            {MESSAGES.importJson[locale]}
          </button>
          <input
            ref={file}
            hidden
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const upload = event.target.files?.[0]
              event.target.value = ''
              if (upload) void importFile(upload, 'document')
            }}
          />
          <button type="button" onClick={() => compareFile.current?.click()}>
            {MESSAGES.compareWith[locale]}
          </button>
          <input
            ref={compareFile}
            hidden
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const upload = event.target.files?.[0]
              event.target.value = ''
              if (upload) void importFile(upload, 'comparison')
            }}
          />
          <button
            type="button"
            onClick={() => {
              readSequence.current += 1
              setDocument(initialDocument)
              setAfterDocument(null)
              setMessage('')
            }}
          >
            {MESSAGES.reset[locale]}
          </button>
        </div>
      </header>
      {message && (
        <p className="viewer-message" role="status">
          {message}
        </p>
      )}
      <DiagramViewer document={document} locale={locale} onExportRequest={setExportRequest} />
      <button
        type="button"
        className="control"
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true })
          setExportRequest({ format: 'svg', quality: 'edit' })
        }}
      >
        {locale === 'es' ? 'Exportar' : 'Export'}
      </button>
      {exportRequest && (
        <ExportDialog
          locale={locale}
          open
          onClose={() => setExportRequest(null)}
          source={{
            document,
            selection: [],
            theme: hostTheme,
            query: exportRequest.query,
          }}
          initialChoice={exportRequest}
        />
      )}

      {afterDocument && <Comparison before={document} after={afterDocument} locale={locale} />}
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<ViewerApp />)
