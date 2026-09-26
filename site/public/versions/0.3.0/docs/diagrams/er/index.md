# Entity relationship diagrams

Version 0.3.0. The minimal spec below is validated and its complete React
example is compiled against the package tarball. See [API](/versions/0.3.0/docs/api/) for
defaults, [React](/versions/0.3.0/docs/guides/react/) for state/SSR and [Theming](/versions/0.3.0/docs/guides/theming/)
for required host variables. For richer localized examples use the public examples entrypoint.

```json
{
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
}
```

## ErDiagramSpec

| Field | Required | Contract |
|---|---|---|
| `type` | yes | {"type":"string","const":"er"} |
| `caption` | yes | {"type":"string"} |
| `legend` | yes | {"type":"object","properties":{"main":{"type":"string"},"branch":{"type":"string"}},"required":["main","branch"],"additionalProperties":false} |
| `entities` | yes | {"type":"array","items":{"$ref":"#/definitions/ErEntity"}} |
| `relations` | yes | {"type":"array","items":{"$ref":"#/definitions/ErRelation"}} |

## ErEntity

| Field | Required | Contract |
|---|---|---|
| `id` | yes | {"type":"string"} |
| `label` | yes | {"type":"string"} |
| `kind` | no | {"type":"string"} |
| `weight` | no | {"$ref":"#/definitions/NodeWeight"} |
| `fields` | yes | {"type":"array","items":{"$ref":"#/definitions/TableField"}} |

## TableField

| Field | Required | Contract |
|---|---|---|
| `name` | yes | {"type":"string"} |
| `type` | no | Optional column type, e.g. `uuid`, `varchar(64)`. |
| `key` | no | Row badge: primary key / foreign key / unique. |

## ErRelation

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
