# `text`

Prose, intentionally constrained: ~240 characters at a glance; longer text collapses.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `text` | yes |  |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "text",
  "text": "Text remains available, but it has to earn its place. Long Markdown belongs in `detail`, behind progressive disclosure."
}
```

## Terminal rendering (80 columns)

```text
Text remains available, but it has to earn its place. Long Markdown belongs in
detail, behind progressive disclosure.
```

<details><summary>ASCII fallback</summary>

```text
Text remains available, but it has to earn its place. Long Markdown belongs in
detail, behind progressive disclosure.
```

</details>
