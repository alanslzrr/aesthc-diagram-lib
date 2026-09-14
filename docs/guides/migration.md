# Migrating to 0.3.0

1. Registry state now matches across public entrypoints. Install the whole package;
   do not copy a single built entry file without its shared chunks.
2. Sequence edge IDs preserve message IDs. Other relations can declare `id`.
   Update integrations that assumed every edge ID was `from::to`. Endpoint tokens
   are escaped to avoid delimiter collisions; anonymous parallel IDs depend on order.
3. Import `DEFAULT_SHOWCASE_ENTRIES` from `/showcase`; `/showcase/entries` was never
   a public export and should not be used.
4. The playground edits strict JSON, not JavaScript expressions. Use quoted keys,
   remove comments and use the generated TSX view for application code.
5. Use `/validation` for untrusted data. Low-level typed layout and registry APIs
   do not automatically validate or sandbox arbitrary objects.
6. Set `--diagram-font-display` for canvas display fonts. This avoids the previous
   self-referencing display-font variable.
7. This release targets React 18.3/19 and Node 20.19+ consumers, with Node 22.14+
   for development. Validate your actual framework/bundler configuration.

Label-only cards without an icon now center their labels. Annotated cards without
an icon use normal inner padding instead of reserving an empty icon rail; cards
with icons retain the original alignment. No spec fields or interaction callbacks
change. Do not rely on the previous fixed text coordinates in custom overlays.

Pre-1.0 minor versions can contain documented breaking changes. Pin a version when
embedding documentation in an agent workflow and upgrade deliberately. We keep
published versions immutable; fixes use a new version, not replacement tarballs.

## Geist typography

The package stylesheet now supplies Geist Sans and Geist Mono and uses them as
its default font families. Existing specs and callbacks are unchanged. Set
`--diagram-font-sans`, `--diagram-font-display` and `--diagram-font-mono` to retain
a host application's own fonts. Ensure your bundler copies the stylesheet's
relative `fonts/*.woff2` assets. Standalone playground SVG/PNG exports use Geist.

The documentation now uses prerendered React pages and client navigation.
Existing routes, Markdown downloads and versioned documentation are preserved.
The shared theme preference accepts `system`, `light` or `dark`; an absent or
invalid preference follows the system. Existing explicit light/dark choices remain.

### Selected TheSVG brands

The optional `@aesthc/diagram-lib/icons` entrypoint exposes `BrandIcon`.
Architecture `nodeVisuals` accept `source: 'thesvg'` with the original brand keys
and `azure`; legacy `source: 'svgl'` mappings remain compatible. Artwork now comes
from a pinned TheSVG revision, so brand silhouettes may differ slightly. Specs,
layout geometry and callbacks are unchanged. Font and theme tokens still apply.

## Semantic issue paths

Validation issues now use the authored collection (`edges`, `messages`,
`transitions`, `relations`, `participants`, `states`, `entities` or `events`), not
normalized `/nodes` and `/relations` paths. Duplicate explicit IDs retain original
indices even after anonymous relations. Consumers matching exact paths should
update their field mapping; issue codes and success/result shapes are unchanged.
