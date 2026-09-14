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
- Site width: 1180px; docs shell: 1280px; article: 704px; hero: 640px.
- Installation block: at most 560px in the hero. Docs examples follow the article width.
- Sections: 48px vertical spacing; avoid empty oversized marketing spacing.
- Document reading scroll stays native. Only side panels and wide content own scroll areas.

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
- Neutral surfaces and hairline borders; cobalt identifies diagram main paths and focus.
- No decorative left stripes, gradients or glowing headline text.
- Node surfaces stay opaque where required to mask the dot grid. Keep aspect ratios intact.
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
