# State machine diagrams

Version 0.3.0. The minimal spec below is validated and its complete React
example is compiled against the package tarball. See [API](/versions/0.3.0/docs/api/) for
defaults, [React](/versions/0.3.0/docs/guides/react/) for state/SSR and [Theming](/versions/0.3.0/docs/guides/theming/)
for required host variables. For richer localized examples use the public examples entrypoint.

```json
{
  "type": "state-machine",
  "caption": "Job lifecycle",
  "legend": {
    "main": "Main path",
    "branch": "Alternative"
  },
  "states": [
    {
      "id": "a",
      "label": "Pending",
      "initial": true
    },
    {
      "id": "b",
      "label": "Complete",
      "final": true
    }
  ],
  "transitions": [
    {
      "id": "finish",
      "from": "a",
      "to": "b",
      "label": "finish"
    }
  ]
}
```

## StateMachineDiagramSpec

| Field | Required | Contract |
|---|---|---|
| `type` | yes | {"type":"string","const":"state-machine"} |
| `caption` | yes | {"type":"string"} |
| `legend` | yes | {"type":"object","properties":{"main":{"type":"string"},"branch":{"type":"string"}},"required":["main","branch"],"additionalProperties":false} |
| `states` | yes | {"type":"array","items":{"$ref":"#/definitions/StateMachineState"}} |
| `transitions` | yes | {"type":"array","items":{"$ref":"#/definitions/StateTransition"}} |

## StateMachineState

| Field | Required | Contract |
|---|---|---|
| `id` | yes | {"type":"string"} |
| `label` | yes | {"type":"string"} |
| `kind` | no | {"type":"string"} |
| `sublabel` | no | {"type":"string"} |
| `weight` | no | {"$ref":"#/definitions/NodeWeight"} |
| `description` | no | {"type":"string"} |
| `initial` | no | Drawn with a double outline. |
| `final` | no | Drawn with a hollow centre. |

## StateTransition

| Field | Required | Contract |
|---|---|---|
| `id` | no | Stable identity for parallel relations; recommended when editing/reordering. |
| `from` | yes | {"type":"string"} |
| `to` | yes | {"type":"string"} |
| `label` | no | {"type":"string"} |
| `variant` | no | {"$ref":"#/definitions/EdgeVariant"} |
| `dashed` | no | {"type":"boolean"} |

## Boundaries

IDs must be unique; references must exist. Parallel relations need explicit IDs
when their identity must survive reordering. Large graphs and very long labels
need host-specific testing; there is no automatic text measurement or drag editor.
