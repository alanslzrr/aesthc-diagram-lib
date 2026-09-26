import { useId, useMemo, useState } from 'react'
import { buildAdjacency, connectedIds, diagramEdges, type DiagramSpec } from '@aesthc/diagram-lib'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
import '@aesthc/diagram-lib/styles.css'

const spec = {
  "type": "er",
  "caption": "Users and orders",
  "legend": {
    "main": "Main path",
    "branch": "Alternative"
  },
  "entities": [
    {
      "id": "a",
      "label": "User",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "key": "pk"
        }
      ]
    },
    {
      "id": "b",
      "label": "Order",
      "fields": [
        {
          "name": "user_id",
          "type": "uuid",
          "key": "fk"
        }
      ]
    }
  ],
  "relations": [
    {
      "id": "orders",
      "from": "a",
      "to": "b",
      "label": "places"
    }
  ]
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
