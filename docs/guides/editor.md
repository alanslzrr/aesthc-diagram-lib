# Editable documents and Studio

The opt-in editor APIs are an incremental implementation of the canvas specification in the repository's docs/specs/editable-canvas directory, not a claim that all M1–M3 acceptance gates have passed. See the execution report for remaining scope.

## Compatibility

Existing `DiagramSpec`, `layoutDiagram` and `DiagramCanvas` retain their seven-type contracts. Do not feed a graph document to the legacy layout dispatcher. Use `EditorSpec`, `createDocument` and `resolveDocument` from `@aesthc/diagram-lib/editor-core`. Imported documents are versioned envelopes, not replacements for legacy specs.

No root runtime import loads the editor. Interactive React components are confined to `/editor`; `/editor-core`, `/graph`, `/export`, `/persistence` and `/render` support server imports. Nothing writes to storage or the network on import.

## React composition

Import `@aesthc/diagram-lib/editor.css` once. Wrap controls in an `adl-editor` element with `data-theme="light"` or `"dark"`, and provide loaded Geist fonts. Use useEditorStore for React-owned stores; it handles Strict Mode effect replay and disposes on real unmount. For externally owned stores, instantiate once and dispose when that owner ends.

```tsx
import { type DiagramDocument } from '@aesthc/diagram-lib/editor-core'
import {
  EditorRoot, EditorToolbar, EditorSurface, EditorInspector, EditorJsonPanel, EditorOutline, useEditorStore,
} from '@aesthc/diagram-lib/editor'
import '@aesthc/diagram-lib/editor.css'

export function Editor({ document }: { document: DiagramDocument }) {
  const store = useEditorStore({
    document, permissions: { edit: true, save: true, export: true },
  })
  return (
    <EditorRoot store={store} locale="en">
      <section className="adl-editor" data-theme="light">
        <EditorToolbar />
        <div className="adl-editor-body">
          <EditorSurface />
          <EditorInspector />
        </div>
        <EditorOutline />
        <EditorJsonPanel />
      </section>
    </EditorRoot>
  )
}
```

A store captures its initial document; later host changes must use `replaceDocument` with the current revision. This explicitly resets history. Do not recreate the store on every keystroke.

## Keyboard and touch navigation

`EditorOutline` provides a collapsible native-button list of authored nodes, connections and groups. Enter/Space selects an entity; Shift adds or removes it without editing content. Synthetic activation bars are not listed.

Ordinary wheel input retains native page scrolling. Ctrl/Meta + wheel zooms around the cursor; the toolbar provides an alternative. Hold Space while the canvas itself is focused and drag to pan, or select the Pan tool. Two touch pointers pan and zoom around their midpoint; starting a pinch cancels any in-progress node drag instead of committing it. Navigation never enters document history.

## Transactions and identity

Use `createDocument(spec, { id, locale })` to materialize anonymous relation IDs. Explicit IDs never change; anonymous parallel identities follow authored order. `importDocument` accepts JSON text or plain data, validates before layout, and rejects unknown schema versions. Legacy band input without a type requires `allowLegacyBand: true`.

Every dispatch specifies `expectedRevision`. One failed command rejects the whole batch. Undo and redo restore content while incrementing revision. Selection, camera, draft JSON and gesture previews do not become document content. Invalid JSON leaves the last valid document visible.

Structured diagrams retain semantic ordering and band/lane membership. Their adapters do not advertise arbitrary XY movement. Free movement is available for graph, flowchart, state-machine and ER documents.

### Replacing bands and lanes

Pass a complete mapping to `getAdapter(type).editStructure`: every existing node must appear exactly once, either as an own key in `assignments` or in `removeNodeIds`. For label-only edits, pass the current assignments too. Band destinations are zero-based indexes in the resulting bands; lane destinations are IDs in the resulting lanes.

```ts
const updated = getAdapter('band').editStructure(document.spec, {
  type: 'bands.replace',
  bands: [{ title: 'Merged' }],
  assignments: { a: 0 },
  removeNodeIds: ['b'],
})
if (updated.ok) {
  store.dispatch({
    id: 'merge-bands', label: 'Merge bands',
    expectedRevision: document.revision,
    commands: [{ type: 'spec.replace', spec: updated.value, references: 'prune-references' }],
  })
}
```

