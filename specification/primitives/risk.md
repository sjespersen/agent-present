# `risk`

Risks on an impact × likelihood matrix; severity is derived, not declared.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `items` | yes |  |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "risk",
  "items": [
    {
      "label": "release blocker",
      "impact": "high",
      "likelihood": "high"
    },
    {
      "label": "payment retries",
      "impact": "high",
      "likelihood": "medium"
    },
    {
      "label": "minor issues",
      "impact": "medium",
      "likelihood": "low"
    }
  ]
}
```

## Terminal rendering (80 columns)

```text
       impact ►    LOW    MED   HIGH
likelihood HIGH     ·      ·      █     █ release blocker
            MED     ·      ·      ▲     ▲ payment retries
            LOW     ·      ●      ·     ● minor issues
```

<details><summary>ASCII fallback</summary>

```text
       impact >    LOW    MED   HIGH
likelihood HIGH     .      .      #     # release blocker
            MED     .      .      ^     ^ payment retries
            LOW     .      o      .     o minor issues
```

</details>
