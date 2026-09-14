# Third-party notices

## Fonts distributed by the package, playground and documentation

Geist Sans and Geist Mono WOFF2 assets are distributed from the official
`geist` npm package (1.7.2), Copyright the Geist Project Authors
(https://github.com/vercel/geist-font). The complete SIL Open Font License
notice is preserved in `licenses/Geist-OFL.txt` and served with the site.
The package stylesheet references its own relative font assets; consumers
can override the diagram font tokens with appropriately licensed host fonts.

Historical releases may retain Sora, Bodoni Moda or earlier Geist Mono assets
and their corresponding notices.

## Interface components

ScrollArea and the theme ToggleGroup compose Radix primitives using the
shadcn/ui pattern. Disclosure uses native details/summary with Motion animation;
the motion-primitives composition is a design reference, not executed Markdown.
These dependencies belong to the private site, not the public library runtime.

## Icons

Live brand artwork is now sourced from a pinned TheSVG revision, not loaded from
its CDN. Selected assets, checksums, source links, individual license metadata
and brand guidelines are recorded in `licenses/TheSVG-NOTICES.md`. Yarn artwork
is attributed to the Yarn contributors under CC BY 4.0; local fill styles are
flattened to attributes without changing artwork. TheSVG project code notice is
preserved separately. Collection code licensing does not override brand-use
restrictions. Icons identify their named tools/providers, without endorsement.
The public `svgl` visual source remains a compatibility alias for existing keys;
new brand visuals may use `thesvg`, including `google-cloud` and `azure`.

Historical copied assets:

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
