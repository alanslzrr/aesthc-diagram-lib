# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Audit remediation (2026-10-02)

Fixed the full-scope audit findings. Highlights:

- **Editor contracts:** replacement commands (`scene.set`, `document.replace-content`) preserve locked nodes, group locks and lock transitions and reject foreign id/type/schema replacements; the optimized `skipValidation` preview path is limited to fully delta-validated scene batches; conversion confirmations bind to their source document and revision; save-as switches an explicit active storage key, token and autosave ownership atomically; the playground hands its current document to Studio through a bounded local record and guards dirty work and unapplied JSON buffers.
- **Exports:** portable HTML applies one allowlisted metadata projection with explicit `metadata:'all'`, carries the effective theme into the standalone runtime and allows only the SHA-256 hash of the emitted runtime script; cards reject invalid padding; the WebM lifecycle always settles and releases its tracks; the export menu is pointer-safe on WebKit.
- **Profiles and renderers:** the deployment profile activates from `metadata.engineeringProfile` (external exempts owner only, database/storage and security groups require explicit privacy, regions resolve through ancestor groups, boundary crossings require metadata); optional `registry` props on `EditorRoot`/`DiagramViewer` plus portable-selector failures replace placeholder exports; one effective theme reaches custom nodes.
- **Library contracts:** `compareDocuments` reports complete document-level deltas (metadata, groups, views, story, locale, extensions); evidence verification requires the declared range under `evidence.range.v1`; registered layout providers receive an isolated snapshot and honor pre-abort/midflight cancellation; share reads settle against a real deadline.
- **Site:** panel tabs are instance-scoped and normalize on document-type changes; Apply JSON surfaces commit-time conflicts; deleting an occupied lane asks for an explicit policy; async imports are owned by request and revision; filtered landing links resolve; host theme and locale are shared across landing, docs, playground, Studio and Viewer; theme tokens, copied CSS and docs share one contract; the export workflow and movement model are shared and capability-aware; docs previews and the mobile header hold their legibility bounds.
- **Tests:** WebKit grid correlation measures CSS pixels, shortcut tests isolate browser defaults, and the cross-engine matrix (Chromium, mobile Chromium, WebKit, mobile WebKit) passes. Known gap: the local long-task budget (`F33`) still reports one task over 100 ms on the development machine; the GitHub Actions `frame-budget` job is the reference gate.

### Added

- Dedicated `/playground.html` editable workspace backed by the public editor store: one session per example (history, dirty baseline, selection and drafts survive switching), visual selection and movement, label editing, connections, undo/redo, contextual inspector, JSON panel, confirmed JSON import/export and a host theme control separate from the document appearance.
- Documentation navigation grouped by task (Start, Diagrams, Editor, Viewer, Export & sharing, Extending, Reference, Maintainers) with direct playground and studio links and a Copy Markdown page action.

### Changed

- `DiagramCanvas` gained optional `showGrid`, `fit` and `view` presentation props and `/canvas` exports `previewBounds`; the API page and migration guide document the defaults, scope and host legibility responsibility.

