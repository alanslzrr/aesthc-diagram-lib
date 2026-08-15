# Showcase site + layout polish — design

**Date:** 2026-08-15 · **Status:** approved for autonomous execution (user delegated iteration)

## Goal

Turn the library's presentation into a professional open-source main page and polish
the rendering of all seven diagram types. Requirements from the user:

1. Professional main page for the open-source project.
2. Real-time customization of the components, with export.
3. Every component gets a "view code" window with a copy button.
4. Keep the existing design system (alansalazar.dev language: hairline frames,
   mono uppercase micro-labels, Bodoni Moda display, Sora sans, Geist Mono,
   cobalt `#0fa8ff` / branch `#d6a55e`, light `#f4f7fb` / dark `#070707`).
5. The six newer layout engines (flowchart, sequence, state-machine, er,
   timeline, swimlane) render poorly and must be polished one by one.
6. Iterate autonomously with screenshots until the result is right.

## Architecture

### `site/` — Vite demo app (not published to npm)

- `pnpm-workspace.yaml` with `['.', 'site']`; site consumes the library
  **from source** via Vite alias (`@aesthc/diagram-lib` → `../src`) so layout
  fixes hot-reload instantly.
- Tailwind v4 via `@tailwindcss/vite`; site CSS declares the host theme
  contract from the README (light + `[data-theme='dark']`) and `@source`s the
  library `src/` so canvas utilities compile in the same pass (no cascade-layer
  wrapping needed inside the site).
- Fonts: Bodoni Moda + Sora + Geist Mono via Google Fonts `<link>`.

### Page structure (single scrolling page)

1. **Top bar** — project name, GitHub link, locale toggle (en/es), theme toggle.
2. **Hero** — mono label, Bodoni display heading with italic cobalt accent,
   intro, install command with copy button, badges (MIT · ESM · React ≥ 18 ·
   7 types · 0 runtime deps beyond icons/tooltip).
3. **Seven type sections** — numbered articles (01–07). Each panel keeps the
   showcase chrome (hairline frame, mono header, caption + legend footer) and
   adds a toolbar:
   - **Preview / Code tabs.** Code view shows the current spec as editable
     JSON (textarea overlaying a highlighted block) with live apply-on-valid +
     inline error, plus a read-only usage snippet. Both have copy buttons.
   - **Per-type knobs** rendered from a small config (e.g. flowchart
     `direction`, sequence activations on/off, timeline density) — real-time.
   - **Export**: download current SVG (serialized with resolved colors),
     copy spec JSON / registerDiagram snippet.
4. **Theme studio section** — live token editor for `--cobalt`, `--branch`,
   surfaces (`--background`, `--card`, `--border`, `--foreground`) with
   presets; edits apply to the whole page in real time; "copy theme CSS"
   exports the variables block from the README contract.
5. **Quick-start / footer** — install + minimal usage snippet with copy,
   links (GitHub, README sections, LICENSE), MIT note.

### Layout polish

Baseline screenshots of all seven panels (light + dark) drive a per-type
diagnosis; fixes go into `src/layouts/*` (spacing, label collisions, edge
routing, proportions) and, where content is at fault, `src/examples.ts`.
Band is the reference aesthetic and is expected to need no changes.

## Non-goals

- No router/MDX docs site, no Storybook, no npm publish changes.
- No new UI dependency (shadcn etc.); the page uses the library's own visual
  language with hand-rolled controls.
- The published package surface stays as-is (site is dev-only), except any
  genuine layout-engine fixes, which are the point.

## Validation

- Screenshot-driven iteration per panel (light/dark, desktop/mobile) via the
  browser preview.
- Fresh-eyes design-review agent pass at the end; findings applied.
- `pnpm test`, `pnpm typecheck`, `pnpm build` green; README updated
  (site dev instructions); work on branch `feat/showcase-site`.
