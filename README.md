# @aesthc/diagram-lib

Seven diagram types with one visual language: declarative React SVG diagrams with
localized data, controlled interaction and host-defined themes.

[Playground](https://alanslzrr.github.io/aesthc-diagram-lib/) · [Documentation](https://alanslzrr.github.io/aesthc-diagram-lib/docs/) · [Use with your agent](https://alanslzrr.github.io/aesthc-diagram-lib/agents/) · [MIT license](https://github.com/alanslzrr/aesthc-diagram-lib/blob/main/LICENSE)

![Band diagram](https://raw.githubusercontent.com/alanslzrr/aesthc-diagram-lib/main/docs/diagrams/band.svg)

## Install

```bash
npm install @aesthc/diagram-lib@0.3.0
```

This README targets 0.3.0; verify that the matching release is public.
Before initial publication, use the maintainer-provided candidate tarball rather
than assuming that a Git tag means npm is available. React 18.3/19, ESM, Node20.19+.
Tailwind is not required. Import the distributed CSS and configure [host theme variables](https://alanslzrr.github.io/aesthc-diagram-lib/docs/guides/theming/).

## First diagram

```tsx
import { useId, useMemo, useState } from 'react'
import { buildAdjacency, connectedIds, diagramEdges, type DiagramSpec } from '@aesthc/diagram-lib'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
import '@aesthc/diagram-lib/styles.css'

const spec = {
  "type": "flowchart",
  "caption": "Request flow",
  "legend": {
    "main": "Main path",
    "branch": "Alternative"
  },
  "nodes": [
    {
      "id": "a",
      "label": "Request",
      "description": "Receive a request."
    },
    {
      "id": "b",
      "label": "Response",
      "description": "Return a response."
    }
  ],
  "edges": [
    {
      "id": "request",
      "from": "a",
      "to": "b"
    }
  ],
  "direction": "top-down"
} satisfies DiagramSpec

export function Diagram() {
  const instanceId = useId()
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const layout = useMemo(() => layoutDiagram(spec), [])
  const adjacency = useMemo(() => buildAdjacency(diagramEdges(spec)), [])
  const active = hovered ?? focused ?? selected
  const highlight = active ? connectedIds(active, adjacency) : null
  return <DiagramCanvas layout={layout} highlight={highlight}
    activeNodeId={active} focusedNodeId={focused} selectedNodeId={selected}
    onTooltipNodeChange={(id, open) => setHovered(open ? id : null)}
    onFocusNode={setFocused} onSelectNode={(id) => setSelected(selected === id ? null : id)}
    onDismissNode={() => { setHovered(null); setSelected(null) }}
    instanceId={instanceId} ariaLabel={spec.caption} nodeVisuals={{}} />
}
```

## Diagram types

- [Band](https://alanslzrr.github.io/aesthc-diagram-lib/docs/diagrams/band/)
- [Flowchart](https://alanslzrr.github.io/aesthc-diagram-lib/docs/diagrams/flowchart/)
- [Sequence](https://alanslzrr.github.io/aesthc-diagram-lib/docs/diagrams/sequence/)
- [State machine](https://alanslzrr.github.io/aesthc-diagram-lib/docs/diagrams/state-machine/)
- [Entity relationship](https://alanslzrr.github.io/aesthc-diagram-lib/docs/diagrams/er/)
- [Timeline](https://alanslzrr.github.io/aesthc-diagram-lib/docs/diagrams/timeline/)
- [Swimlane](https://alanslzrr.github.io/aesthc-diagram-lib/docs/diagrams/swimlane/)

Each example has validated JSON, a complete React component and generated field
reference. More detailed localized examples ship through the public examples import.

## Use with your agent

Pass **https://alanslzrr.github.io/aesthc-diagram-lib/agents/** to your agent along with your task. The guide covers
installation, public imports, styles, choosing a layout and verification. No skill,
plugin or MCP server is required. To contribute to this repository instead, read
[AGENTS.md](https://github.com/alanslzrr/aesthc-diagram-lib/blob/main/AGENTS.md).

## API and limits

Specs → pure layouts → controlled SVG canvas. Registration is optional.
Read the [API](https://alanslzrr.github.io/aesthc-diagram-lib/docs/api/), [React/SSR guide](https://alanslzrr.github.io/aesthc-diagram-lib/docs/guides/react/),
[migration notes](https://alanslzrr.github.io/aesthc-diagram-lib/docs/guides/migration/) and [troubleshooting](https://alanslzrr.github.io/aesthc-diagram-lib/docs/guides/troubleshooting/).

This is not a drag editor or a solver for arbitrarily large graphs. External input
needs validation. Shared links are not encrypted; never include secrets. SVG/PNG
exports and the JSON editor are playground features, not package APIs.

## Development and support

Node 22.14+ and pnpm 10.29.3. Run `pnpm install --frozen-lockfile`, then
`pnpm check`. Browser checks require `pnpm exec playwright install`.
See [CONTRIBUTING.md](https://github.com/alanslzrr/aesthc-diagram-lib/blob/main/CONTRIBUTING.md),
[SUPPORT.md](https://github.com/alanslzrr/aesthc-diagram-lib/blob/main/SUPPORT.md),
[SECURITY.md](https://github.com/alanslzrr/aesthc-diagram-lib/blob/main/SECURITY.md) and
[ROADMAP.md](https://github.com/alanslzrr/aesthc-diagram-lib/blob/main/ROADMAP.md).

Maintained by [Alan Salazar](https://github.com/alanslzrr). MIT. Third-party font
and icon notices are recorded in THIRD_PARTY_NOTICES.md.
