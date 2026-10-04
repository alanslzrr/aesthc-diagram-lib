# Sequence diagrams

Version 0.3.0. The minimal spec below is validated and its complete React
example is compiled against the package tarball. See [API](../api/index.md) for
defaults, [React](../guides/react.md) for state/SSR and [Theming](../guides/theming.md)
for required host variables. For richer localized examples use the public examples entrypoint.

```json
{
  "type": "sequence",
  "caption": "Client retry",
  "legend": {
    "main": "Main path",
    "branch": "Alternative"
  },
  "participants": [
    {
      "id": "a",
      "label": "Client"
    }
  ],
  "messages": [
    {
      "id": "retry",
      "from": "a",
      "to": "a",
      "label": "retry"
    }
  ]
}
```

## SequenceDiagramSpec

| Field | Required | Contract |
|---|---|---|
| `type` | yes | {"type":"string","const":"sequence"} |
| `caption` | yes | {"type":"string"} |
| `legend` | yes | {"type":"object","properties":{"main":{"type":"string"},"branch":{"type":"string"}},"required":["main","branch"],"additionalProperties":false} |
| `participants` | yes | {"type":"array","items":{"$ref":"#/definitions/SequenceParticipant"}} |
| `messages` | yes | {"type":"array","items":{"$ref":"#/definitions/SequenceMessage"}} |

## SequenceParticipant

| Field | Required | Contract |
|---|---|---|
| `id` | yes | {"type":"string"} |
| `label` | yes | {"type":"string"} |
| `kind` | no | {"type":"string"} |

## SequenceMessage

| Field | Required | Contract |
|---|---|---|
| `id` | yes | {"type":"string"} |
| `from` | yes | {"type":"string"} |
| `to` | yes | {"type":"string"} |
| `label` | no | {"type":"string"} |
| `variant` | no | {"$ref":"#/definitions/EdgeVariant"} |
| `dashed` | no | {"type":"boolean"} |
| `activation` | no | Draw a thin activation bar on the target lifeline for this message. |

## Boundaries

IDs must be unique; references must exist. Parallel relations need explicit IDs
when their identity must survive reordering. Large graphs and very long labels
need host-specific testing. The declarative `DiagramCanvas` is render-only: it
does not measure text or handle dragging. Editing is an opt-in entrypoint —
`@aesthc/diagram-lib/editor` adds selection, movement, label editing, connections
and undo with measured layout, as shown in the [editor guide](../guides/editor.md)
and the [playground](https://alanslzrr.github.io/aesthc-diagram-lib/playground.html).
