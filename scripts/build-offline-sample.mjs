import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createDocument } from '../dist/editor-core/index.js'
import { exportDocumentHtml } from '../dist/export/index.js'

const made = createDocument(
  {
    type: 'graph',
    profile: 'architecture',
    caption: 'Offline accessibility sample',
    legend: { main: 'Request', branch: 'Async' },
    nodes: [
      { id: 'client', label: 'Web client', kind: 'Application', description: 'Places orders.' },
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
      { id: 'database', label: 'Orders', kind: 'Database', description: 'Stores the lifecycle.' },
      { id: 'worker', label: 'Email worker', kind: 'Service', description: 'Sends confirmations.' },
    ],
    edges: [
      { id: 'request', from: 'client', to: 'api', label: 'HTTPS' },
      { id: 'persist', from: 'api', to: 'database', label: 'Write' },
      { id: 'notify', from: 'api', to: 'worker', label: 'Queue', variant: 'branch' },
    ],
  },
  { id: 'a11y-offline', locale: 'en' },
)
if (!made.ok) throw Error(made.diagnostics.map((d) => d.code).join(', '))
const document = made.value
document.metadata = {
  nodes: {
    client: {
      roles: ['frontend'],
      tags: ['region:eu'],
      owner: 'team-a',
      links: [{ label: 'Repository', href: 'https://example.com/client' }],
      evidence: [
        {
          id: 'ev-client',
          repository: 'https://example.com/client',
          commit: '0123456789abcdef0123456789abcdef01234567',
          path: 'src/client.ts',
          startLine: 1,
          endLine: 20,
        },
      ],
    },
    api: { roles: ['backend'], tags: ['region:us'], visibility: 'public' },
    database: { roles: ['backend'], tags: ['region:eu', 'region:us'], owner: 'team-d' },
    worker: { roles: ['backend'], tags: ['core'] },
  },
  edges: {},
  visuals: {},
  engineeringProfile: 'deployment-ownership',
}
document.scene.groups = [
  {
    id: 'platform',
    label: 'Platform',
    kind: 'visual',
    nodeIds: ['api', 'database'],
    locked: false,
  },
]
document.views = [
  { id: 'v-client', label: 'Client entry', focus: { nodeIds: ['client'], edgeIds: [] } },
  {
    id: 'v-orders',
    label: 'Orders',
    focus: { nodeIds: ['api', 'database'], edgeIds: ['persist'] },
  },
  { id: 'v-worker', label: 'Worker', focus: { nodeIds: ['worker'], edgeIds: [] } },
]
document.story = [
  { id: 'st1', viewId: 'v-client', durationMs: 1000 },
  { id: 'st2', viewId: 'v-orders', durationMs: 1000 },
  { id: 'st3', viewId: 'v-worker', durationMs: 1000 },
]

const artifact = exportDocumentHtml(document, {
  runtime: readFileSync('dist/standalone/viewer.js', 'utf8'),
  css: readFileSync('dist/viewer.css', 'utf8'),
  fonts: {
    sans: new Uint8Array(readFileSync('dist/fonts/geist-sans.woff2')),
    mono: new Uint8Array(readFileSync('dist/fonts/geist-mono.woff2')),
  },
})
if (!artifact.ok) throw Error(artifact.diagnostics.map((d) => d.code).join(', '))
mkdirSync('test-results/a11y', { recursive: true })
writeFileSync('test-results/a11y/offline.html', artifact.value.html)
console.log(`Wrote test-results/a11y/offline.html (${artifact.value.receipt.bytes} bytes)`)
