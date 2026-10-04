# `trend`

A sequence and how it changes; threshold and annotation are placed on the chart.

## Fields

| field | required | notes |
|---|---|---|
| `detail` |  | Long-form Markdown shown only when the user explores |
| `label` |  |  |
| `series` | yes |  |
| `xLabels` |  |  |
| `unit` |  |  |
| `status` |  | Semantic status: good \| warning \| critical \| info \| neutral |
| `threshold` |  |  |
| `annotation` |  |  |

Common fields on every block: `id`, `title`, `priority`, `emphasis`, `density`, `detail`, `sources`.

## Example

```json
{
  "type": "trend",
  "label": "p95 latency",
  "unit": "ms",
  "series": [
    {
      "values": [
        100,
        104,
        98,
        180,
        300,
        420,
        610,
        680
      ]
    }
  ],
  "xLabels": [
    "09",
    "10",
    "11",
    "12"
  ],
  "threshold": 300,
  "annotation": "deploy",
  "status": "critical"
}
```

## Terminal rendering (80 columns)

```text
P95 LATENCY   100 ms ► 680 ms  ▲ +580%
680 ms ┤                                                             ╭──────────
535 ms ┤                                                     ╭───────╯
389 ms ┤                                          ╭──────────╯
244 ms ┤┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╭───────────╯┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
 98 ms ┤──────────────────────────────╯
       └────────────────────────────────────────────────────────────────────────
        09                     10                     11                      12
                                    ▲ deploy
┄┄ threshold 300 ms
```

<details><summary>ASCII fallback</summary>

```text
P95 LATENCY   100 ms > 680 ms  ^ +580%
680 ms |                                                             +----------
535 ms |                                                     +-------+
389 ms |                                          +----------+
244 ms |..............................+-----------+.............................
 98 ms |------------------------------+
       +------------------------------------------------------------------------
        09                     10                     11                      12
                                    ^ deploy
.. threshold 300 ms
```

</details>
