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
  EditorRoot,
  EditorToolbar,
  EditorSurface,
  EditorInspector,
  EditorJsonPanel,
  EditorOutline,
  EditorStatus,
  useEditorStore,
} from '@aesthc/diagram-lib/editor'
import '@aesthc/diagram-lib/editor.css'

export function Editor({ document }: { document: DiagramDocument }) {
  const store = useEditorStore({
    document,
    permissions: { edit: true, save: true, export: true },
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

The editor is composable by slots: `EditorSurface` is the only required interactive component.
Place `EditorToolbar`, `EditorInspector`, `EditorOutline`, `EditorJsonPanel` and `EditorStatus`
where the layout needs them, or omit any of them — the surface and store work without chrome.
`EditorStatus` renders the dirty/saved state as a live region and is embedded in the toolbar by
default, so rendering it twice is unnecessary. Custom chrome can read the same slices through
`useEditorSelector`, so hosts do not need boolean props to configure the built-in panels.

A store captures its initial document; later host changes must use `replaceDocument` with the current revision. This explicitly resets history. Do not recreate the store on every keystroke.

## Keyboard and touch navigation

The document panels present the authored nodes, connections and groups in an `Outline` tab (no disclosure triangle), with the JSON editor and the connections list in sibling tabs. Enter/Space selects an entity; Shift adds or removes it without editing content. Synthetic activation bars are not listed.

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
    id: 'merge-bands',
    label: 'Merge bands',
    expectedRevision: document.revision,
    commands: [{ type: 'spec.replace', spec: updated.value, references: 'prune-references' }],
  })
}
```

The adapter leaves the original spec unchanged. Removed nodes and their dependent relations are pruned together; store dispatch integrates the result as one undoable edit. Invalid mappings report `structure.mapping.incomplete`, `structure.mapping.overlap`, `structure.mapping.duplicate`, or `reference.missing` for unknown node IDs. Destination validation uses the regular spec diagnostics. Previously accepted partial mappings must now explicitly include unchanged nodes.

## Canvas selection and resizing

Drag empty canvas space in Select mode to draw a selection rectangle; any positive overlap selects a node. Shift adds to the previous selection. Reverse drags and zoom are supported. Escape or pointer cancellation restores the previous selection. Selection does not create undo entries, dirty the document or appear in exports. In Pan mode, dragging the background still moves the camera.

A single unlocked node in a free-layout diagram exposes eight edge/corner resize handles. Drag it to preview a snapped size and release to commit one undoable transaction; Escape cancels. Handle targets stay 44 screen pixels when there is room and clamp to a fraction of the node at low zoom, so a handle never covers the card body and dragging a selected card still moves it. Focus it and use arrow keys for one-pixel resizing (Shift for 16 pixels), or use the inspector's width/height fields. Pointer resizing clamps sizes to 96×48 through 4096×4096. The opposite edge/corner stays fixed, including at the size limits; edges change only their own axis. Multi-node resizing from one anchored handle is supported and covered by the studio suite. Structured diagrams retain their semantic geometry.

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

## M2 surfaces

The viewer (finder, inspector, route/reach with receipt invalidation), lenses,
group collapse with original-ID proxies, minimap, finite stories, presentation,
bounded shares, 1200x630 cards, the self-contained offline HTML artifact and the
per-instance renderer/provider registries are implemented and documented in the
[viewer guide](./viewer.md), the [extending guide](./extending.md) and the
[share/export guide](./share-export.md).

## Known limits of this implementation

Document compare, evidence verification, deployment profiles and finite WebM
motion export are implemented and covered by unit and browser tests. Cross-browser
certification runs in CI with the pinned browsers; a local Chrome is complementary
evidence, not a replacement. Accessibility acceptance relies on the automated axe,
keyboard, reflow and browser-matrix gates; it does not include a person-recorded
screen-reader review. The reference-runner performance protocol (long tasks,
memory) is certified in CI.

## Shared configuration

Playground and Studio expose **Configure document** over the same public store
commands. Document edits (caption/legend), layout (padding, text scale, grid
spacing/snap/visibility, edge style), both palette channel sets, and selected
node/edge metadata are submitted as one atomic transaction. The selection pane
also exposes node kind and description where the type supports them; ports,
routes, ER fields, participants and lanes remain in the contextual inspector.

Opening configuration captures the current revision. An intervening edit makes
Apply reject with `revision.stale`; the form remains open. Invalid values also
preserve the form and last valid canvas. Cancel changes nothing. One Undo
reverses Apply. Editing a palette does not change the global host theme.

## Advanced authoring

| Capability                           | Authoring entry point                                                                             | State ownership                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Named views and story steps          | API-only: `views.set`; compilable example `examples/editor-authoring.tsx`                         | Canonical document; revision checked, undoable                      |
| Roles/tags used by lenses            | Configure document → Selection                                                                    | Canonical metadata                                                  |
| Active lens/filter                   | Viewer controls / `ViewerState` integration                                                       | Transient; does not alter topology                                  |
| Collapsed groups                     | Viewer controls / viewer state                                                                    | Transient; original IDs remain queryable                            |
| Trace input                          | API-only: `createTracePlayer` with validated route edge IDs                                       | Finite playback; never invents a relation                           |
| Comparison inputs                    | API-only: `compareDocuments(before, after)` and `Comparison`                                      | Read-only, not a merge                                              |
| Evidence references and verification | API-only: `metadata.set`, `declaredEvidence`, `verifyEvidence` with a host-owned trusted verifier | Declared references are canonical; verification receipt is separate |

See [Viewer](./viewer.md) for playback and query contracts, and
[Extending](./extending.md) for trusted instance registries. Advanced authoring
does not execute code embedded in a document. Evidence verification never
silently gains filesystem or network access.

## Export cancellation diagnostics

Font readiness, SVG image loading, canvas encoding and blob reading have a
10-second bound per operation. Cancellation returns `operation.aborted`; a
stalled operation returns `export.timeout`. Raster object URLs, image handlers
and canvas storage are released on either path. Browser operations that cannot
be interrupted natively may finish later, but their callbacks cannot complete
or mutate the canceled export.
