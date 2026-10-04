# Styles and theming

Import `@aesthc/diagram-lib/styles.css` once. It contains generated canvas utilities
inside `@layer diagram-lib`, without a global reset. Tailwind is a build dependency
of this repository, not a requirement in your application.

<!-- theme-snippet:start -->
```css
:root {
  color-scheme: light;
  --background: #ffffff;
  --foreground: #0a0a0a;
  --card: #fafafa;
  --muted: #f2f2f2;
  --muted-foreground: #666666;
  --border: #eaeaea;
  --border-subtle: color-mix(in srgb, var(--border) 42%, transparent);
  --border-strong: color-mix(in srgb, var(--border) 88%, var(--foreground) 8%);
  --diagram-node-border: color-mix(in srgb, var(--foreground) 42%, var(--border));
  --diagram-structure: color-mix(in srgb, var(--foreground) 42%, var(--border));
  --diagram-node-fill: var(--card);
  --diagram-secondary-fill: color-mix(in srgb, var(--card) 55%, var(--background));
  --diagram-container-fill: color-mix(in srgb, var(--foreground) 2%, var(--background));
  --diagram-grid-opacity: 0.18;
  --diagram-main-tail-opacity: 0.62;
  --diagram-branch-tail-opacity: 0.48;
  --cobalt: #0070f3;
  --cobalt-ink: #0060df;
  --branch: #a66b21;
  --branch-ink: #8a6425;
  --ring: #0070f3;
}

[data-theme='dark'] {
  color-scheme: dark;
  --background: #000000;
  --foreground: #ededed;
  --card: #0a0a0a;
  --muted: #141414;
  --muted-foreground: #a1a1a1;
  --border: #1f1f1f;
  --border-subtle: color-mix(in srgb, var(--border) 62%, transparent);
  --border-strong: color-mix(in srgb, var(--border) 80%, var(--foreground) 10%);
  --diagram-node-border: color-mix(in srgb, var(--foreground) 34%, var(--border));
  --diagram-structure: color-mix(in srgb, var(--foreground) 34%, var(--border));
  --diagram-node-fill: color-mix(in srgb, var(--foreground) 4%, var(--background));
  --diagram-secondary-fill: color-mix(in srgb, var(--foreground) 6%, var(--background));
  --diagram-container-fill: color-mix(in srgb, var(--foreground) 4%, var(--background));
  --diagram-grid-opacity: 0.12;
  --diagram-main-tail-opacity: 0.24;
  --diagram-branch-tail-opacity: 0.12;
  --cobalt: #3291ff;
  --cobalt-ink: #3291ff;
  --branch: #d6a55e;
  --branch-ink: var(--branch);
  --ring: #3291ff;
}
```
<!-- theme-snippet:end -->

This block is the same contract the Theme Studio copies and the live host
stylesheet uses. It carries the complete surface set: node outline, structure,
container, node fill and an opaque secondary fill, plus the edge/text ink policy.
The secondary surface is never `transparent`; light and dark both keep a visible
outline (`--diagram-node-border`, `--diagram-structure`) so hairlines survive on
projector and low-contrast displays. Edge strokes use `--cobalt`/`--branch`;
readable text uses `--cobalt-ink`/`--branch-ink`. If you replace the accents,
replace the ink tokens with a value that keeps contrast on your background.

Place the theme attribute on the document root when using portalled tooltips.
A theme only on a nested canvas wrapper does not automatically reach a portal in
`document.body`. Scope ordinary host overrides above the library cascade layer.
Icon visibility rules intentionally sit outside that layer to hide the alternate
brand icon variant.

The package stylesheet includes self-hosted Geist Sans and Geist Mono WOFF2
assets. No third-party font service is contacted. Override
`--diagram-font-sans`, `--diagram-font-display` and `--diagram-font-mono` to
use your application's fonts. The playground embeds its Geist faces in standalone
SVG exports so they also survive PNG rasterization.

For multiple themes, test text contrast and focus rings in both, including labels,
branch edges and tooltips. Decorative edge colors and text may need different ink
values. Do not reduce the complete SVG to illegible text just to fit mobile width;
wrap it in a labelled, keyboard-focusable horizontal scroll region.

### Detail on light surfaces

