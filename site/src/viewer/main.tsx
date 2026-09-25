import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createDocument, importDocument } from '@aesthc/diagram-lib/editor-core'
import type { DiagramDocument, Locale } from '@aesthc/diagram-lib/editor-core'
import { DiagramViewer } from '@aesthc/diagram-lib/viewer'
import '@aesthc/diagram-lib/viewer.css'
import '../design-system.css'
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

function ViewerApp() {
  const [document, setDocument] = useState<DiagramDocument>(initialDocument)
  const [locale, setLocale] = useState<Locale>('en')
  const [message, setMessage] = useState('')
  const file = useRef<HTMLInputElement>(null)
  return (
    <main className="viewer-shell">
      <header className="viewer-header">
        <a href="./">aesthc / diagram-lib</a>
        <h1>Semantic viewer</h1>
        <div className="viewer-actions">
          <label>
            Language
            <select
              aria-label="Language"
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
          <button type="button" onClick={() => file.current?.click()}>
            Import JSON
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
              if (result.ok) {
                setDocument(result.value.document)
                setMessage('')
              } else setMessage(result.diagnostics.map((d) => d.code).join(', '))
            }}
          />
          <button
            type="button"
            onClick={() => {
              setDocument(initialDocument)
              setMessage('')
            }}
          >
            Reset
          </button>
        </div>
      </header>
      {message && (
        <p className="viewer-message" role="status">
          {message}
        </p>
      )}
      <DiagramViewer document={document} locale={locale} />
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<ViewerApp />)
