# `verdict`

Conclusions, diagnoses, recommendations and decisions.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | One supporting line, e.g. '2 blockers' |
| `text` | yes | Short, decisive, e.g. "DON'T SHIP YET" |
| `status` |  | Semantic status: good \| warning \| critical \| info \| neutral |
| `next` |  | Recommended next step |
| `command` |  | Command that performs the next step |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "verdict",
  "text": "Don't ship yet",
  "status": "critical",
  "detail": "2 blockers",
  "next": "Fix the migration first",
  "command": "pnpm db:migrate"
}
```

## Terminal rendering (80 columns)

```text
▌ ✕ DON'T SHIP YET
▌ 2 blockers
▌ ► Fix the migration first
▌ $ pnpm db:migrate
```

<details><summary>ASCII fallback</summary>

```text
| x DON'T SHIP YET
| 2 blockers
| > Fix the migration first
| $ pnpm db:migrate
```

</details>
