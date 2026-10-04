# `flow`

Processes, pipelines and causal chains. `status: critical` on an edge draws a broken link.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `nodes` | yes |  |
| `edges` |  | Omit to connect nodes in order |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "flow",
  "nodes": [
    {
      "id": "api",
      "label": "API"
    },
    {
      "id": "auth",
      "label": "Auth"
    },
    {
      "id": "policy",
      "label": "Policy"
    },
    {
      "id": "allow",
      "label": "ALLOW",
      "kind": "outcome"
    },
    {
      "id": "deny",
      "label": "DENY",
      "kind": "outcome",
      "status": "critical"
    }
  ],
  "edges": [
    {
      "from": "api",
      "to": "auth"
    },
    {
      "from": "auth",
      "to": "policy"
    },
    {
      "from": "policy",
      "to": "allow"
    },
    {
      "from": "policy",
      "to": "deny"
    }
  ]
}
```

## Terminal rendering (80 columns)

```text
                                    ┌─────┐
                                    │ API │
                                    └──┬──┘
                                       │
                                       ▼
                                    ┌──────┐
                                    │ Auth │
                                    └──┬───┘
                                       │
                                       ▼
                                   ┌────────┐
                                   │ Policy │
                                   └───┬────┘
                                       │
                                   ┌───┴───┐
                                   ▼       ▼
                                 ALLOW   ✕ DENY
```

<details><summary>ASCII fallback</summary>

```text
                                    +-----+
                                    | API |
                                    +--+--+
                                       |
                                       v
                                    +------+
                                    | Auth |
                                    +--+---+
                                       |
                                       v
                                   +--------+
                                   | Policy |
                                   +---+----+
                                       |
                                   +---+---+
                                   v       v
                                 ALLOW   x DENY
```

</details>
