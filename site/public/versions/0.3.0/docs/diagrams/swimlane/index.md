# Swimlane diagrams

Version 0.3.0. The minimal spec below is validated and its complete React
example is compiled against the package tarball. See [API](/aesthc-diagram-lib/versions/0.3.0/docs/api/) for
defaults, [React](/aesthc-diagram-lib/versions/0.3.0/docs/guides/react/) for state/SSR and [Theming](/aesthc-diagram-lib/versions/0.3.0/docs/guides/theming/)
for required host variables. For richer localized examples use the public examples entrypoint.

```json
{
  "type": "swimlane",
  "caption": "Support handoff",
  "legend": {
    "main": "Main path",
    "branch": "Alternative"
  },
  "lanes": [
    {
      "id": "support",
      "label": "Support"
    },
    {
      "id": "engineering",
      "label": "Engineering"
    }
  ],
  "nodes": [
    {
      "id": "a",
      "label": "Request",
      "description": "Receive a request.",
      "lane": "support"
    },
    {
      "id": "b",
      "label": "Response",
      "description": "Return a response.",
      "lane": "engineering"
    }
  ],
  "edges": [
    {
      "id": "handoff",
      "from": "a",
      "to": "b"
    }
  ]
}
```

## SwimlaneDiagramSpec

| Field | Required | Contract |
|---|---|---|
| `type` | yes | {"type":"string","const":"swimlane"} |
| `caption` | yes | {"type":"string"} |
| `legend` | yes | {"type":"object","properties":{"main":{"type":"string"},"branch":{"type":"string"}},"required":["main","branch"],"additionalProperties":false} |
| `lanes` | yes | {"type":"array","items":{"$ref":"#/definitions/SwimlaneLane"}} |
| `nodes` | yes | {"type":"array","items":{"type":"object","additionalProperties":false,"properties":{"lane":{"type":"string"},"id":{"type":"string"},"label":{"type":"string"},"description":{"type":"string","description":"Localized explanation shown on hover/focus and available to assistive technology."},"kind":{"type":"string","description":"Mono micro-label above the title, e.g. 'Trigger', 'Engine', 'Gate'."},"sublabel":{"type":"string"},"weight":{"$ref":"#/definitions/NodeWeight"},"nudge":{"type":"number","description":"Vertical fine-tune in viewBox units, applied after the layout centres the node."},"shape":{"$ref":"#/definitions/DiagramNodeShape","description":"Draw this node as something other than a hairline card."},"textAnchor":{"$ref":"#/definitions/DiagramNodeTextAnchor","description":"Label alignment for `event` shapes (timeline)."},"fields":{"type":"array","items":{"$ref":"#/definitions/TableField"},"description":"ER table rows (only meaningful for `shape: 'table'`)."},"initial":{"type":"boolean","description":"State-machine: draw a double outline (initial state)."},"final":{"type":"boolean","description":"State-machine: draw a hollow centre (final state)."}},"required":["description","id","label","lane"]}} |
| `edges` | yes | {"type":"array","items":{"$ref":"#/definitions/DiagramEdge"}} |

## SwimlaneLane

| Field | Required | Contract |
|---|---|---|
| `id` | yes | {"type":"string"} |
| `label` | yes | {"type":"string"} |
| `kind` | no | {"type":"string"} |

## TableField

| Field | Required | Contract |
|---|---|---|
| `name` | yes | {"type":"string"} |
| `type` | no | Optional column type, e.g. `uuid`, `varchar(64)`. |
| `key` | no | Row badge: primary key / foreign key / unique. |

## DiagramEdge

| Field | Required | Contract |
|---|---|---|
| `id` | no | Stable identity for parallel relations; recommended when editing/reordering. |
| `from` | yes | {"type":"string"} |
| `to` | yes | {"type":"string"} |
| `label` | no | {"type":"string"} |
| `variant` | no | {"$ref":"#/definitions/EdgeVariant"} |
| `dashed` | no | {"type":"boolean"} |
| `labelPlacement` | no | Move a pill into an authored whitespace slot without changing its edge. |
| `route` | no | Route a cross-band edge around every intervening band on an outer lane. |

## Boundaries

IDs must be unique; references must exist. Parallel relations need explicit IDs
when their identity must survive reordering. Large graphs and very long labels
need host-specific testing; there is no automatic text measurement or drag editor.
