# @aesthc/diagram-lib

**Reusable SVG diagram library** with a cohesive visual language: dot grid
backgrounds, hairline cards, cobalt/branch edges, edge pills, and glass
tooltips. One canvas renders **seven diagram types** from declarative,
localized data — no DOM measurement, no hand-authored coordinates.

Built for — and extracted from — [alansalazar.dev](https://alansalazar.dev)'s
featured-work section (the "Validation Orchestrator" and "Quote Agent"
case studies).

![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## Table of contents

1. [Features](#features)
2. [Diagram types](#diagram-types)
3. [Installation](#installation)
4. [Quick start](#quick-start)
5. [API](#api)
6. [Configuration & customization](#configuration--customization)
   - [Theming](#theming)
   - [Node cards](#node-cards)
   - [Node shapes](#node-shapes)
   - [Node icons](#node-icons)
   - [Edges](#edges)
   - [Decisions & continuations](#decisions--continuations)
7. [Per-type specs](#per-type-specs)
8. [Integrating with Next.js](#integrating-with-nextjs--tailwind-v4)
9. [Showcase](#showcase)
10. [Development](#development)
11. [Distribution model](#distribution-model)
12. [Contributing](#contributing)
13. [License](#license)

---

## Features

- **7 diagram types** from a single renderer: `band`, `flowchart`, `sequence`,
  `state-machine`, `er` (data model), `timeline`, and `swimlane`.
- **Declarative, localized specs** — content is data (`en` / `es`), topology
  is shared across locales.
- **Computed geometry** — layouts derive pixel coordinates and SVG paths from
  the spec; no hand-authored `x`/`y`, no resize observers.
- **One visual language** — dot grid, hairline cards, bezier edges with
  longitudinal gradients, decision pills, off-canvas continuations, glass
  tooltips.
- **Accessible & interactive** — every node is a focusable `role="button"`
  with a `<desc>`; hover/focus/selection highlights the full upstream +
  downstream path.
- **Tree-shakeable subpaths** — the core barrel has no layout engines; a
  consumer that only renders `band` imports exactly that layout.
- **Theme-agnostic CSS** — the canvas references the host's CSS variables, so
  it inherits any design system.

---

## Diagram types

| `type` | Spec keys | Layout |
|---|---|---|
| `band` | `bands`, `nodes` (+ `band`), `edges`, `decisions?`, `continuations?` | Vertical columns, centred stacks, bezier edges between bands (the original Quote Agent / Orchestrator design) |
| `flowchart` | `nodes`, `edges` (+ `direction`, `level`) | Top-down or left-right levels, auto-assigned by topological order |
| `sequence` | `participants`, `messages` | Vertical lifelines, horizontal messages, activation bars |
| `state-machine` | `states` (+ `initial`/`final`), `transitions` | States on a ring, curved transitions, self-loops, double-outline initial, hollow final |
| `er` | `entities` (with `fields`), `relations` | Tables in a grid, typed rows (pk / fk / unique) |
| `timeline` | `events` | Dashed central spine, events alternating above/below |
| `swimlane` | `lanes`, `nodes` (with `lane`), `edges` | Labelled horizontal lanes |

---

## Installation

```bash
pnpm add @aesthc/diagram-lib
# or
npm install @aesthc/diagram-lib
```

Peer dependencies: `react >= 18`, `react-dom >= 18`.

**Using from git** (no registry publish yet):

```json
{
  "dependencies": {
    "@aesthc/diagram-lib": "github:alanslzrr/aesthc-diagram-lib"
  }
}
```

**Local development against the source**:

```json
{
  "dependencies": {
    "@aesthc/diagram-lib": "file:../aesthc-diagram-lib"
  }
}
```

---

## Quick start

```tsx
import { registerDiagram } from '@aesthc/diagram-lib'
import { getDiagram, diagramEdges, buildAdjacency, connectedIds } from '@aesthc/diagram-lib'
import { layoutBand } from '@aesthc/diagram-lib/layouts/band'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'

// 1. Register content (module scope of a data file)
registerDiagram('my-project', {
  diagram: {
    en: {
      type: 'band',
      caption: 'what the diagram tells',
      legend: { main: 'main path', branch: 'alternative' },
      bands: [{ title: 'Input' }, { title: 'Process' }, { title: 'Output' }],
      nodes: [
        { id: 'a', band: 0, label: 'Step A', description: 'What A does.', kind: 'Trigger', sublabel: 'ingest' },
        { id: 'b', band: 1, label: 'Step B', description: 'What B does.', weight: 'primary' },
        { id: 'c', band: 2, label: 'Step C', description: 'What C does.', weight: 'muted' },
      ],
      edges: [
        { from: 'a', to: 'b', label: 'next' },
        { from: 'b', to: 'c' },
      ],
      continuations: [
        { id: 'back', from: 'c', label: 'retry', destination: 'a', side: 'left' },
      ],
    },
    es: { /* same ids/topology, Spanish text */ },
  },
  visuals: {
    a: { source: 'phosphor', key: 'rocket-launch' },
    b: { source: 'svgl', key: 'openrouter' },
  },
})

// 2. Render
function MyDiagram() {
  const locale = 'en'
  const diagram = getDiagram('my-project', locale) // localized spec
  const layout = layoutBand(diagram)               // pixel geometry + SVG paths
  const edges = diagramEdges(diagram)              // normalized relations
  const adjacency = buildAdjacency(edges)          // for hover/focus highlight
  const highlight = connectedIds('b', adjacency)   // full path through b

  return (
    <DiagramCanvas
      layout={layout}
      highlight={highlight}
      activeNodeId={null}
      focusedNodeId={null}
      selectedNodeId={null}
      onTooltipNodeChange={() => {}}
      onFocusNode={() => {}}
      onSelectNode={() => {}}
      onDismissNode={() => {}}
      instanceId="my-project"
      ariaLabel="My project architecture"
      nodeVisuals={{ a: { source: 'phosphor', key: 'rocket-launch' } }}
    />
  )
}
```

> Both locales must share `id`s and topology — only the text differs.
> Registering the same key twice replaces the entry (handy in HMR).

---

## API

### Registry — `@aesthc/diagram-lib`

| Function | Description |
|---|---|
| `registerDiagram(key, { diagram: { en, es }, visuals? })` | Registers a localized diagram + optional node icons. |
| `registerDiagrams(entries)` | Registers several at once. |
| `getDiagram(key, locale)` | Returns the localized spec (`es` for `es*`, `en` otherwise). Throws on unknown key. |
| `getDiagramVisuals(key)` | Returns the node icon map. |
| `hasDiagram(key)` / `getDiagramKeys()` | Registry introspection. |

### Geometry — `@aesthc/diagram-lib`

| Function | Description |
|---|---|
| `layoutDiagram(spec)` / `layoutByType(spec)` | Dispatches any spec to its layout. |
| `layoutBand(spec)` | Band layout only (lightweight import). |
| `diagramEdges(spec)` | Normalizes `messages` / `transitions` / `relations` / `edges` into plain edges. |
| `buildAdjacency(edges)` / `connectedIds(id, adj)` | Graph traversal for highlight. |
| `nodePorts(node, edges, continuations)` | Real connection points of a placed node. |

### Canvas — `@aesthc/diagram-lib/canvas`

| Export | Description |
|---|---|
| `DiagramCanvas` | The SVG renderer. Props: `layout`, `highlight`, `activeNodeId`, `focusedNodeId`, `selectedNodeId`, `onTooltipNodeChange`, `onFocusNode`, `onSelectNode`, `onDismissNode`, `instanceId`, `ariaLabel`, `nodeVisuals`. |
| `ArchitectureNodeIcon` | Renders an SVGL brand mark or a Phosphor icon. |
| `DiagramCanvasProps` | Prop types. |

### Subpaths

| Subpath | Contents |
|---|---|
| `@aesthc/diagram-lib` | Core: `types`, `theme`, `layout` (common), `registry`. No layout engines. |
| `@aesthc/diagram-lib/layouts` | Dispatcher `layoutByType` + `layoutDiagram` + all 7 layouts. |
| `@aesthc/diagram-lib/layouts/band` | Just the band layout. |
| `@aesthc/diagram-lib/canvas` | `DiagramCanvas`, `ArchitectureNodeIcon`, props types. |
| `@aesthc/diagram-lib/examples` | `EXAMPLE_DIAGRAMS` + `registerExampleDiagrams()`. |
| `@aesthc/diagram-lib/showcase` | `DiagramShowcase` — a ready-made interactive showcase page (one panel per type). |
| `@aesthc/diagram-lib/styles.css` | Compiled canvas utilities (see theming). |

---

## Configuration & customization

### Theming

The canvas is **theme-agnostic**: it reads CSS variables from the host. Define
these anywhere in your app (light + dark):

```css
:root {
  --foreground: #171717;
  --background: #f4f7fb;
  --border: #d8e0eb;
  --diagram-node-border: color-mix(in srgb, var(--foreground) 20%, var(--border));
  --card: #f9fbff;
  --cobalt: #0fa8ff;   /* main edges, ports, focus ring */
  --branch: #d6a55e;   /* branch edges, continuations */
}
[data-theme='dark'] {
  --foreground: #f2f2ee;
  --background: #070707;
  --border: #242424;
  --diagram-node-border: var(--border);
  --card: #101010;
  --cobalt: #14a8ff;
  --branch: #d6a55e;
}
```

The package ships a compiled `styles.css` with the canvas utilities
(utilities-only, no preflight) that references these variables, so the
diagram inherits your palette and dark mode automatically.

`--diagram-node-border` is optional. If omitted, node outlines fall back to
`--border`; define it per theme when the canvas needs a different outline
contrast without changing borders across the rest of the host application.

**Regenerate the compiled CSS** after changing canvas classes:

```bash
pnpm build:css   # tailwindcss -i ./src/styles.css -o ./dist/styles.css --minify
```

### Node cards

| Field | Type | Effect |
|---|---|---|
| `id` | `string` | Stable identifier used by edges/visuals. |
| `label` | `string` | Main title. |
| `description` | `string` | Tooltip + `<desc>` (accessibility). Required. |
| `kind` | `string` | Mono micro-label above the title (e.g. `Trigger`, `Engine`, `Gate`). |
| `sublabel` | `string` | Mono secondary line; makes the card taller (`CARD_H_FULL`). |
| `weight` | `'primary' \| 'secondary' \| 'muted'` | `primary` = visible border + elevated fill; `secondary` = hairline, transparent; `muted` = no card, just text over a bottom rule. |
| `nudge` | `number` | Vertical fine-tune after layout centres the node. |
| `shape` | see below | Draw the node as something other than a card. |
| `fields` | `TableField[]` | Rows for `shape: 'table'` (ER). |

### Node shapes

| Shape | Used by | Rendering |
|---|---|---|
| `card` | all | Default hairline card. |
| `state` | state-machine | Rounded pill; `initial` adds a double outline, `final` a hollow centre dot. |
| `table` | er | Header band + typed field rows with pk/fk/unique badges. |
| `event` | timeline | Dot on the spine + label above/below. |
| `terminal` | flowchart | Rounded start/end capsule. |
| `bar` | sequence | Thin activation bar (non-interactive, no tooltip). |

### Node icons

`visuals` map node ids to icons. Two sources:

```ts
type DiagramNodeVisual =
  | { source: 'svgl'; key: SvglNodeIconKey }      // brand marks
  | { source: 'phosphor'; key: SemanticNodeIconKey } // abstract operations
```

- **SVGL brand marks**: `express`, `google-cloud`, `mcp`, `nextjs`, `openai`,
  `openrouter`, `pdf`, `postgresql` (dark/light aware).
- **Phosphor operations**: `arrows-split`, `brackets-curly`, `folder-lock`,
  `gauge`, `graph`, `handshake`, `list-checks`, `list-magnifying-glass`,
  `monitor`, `receipt`, `rocket-launch`, `scales`, `seal-check`, `user-check`,
  `user-focus`, `warning`.

To add a brand mark, drop the SVG component in `src/svgs/`, extend
`SvglNodeIconKey` in `src/types.ts`, and map it in
`src/canvas/ArchitectureNodeIcon.tsx`.

### Edges

| Field | Type | Effect |
|---|---|---|
| `from` / `to` | `string` | Node ids. |
| `label` | `string` | Pill rendered near the edge. |
| `variant` | `'main' \| 'branch'` | Cobalt (`main`) vs amber (`branch`). |
| `dashed` | `boolean` | Dashed stroke (alternative paths). |
| `labelPlacement` | `'above-target' \| 'below-target' \| 'left-of-edge' \| 'right-of-edge'` | Move the pill into whitespace. |
| `route` | `{ lane: 'above' \| 'below', clearance? }` | Route a cross-band edge around intervening bands on an outer lane. |

### Decisions & continuations

```ts
// A compact question in the open run after a branching node.
decisions: [{ id: 'health', source: 'verdict', label: 'healthy?' }]

// An off-canvas return stub — preserves feedback semantics without a long
// edge or an enclosing rail. Rendered as a 44u stub with a chevron.
continuations: [{
  id: 'realtime-console',
  from: 'store',
  label: 'realtime',
  destination: 'console',          // only used in the aria label
  side: 'left' | 'right',
  anchor: 'upper' | 'center' | 'lower',  // escape hatch off a muted node's rule
  labelPlacement: 'above-source' | 'below-source',
  variant: 'branch',
  ariaLabel: '…',                  // spoken return semantics
}]
```

---

## Per-type specs

All types share `caption` and `legend: { main, branch }`. Beyond that:

### Band

```ts
{
  type: 'band',
  bands: [{ title: 'Intake' }],
  nodes: [{ id: 'crm', band: 0, label: 'CRM / ERP event', … }],
  edges: [{ from: 'crm', to: 'case' }],
  decisions?: […], continuations?: […],
}
```

### Flowchart

```ts
{
  type: 'flowchart',
  direction?: 'top-down' | 'left-right',   // default top-down
  level?: number,                          // pin a column; default = topological pass
  nodes: […], edges: […],
}
```

### Sequence

```ts
{
  type: 'sequence',
  participants: [{ id: 'api', label: 'API', kind: 'Next.js' }],
  messages: [{
    id: 'intent', from: 'api', to: 'pay',
    label: 'create intent', variant?: 'main' | 'branch',
    dashed?: boolean, activation?: boolean,
  }],
}
```

### State machine

```ts
{
  type: 'state-machine',
  states: [{
    id: 'paid', label: 'Paid', kind: 'Confirmed',
    weight?: NodeWeight, initial?: boolean, final?: boolean,
    description?: string,
  }],
  transitions: [{ from: 'created', to: 'payment', label: 'checkout', variant?, dashed? }],
}
```

### ER / data model

```ts
{
  type: 'er',
  entities: [{
    id: 'products', label: 'products', kind: 'table',
    weight?: NodeWeight,
    fields: [
      { name: 'id', type: 'uuid', key: 'pk' },
      { name: 'product_id', type: 'uuid', key: 'fk' },
      { name: 'slug', type: 'varchar(120)', key: 'unique' },
    ],
  }],
  relations: [{ from: 'products', to: 'variants', label: '1—N', variant? }],
}
```

### Timeline

```ts
{
  type: 'timeline',
  events: [{
    id: 'public', label: 'Public launch', kind: 'launch',
    sublabel?: string, description: string,
    variant?: 'main' | 'branch', weight?: NodeWeight,
  }],
}
```

### Swimlane

```ts
{
  type: 'swimlane',
  lanes: [{ id: 'eng', label: 'Engineering', kind: 'Product' }],
  nodes: [{ id: 'debug', lane: 'eng', label: 'Debug & fix', … }],
  edges: [{ from: 'escalate', to: 'debug' }],
}
```

---

## Integrating with Next.js + Tailwind v4

The package ships **TSX source + a compiled CSS file** with the canvas
utilities. A Next.js consumer:

1. Add the dependency (local or git — see [Installation](#installation)).

2. (Optional for older setups) Tell Next to transpile the source only if
   consuming from `src` directly; the published package is prebuilt ESM and
   does not require it.

3. Import the compiled styles **before** `@import 'tailwindcss'` in your root
   CSS. The package utilities are wrapped in the `diagram-lib` cascade layer;
   keeping that layer before the host layers ensures responsive host utilities
   such as `.sm:flex` win over shared utility names such as `.hidden`:

   ```css
   @import '@aesthc/diagram-lib/styles.css';
   @import 'tailwindcss';
   ```

   The package metadata marks `dist/styles.css` as a side effect so production bundlers retain this import even when no JavaScript export is consumed from the stylesheet entry.

   The package's `.adl-icon-light` and `.adl-icon-dark` rules are deliberately
   scoped and unlayered so they can override a host `svg { display: block }`
   reset without introducing generic utility collisions.

4. Ensure the theme variables above are defined (light + `[data-theme='dark']`).

5. Optional — editor paths:

   ```json
   {
     "compilerOptions": {
       "paths": {
         "@aesthc/diagram-lib": ["../aesthc-diagram-lib/src/index.ts"],
         "@aesthc/diagram-lib/*": ["../aesthc-diagram-lib/src/*"]
       }
     }
   }
   ```

> **Vercel / CI**: a `file:` dependency won't resolve on a clean deploy. Use
> the `github:` dependency (and grant the private repo access to the deploy
> platform).

**Other bundlers (Vite, webpack)**: transpile the package source
(`optimizeDeps.exclude` / `transpileDependencies`) or point your bundler at
the `exports` target; the package does not ship a JS build by design.

---

## Showcase

`DiagramShowcase` is a ready-made, interactive page that presents every
supported diagram type with the library's visual chrome (hairline frames,
mono header bars, caption + cobalt/branch legend). It is what you see if you
want to "demo the library" — no i18n framework required.

```tsx
import { DiagramShowcase } from '@aesthc/diagram-lib/showcase'
import { DEFAULT_SHOWCASE_ENTRIES } from '@aesthc/diagram-lib/showcase/entries'

export default function DemoPage() {
  return (
    <DiagramShowcase
      locale="en"                                  // 'en' | 'es'
      heading="Seven diagram types,"
      headingAccent="one visual language."
      intro="A single SVG renderer and a declarative data model…"
      entries={DEFAULT_SHOWCASE_ENTRIES}           // or your own list
    />
  )
}
```

`entries` is `{ key, title, description }[]`; `key` must be a diagram
registered in the registry (the examples are registered automatically when
the module loads). Pass localized strings via props — defaults are English.

The showcase assumes the host defines the theme variables from
[Theming](#theming) plus `--muted-foreground` and `--font-display` (used by
the hero/typography). `DEFAULT_SHOWCASE_ENTRIES` covers the seven example
diagrams (`example-band` … `example-swimlane`).


## Development

```bash
pnpm install
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run (27 tests: registry, per-type layouts, render, showcase, CSS cascade)
pnpm build:css    # regenerate dist/styles.css after canvas class changes
```

The test suite covers: registry lookup, every example layout inside its
canvas, per-type invariants (levels, lifelines, ring, tables, spine, lanes),
edge normalization, SSR rendering of every diagram type, the showcase page,
and the compiled-stylesheet cascade contract.

---
## Distribution model

The package is published as **compiled ESM + `.d.ts`** (`dist/`), built with
`tsup` on every release. Each public subpath resolves to a self-contained
module; `main`/`module`/`types` point at `dist/index.js` / `dist/index.d.ts`.

Implications:

- Any bundler or Node runtime that supports ESM can consume the package —
  **no `transpilePackages` needed** (a Next.js consumer only wires the
  compiled styles, see [Integrating with Next.js](#integrating-with-nextjs--tailwind-v4)).
- The `canvas` and `showcase` entries carry the `'use client'` directive so
  Next.js treats them as Client Components.
- `dist/` is generated and CI-fenced: the pipeline runs `pnpm build` and fails
  if `dist/` drifts. `src/` remains the source of truth for development.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, the style-build workflow,
how to add a diagram type or brand icon, and release steps.


## License

[MIT](./LICENSE) © 2026 Alan Salazar