- Rebuilt the landing composition: two-column hero (copy, primary/secondary CTAs, installation) with the diagram preview beside it, a compact “Seven layouts” gallery of thumbnail cards, and the full spec/code panels reserved for `?only=`. Presentation assets (hero previews, README gallery, OG image) regenerated with the Vercel palette.
- Adopted the Vercel design system across the site: white/black surfaces, Vercel blue (`#0070f3` / `#3291ff`) for links and focus, Geist 600 headings, six-pixel controls; diagram chrome no longer uses decorative mono labels.
- Replaced the documentation UI with the Vercel system: monochrome surfaces, task-grouped navigation, page actions under the title and fitted preview cards over a single masked dot backdrop.
- Landing showcases render at the layout's natural scale as a static presentation: wider layouts crop at the panel edge with a visual fade and `inert`, and the “Open in playground” call to action opens the interactive editor. The gallery now shows a curated, readable fixture per layout instead of a squeezed full example.
- Playground toolbar is one compact working row: grouped, intrinsic-width controls that wrap instead of shrinking into each other, an indivisible tabular zoom value, a separate status slot and an explicit “More actions” menu for less frequent editing commands.
- One global theme authority in the playground: `EditorRoot theme` overrides the effective appearance for chrome, canvas, nodes and connections, reaches already-open and imported documents, and never touches JSON, revision, undo or dirty state. The inspector’s document theme select is absent while the override is active.
- The editor canvas paints one viewport-continuous dot grid: it covers every corner at any pan, zoom or document size, follows the camera phase, reduces visual density at extreme zoom-out without touching document snap, and disappears entirely with “Show grid”; export rendering keeps its own document-bounds grid policy.
- Structured layouts drag by editing their authored structure: band and swimlane reassignment plus order, sequence participant order and timeline event order, each previewed live and committed as one undo entry instead of converting the document to a graph.
- Documentation navigation is authored with the pinned Heyo Docs config builder (`@heyo-sh/heyo-docs@3.3.0`, MIT); see `docs/maintainers/heyo-integration.md` for the reuse map and the runtime limitations in this static stack.
- The `/docs` shell is now the real Heyo Docs runtime: `DocsApp` resolves pages, previous/next navigation, the table of contents and the search slot, while a site-owned theme (`site/src/docs/shell.tsx`) preserves the Vercel/Geist shell, previews, Markdown mirrors, versioned snapshots and the static `page.json` client navigation. The docs entry graph gets a reviewed 240 KiB gzip ceiling measured from the mounted runtime.
- Reviewed transfer budget: `playground.html` and `studio.html` get a documented 180 KiB JavaScript ceiling because they embed the full editor; every reader-facing entry stays at 175 KiB.

### Fixed

- The viewer component now consumes the host palette at `.adl-viewer` itself, so the canvas, text and controls match the shell instead of keeping the package's previous blue-grey values; hosts without an override keep the package defaults.
- The editor grid no longer applies a second phase on top of the camera transform: dots and geometry move together during pan at any zoom. Resize handle targets clamp to a fraction of the node at low zoom so selecting a card no longer turns its centre into a resize gesture.
- Diagram geometry constants changed with the compact examples: `SWIMLANE_HEADER_W` 140→118, `SWIMLANE_PAD` 24→8 and the timeline `MARGIN_X` 96→64; migration notes list the observable coordinate effects and unit tests guard long lane labels and spacing.

- The editor's viewport grid now paints below the confirmed geometry (it moved into the persistent baseline layer), so opaque cards, tables and lanes never show dots on top; a pixel regression covers the card interior, the empty canvas, the gesture preview and commit/undo in both themes.
- Documentation examples are compact enough to stay legible on phones: useful-bounds framing (`previewBounds` + the new `DiagramCanvas view` prop) crops authored empty margins, and the minimal specs and gallery fixtures were reduced where two cards cannot fit a 390px viewport. The gallery asserts an effective main-label size of at least 10px at 390/768/1280/1718 and the docs previews keep their 11px minimum.
- The viewer entry loads the shared Geist fonts and Vercel tokens, resets the native body margin and paints its own phase-synced viewport backdrop; the document SVG in the interactive surface no longer contains the bounded artboard background or grid, while exports keep them.
- Compact editor status uses a hollow ring when clean and a filled disc when dirty (shape, not only colour) and the affected tests assert the `role=status` name and the observable dirty state.
- Removed the unused legacy `Disclosure` component and its styles.

