# Timeline diagrams

Version 0.3.0. The minimal spec below is validated and its complete React
example is compiled against the package tarball. See [API](/aesthc-diagram-lib/versions/0.3.0/docs/api/) for
defaults, [React](/aesthc-diagram-lib/versions/0.3.0/docs/guides/react/) for state/SSR and [Theming](/aesthc-diagram-lib/versions/0.3.0/docs/guides/theming/)
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
      "label": "Design",
      "description": "Agree on the contract."
    },
    {
      "id": "b",
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
need host-specific testing; there is no automatic text measurement or drag editor.
