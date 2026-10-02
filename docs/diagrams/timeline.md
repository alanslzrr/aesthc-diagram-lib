# Timeline diagrams

Version 0.3.0. The minimal spec below is validated and its complete React
example is compiled against the package tarball. See [API](../api/index.md) for
defaults, [React](../guides/react.md) for state/SSR and [Theming](../guides/theming.md)
for required host variables. For richer localized examples use the public examples entrypoint.

```json
{
  "type": "timeline",
  "caption": "Release history",
  "legend": {
    "main": "Main path",
    "branch": "Alternative"
  },
  "events": [
    {
      "id": "a",
      "label": "Release",
      "description": "Publish the verified package."
    }
  ]
}
```

## TimelineDiagramSpec

| Field | Required | Contract |
|---|---|---|
| `type` | yes | {"type":"string","const":"timeline"} |
| `caption` | yes | {"type":"string"} |
| `legend` | yes | {"type":"object","properties":{"main":{"type":"string"},"branch":{"type":"string"}},"required":["main","branch"],"additionalProperties":false} |
| `events` | yes | {"type":"array","items":{"$ref":"#/definitions/TimelineEvent"}} |

## TimelineEvent

| Field | Required | Contract |
|---|---|---|
| `id` | yes | {"type":"string"} |
| `label` | yes | {"type":"string"} |
| `kind` | no | {"type":"string"} |
| `sublabel` | no | {"type":"string"} |
| `description` | yes | {"type":"string"} |
| `variant` | no | {"$ref":"#/definitions/EdgeVariant"} |
| `weight` | no | {"$ref":"#/definitions/NodeWeight"} |

## Boundaries

IDs must be unique; references must exist. Parallel relations need explicit IDs
when their identity must survive reordering. Large graphs and very long labels
need host-specific testing. The declarative `DiagramCanvas` is render-only: it
does not measure text or handle dragging. Editing is an opt-in entrypoint —
`@aesthc/diagram-lib/editor` adds selection, movement, label editing, connections
and undo with measured layout, as shown in the [editor guide](../guides/editor.md)
and the [playground](https://alanslzrr.github.io/aesthc-diagram-lib/playground.html).