The example light palette uses white and near-black surfaces with Vercel-blue
and ochre accents. `--diagram-node-fill` and `--diagram-secondary-fill`
separate primary and secondary cards without changing geometry; both stay opaque
so text never sits on a see-through card. `--diagram-container-fill` separates
lanes, bands and lifeline containers from the backdrop without a second border.
`--diagram-grid-opacity`, `--diagram-main-tail-opacity` and
`--diagram-branch-tail-opacity` keep dots and connection ends visible on light
backgrounds. These tokens are optional: omitting them preserves the original
canvas defaults. Define both theme scopes when overriding them, as shown above.
The playground's Theme Studio and copied CSS use the same per-theme values
because all four surfaces are generated from one contract.

### Migrating from earlier snippets

Earlier copies of this block (and the Theme Studio output) used a 20% light
outline, the bare `--border` in dark, and `--diagram-secondary-fill:
transparent` in dark. The strengthened block above is a drop-in replacement:
it adds `--diagram-structure`, `--diagram-container-fill`, `--border-subtle`,
`--border-strong`, `--cobalt-ink`, `--branch-ink`, `--ring` and `color-scheme`.
If you paste the block over an existing override, remove any older duplicate
declarations for those tokens; the package defaults apply when a token is
absent, but a stale duplicate later in your stylesheet wins. The block also no
longer repeats `--diagram-font-sans`, `--diagram-font-display` and
`--diagram-font-mono`: the package stylesheet already ships the Geist defaults,
and font overrides stay yours to keep.

## Editor view appearance

`DiagramDocument.presentation.theme` remains part of the document contract:
each mode carries its own palette and the mode is serialized in JSON.
`EditorRoot` accepts an optional `theme` prop that overrides only the *effective
view appearance* while the override is supplied:

```tsx
<EditorRoot store={store} locale="en" theme={hostTheme}>
  <EditorSurface />
  <EditorInspector />
</EditorRoot>
```

- Rendering (surface and overlays) uses the override mode's palette; the
  serialized document is untouched.
- While the override is active the inspector hides its own document theme
  select, so a single host control remains the authority.
- Changing the override is not a document edit: revision, undo history and dirty
  state do not change, and importing a document with the opposite theme renders
  with the override immediately.
- Omit the prop for the standalone studio or any consumer that wants the
  document's own mode to drive rendering.

## Brand icons and architecture providers

Selected brand icons are distributed locally from [TheSVG](https://github.com/GLINCKER/thesvg).
Use `BrandIcon` from `@aesthc/diagram-lib/icons` for interface marks. Import the
package CSS for its light/dark variants. Package-manager marks retain their colors.
Brand icon names are an explicit typed selection, not URLs or imported SVG text.

For concrete service-level examples, import `ARCHITECTURE_EXAMPLES` from
`@aesthc/diagram-lib/examples`. Each entry contains `diagram.en` / `diagram.es`,
explicit `visuals`, operational notes and links to provider documentation:

- `documents`: Cloud Storage → Pub/Sub → Cloud Run → BigQuery, with a separate
  application-owned quarantine bucket for invalid documents.
- `orders`: Container Apps → Service Bus → event-driven Container Apps Job →
  Azure SQL, with broker dead-letter handling after exhausted delivery attempts.
- `delivery`: GitHub → GitHub Actions → Artifact Registry → Cloud Run, with
  digest-based deployment and failed checks blocking publication.

Pass `layoutDiagram(example.diagram.en)` to `DiagramCanvas` and `example.visuals`
as `nodeVisuals`. Labels describe responsibilities; sublabels identify services.
Provider icons identify the platform, not a distinct service-specific product logo.
These are authored reference designs, not deployed production environments or
complete infrastructure recipes. Identity, retry/settlement, idempotency and
rollout policies require configuration; the diagram does not implement them.

The earlier `CLOUD_ARCHITECTURE_SPEC` / `CLOUD_ARCHITECTURE_VISUALS` exports remain
available for compatibility. They are no longer used by the website showcase.
Provider mentions alone do not infer or load icons.

Existing `source: 'svgl'` entries remain supported for their original keys.
See the distributed `licenses/TheSVG-NOTICES.md` for per-asset provenance,
attribution and brand guidelines. Icon inclusion does not imply affiliation.
