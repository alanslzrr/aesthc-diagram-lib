# React, Vite and Next.js

## Vite or another React bundler

Use ESM imports and the complete getting-started example. The package supports
React 18.3 and React 19 peer lines. Import the CSS once. Start with the direct
`layoutDiagram(spec)` route; no global registration is needed for a local diagram.

## Next App Router

Put the interactive example in a file starting with `'use client'`. Keep React
state and all canvas callbacks inside that boundary. Import global diagram CSS
from your root layout or the client entry according to your app's stylesheet
conventions. Pass serializable specs from a Server Component, not callback functions.

Core types, registry helpers and pure layout functions do not need DOM measurement.
Canvas/showcase entrypoints preserve their client directives. Server rendering
alone does not establish that a particular app hydrates correctly: run a production
build and a hydration/browser smoke test in your supported Next version.

## Controlled interaction

`DiagramCanvas` does not own selection or graph traversal. Supply hover/focus/
selection state and callbacks. `connectedIds` traverses upstream and downstream
relations using adjacency computed from `diagramEdges(spec)`.

Use `useId()` per instance. IDs of relations are not the same as endpoints: two
messages can have identical `from`/`to` and distinct IDs. Anonymous parallel IDs
follow authored order; explicitly name them if you reorder or persist selection.

## Registry and localization

`registerDiagram(key, { diagram: { en, es }, visuals })` stores an application-owned
registration. `getDiagram(key, locale)` uses Spanish for locales starting with `es`
and English otherwise. `validateLocalizedDiagram` checks both specs and their
ordered topology. Both locales need real, complete data, not an empty placeholder.

Registry state is shared across public imports within one physical package
installation. It is not synchronized between server/client, workers, processes or
multiple installed copies. Do not store per-request private data in a module-global
registry. Prefer direct specs when request-level isolation is needed.

## Support boundaries

The library is a curated diagram renderer, not a general drag editor or a solver
for huge graphs. Framework versions must be covered by the repository's consumer
fixtures before claiming support. Browser requirements include modern SVG, CSS
custom properties and `color-mix`; the playground additionally uses clipboard,
canvas and compression APIs with fallbacks and visible errors.
