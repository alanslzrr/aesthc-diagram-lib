# Styles and theming

Import `@aesthc/diagram-lib/styles.css` once. It contains generated canvas utilities
inside `@layer diagram-lib`, without a global reset. Tailwind is a build dependency
of this repository, not a requirement in your application.

```css
:root {
  --background: #e9eef4;
  --foreground: #202b38;
  --card: #f9fbfd;
  --border: #aebdcd;
  --muted: #dde5ee;
  --muted-foreground: #536273;
  --cobalt: #087cbd;
  --branch: #a66b21;
  --diagram-font-display: Geist, system-ui, sans-serif;
  --diagram-font-sans: Geist, system-ui, sans-serif;
  --diagram-font-mono: 'Geist Mono', ui-monospace, monospace;
  --diagram-node-border: color-mix(in srgb, var(--foreground) 20%, var(--border));
  --diagram-node-fill: var(--card);
  --diagram-secondary-fill: color-mix(in srgb, var(--card) 38%, var(--background));
  --diagram-grid-opacity: 0.18;
  --diagram-main-tail-opacity: 0.62;
  --diagram-branch-tail-opacity: 0.48;
  color-scheme: light;
}
[data-theme='dark'] {
  --background: #070707;
  --foreground: #f2f2ee;
  --card: #101010;
  --border: #242424;
  --muted: #151515;
  --muted-foreground: #a8a8a1;
  --cobalt: #14a8ff;
  --branch: #d6a55e;
  --diagram-node-border: var(--border);
  --diagram-node-fill: color-mix(in srgb, var(--foreground) 4%, var(--background));
  --diagram-secondary-fill: transparent;
  --diagram-grid-opacity: 0.12;
  --diagram-main-tail-opacity: 0.24;
  --diagram-branch-tail-opacity: 0.12;
  color-scheme: dark;
}
```

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

The example light palette uses a blue-gray canvas and lighter node surfaces,
with darker blue/ochre accents. `--diagram-node-fill` and
`--diagram-secondary-fill` separate primary and secondary cards without changing
geometry. `--diagram-grid-opacity`, `--diagram-main-tail-opacity` and
`--diagram-branch-tail-opacity` keep dots and connection ends visible on light
backgrounds. These tokens are optional: omitting them preserves the original
canvas defaults. Define both theme scopes when overriding them, as shown above.
The playground's Theme Studio and copied CSS use the same per-theme values.

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
