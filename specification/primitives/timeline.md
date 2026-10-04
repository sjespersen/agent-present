# `timeline`

Chronology, laid out spatially. Notes hang below their event.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `events` | yes |  |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "timeline",
  "events": [
    {
      "at": "09:14",
      "label": "deploy"
    },
    {
      "at": "09:16",
      "label": "errors",
      "status": "critical",
      "note": "auth failures begin"
    },
    {
      "at": "09:18",
      "label": "rollback",
      "status": "warning"
    },
    {
      "at": "09:21",
      "label": "stable",
      "status": "good"
    }
  ]
}
```

## Terminal rendering (80 columns)

```text
09:14           09:16              09:18           09:21
●─────────────────✕──────────────────▲─────────────────●
deploy          errors            rollback        stable
                  ▲
                  │
         auth failures begin
```

<details><summary>ASCII fallback</summary>

```text
09:14           09:16              09:18           09:21
o-----------------x------------------!-----------------o
deploy          errors            rollback        stable
                  ^
                  |
         auth failures begin
```

</details>
