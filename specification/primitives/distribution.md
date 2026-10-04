# `distribution`

Comparing quantities. `whole: true` renders parts of one total as a stacked bar.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `items` | yes |  |
| `unit` |  |  |
| `whole` |  | Items are parts of one whole (renders a stacked bar) |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "distribution",
  "title": "Token usage",
  "items": [
    {
      "label": "Code analysis",
      "value": 43
    },
    {
      "label": "Tool output",
      "value": 22
    },
    {
      "label": "Reasoning",
      "value": 18
    },
    {
      "label": "Conversation",
      "value": 17
    }
  ],
  "unit": "%"
}
```

## Terminal rendering (80 columns)

```text
TOKEN USAGE
Code analysis  ███████████████████████████████████████████████████████████ 43%
Tool output    ██████████████████████████████▏                             22%
Reasoning      ████████████████████████▊                                   18%
Conversation   ███████████████████████▍                                    17%
```

<details><summary>ASCII fallback</summary>

```text
TOKEN USAGE
Code analysis  ########################################################### 43%
Tool output    ##############################                              22%
Reasoning      #########################                                   18%
Conversation   #######################                                     17%
```

</details>
