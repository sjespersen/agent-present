# `checklist`

Items with a completion state; the title shows the tally.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `items` | yes |  |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "checklist",
  "title": "Release",
  "items": [
    {
      "label": "tests",
      "state": "done"
    },
    {
      "label": "lint",
      "state": "done"
    },
    {
      "label": "migration",
      "state": "failed",
      "note": "not applied"
    },
    {
      "label": "smoke test",
      "state": "pending"
    }
  ]
}
```

## Terminal rendering (80 columns)

```text
RELEASE                                                                    2/4 ✓
✓ tests
✓ lint
✕ migration   not applied
○ smoke test
```

<details><summary>ASCII fallback</summary>

```text
RELEASE                                                                    2/4 +
+ tests
+ lint
x migration   not applied
o smoke test
```

</details>
