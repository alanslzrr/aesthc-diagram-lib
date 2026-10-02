# Migrating to 0.3.0

1. Registry state now matches across public entrypoints. Install the whole package;
   do not copy a single built entry file without its shared chunks.
2. Sequence edge IDs preserve message IDs. Other relations can declare `id`.
   Update integrations that assumed every edge ID was `from::to`. Endpoint tokens
   are escaped to avoid delimiter collisions; anonymous parallel IDs depend on order.
3. Import `DEFAULT_SHOWCASE_ENTRIES` from `/showcase`; `/showcase/entries` was never
   a public export and should not be used.
4. The playground edits strict JSON, not JavaScript expressions. Use quoted keys,
   remove comments and use the generated TSX view for application code.
5. Use `/validation` for untrusted data. Low-level typed layout and registry APIs
   do not automatically validate or sandbox arbitrary objects.
6. Set `--diagram-font-display` for canvas display fonts. This avoids the previous
   self-referencing display-font variable.
7. This release targets React 18.3/19 and Node 20.19+ consumers, with Node 22.14+
   for development. Validate your actual framework/bundler configuration.

Label-only cards without an icon now center their labels. Annotated cards without
an icon use normal inner padding instead of reserving an empty icon rail; cards
with icons retain the original alignment. No spec fields or interaction callbacks
change. Do not rely on the previous fixed text coordinates in custom overlays.

Pre-1.0 minor versions can contain documented breaking changes. Pin a version when
embedding documentation in an agent workflow and upgrade deliberately. We keep
published versions immutable; fixes use a new version, not replacement tarballs.

## Geist typography

The package stylesheet now supplies Geist Sans and Geist Mono and uses them as
its default font families. Existing specs and callbacks are unchanged. Set
`--diagram-font-sans`, `--diagram-font-display` and `--diagram-font-mono` to retain
a host application's own fonts. Ensure your bundler copies the stylesheet's
relative `fonts/*.woff2` assets. Standalone playground SVG/PNG exports use Geist.

The documentation now uses prerendered React pages and client navigation.
Existing routes, Markdown downloads and versioned documentation are preserved.
The shared theme preference accepts `system`, `light` or `dark`; an absent or
invalid preference follows the system. Existing explicit light/dark choices remain.

### Selected TheSVG brands

The optional `@aesthc/diagram-lib/icons` entrypoint exposes `BrandIcon`.
Architecture `nodeVisuals` accept `source: 'thesvg'` with the original brand keys
and `azure`; legacy `source: 'svgl'` mappings remain compatible. Artwork now comes
from a pinned TheSVG revision, so brand silhouettes may differ slightly. Specs,
layout geometry and callbacks are unchanged. Font and theme tokens still apply.

## Semantic issue paths

Validation issues now use the authored collection (`edges`, `messages`,
`transitions`, `relations`, `participants`, `states`, `entities` or `events`), not
normalized `/nodes` and `/relations` paths. Duplicate explicit IDs retain original
indices even after anonymous relations. Consumers matching exact paths should
update their field mapping; issue codes and success/result shapes are unchanged.

## Unreleased opt-in editor APIs

Existing seven-type `DiagramSpec` consumers do not need a migration. New editing
hosts use `/editor-core` documents and the separate `/editor` React entry; graph
documents are deliberately not accepted by the legacy layout dispatcher.
`createDocument` materializes relation IDs once. Persist the resulting document
instead of regenerating anonymous IDs after reordering. No registry is required.

Use the [editor guide](./editor.md) for composition, validation, export fonts,
local persistence and known incomplete milestones. Studio has its own HTML entry
and does not reinterpret existing playground `s=` links or overwrite its drafts.

## Canvas presentation additions (no breaking changes)

`DiagramCanvas` accepts three optional props and one new helper export:

- `showGrid` (default `true`) and `fit` (default `'natural'`) — see the
  [canvas contract](../api/index.md#presentation-framing).
- `view` plus `previewBounds(layout)` from `/canvas` to crop authored empty
  margins while keeping every node inside the frame.

The optional props preserve their own defaults, but this release also trims
shared layout geometry so compact examples stay legible on phones:

| Constant            | Before | Now | Observable effect                                 |
| ------------------- | ------ | --- | ------------------------------------------------- |
| `SWIMLANE_HEADER_W` | 140    | 118 | Swimlane columns start at `118 + padding`.        |
| `SWIMLANE_PAD`      | 24     | 8   | Smaller outer offsets; narrower layouts.          |
| Timeline `MARGIN_X` | 96     | 64  | One-event timelines shift their centre and width. |

Types and APIs are unchanged, but exact coordinates, exported bounds and visual
snapshots shift. Re-verify manual scenes and exports if you depend on them. The
longest shipped lane label (`ENGINEERING`, ~92px at 11.25px Geist Mono with
tracking) still fits the header; `tests/layout-geometry.unit.spec.ts` guards
that contract and the column/timeline spacing. Hosts that adopt
`view`/`fit="contain"` take over the legibility check at the rendered width.

## M2 additions (no breaking changes)

- `/viewer` + `/viewer.css`: read-only semantic viewer composition.
- `/editor-core`: `routeOrthogonal`, `createRendererRegistry`,
  `renderCustomNode`, `createLayoutProviderRegistry`, `runRegisteredLayout`
  and the existing document/store/scene APIs.
- `/export`: `exportDocumentHtml`, `cardSvg`, `exportCard`,
  `probeExportCapabilities` and the existing JSON/SVG/PNG/JPEG/WebP pipeline.
- `/persistence`: `encodeShareDocument` / `decodeShareDocument`; legacy `s=`
  share links remain readable and unchanged.
- The offline artifact is generated with `exportDocumentHtml` and the bundled
  runtime in `dist/standalone/`; it is not a published subpath.

These additions have not been published by this implementation task.

## 0.4.0 audit remediation (unreleased)

The 2026-10-02 audit remediation adds behavior-changing safety guarantees and
new optional fields. Existing documents and call sites keep working unless
noted.

### New optional field

- `DiagramGroup.visibility?: 'public' | 'private'`. It exists for the
  deployment profile's security-group rule. Older strict readers that reject
  unknown fields may reject documents containing it; update the reader before
  authoring the field. Documents that do not use it remain byte-compatible.

### Replacement and preview semantics

- `document.replace-content` now requires the same format/schema, document id
  and diagram type, and rejects foreign ids with `replacement.id-mismatch`,
  foreign types with `replacement.type-mismatch` and schema changes with
  `replacement.schema-mismatch`. Cross-type or cross-document moves must use
  the explicit import/conversion workflow.
- `scene.set` and `document.replace-content` preserve locked nodes, group
  membership and lock flags; unlock through `nodes.set-lock` in the same
  batch, or before the replacement, when you intend to edit locked geometry.
- `previewGesture(commands, { skipValidation: true })` only skips full
  validation for complete scene-only batches. Presentation, metadata, views,
  replacement and mixed batches are always fully validated, so an invalid
  preview can no longer replace the last-good draft.

### Comparison

- `compareDocuments` keeps its existing node/edge deltas and adds a
  `document` delta (caption, legend, metadata, groups, views, story, locale,
  extensions) plus explicit counts. Extension payloads are compared
  structurally by namespace and reported with unknown semantics.

### Evidence verification

- `TrustedVerifier.verify` receives `range: { startLine, endLine }` and
  `blobSha` when declared. Only a verifier that declares
  `contract: EVIDENCE_RANGE_CONTRACT` (`'evidence.range.v1'`) and matches the
  complete range can produce `verified`. A legacy file-only match keeps the
  truthful `declared` status with `scope: 'file'`. Update host verifiers to
  declare the contract and compare the supplied range.

### Renderers and portable exports

- `EditorRoot` and `DiagramViewer` accept an optional `registry` prop; without
  one, custom nodes remain unavailable placeholders in the interactive
  surfaces. `exportDocument` already accepted `renderers`; `exportDocumentHtml`,
  `cardSvg`/`exportCard` and `exportStoryWebm` now accept it too.
- Portable artifacts (SVG, raster, HTML, cards, WebM) fail with
  `renderer.unsupported`/`renderer.invalid`/`renderer.measure` instead of
  writing a placeholder into a successful artifact.
- HTML export applies the allowlisted metadata projection by default and
  accepts `metadata: 'all'`; `includeSource` still embeds the exact canonical
  document separately.
- The offline HTML CSP allows only the SHA-256 hash of the emitted runtime
  script plus documented inline styles.

### Deployment profiles

- Activation is authored: `metadata.engineeringProfile === 'deployment-ownership'`.
  An export option cannot disable it. Roles are read from
  `metadata.nodes[id].roles`; `'external'` exempts only the owner requirement.
  `'database'`/`'storage'` require `visibility: 'private'`; security-group
  groups require explicit `visibility: 'private'` and exactly one region
  ancestor; regions come from ancestor groups with `kind: 'region'`; and any
  region or security-group membership change on an edge requires non-empty
  `metadata.edges[id].crossing`.

### Site workflows

- The Playground is the primary editor, Studio is advanced tooling for the
  same document through a bounded handoff, and the Viewer stays read-only.
  Host theme and locale are shared across surfaces; document/export appearance
  remains part of the document.
- Editing tools, panels and export controls are shared instead of duplicated.
  Scripts that drove the old Studio inline export selects should use the
  shared export dialog controls.

The entry budgets in `scripts/check-budgets.mjs` were re-measured for the
editor entries, the landing and docs; see the comments there for the exact
graphs and headroom.