The adapter leaves the original spec unchanged. Removed nodes and their dependent relations are pruned together; store dispatch integrates the result as one undoable edit. Invalid mappings report `structure.mapping.incomplete`, `structure.mapping.overlap`, `structure.mapping.duplicate`, or `reference.missing` for unknown node IDs. Destination validation uses the regular spec diagnostics. Previously accepted partial mappings must now explicitly include unchanged nodes.

## Canvas selection and resizing

Drag empty canvas space in Select mode to draw a selection rectangle; any positive overlap selects a node. Shift adds to the previous selection. Reverse drags and zoom are supported. Escape or pointer cancellation restores the previous selection. Selection does not create undo entries, dirty the document or appear in exports. In Pan mode, dragging the background still moves the camera.

A single unlocked node in a free-layout diagram exposes eight edge/corner resize handles. Drag it to preview a snapped size and release to commit one undoable transaction; Escape cancels. Each handle has a 44-screen-pixel target at every zoom. Focus it and use arrow keys for one-pixel resizing (Shift for 16 pixels), or use the inspector's width/height fields. Pointer resizing clamps sizes to 96×48 through 4096×4096. The opposite edge/corner stays fixed, including at the size limits; edges change only their own axis. Multi-node resizing remains pending. Structured diagrams retain their semantic geometry.

With two unlocked free-layout nodes selected, arrangement controls align their edges or centers to the selection bounds. Three or more nodes can be distributed with equal gaps, preserving the first and last positions on that axis. Arrangement preserves sizes, does not grid-round the resulting coordinates and commits one undo entry. A selection containing a locked node disables arrangement rather than moving only part of it.

## Clipboard

Copy/Paste keep a private in-memory fragment. Copy to clipboard/Paste from clipboard are explicit system-clipboard actions using versioned JSON fragments, not executable text. Browser support and permission are required; denial leaves the document unchanged and displays a diagnostic. Clipboard text is bounded to 1 MiB before JSON parsing, validated, and pasted with new IDs in one transaction. An asynchronous read is rejected if the document changed while permission was pending. Structured-type paste still requires the mapping workflow; it is not enabled by these controls.

## Export without touching the visible canvas

`exportDocument` returns bytes and a receipt; it does not click a download or write the clipboard. Call `downloadArtifact` or `copyArtifact` separately from a user gesture. JSON always contains source.

SVG and raster exports require WOFF2 bytes supplied in `fonts: { sans, mono }`. Resolve `@aesthc/diagram-lib/fonts/geist-sans.woff2` and `geist-mono.woff2` through your bundler's asset URL support and fetch them from your own origin. The exported SVG embeds the bytes. If you deliberately accept platform font substitution, specify `fontPolicy: 'fallback'`; the receipt includes a warning. No imported label or URL triggers font or icon fetching. Icons in `document.metadata.visuals` use bundled TheSVG artwork and generated Phosphor regular geometry, with explicit theme variants and scoped internal references. Icon license notices are retained as inert SVG metadata; headless imports do not load React.

Raster export needs browser Canvas and Image APIs. Scale is bounded and output is limited to 32 million pixels and 16384 pixels per side. JPEG rejects transparent backgrounds. WebP verifies the actual encoded MIME. Cancellation never reports a partial artifact as successful. Receipts currently have `verified: false`; basic geometry warnings are not a publish-quality certification.

## Persistence and conflicts

`createMemoryStorage()` is isolated by instance. `createLocalStorageAdapter(hostNamespace)` uses namespaced keys and Web Locks for cross-tab compare-and-swap. Without Web Locks it reports unavailable rather than pretending localStorage is atomic. Existing corrupt payloads are not overwritten automatically.

Autosave is opt-in through `createAutosave(store, adapter, { key, token })`. It listens only to commits, debounces 750 ms, serializes writes and stops on conflicts. A successful old snapshot does not mark newer content saved. Dispose autosave before disposing its store. Local storage is not backup; offer JSON download when storage fails.

## Studio

The separate `studio.html` entry consumes public package exports. It supports local import/save/load, opt-in autosave, node editing and dragging, undo/redo, JSON drafts, appearance controls and file export in both locales. It does not upload documents.

## Known limits of this implementation

The exhaustive spec remains the target. Advanced renderer parity, routing certification, viewer stories/lenses, standalone HTML, share cards, plugins, document compare, evidence verification and motion are not established by the basic editor tests. Do not infer their availability from the proposed contract file in the spec.
