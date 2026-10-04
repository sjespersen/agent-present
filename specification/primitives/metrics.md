# `metrics`

A compact group of 2–6 related measures — instead of a row of boxes.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `items` | yes |  |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "metrics",
  "items": [
    {
      "label": "files",
      "value": 81
    },
    {
      "label": "tests",
      "value": 435
    },
    {
      "label": "coverage",
      "value": 87,
      "unit": "%",
      "status": "good"
    },
    {
      "label": "risk",
      "value": "HIGH",
      "status": "critical"
    }
  ]
}
```

## Terminal rendering (80 columns)

```text
81                  435                 87% ✓               HIGH ✕
FILES               TESTS               COVERAGE            RISK
```

<details><summary>ASCII fallback</summary>

```text
81                  435                 87% +               HIGH x
FILES               TESTS               COVERAGE            RISK
```

</details>
