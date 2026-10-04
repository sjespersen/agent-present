# `progress`

Work in progress. With intent `progress` hosts show it temporarily and replace it with the final result.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `items` | yes |  |
| `signal` |  |  |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "progress",
  "items": [
    {
      "label": "files",
      "value": 64,
      "total": 81
    },
    {
      "label": "tests",
      "state": "done"
    }
  ],
  "signal": {
    "label": "auth migration",
    "value": "high risk",
    "status": "critical"
  }
}
```

## Terminal rendering (80 columns)

```text
files   █████████████████████████▎░░░░░░    64 / 81
tests   ████████████████████████████████  complete

current signal
auth migration  ────────────────►  HIGH RISK
```

<details><summary>ASCII fallback</summary>

```text
files   #########################-------    64 / 81
tests   ################################  complete

current signal
auth migration  ---------------->  HIGH RISK
```

</details>
