# Web design system

This contract governs the landing page, documentation and playground controls.
`site/src/design-system.css` is the shared source of sizing and typography tokens.
It does not rescale the document root, diagram coordinates or public package specs.

## Typography

- Self-hosted **Geist Sans** for all UI and headings; **Geist Mono** only for code/data.
- Root remains 16px; reading text is 15px, docs mobile reading is 16px.
- Hero: 32–40px, weight 550, line-height 1.15, tracking −0.025em. Maximum two lines at desktop.
- Docs title: 32px desktop / 28px mobile. Section headings: 24px; subsections: 20px.
- Controls/code: 13px; supporting labels: 12px. No all-caps button labels.
- Body leading: 1.65; long-form docs: 1.75. Article flow: 1.25em.
- Hero copy is a short product explanation, not a list of every capability.

## Layout and rhythm

- Four-pixel spacing grid: 4, 8, 12, 16, 20, 24, 32, 48, 64px.
- Header: 64px baseline; may grow to preserve usable mobile controls.
- Site width: 1180px; docs shell: 1440px (264px sidebar, 208px page index);
  article: 704px; hero: 640px.
- Dedicated playground: `site/playground.html` is an editable workspace backed by
  the public editor store (toolbar, inspector, outline, JSON panel, per-example
  sessions and reset). It must load every stylesheet it uses directly; direct entry
  can never depend on another route having loaded utilities or tokens.
- Hero: two-column grid on desktop (reading copy, CTAs and installation left;
  diagram preview right) with the supporting navigation below. The landing
  shows a compact gallery of layout thumbnails; the full spec/code panel is
  reserved for `?only=` and the playground is the editing surface.
- Showcases keep the layout's natural scale: scale down when needed, never
  upscale past the authored size, and link to the exact example in the playground.
- The playground has one global theme authority. `EditorRoot theme` overrides the
  effective view appearance for chrome, canvas, nodes and connections; the
  document keeps its own `presentation.theme` in JSON, and switching the host
  theme is not a document edit (no revision, undo entry or dirty state). The
  inspector's own theme select only renders when no override is supplied.
  Sessions are per example and preserve document, history, selection, camera and
  dirty state.
- Documentation UI follows the Vercel system: `#ffffff`/`#000000` surfaces,
  Vercel blue (`#0070f3` / `#3291ff`) for links and focus, Geist 600 headings,
  6px controls and fitted preview cards over a single masked dot backdrop. Documentation
  navigation groups pages by task (Start, Diagrams, Editor, Viewer,
  Export & sharing, Extending, Reference, Maintainers); Editor and Viewer guides
  are never nested behind the API reference.
- Installation block: at most 560px in the hero. Docs examples follow the article width.
- Sections: 48px vertical spacing; avoid empty oversized marketing spacing.
- Document reading scroll stays native. Only side panels and wide content own scroll areas.

## Motion

- Interactive states use CSS transitions with the named curves in
  `design-system.css` (`--ease-out`, `--ease-in-out`) and 120–220ms durations;
  no `transition: all`.
- Focal controls and rows acknowledge presses with `scale(0.96)`; tabs and
  toggles keep a static color cue so motion is never the only feedback.
- Theme flips suppress transitions for one frame so the swap snaps instead of
  crossfading every surface.

## Icons and controls

- UI and package-manager marks: **16px**. GitHub mark: **18px**.
- Icon dimensions are explicitly bounded by the owning control, never by a generic `svg` rule.
- Diagram SVGs and node visual geometry are excluded from UI icon rules.
- Control height: 36px; package-manager tabs: 44px; coarse-pointer theme targets: 44px.
- Corners: 4px small tabs, 6px controls, 8px panels. No general pill buttons.
- Theme selector is the sole pill/circle exception (system / light / dark).
- Colored brand artwork remains unmodified. Semantic actions retain the established outline icon language.
- Installation: tabs on the first row, straight 2px active underline, icon-only copy at the right.
  Command on the second row; `$` is decorative and is never copied.

## Color and surfaces

- Use existing light/dark theme tokens, not component-specific arbitrary palettes.
- Structural frames use `--border`; internal separators and quiet hairlines use
  the derived `--border-subtle`. Neutral surfaces stay flat: no decorative
  gradients or ornamental shadows.
- Cobalt identifies diagram main paths, links and focus; branch identifies the
  alternate path. Amber text uses `--branch-ink` for AA contrast on light.
- No decorative left stripes, gradients or glowing headline text.
- Backgrounds follow one contract: base surface → masked decorative dot layer →
  opaque diagram → controls. `.diagram-backdrop` owns the only dot layer per
  surface; the mask never wraps the SVG, captions or controls. The editable
  canvas paints its single grid across the whole viewport with camera phase.
- Structure tokens are separate from decoration: `--diagram-node-border` for
  node outlines, `--diagram-structure` for lifelines, lanes, ER separators and
  states. A panel hairline (`--border`) is never a diagram outline. Essential
  diagram strokes hold at least 3:1 over their adjacent surface; decorative
  dots do not.
- Node surfaces stay opaque and the grid paints below the confirmed geometry;
  opaque fills are not a substitute for layer order. Static previews frame
  useful bounds (`previewBounds`) instead of authored empty margins, and every
  host verifies the effective label size at the rendered width.
- Node surfaces stay opaque (dots cannot read through cards or tables) and keep
  aspect ratios intact. Secondary weight changes surface and ink, not opacity.
- Hover, focus, selected, copied and error states must remain distinguishable.

## Review gate

Verify loaded Geist (not only the CSS family name), viewport-sized measurements,
keyboard/focus, both themes/locales, no-JS docs and no page-level horizontal overflow.
Inspect screenshots before accepting visual baselines. Test icon/copy positions and
hero/installation size bounds so future changes cannot silently inflate the UI.

### Diagram action toolbar

Preview (eye), code (brackets) and share (connected nodes) are icon-only controls
with localized accessible names and hover titles. The one visible integration
label is **Copy prompt**. A single download glyph opens **Copy or download**:
Copy JSON, Copy SVG, Download JSON, Download SVG and Download PNG. Do not repeat
those formats as standalone toolbar buttons. Options close after selection;
Escape restores trigger focus, arrows/Home/End iterate, and outside clicks close.
Icons stay 16px; coarse-pointer targets are at least 44px.

### Architecture example content

Node titles name a responsibility (Order API, Document worker); sublabels name the
concrete service (Container Apps, Cloud Run). Never repeat a provider as both title
and sublabel. Edges show specific events, commands or artifacts and include a real
exception path. Detailed settlement, identity and idempotency assumptions belong
in descriptions/notes, not oversized edge pills. Reference designs must cite
provider documentation and must not be presented as deployed production systems.

### Palette source and reading overrides

`site/src/lib/palette.ts` defines the seven base light/dark tokens. Documentation
and playground styles consume generated `--palette-*` values. Theme Studio starts
from that base and scopes edits to its local SVG preview, never document controls.

| Token            | Light base | Dark base | Docs dark reading override |
| ---------------- | ---------- | --------- | -------------------------- |
| background       | #ffffff    | #000000   | none                       |
| foreground       | #0a0a0a    | #ededed   | none                       |
| card             | #fafafa    | #0a0a0a   | none                       |
| border           | #eaeaea    | #1f1f1f   | none                       |
| muted-foreground | #666666    | #a1a1a1   | none                       |
| cobalt           | #0070f3    | #3291ff   | none                       |
| branch           | #a66b21    | #d6a55e   | none                       |

Copied CSS exports base canvas tokens, not documentation reading overrides.
`pnpm docs:generate` regenerates palette CSS; do not edit the generated file.
