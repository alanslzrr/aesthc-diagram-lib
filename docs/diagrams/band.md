# Band diagrams

Version 0.3.0. The minimal spec below is validated and its complete React
example is compiled against the package tarball. See [API](../api/index.md) for
defaults, [React](../guides/react.md) for state/SSR and [Theming](../guides/theming.md)
for required host variables. For richer localized examples use the public examples entrypoint.

```json
{
  "type": "band",
  "caption": "Request pipeline",
  "legend": {
    "main": "Main path",
    "branch": "Alternative"
  },
  "bands": [
    {
      "title": "Input"
    },
    {
      "title": "Output"
    }
  ],
  "nodes": [
    {
      "id": "a",
      "label": "Request",
      "description": "Receive a request.",
      "band": 0
    },
    {
      "id": "b",
      "label": "Response",
      "description": "Return a response.",
      "band": 1
    }
  ],
  "edges": [
    {
      "id": "request",
      "from": "a",
      "to": "b"
    }
  ]
}
```

## BandDiagramSpec

| Field | Required | Contract |
|---|---|---|
| `type` | yes | {"type":"string","const":"band"} |
| `caption` | yes | {"type":"string"} |
| `legend` | yes | {"type":"object","properties":{"main":{"type":"string"},"branch":{"type":"string"}},"required":["main","branch"],"additionalProperties":false} |
| `bands` | yes | {"type":"array","items":{"$ref":"#/definitions/DiagramBand"}} |
| `nodes` | yes | {"type":"array","items":{"$ref":"#/definitions/BandDiagramNode"}} |
| `edges` | yes | {"type":"array","items":{"$ref":"#/definitions/DiagramEdge"}} |
| `decisions` | no | {"type":"array","items":{"$ref":"#/definitions/DiagramDecision"}} |
| `continuations` | no | {"type":"array","items":{"$ref":"#/definitions/DiagramContinuation"}} |

## DiagramBand

| Field | Required | Contract |
|---|---|---|
| `title` | yes | {"type":"string"} |

## BandDiagramNode

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
| `band` | yes | {"type":"number"} |

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

## DiagramDecision

| Field | Required | Contract |
|---|---|---|
| `id` | yes | {"type":"string"} |
| `source` | yes | {"type":"string"} |
| `label` | yes | {"type":"string"} |

## DiagramContinuation

| Field | Required | Contract |
|---|---|---|
| `id` | yes | {"type":"string"} |
| `from` | yes | {"type":"string"} |
| `label` | yes | {"type":"string"} |
| `destination` | yes | {"type":"string"} |
| `side` | yes | {"$ref":"#/definitions/ContinuationSide"} |
| `anchor` | no | {"$ref":"#/definitions/ContinuationAnchor"} |
| `labelPlacement` | yes | {"type":"string","enum":["above-source","below-source"]} |
| `variant` | no | {"$ref":"#/definitions/EdgeVariant"} |
| `ariaLabel` | no | Spoken text when the compact visible label needs clearer return semantics. |

## Boundaries

IDs must be unique; references must exist. Parallel relations need explicit IDs
when their identity must survive reordering. Large graphs and very long labels
need host-specific testing; there is no automatic text measurement or drag editor.
