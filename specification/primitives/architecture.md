# `architecture`

Systems and dependencies, optionally with trust boundaries.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `nodes` | yes |  |
| `edges` |  |  |
| `boundaries` |  |  |
| `boundaryTitle` |  | e.g. 'TRUST BOUNDARY' |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "architecture",
  "nodes": [
    {
      "id": "user",
      "label": "user",
      "kind": "actor"
    },
    {
      "id": "web",
      "label": "Web app"
    },
    {
      "id": "auth",
      "label": "Auth"
    },
    {
      "id": "orders",
      "label": "Orders"
    },
    {
      "id": "bus",
      "label": "Event bus"
    }
  ],
  "edges": [
    {
      "from": "user",
      "to": "web"
    },
    {
      "from": "web",
      "to": "auth"
    },
    {
      "from": "web",
      "to": "orders"
    },
    {
      "from": "auth",
      "to": "bus"
    },
    {
      "from": "orders",
      "to": "bus"
    }
  ],
  "boundaries": [
    {
      "label": "user",
      "note": "untrusted",
      "status": "critical"
    },
    {
      "label": "event bus",
      "note": "internal only",
      "status": "good"
    }
  ]
}
```

## Terminal rendering (80 columns)

```text
                                     user
                                      │
                                      ▼
                                 ┌─────────┐
                                 │ Web app │
                                 └────┬────┘
                                      │
                                ┌─────┴─────┐
                                ▼           ▼
                             ┌──────┐   ┌────────┐
                             │ Auth │   │ Orders │
                             └──┬───┘   └───┬────┘
                                │           │
                                └─────┬─────┘
                                      ▼
                                ┌───────────┐
                                │ Event bus │
                                └───────────┘

BOUNDARIES
──────────────────────────────────────────────
user        ✕ untrusted
event bus   ✓ internal only
```

<details><summary>ASCII fallback</summary>

```text
                                     user
                                      |
                                      v
                                 +---------+
                                 | Web app |
                                 +----+----+
                                      |
                                +-----+-----+
                                v           v
                             +------+   +--------+
                             | Auth |   | Orders |
                             +--+---+   +---+----+
                                |           |
                                +-----+-----+
                                      v
                                +-----------+
                                | Event bus |
                                +-----------+

BOUNDARIES
----------------------------------------------
user        x untrusted
event bus   + internal only
```

</details>
