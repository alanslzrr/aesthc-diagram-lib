# Third-party notices

## Fonts distributed by the playground and documentation

The bundled WOFF2 name tables were inspected to verify family and copyright:

- Sora: Copyright 2019 The Sora Project Authors (https://github.com/sora-xor/sora-font).
- Bodoni Moda, regular and italic: Copyright 2020 The Bodoni Moda Project Authors
  (https://github.com/indestructible-type/Bodoni).
- Geist Mono: Copyright 2024 The Geist Project Authors
  (https://github.com/vercel/geist-font.git).

These fonts use the SIL Open Font License 1.1. Complete notices are in `licenses/`
and are served with the site under `/licenses/`. The library package does not
require these fonts; applications can supply their own appropriately licensed fonts.

## Icons

Brand SVG components adapted from the SVGL collection retain its MIT notice in
`licenses/SVGL-MIT.txt` (Copyright 2022 Pablo Hdez). Brand names/logos remain the
property of their respective owners. Collection licensing is not an endorsement
or a grant of unrelated trademark rights; check brand guidelines for your use.

Phosphor icons and Radix primitives are installed dependencies with their own
licenses and notices. Their license files remain in their installed packages.
Changes to copied third-party assets must preserve the applicable notices.

## Generated validation

JSON Schemas derive from this project's MIT-licensed TypeScript model. The
standalone validation code is generated with Ajv, an MIT-licensed development tool.
No Ajv runtime is required by the generated validation entrypoint.
