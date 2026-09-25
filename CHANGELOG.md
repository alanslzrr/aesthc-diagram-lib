# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Release candidate: 0.3.0

Prepared for review; public npm availability has not yet been verified.

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

[0.2.2]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.2.2
[0.2.1]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.2.1
[0.2.0]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.2.0
[0.1.0]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.1.0
