# Sequence diagrams

Version 0.3.0. The minimal spec below is validated and its complete React
example is compiled against the package tarball. See [API](/aesthc-diagram-lib/versions/0.3.0/docs/api/) for
defaults, [React](/aesthc-diagram-lib/versions/0.3.0/docs/guides/react/) for state/SSR and [Theming](/aesthc-diagram-lib/versions/0.3.0/docs/guides/theming/)
for required host variables. For richer localized examples use the public examples entrypoint.

```json
{
  "type": "sequence",
  "caption": "Request and response",
  "legend": {
    "main": "Main path",
    "branch": "Alternative"
  },
  "participants": [
    {
      "id": "a",
      "label": "Client"
    },
    {
      "id": "b",
      "label": "Server"
    }
  ],
  "messages": [
    {
      "id": "request",
      "from": "a",
      "to": "b",
      "label": "GET /"
    },
    {
      "id": "response",
      "from": "b",
      "to": "a",
      "label": "200 OK"
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
need host-specific testing; there is no automatic text measurement or drag editor.
