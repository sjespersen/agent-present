# `hierarchy`

Trees: ownership, taxonomies, module structure.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `root` | yes |  |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "hierarchy",
  "root": {
    "label": "Platform",
    "children": [
      {
        "label": "Identity",
        "children": [
          {
            "label": "Authentication"
          },
          {
            "label": "Authorization"
          }
        ]
      },
      {
        "label": "Commerce",
        "children": [
          {
            "label": "Cart"
          },
          {
            "label": "Checkout",
            "status": "warning",
            "note": "flaky"
          }
        ]
      }
    ]
  }
}
```

## Terminal rendering (80 columns)

```text
Platform
├── Identity
│   ├── Authentication
│   └── Authorization
└── Commerce
    ├── Cart
    └── ▲ Checkout  flaky
```

<details><summary>ASCII fallback</summary>

```text
Platform
|-- Identity
|   |-- Authentication
|   `-- Authorization
`-- Commerce
    |-- Cart
    `-- ! Checkout  flaky
```

</details>