- Preserve the camera (x, y, zoom) when switching examples: the editor only auto-fits on a session's first open and keeps the restored camera on later mounts; Fit continues to work.
- Preserve per-example editing sessions (history and dirty state included) when switching examples; `Reset example` asks for confirmation before discarding a restored draft.
- Capture the import destination and revision before reading the file, reject stale imports after an example switch, check the commit result and never promise an undo the history reset cannot provide.
- Load the shared utility stylesheet on direct playground entry so controls no longer fall back to browser defaults.
- Center the viewer camera in its canvas and move collapse proxy overlays with the same transform.
- Scale the minimap SVG inside its frame and derive the viewport rectangle from the visible world size.
- Re-fit the editor camera on surface resize while the camera is untouched, so stacked mobile layouts stay centered.
- Diagram surfaces now paint exactly one decorative dot layer. The gallery and documentation previews disable the SVG document grid (`DiagramCanvas showGrid`) and use a shared `.diagram-backdrop` layer whose mask applies only to the dots, never to nodes, edges, captions or controls; the cropped landing showcase hints the crop with an overlay instead of masking the SVG.
- Semantic structure no longer competes with decoration: `--diagram-node-border` and `--diagram-structure` are separate tokens from the panel hairline, node fills are opaque (dots cannot read through cards or tables), and node/lifeline/lane/ER/state strokes hold at least 3:1 contrast over their surface in both themes, in the CSS canvas and in the editor renderer.
- Documentation previews fit proportionally: the forced SVG `min-width` and container `mask-image`/`max-height` are gone, so swimlane and sequence previews no longer scroll horizontally or amputate nodes at 390/768/1280px.
- Connection and continuation labels are centered on their pills (`text-anchor="middle"`), so long labels such as `payment.succeeded` no longer overflow the capsule in the editor, exports or both locales.
- Thumbnail legibility: the gallery fixtures are smaller per layout with per-type framing (wide ring/lane layouts take the full row) and non-scaling strokes, keeping every main label at 10px or more at the rendered card size.
- The generated diagram pages distinguish the render-only `DiagramCanvas` from the opt-in `@aesthc/diagram-lib/editor`, and the Heyo integration document records the SSR feasibility spike plus the remaining shell work.

## [0.3.0] - 2026-09-26

