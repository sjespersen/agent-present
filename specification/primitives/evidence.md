# `evidence`

A claim, its confidence, and the observations that support (or contradict) it.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `claim` | yes |  |
| `confidence` |  | Confidence |
| `items` | yes |  |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "evidence",
  "claim": "Auth failures began after migration 182.",
  "confidence": "high",
  "items": [
    {
      "label": "migration deployed",
      "value": "09:16"
    },
    {
      "label": "failures begin",
      "value": "09:16"
    },
    {
      "label": "rollback",
      "value": "09:21"
    }
  ]
}
```

## Terminal rendering (80 columns)

```text
Auth failures began after migration 182.                     ●●● HIGH CONFIDENCE
   migration deployed  ──► 09:16
   failures begin      ──► 09:16
   rollback            ──► 09:21
```

<details><summary>ASCII fallback</summary>

```text
Auth failures began after migration 182.                     3/3 HIGH CONFIDENCE
   migration deployed  --> 09:16
   failures begin      --> 09:16
   rollback            --> 09:21
```

</details>
