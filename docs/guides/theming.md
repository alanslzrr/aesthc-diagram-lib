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
  --diagram-font-display: Georgia, serif;
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
  --border: #404040;
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

The library does not install fonts or download them at runtime. Use your host
font or set `--diagram-font-display`. The playground's self-hosted fonts and SVG
font embedding are site features, not an implicit package dependency.

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
