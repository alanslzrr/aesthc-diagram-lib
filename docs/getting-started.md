# Getting started

Documentation for **0.3.0**. Version 0.3.0 is available on npm.

React `^18.3.1 || ^19.0.0`, ESM and Node 20.19+ are the declared consumer targets.
See the [support matrix](guides/support.md) for verification scope.

## Installation

```bash
npm install @aesthc/diagram-lib@0.3.0
```

Use your existing package manager; npm, pnpm, yarn and bun can install the same package.
Import the stylesheet and define the host variables in [Theming](guides/theming.md).
Tailwind is not required.

## First diagram

This complete example includes selection/focus state:

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

## Next steps

For Next App Router, add a client boundary as described in [React integration](guides/react.md).
For untrusted JSON, validate before rendering using the [API](api/index.md).
All seven examples are included in the package. A coding agent can start with
the [integration guide](agents/integrate.md), without installing extra tools.
