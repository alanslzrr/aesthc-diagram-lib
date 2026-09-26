# Troubleshooting

- **Unknown diagram key:** register before reading, use the same installation,
  and upgrade to 0.3.0 for shared registry identity across entrypoints. Direct specs
  avoid registry lifecycle concerns entirely.
- **Missing styles:** import `/styles.css`, define theme variables, and verify your
  bundler retains CSS. Do not import a nonexistent `/styles` export.
- **Type widened to string:** use `satisfies DiagramSpec` or a concrete spec type.
  `getDiagram` returns a union; narrow its `type` before calling a type-specific
  layout, or use `layoutDiagram`.
- **Invalid JSON:** the playground no longer accepts JavaScript expressions,
  unquoted keys or comments. Keep data in JSON and code in the generated TSX view.
  Validation errors leave the last valid preview intact.
- **Duplicate IDs:** name nodes and explicit relations uniquely. Endpoint equality
  does not imply relation identity. Empty/reserved IDs and missing references are
  rejected by the validation API.
- **Hydration or client errors:** use a client boundary for canvas callbacks and
  `useId` for instance IDs. Do not generate random IDs independently on server/client.
- **Wrong tooltip theme:** put the theme tokens on an ancestor of the portal target,
  normally the document root.
- **Wide canvas:** use a labelled horizontal scroll wrapper; do not force tiny text.
  Layout sizes are authored geometry, not an automatic screen-fit algorithm.
- **Share cannot load:** malformed/oversized/version-unsupported links are rejected.
  Download JSON for larger diagrams. A link is not encrypted storage.
- **Export font differs:** copied SVG may use host fonts; standalone SVG downloads
  embed the playground fonts. Test the target SVG application; not every renderer
  supports every CSS feature. PNG exports capture a raster image.
- **Installation returns 404:** verify that the version was publicly published and
  that your registry is correct. A Git tag is not proof of npm publication.

For a bug report, include versions and a minimal sanitized reproduction using the
issue form. Follow SECURITY.md for private vulnerability disclosure.