First published to the public npm registry on 2026-09-26; the automated
acceptance evidence is recorded in the
[execution report](docs/specs/editable-canvas/execution/README.md#cierre-de-aceptación-2026-09-26).

### Added

- Opt-in semantic viewer (`/viewer` + `/viewer.css`): deterministic finder, inspector with exact parallel relation IDs, route/reach highlight with revision-bound receipts, lenses, group collapse with original-ID proxies, minimap, finite stories with a single motion owner, reduced-motion static navigation and fullscreen fallback.
- Bounded sharing (`d=` documents, legacy `s=` links), 1200x630 context cards with exact-query receipts, real export-format probing and self-contained offline HTML artifacts (CSP, inline fonts, no-JS fallback, explicit source opt-in).
- Per-instance custom node renderer registry, registered asynchronous layout providers with latest-wins isolation, and a bounded deterministic orthogonal A* router.
- Exact Before/Delta/After document comparison (ID-matched, no inferred renames), declared-versus-verified evidence with a trusted verifier, an opt-in deployment profile that fails by exact fact, and finite WebM story export with strict capability gating and resource cleanup.
- Generated schemas, structural/semantic validation, complete tested examples and agent integration guides.
- Local TheSVG brand icons, explicit node visuals and service-level architecture examples with localized notes and references; legacy mappings/constants remain compatible.
- Validated JSON playground, bounded locale-aware shared links, standalone SVG/PNG exports and keyboard-accessible action controls.
- Prerendered React documentation, Markdown/search/downloads, package-consumer and framework checks, size budgets and authorized OIDC release preparation.

### Changed

- Use self-hosted Geist Sans/Mono throughout package defaults, site and exports while preserving host font overrides.
- Share compact design-system sizing, native reading scroll, accessible controls and opaque documentation node surfaces.
- Improve per-layout routing and canvas bounds without rescaling SVG aspect ratios.

### Fixed

- Share registry state across distribution entrypoints and remove obsolete chunks on full builds.
- Preserve explicit sequence/parallel relation identities; anonymous parallel identities follow authored order.
- Correct label-only node alignment and ER field overlap.
- Meet AA contrast in the light viewer chrome and repair ARIA listbox semantics in the viewer finder and comparison surfaces.

Migration: editor/share input is JSON, not executable JavaScript. See
[migration notes](docs/guides/migration.md) for identity, styles and import guidance.

## [0.2.2] - 2026-08-14

### Changed

- Added the optional `--diagram-node-border` theme token for host-controlled
  node outline contrast without coupling the canvas to a global border value.
- Increased secondary node outline presence in light themes while preserving the
  existing dark-theme opacity treatment.

## [0.2.1] - 2026-08-14

### Fixed

- Marked `dist/styles.css` as a package side effect so production bundlers
  retain the imported diagram canvas stylesheet.

## [0.2.0] - 2026-08-14

### Changed

- Distribution: the package is now published as **compiled ESM + `.d.ts`**
  (built with `tsup`) instead of raw TSX source. `main`/`module`/`types` and
  every `exports` subpath point at `dist/`.
- Consumers no longer need `transpilePackages`; any bundler that supports ESM
  can consume the package. (The previous TSX-source distribution required a
  transpiling consumer and broke Turbopack's PostCSS loader on Linux CI when
  combined with `transpilePackages`.)
- `'use client'` is re-injected into the `canvas` and `showcase` entries so
  Next.js still treats them as Client Components.
- CI now builds the package (ESM + d.ts + styles) and fails if `dist/` drifts.

### Fixed

- PostCSS/Turbopack incompatibility when the package source was consumed via
  `transpilePackages` (see Changed above).

## [0.1.0] - 2026-08-14

### Added

- Seven diagram types rendered by one SVG canvas: `band`, `flowchart`,
  `sequence`, `state-machine`, `er`, `timeline` and `swimlane`.
- Declarative, localized specs (`en` / `es`) that share a single topology
  contract (node/edge ids must match across locales).
- Computed geometry: every layout derives pixel coordinates and SVG paths
  from the spec — no hand-authored `x`/`y`, no DOM measurement.
- Global registry (`registerDiagram` / `getDiagram`) with tree-shakeable
  subpath exports (`/canvas`, `/layouts`, `/layouts/band`, `/showcase`, …).
- `DiagramCanvas` visual language: dot grid, hairline cards, bezier edges
  with longitudinal gradients, edge pills, decision pills, off-canvas
  continuations and glass tooltips.
- Theme-agnostic compiled styles wrapped in `@layer diagram-lib` that
  reference host CSS variables (`--foreground`, `--background`, `--border`,
  `--card`, `--cobalt`, `--branch`).
- `DiagramShowcase` page component plus `DEFAULT_SHOWCASE_ENTRIES`.
- Dark/light icon switching via library-scoped `.adl-icon-*` rules.
- Test suite (27 tests) covering the registry, every layout inside its
  canvas, per-type invariants, SSR rendering, the showcase, and the
  compiled-stylesheet cascade contract.

### Fixed

- Compiled utilities are wrapped in `@layer diagram-lib` so a host app's
  responsive utilities (`.sm:flex`, …) always win over shared utility names
  such as `.hidden`.
- Icon visibility rules are isolated and `!important`-scoped so a host
  `svg { display: block }` reset can never resurrect the hidden variant.

### Distribution

- MIT licensed.
- Published as source (TSX + compiled CSS); consumers transpile the package
  in place (Next.js: `transpilePackages`). A JS + `.d.ts` build is a
  deliberate future improvement, not a current blocker.

[0.3.0]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.3.0
[0.2.2]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.2.2
[0.2.1]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.2.1
[0.2.0]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.2.0
[0.1.0]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.1.0
