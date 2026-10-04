# `metric`

One number made visually meaningful: value, scale, trend, delta.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `label` | yes |  |
| `value` | yes |  |
| `unit` |  | e.g. '%', 'ms', 'GB' |
| `max` |  | Top of the scale; percentages default to 100 |
| `min` |  |  |
| `target` |  |  |
| `trend` |  | Recent values, oldest first |
| `delta` |  | Change vs previous |
| `status` |  | Semantic status: good \| warning \| critical \| info \| neutral |
| `caption` |  | e.g. '93k / 128k' |
| `higherIsBetter` |  |  |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "metric",
  "label": "Context used",
  "value": 93,
  "unit": "k",
  "max": 128,
  "status": "warning",
  "caption": "93k / 128k tokens",
  "trend": [
    12,
    31,
    52,
    71,
    93
  ]
}
```

## Terminal rendering (80 columns)

```text
CONTEXT USED
93k ▲  █████████████████████████████▏░░░░░░░░░░  73%  ▁▃▄▆█
93k / 128k tokens
```

<details><summary>ASCII fallback</summary>

```text
CONTEXT USED
93k !  #############################-----------  73%  _,-=#
93k / 128k tokens
```

</details>
