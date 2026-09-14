# Contributing

Thanks for taking the time to contribute. This project is a small, focused
SVG diagram library; keep changes scoped and documented.

## Setup

```bash
pnpm install --frozen-lockfile
```

Requires `pnpm` 10 (see `packageManager` in `package.json`) and Node 22.14+ for development (see `.node-version`). The published package declares Node 20.19+.

## Scripts

```bash
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
pnpm build        # rebuild all ESM entries, shared chunks, declarations and CSS
pnpm test:package # build, install the tarball outside the workspace and test public imports
pnpm build:css    # regenerate dist/styles.css (Tailwind + layer wrap)
```

### Testing the distributed package

`pnpm test:package` creates a temporary consumer outside this workspace, installs
the generated npm tarball and tests registry sharing, showcase rendering, public
exports, client directives and declaration resolution in NodeNext and Bundler
mode. It also imports the pure layout graph with React's server condition.

This check requires npm and registry access to install dependencies. Dependency
lifecycle scripts are disabled, and the temporary directory is removed even when
a test fails. React and compiler versions match those installed from the workspace
lockfile; transitive consumer dependencies still resolve through npm. This smoke
test is not yet a locked multi-version compatibility matrix or a browser test.

After an existing `pnpm build`, run `node scripts/test-package.mjs` to avoid
building twice, as CI does. Do not substitute workspace aliases for tarball imports:
source tests cannot detect duplicated module state between built entrypoints.

## How the compiled styles work

`src/styles.css` is the Tailwind entry (utilities only). `pnpm build:css`
compiles it and then runs `scripts/wrap-layer.mjs`, which:

1. wraps all Tailwind output inside `@layer diagram-lib { … }`, and
2. appends `src/icon-styles.css` (the `.adl-icon-*` dark/light rules)
   **outside** the layer with `!important` on hidden states.

Never edit `dist/` by hand — it is generated. The full build cleans its output
before generating JS, declarations and CSS. Shared ESM chunks keep one registry
per package installation; their filenames can change when source changes. Include
new chunks and remove obsolete ones in the same change. CI runs the full build and
rejects modified, deleted or untracked output. A PR that touches canvas classes
must include the regenerated stylesheet.

## Adding a diagram type

1. Add the spec to `src/types.ts` (`XDiagramSpec`) and extend `DiagramSpec`.
2. Create `src/layouts/x.ts` returning a `DiagramLayout`.
3. Register the layout in `src/layouts/index.ts`.
4. Add a node shape to `DiagramNodeShape` and render it in
   `src/canvas/DiagramCanvas.tsx` if needed.
5. Add an example in `src/examples.ts` and tests in `tests/`.

## Adding a brand icon

1. Drop the SVG component in `src/svgs/`.
2. Extend `SvglNodeIconKey` in `src/types.ts`.
3. Map it in `src/canvas/ArchitectureNodeIcon.tsx`.

## Commit conventions

- Use [Conventional Commits](https://www.conventionalcommits.org/):
  `feat:`, `fix:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, `docs:`,
  `chore:`.
- Describe the technical change precisely; avoid generic wording.
- Keep each commit limited to one responsibility.

## Documentation and checks

Run `pnpm schemas:generate` after changing the spec types. Run
`pnpm docs:generate` after changing canonical examples or package version.
Generated files must stay synchronized; CI runs both drift checks.

`pnpm check` runs lint, formatting, generated-contract checks, typechecking,
unit tests, installed-package tests, site typechecking/build and size budgets.
ESLint rejects executable-data patterns and unused declarations; TypeScript
handles type correctness and Prettier handles formatting.

Install browsers with `pnpm exec playwright install`, then run `pnpm test:e2e`.
`pnpm test:frameworks` builds real Vite and Next.js consumers from the tarball.
Visual comparisons are separate: `pnpm test:visual`. Review baseline differences;
never approve a new screenshot merely to make a test green. Browser downloads
require network access. Report unavailable checks rather than silently skipping.

The documentation website is generated from Markdown by `pnpm docs:build` after
building the playground. `pnpm site:build` performs both. Keep the base path in
mind when adding links. Human documentation is English; the playground is en/es.

## Releasing

Follow [the release runbook](docs/maintainers/releasing.md). Do not publish just
because a local build passes: verify the reviewed commit, tag/version, tarball,
public authorization, npm authentication, CI matrix and matching documentation.
Never move an existing tag or overwrite an npm version.
