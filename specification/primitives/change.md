# `change`

Code change impact: churn per file and risk, with the risk centre marked.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `files` | yes |  |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "change",
  "files": [
    {
      "path": "src/auth/session.ts",
      "added": 42,
      "removed": 17,
      "risk": "high"
    },
    {
      "path": "src/web/login.tsx",
      "added": 18,
      "removed": 8,
      "risk": "medium"
    },
    {
      "path": "tests/auth.test.ts",
      "added": 63,
      "risk": "low"
    }
  ]
}
```

## Terminal rendering (80 columns)

```text
src/auth/session.ts  +42 -17  █████████▒▒▒▒   HIGH  ◄ risk centre
src/web/login.tsx    +18  -8  ████▒▒          MED
tests/auth.test.ts   +63  -0  ██████████████  LOW
```

<details><summary>ASCII fallback</summary>

```text
src/auth/session.ts  +42 -17  #########----   HIGH  < risk centre
src/web/login.tsx    +18  -8  ####--          MED
tests/auth.test.ts   +63  -0  ##############  LOW
```

</details>
