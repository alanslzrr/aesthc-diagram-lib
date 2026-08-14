# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[0.2.1]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.2.1
[0.2.0]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.2.0
[0.1.0]: https://github.com/alanslzrr/aesthc-diagram-lib/releases/tag/v0.1.0
