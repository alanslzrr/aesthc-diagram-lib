# Extending the editor

The editor-core exposes three opt-in extension points. Registration is always
local to an instance: nothing is loaded from a document payload, a URL or a
global singleton.

## Custom node renderers

Create a trusted renderer with `validate`, deterministic `measure` and a
canonical `renderSvg`, then register it:

```ts
import { createRendererRegistry, renderCustomNode } from '@aesthc/diagram-lib/editor-core'

const renderers = createRendererRegistry()
renderers.register({
  typeKey: 'metric-card',
  validate: (data) => ({ ok: true, diagnostics: [], value: data }),
  measure: () => ({ width: 200, height: 72 }),
  renderSvg: (data, context) => `<g>…escaped by your code…</g>`,
})

const rendered = renderCustomNode(
  renderers,
  { typeKey: 'metric-card', data: { title: 'RPS', value: '1 240' } },
  { fontSize: 13, theme: 'light', palette: {/* document palette */}, x: 24, y: 24 },
)
```

A payload with an unknown `typeKey` is reported as `renderer.unsupported` and is
never fetched or evaluated. Duplicate registrations are rejected and other
instances stay isolated. Payloads are plain JSON: callbacks are never serialized
into documents.

The registry is part of the document pipeline, not a side helper: pass
`renderers` to `resolveDocument` and `exportDocument`, and nodes declaring a
`renderer` payload are measured (the measured size becomes their geometry) and
rendered as the canonical fragment (`data-custom-renderer`). Without a
registered implementation the node is drawn as a placeholder
(`data-renderer-missing`) — never as a standard card — and publish export fails
with `renderer.unsupported`.

## Registered layout providers

Providers are explicit and asynchronous. `runRegisteredLayout` enforces the
contract: the latest request id wins, the base revision must match, unknown node
ids are rejected and locked nodes can never move. A rejection keeps the
last-good document untouched and allows a retry.

```ts
import { createLayoutProviderRegistry, runRegisteredLayout } from '@aesthc/diagram-lib/editor-core'

const providers = createLayoutProviderRegistry()
providers.register({ id: 'grid', run: async ({ document, signal }) => ({/* scene */}) })

const outcome = await runRegisteredLayout(document, providers, 'grid', {
  expectedRevision: document.revision,
  latestRequestId: () => currentRequestId,
  requestId: 'grid-1',
})
```

## Bounded orthogonal router

`routeOrthogonal` routes around obstacles with a clearance of 12 units, a bend
budget (default 24), a bounded state budget and a deterministic path. An
enclosed target reports `router.impossible`; an exhausted budget reports
`router.budget`; exceeding the bend budget reports `router.bends`. The router
never claims a valid route that crosses an obstacle, and it does not merge
parallel relations — the caller offsets them into separate slots.

```ts
import { routeOrthogonal } from '@aesthc/diagram-lib/editor-core'

const route = routeOrthogonal({ from, to, obstacles, fromSide: 'right' })
```

See the [editor guide](./editor.md) for composition, persistence and export, and
the [viewer guide](./viewer.md) for read-only exploration.
