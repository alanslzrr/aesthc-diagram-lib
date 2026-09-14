# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Release candidate: 0.3.0

- Refine the light palette with a blue-gray canvas, distinct node surfaces,
  stronger grid and connection contrast. Optional detail tokens preserve existing
  consumer defaults; the playground, copied CSS and SVG exports stay aligned.
  The dark palette is unchanged.

This version is prepared locally, not yet verified on the public npm registry.

- Add generated JSON Schemas and the dependency-free `/validation` entrypoint.
- Use explicit relation IDs and collision-safe anonymous parallel identities;
  preserve every relation during connected-path highlighting.
- Replace executable editor input with validated JSON and retain the last valid
  preview. Version shared links with locale and bounded decoding.
- Generate seven complete interactive examples, API/type documentation, a static
  integration guide for agents, Markdown endpoints and `llms.txt` indexes.
- Consume package exports in the playground and test installed tarballs with
  React 18/19, TypeScript NodeNext/Bundler, Vite and Next.js.
- Add private security/conduct contacts, contribution templates, license notices,
  browser accessibility checks and a gated OIDC release workflow.
- Improve mobile controls, keyboard-accessible code regions, text descriptions,
  theme previews and error reporting for copy/download actions.

Migration: editor/share data is JSON, not executable JavaScript. Sequence relation
IDs now match authored message IDs. See [migration notes](docs/guides/migration.md).


### Fixed

- Registry state is now shared between the root, registry, examples and showcase
  package entrypoints. Previously, independent bundles duplicated the registry
  and could report an unknown diagram for registrations made through another import.
- Full builds remove obsolete distribution chunks before generating JS, types and
  CSS, preventing stale files from accumulating in release artifacts.

### Added

- An isolated tarball consumer test verifies public imports, registry identity,
  showcase rendering, client directives and published TypeScript declarations.

- Site round 2 (inspired by editorial diagram tooling): **PNG export (2×)**
  rasterized from the standalone SVG, **share links** (spec
  deflate-compressed into the URL hash, hydrating the exact diagram on
  open), **reveal-on-scroll motion** (edges fade, nodes rise with a
  stagger; fully static under `prefers-reduced-motion`), a feature grid in
  the hero, and **self-hosted latin fonts** (no external requests; the SVG
  exporter inlines them so downloads open with the real typography
  anywhere). A dev-only Vite endpoint regenerates the README gallery
  (`docs/diagrams/*.svg`) from real playground exports.
- State machine: the `final` marker is a concentric ring on the pill's
  right edge instead of a dot over the label text.

- `site/`: an interactive open-source showcase page (Vite + Tailwind v4,
  deployed to GitHub Pages) with a live TS-flavoured spec editor per diagram,
  per-type knobs, standalone SVG export (copy + download), a theme studio
  with presets that restyles every canvas in real time, and bilingual
  (en/es) page copy driven by the library's own localization model.
- `PlacedEdge.arrowEnd` / `PlacedEdge.strokeWidth`: layouts can now request a
  chevron arrowhead (rendered with the continuation markers) and a per-edge
  stroke width. Sequence messages, state transitions, swimlane handoffs, the
  timeline spine and flowchart feedback/skip lanes use arrowheads.

### Changed

- Every layout now reports an **honest canvas width** derived from its
  content, and the canvas caps its rendered size at 1 unit = 1px (centred in
  the panel) instead of stretching small artboards to a fixed 1680u frame.
- **Flowchart**: `top-down` renders levels as stacked rows (the previous
  implementation inverted the axes and degenerated into one long strip),
  back edges detected by a DFS are excluded from levelling and routed on an
  outer feedback lane, and level-skipping edges travel a side lane instead of
  crossing intermediate cards.
- **State machine**: states sit on a compact ellipse (roughly half the old
  ring's canvas), transitions are trimmed at the pill borders — outward arcs
  between ring neighbours, gentle inward chords across — and labels sit at
  the true curve midpoint.
- **ER**: grid rows size to the tallest table in the row (previously a fixed
  240u pitch), and relations route orthogonally through the grid corridors
  with rounded corners instead of drawing straight lines across tables.
- **Sequence**: participant headers use the slim card height (labels no
  longer overflow the card), messages carry arrowheads, and activation bars
  span from the opening message to the participant's next reply.
- **Swimlane**: nodes advance through global topological columns so the flow
  reads left-to-right across lanes; cells that stack grow their lane.
- **Timeline**: the canvas hugs the content, the spine overhangs the first
  and last events with a direction arrow, and below-spine event text keeps
  the connector clear of every line.
- The dot-grid fade keeps a subtle floor at the canvas bottom instead of
  fading to nothing, and ER key badges are typographic (`pk`/`fk`) rather
  than emoji.

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

[0.2.2]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.2.2
[0.2.1]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.2.1
[0.2.0]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.2.0
[0.1.0]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.1.0
