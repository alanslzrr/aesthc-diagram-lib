# Contributing

Thanks for taking the time to contribute. This project is a small, focused
SVG diagram library; keep changes scoped and documented.

## Setup

```bash
git clone https://github.com/alanslzrr/aesthc-diagram-lib.git
cd aesthc-diagram-lib
pnpm install --frozen-lockfile
pnpm build
pnpm --dir site dev
```

Requires `pnpm` 10 (see `packageManager` in `package.json`) and Node 22.14+ for development (see `.node-version`). The published package declares Node 20.19+.

The site consumes the published export map from **dist**, not source aliases.
After library edits, run `pnpm build` again; site-only edits hot-reload normally.

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

1. Review the pinned TheSVG revision in `licenses/TheSVG-NOTICES.md`, the asset metadata, licensing and brand guidelines. Do not assume the collection license covers every mark.
2. Add sanitized local geometry to `src/brand-icons/data.ts`; retain viewBox, colors and matching light/dark variants. Reject scripts, handlers, remote references, styles and foreignObject. Flatten fill-only styles into attributes.
3. Extend `BrandIconName` in `src/brand-icons/index.tsx`. For diagram visuals, extend `ThesvgNodeIconKey` in `src/types.ts` and the explicit mapping in `src/canvas/ArchitectureNodeIcon.tsx`; do not repurpose legacy `svgl` keys.
4. Record revision, source, attribution and per-asset guidelines in `licenses/TheSVG-NOTICES.md`; update `THIRD_PARTY_NOTICES.md` if needed. Preserve existing notices.
5. Add both-theme rendering/security tests in `tests/brand-icons.unit.spec.ts`, run schema/documentation generation, full build and `pnpm check`.

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

## Sources and generated outputs

| Edit this source | Generated outputs / command |
|---|---|
| `src/types.ts`, semantic validation | `schemas/*`, `src/validation/structural.js` — `pnpm schemas:generate` |
| `examples/specs.ts`, `site/src/lib/code.ts` | JSON/TSX examples and diagram field pages — `pnpm docs:generate` |
| `scripts/generate-docs.ts` (README/getting-started templates), `package.json` (`diagramRelease`) | README, getting-started and quick-start metadata — `pnpm docs:generate` |
| `docs/api/index.md` | Export inventory — `pnpm docs:generate`; checked against TypeScript exports |
| `src/*` | Tracked `dist/*` — `pnpm build` (include chunk additions/removals) |
| Live docs Markdown, docs renderer and styles | Static docs — `pnpm site:build` |

Do not edit generated output to bypass a drift check. Release availability metadata
is changed only after anonymous registry verification; a tag or passing build is not publication evidence.
