# `comparison`

Explicit trade-offs between alternatives, with a recommended pick.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `options` | yes |  |
| `dimensions` | yes |  |
| `winner` |  | id or label of the recommended option |
| `rationale` |  | One line explaining the pick |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "comparison",
  "options": [
    {
      "id": "strix",
      "label": "Strix Halo",
      "summary": "big models"
    },
    {
      "id": "rtx",
      "label": "RTX 5090",
      "summary": "speed"
    }
  ],
  "dimensions": [
    {
      "label": "Memory",
      "unit": "GB",
      "values": [
        128,
        32
      ]
    },
    {
      "label": "Speed",
      "unit": "tok/s",
      "values": [
        32,
        81
      ]
    },
    {
      "label": "Power",
      "unit": "W",
      "better": "lower",
      "values": [
        120,
        575
      ]
    }
  ],
  "winner": "strix",
  "rationale": "Fits 70B models"
}
```

## Terminal rendering (80 columns)

```text
          STRIX HALO                         RTX 5090
MEMORY    ████████████████████████████████   ████████
          128 GB ●                           32 GB
SPEED     ████████████▋                      ████████████████████████████████
          32 tok/s                           81 tok/s ●
POWER     ██████▋                            ████████████████████████████████
          120 W ●                            575 W
BEST FOR  BIG MODELS                         SPEED
          ▲
          PICK  Fits 70B models
```

<details><summary>ASCII fallback</summary>

```text
          STRIX HALO                         RTX 5090
MEMORY    ################################   ########
          128 GB *                           32 GB
SPEED     #############                      ################################
          32 tok/s                           81 tok/s *
POWER     #######                            ################################
          120 W *                            575 W
BEST FOR  BIG MODELS                         SPEED
          ^
          PICK  Fits 70B models
```

</details>
