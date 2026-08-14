# Contributing

Thanks for taking the time to contribute. This project is a small, focused
SVG diagram library; keep changes scoped and documented.

## Setup

```bash
pnpm install
```

Requires `pnpm` 10 (see `packageManager` in `package.json`) and Node 20+.

## Scripts

```bash
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
pnpm build:css    # regenerate dist/styles.css (Tailwind + layer wrap)
```

## How the compiled styles work

`src/styles.css` is the Tailwind entry (utilities only). `pnpm build:css`
compiles it and then runs `scripts/wrap-layer.mjs`, which:

1. wraps all Tailwind output inside `@layer diagram-lib { … }`, and
2. appends `src/icon-styles.css` (the `.adl-icon-*` dark/light rules)
   **outside** the layer with `!important` on hidden states.

Never edit `dist/styles.css` by hand — it is generated. The CI pipeline runs
`build:css` and fails if `dist/` changes, so a PR that touches canvas classes
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

## Releasing

1. Update `CHANGELOG.md` (move `[Unreleased]` into a new version).
2. Bump `version` in `package.json`.
3. Tag and release: `git tag vX.Y.Z && git push origin vX.Y.Z`, then
   `gh release create vX.Y.Z --generate-notes`.
