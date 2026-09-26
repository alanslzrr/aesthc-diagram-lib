# Flowchart diagrams

Version 0.3.0. The minimal spec below is validated and its complete React
example is compiled against the package tarball. See [API](/aesthc-diagram-lib/versions/0.3.0/docs/api/) for
defaults, [React](/aesthc-diagram-lib/versions/0.3.0/docs/guides/react/) for state/SSR and [Theming](/aesthc-diagram-lib/versions/0.3.0/docs/guides/theming/)
for required host variables. For richer localized examples use the public examples entrypoint.

```json
{
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
}
```

## FlowchartDiagramSpec

| Field | Required | Contract |
|---|---|---|
| `type` | yes | {"type":"string","const":"flowchart"} |
| `caption` | yes | {"type":"string"} |
| `legend` | yes | {"type":"object","properties":{"main":{"type":"string"},"branch":{"type":"string"}},"required":["main","branch"],"additionalProperties":false} |
| `nodes` | yes | {"type":"array","items":{"$ref":"#/definitions/DiagramNode"}} |
| `edges` | yes | {"type":"array","items":{"$ref":"#/definitions/DiagramEdge"}} |
| `level` | no | Global level override for every node; omit for automatic topological levels. |
| `direction` | no | Main flow direction. |

## DiagramNode

| Field | Required | Contract |
|---|---|---|
| `id` | yes | {"type":"string"} |
| `label` | yes | {"type":"string"} |
| `description` | yes | Localized explanation shown on hover/focus and available to assistive technology. |
| `kind` | no | Mono micro-label above the title, e.g. 'Trigger', 'Engine', 'Gate'. |
| `sublabel` | no | {"type":"string"} |
| `weight` | no | {"$ref":"#/definitions/NodeWeight"} |
| `nudge` | no | Vertical fine-tune in viewBox units, applied after the layout centres the node. |
| `shape` | no | Draw this node as something other than a hairline card. |
| `textAnchor` | no | Label alignment for `event` shapes (timeline). |
| `fields` | no | ER table rows (only meaningful for `shape: 'table'`). |
| `initial` | no | State-machine: draw a double outline (initial state). |
| `final` | no | State-machine: draw a hollow centre (final state). |

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
