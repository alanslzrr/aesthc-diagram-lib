# Sharing and exporting

Three surfaces hand a diagram to someone else, and they do not share one API:

- **Public package APIs** — `@aesthc/diagram-lib/export` and
  `@aesthc/diagram-lib/persistence` are typed entrypoints shipped in the tarball.
  Every `ts` block in [Public package APIs](#public-package-apis) is a real
  import compiled and executed against the installed package by the consumer
  tests.
- **Editable hosts** — the website Playground and Studio build on those APIs and
  add their own controls, limits and recovery. [Editable hosts](#editable-hosts)
  describes what those screens actually offer.
- **Legacy showcase** — the landing page `?only=` panels keep their older `s=`
  share links and raw-text draft recovery. See
  [Legacy showcase](#legacy-showcase-only-panels).

Shared fragments are not encryption. Anyone receiving the URL can read its data;
clipboard, browser history, extensions and screenshots may expose it. Do not put
secrets or personal/customer data into examples you intend to share.

## Public package APIs

Exports take a validated `DiagramDocument`. Create one from a spec with
`createDocument`, or import an existing document with `importDocument` from
`@aesthc/diagram-lib/editor-core`. `Result` values are discriminated: check
`.ok` before reading `.value`, and report `.diagnostics[0].code` on failure.

### `exportDocument`

One entrypoint renders JSON, SVG, PNG, JPEG and WebP. Raster formats need a
browser canvas; JSON and SVG also run in server-side code. Receipts carry the
document id and revision, format, MIME type, byte size, pixel size, scope,
canonical/source flags and diagnostics; `verified` stays `false` because the
exporter does not decode its own output.

```ts export-json
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { exportDocument } from '@aesthc/diagram-lib/export'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value

const result = await exportDocument(document, {
  format: 'json',
  scope: { type: 'document' },
  theme: 'light',
  quality: 'edit',
  background: 'theme',
  scale: 1,
  includeSource: false,
  metadata: 'minimal',
})
if (!result.ok) throw new Error(result.diagnostics[0].code)
const { bytes, receipt } = result.value
if (receipt.format !== 'json' || !receipt.canonical || bytes.byteLength !== receipt.bytes)
  throw new Error('JSON receipt does not match the artifact')
console.log(`JSON ${receipt.bytes} bytes at revision ${receipt.revision}`)
```

```ts export-svg
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { exportDocument } from '@aesthc/diagram-lib/export'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value

const result = await exportDocument(document, {
  format: 'svg',
  scope: { type: 'document' },
  theme: 'dark',
  quality: 'edit',
  background: 'transparent',
  scale: 2,
  includeSource: true,
  metadata: 'minimal',
  fontPolicy: 'fallback',
})
if (!result.ok) throw new Error(result.diagnostics[0].code)
const svg = new TextDecoder().decode(result.value.bytes)
if (
  !svg.startsWith('<svg') ||
  !svg.includes('aesthc-source') ||
  !result.value.receipt.sourceIncluded
)
  throw new Error('SVG source embedding failed')
console.log(`SVG ${result.value.receipt.width}×${result.value.receipt.height}`)
```

```ts export-png
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { exportDocument, getExportCapabilities } from '@aesthc/diagram-lib/export'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value

if (!getExportCapabilities().png) throw new Error('PNG export needs a browser canvas')
const result = await exportDocument(document, {
  format: 'png',
  scope: { type: 'document' },
  theme: 'light',
  quality: 'edit',
  background: 'theme',
  scale: 2,
  includeSource: false,
  metadata: 'minimal',
  fontPolicy: 'fallback',
})
if (!result.ok) throw new Error(result.diagnostics[0].code)
if (result.value.receipt.mimeType !== 'image/png') throw new Error('unexpected MIME type')
console.log(`PNG ${result.value.receipt.bytes} bytes`)
```

```ts export-jpeg
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { exportDocument, getExportCapabilities } from '@aesthc/diagram-lib/export'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value

if (!getExportCapabilities().jpeg) throw new Error('JPEG export needs a browser canvas')
const opaque = await exportDocument(document, {
  format: 'jpeg',
  scope: { type: 'document' },
  theme: 'light',
  quality: 'edit',
  background: 'transparent',
  scale: 2,
  includeSource: false,
  metadata: 'minimal',
  fontPolicy: 'fallback',
})
if (opaque.ok || opaque.diagnostics[0].code !== 'export.alpha')
  throw new Error('JPEG must reject a transparent background')
const result = await exportDocument(document, {
  format: 'jpeg',
  scope: { type: 'document' },
  theme: 'light',
  quality: 'edit',
  background: 'theme',
  scale: 2,
  includeSource: false,
  metadata: 'minimal',
  fontPolicy: 'fallback',
})
if (!result.ok) throw new Error(result.diagnostics[0].code)
console.log(`JPEG ${result.value.receipt.bytes} bytes`)
```

```ts export-webp
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { exportDocument, probeExportCapabilities } from '@aesthc/diagram-lib/export'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value

if (!probeExportCapabilities().webp) throw new Error('WebP is not encodable here')
const result = await exportDocument(document, {
  format: 'webp',
  scope: { type: 'document' },
  theme: 'dark',
  quality: 'edit',
  background: 'transparent',
  scale: 2,
  includeSource: false,
  metadata: 'minimal',
  fontPolicy: 'fallback',
})
if (!result.ok) throw new Error(result.diagnostics[0].code)
if (result.value.receipt.mimeType !== 'image/webp') throw new Error('unexpected MIME type')
console.log(`WebP ${result.value.receipt.bytes} bytes`)
```

```ts export-cancel
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { exportDocument } from '@aesthc/diagram-lib/export'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value

const controller = new AbortController()
controller.abort()
const cancelled = await exportDocument(document, {
  format: 'png',
  scope: { type: 'document' },
  theme: 'light',
  quality: 'edit',
  background: 'theme',
  scale: 1,
  includeSource: false,
  metadata: 'minimal',
  fontPolicy: 'fallback',
  signal: controller.signal,
})
if (cancelled.ok || cancelled.diagnostics[0].code !== 'operation.aborted')
  throw new Error('a pre-aborted export must never report success')
console.log('cancellation returned operation.aborted')
```

Limits for `exportDocument`:

| Bound                              | Value                                                              |
| ---------------------------------- | ------------------------------------------------------------------ |
| Scale                              | `0 < scale <= 8`                                                   |
| Raster size                        | each side `<= 16384`, total pixels `<= 32,000,000`                 |
| JPEG + `background: 'transparent'` | rejected with `export.alpha`                                       |
| `includeSource`                    | JSON and SVG only (`export.source-format` otherwise)               |
| `scope: { type: 'selection' }`     | never JSON (`export.scope`); groups expand to their nodes          |
| `quality: 'publish'`               | runs the authored deployment profile and blocks on its diagnostics |
| Embedded fonts                     | each WOFF2 `<= 512 KiB`; otherwise `export.font-invalid`           |

### `exportDocumentHtml`

`exportDocumentHtml` builds a self-contained offline HTML file: an embedded
viewer runtime, viewer CSS, inlined fonts, a no-JavaScript fallback, and a CSP
that allows only the hashed runtime script plus inline styles. The runtime and
viewer CSS ship inside the package under `dist/`; resolve them from the
installed tarball as shown. `includeSource` embeds the exact canonical JSON in
`#aesthc-source`, and `metadata: 'minimal'` (the default) drops undrawn private
notes, links/evidence and extensions from the runtime document.

```ts export-html
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { exportDocumentHtml } from '@aesthc/diagram-lib/export'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value

const require = createRequire(import.meta.url)
const cssPath = require.resolve('@aesthc/diagram-lib/viewer.css')
const runtime = readFileSync(join(dirname(cssPath), 'standalone/viewer.js'), 'utf8')
const css = readFileSync(cssPath, 'utf8')
const fonts = {
  sans: readFileSync(require.resolve('@aesthc/diagram-lib/fonts/geist-sans.woff2')),
  mono: readFileSync(require.resolve('@aesthc/diagram-lib/fonts/geist-mono.woff2')),
}

const result = exportDocumentHtml(document, {
  runtime,
  css,
  fonts,
  theme: 'light',
  includeSource: true,
  metadata: 'minimal',
})
if (!result.ok) throw new Error(result.diagnostics[0].code)
if (!result.value.html.includes("script-src 'sha256-")) throw new Error('missing CSP hash')
if (!result.value.html.includes('id="aesthc-source"')) throw new Error('source not embedded')
if (!result.value.receipt.sourceIncluded || result.value.receipt.mimeType !== 'text/html')
  throw new Error('HTML receipt does not match the artifact')
console.log(`HTML ${result.value.receipt.bytes} bytes`)
```

The artifact is rejected with `export.bytes` above 8 MiB. `metadata: 'all'`
keeps authored inspector detail in the runtime document; `includeSource`
independently keeps the exact canonical original for round-trip recovery.
Pass `registry` to freeze trusted custom node renderers into the artifact;
without a renderer the export fails with `renderer.unsupported` instead of
shipping a placeholder.

### `exportCard`

`exportCard` rasterizes a fixed 1200×630 PNG. A query receipt marks exact node
and edge ids (parallel edges included) and is rejected when its document id or
revision is stale. `validateCardQuery` exposes the same check before rendering.

```ts export-card
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { exportCard, validateCardQuery } from '@aesthc/diagram-lib/export'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value
const nodeId = 'start'

const query = {
  documentId: document.id,
  revision: document.revision,
  nodeIds: [nodeId],
  edgeIds: [],
  label: 'Focused card',
}
const checked = validateCardQuery(document, query)
if (!checked.ok) throw new Error(checked.diagnostics[0].code)
const stale = validateCardQuery(document, { ...query, revision: document.revision + 1 })
if (stale.ok || stale.diagnostics[0].code !== 'query.stale')
  throw new Error('stale receipts must be rejected')

const result = await exportCard(document, { theme: 'light', query })
if (!result.ok) throw new Error(result.diagnostics[0].code)
if (result.value.receipt.width !== 1200 || result.value.receipt.height !== 630)
  throw new Error('unexpected card size')
console.log(`card ${result.value.receipt.bytes} bytes`)
```

### `exportStoryWebm`

`exportStoryWebm` records the validated document story to WebM from a canvas
stream. It never requests a camera or microphone, and a reduced-motion caller
receives `webm.reduced-motion` instead of a recording.

```ts export-webm
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { exportStoryWebm, webmCapability } from '@aesthc/diagram-lib/export'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value
document.views = [{ id: 'overview', label: 'Overview', focus: { nodeIds: ['start'], edgeIds: [] } }]
document.story = [{ id: 'intro', viewId: 'overview', durationMs: 600 }]

if (!webmCapability().supported) throw new Error('WebM recording is unavailable')
const result = await exportStoryWebm(document, { fps: 30, scale: 1 })
if (!result.ok) throw new Error(result.diagnostics[0].code)
if (!result.value.receipt.mimeType.startsWith('video/webm')) throw new Error('unexpected codec')
console.log(`WebM ${result.value.receipt.durationMs} ms, ${result.value.receipt.frameCount} frames`)
```

Limits for `exportStoryWebm`: each story step is 500–10,000 ms, the total story
is `<= 120 s`, `fps` is clamped to 1–60, `scale` to 0.25–2, and the raster cap
matches `exportDocument`. An abort settles as `operation.aborted` and never
reports a partial success.

### Persistence and share links

`@aesthc/diagram-lib/persistence` stores validated documents behind a
compare-and-swap token. `createMemoryStorage` is for tests and server code;
`createLocalStorageAdapter` is the browser adapter and requires Web Locks for
cross-tab safety. `createAutosave` connects an `EditorStore` to any adapter.

```ts persistence-memory
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { createMemoryStorage } from '@aesthc/diagram-lib/persistence'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value

const storage = createMemoryStorage()
const saved = await storage.save('demo', document, null)
if (saved.status !== 'saved') throw new Error('save failed')
const loaded = await storage.load('demo')
if (!loaded.ok || !loaded.value) throw new Error('load failed')
const conflict = await storage.save('demo', document, null)
if (conflict.status !== 'conflict') throw new Error('stale tokens must conflict')
console.log(`stored ${loaded.value.document.id} @ ${loaded.value.token}`)
```

```ts persistence-local
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { createLocalStorageAdapter } from '@aesthc/diagram-lib/persistence'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value

const storage = createLocalStorageAdapter('my-app')
const saved = await storage.save('release', document, null)
if (saved.status !== 'saved') throw new Error(`storage ${saved.status}`)
const entries = await storage.list()
if (!entries.ok) throw new Error(entries.diagnostics[0].code)
if (!entries.value.some((entry) => entry.key === 'release')) throw new Error('entry not listed')
const removed = await storage.remove('release', saved.token)
if (!removed.ok) throw new Error(removed.diagnostics[0].code)
console.log('localStorage adapter saved, listed and removed')
```

```ts persistence-autosave
import { createDocument, createEditorStore } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { createAutosave, createMemoryStorage } from '@aesthc/diagram-lib/persistence'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)

const store = createEditorStore({
  document: made.value,
  permissions: { edit: true, save: true, export: true },
})
const nodeId = 'start'
let saved = false
const autosave = createAutosave(store, createMemoryStorage(), {
  key: 'release',
  token: null,
  delay: 10,
  onState: (state) => {
    if (state.status === 'saved') saved = true
  },
})
const committed = store.dispatch({
  id: 'tag-node',
  label: 'Tag node',
  expectedRevision: 0,
  commands: [
    {
      type: 'metadata.set',
      metadata: {
        nodes: { [nodeId]: { roles: ['service'], tags: [] } },
        edges: {},
        visuals: {},
      },
    },
  ],
})
if (committed.status !== 'committed') throw new Error('edit rejected')
await autosave.flush()
if (!saved) throw new Error('autosave did not save')
autosave.dispose()
store.dispose()
console.log('autosave flushed after a committed edit')
```

Share links use a versioned envelope. `encodeShareDocument` returns `d=` for a
full document and `decodeShareDocument` also reads legacy `s=` spec links.
Limits are exported as `SHARE_LIMITS`: 64 KiB encoded, 256 KiB expanded, a 5 s
decompression deadline and version 1. Decompression is bounded while reading;
malformed input, expansion bombs and future versions are rejected without
inventing a document.

```ts share-roundtrip
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { decodeShareDocument, encodeShareDocument } from '@aesthc/diagram-lib/persistence'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)
const document = made.value

const encoded = await encodeShareDocument(document)
if (!encoded.ok) throw new Error(encoded.diagnostics[0].code)
if (!encoded.value.startsWith('d=')) throw new Error('unexpected envelope')
const decoded = await decodeShareDocument(`#${encoded.value}`)
if (!decoded.ok) throw new Error(decoded.diagnostics[0].code)
if (decoded.value.document.id !== document.id || decoded.value.source !== 'd')
  throw new Error('round-trip mismatch')
console.log(`share link carries ${encoded.value.length} characters`)
```

```ts share-limits
import { createDocument } from '@aesthc/diagram-lib/editor-core'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { encodeShareDocument, SHARE_LIMITS } from '@aesthc/diagram-lib/persistence'

const made = createDocument(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en, {
  id: 'export-demo',
  locale: 'en',
})
if (!made.ok) throw new Error(made.diagnostics[0].code)

if (SHARE_LIMITS.encoded !== 65536 || SHARE_LIMITS.expanded !== 262144)
  throw new Error('documented share limits drifted')
const tooLong = await encodeShareDocument(made.value, {
  limits: { encoded: 32, expanded: SHARE_LIMITS.expanded },
})
if (tooLong.ok || tooLong.diagnostics[0].code !== 'share.too-long')
  throw new Error('bounded links must refuse oversized payloads')
console.log('oversized share links are refused, not truncated')
```

## Editable hosts

The website applications are consumers of the package APIs above, not a second
contract. Their controls:

- **Playground** (per-diagram editing): **Import JSON**, **Download JSON**,
  **Reset example**, and **Full studio** handoff. It does not expose a Share
  link control; use Studio for a link. Import accepts a document up to 1 MiB of
  JSON and the editor ceilings (`DEFAULT_LIMITS`): 1,000 nodes, 2,000 edges,
  100 groups, 20 views and 50 story steps. Invalid or oversized input keeps the
  last valid preview.
- **Studio** (full workspace): **Share link**, **Autosave**, JSON/SVG/PNG/JPEG/
  WebP export, save/open of stored documents, draft recovery and a discard
  action for corrupted copies. Share link calls `encodeShareDocument`; when the
  link would exceed the encoded limit, Studio offers a local JSON download
  instead of announcing success.
  Autosave uses `createLocalStorageAdapter` plus `createAutosave` and surfaces
  `saved`, `conflict` and `unavailable` states. Saved documents are local,
  unencrypted browser storage; do not include secrets.
- Both hosts validate imported text and retain the last valid preview on
  errors. The Playground keeps in-memory sessions per diagram/locale; Studio
  persistence is explicit.

## Legacy showcase (`?only=` panels)

The landing page panels (`?only=example-band` and the other six layouts) keep
their earlier per-diagram tools:

- **Share** copies a legacy `s=` link that carries a version-1 envelope with
  diagram key, spec and locale. These links remain readable through the public
  `decodeShareDocument` API, which accepts `s=` alongside current `d=` document
  links.
- **Copy or download** offers Copy JSON, Copy SVG, Download JSON, Download SVG
  and Download PNG. Copy SVG resolves current computed styles and colors but
  may depend on fonts installed in the destination application. Download SVG
  embeds the playground fonts for a more portable file; PNG rasterizes at 2×
  scale and is not editable vector content. Clear the selection before
  exporting when you want an undimmed complete diagram.
- **Draft recovery** is opt-in per diagram and stores raw JSON text (up to
  256 KiB) in this browser's local storage. Restore/discard is explicit and
  restoring runs validation before rendering. This is the legacy showcase
  behavior; it is not the Studio autosave contract.

Clipboard and download errors must be visible rather than reported as
successful. The target application remains part of compatibility testing,
especially for SVG fonts, filters, color handling and transparency.

## Exact-font portable artifacts

Use `exportCardSvg` or `exportDocumentHtmlAsync` when geometry must be measured with the exact WOFF2 bytes embedded in the artifact. `exportCard` and `exportStoryWebm` also accept `fonts`, `fontPolicy`, and `signal`. The synchronous `cardSvg` and `exportDocumentHtml` helpers remain available, but their legacy measurement path cannot certify portable typography.

With `fontPolicy: 'required'`, both faces must load; absent or unusable faces return `export.font-missing`, malformed/oversized bytes return `export.font-invalid`, bounded waits return `export.timeout`, and cancellation returns `operation.aborted`. `fallback` emits `export.font-fallback` and `typography: { measurement: 'fallback', embedded: false }`; it does not claim exact-font fidelity. Successful preparation reports `measurement: 'embedded'` without changing `verified: false`.

See `examples/portable-export.ts` for public imports and caller-owned font bytes. Site workflows use bundled Geist with required fonts by default. HTML retains its static fallback until its embedded faces load; it never fetches fonts from the network.

A Viewer host can provide `onExportRequest` to `DiagramViewer` to use its own shared dialog. The request carries the format, quality and an optional revision-bound query receipt. This callback creates no mutable editor store. Pass the receipt to visual `exportDocument` through `query`, or to `exportCard` through `query`, to preserve exact highlight IDs. Stale receipts are rejected, and highlighted artifacts are noncanonical.
