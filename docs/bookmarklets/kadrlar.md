# Pulling the kadrlar CSV out of hrm.argos.uz

Source: the statistics constructor (`#/report/constructor`), not the
`all-employee-distribution-by-seniority` report the previous version used.

## Organisation counts (2026-08-06)

From `GET /api/Staff/Institution/GetSpInstitutionTreeV2`, walking
`Министерство здравоохранения (1052)`.

| Branch | Organisations |
|---|---|
| Территориальный уровень | 1 976 across 14 regions |
| Республиканский уровень | 358 |
| Районный/городской уровень | 2 |
| **Whole ministry** | **2 338** |

Per region, largest first — the spread is wide enough that a single batch size
cannot be assumed to suit all of them:

| Region | Organisations |
|---|---|
| Самаркандская | 488 |
| Ташкентская область | 293 |
| город Ташкент | 188 |
| Джизакская | 186 |
| Кашкадарьинская | 120 |
| Ферганская | 105 |
| Сурхандарьинская | 85 |
| Андижанская · Бухарская · Наваийская · Хорезмская | 78 each |
| Наманганская | 77 |
| Каракалпакстан | 67 |
| Сырдарьинская | 55 |

## Measured limits (2026-08-06)

| Batch | Organisations | Result |
|---|---|---|
| 1 institution (1052) | 1 | 200, 264 ms |
| Районный/городской уровень | 2 | 200, 1.1 s |
| Республиканский уровень | 358 | 200, 9.8 s, 327 items |
| **Самаркандская — the biggest region** | **488** | **200, 3.8–11.3 s, 224 items** |
| whole ministry | 2 338 | **500 Execution Timeout Expired** at 30 s |

**Batch = one branch.** The largest region fits in a single request, so the pull
is 16 requests — 14 regions plus the two other levels — and takes roughly a
minute. No sub-batching is needed. Keep a halve-and-retry on a 500 anyway: the
ceiling sits between 488 and 2 338 and could move as organisations are added.

### `metaData.rows` must be 1–200, and does not paginate

An early attempt sent `rows: 5000` and got a 400 in 67 ms — a *validation*
rejection, not a size problem:

```json
{"errors":{"MetaData.rows":["Row must be between 1 and 200"]}}
```

The same 400 appeared at 50 ids, which is what proved the batch size was
innocent. **Send `rows: 200`.**

`rows` does not limit the returned items. Verified on the 488-id request: `rows:1`,
`rows:10` and `rows:200` each returned all **224** items with an identical
`totalEmployee` sum of **60 148**. There is no pagination to handle.

### Cross-check against the old source

That 60 148 for Samarkand is byte-identical to the figure the previous extraction
produced from `all-employee-distribution-by-seniority`'s
«Управление здравоохранения Самаркандской области (МА+барча Хтлар)» rollup. Two
independent endpoints, two different grouping mechanisms, the same number — good
evidence that the source switch preserves the regional cut.

Note 488 ids return only 224 items: organisations with no staff record produce no
row. Sum the items; do not expect one row per id.

## The script

Not written yet — blocked on the batch size above. See
`docs/superpowers/plans/2026-08-06-kadrlar-source-switch.md`, Task 5.

## Field reference

`POST /api/report/constructor/GetReport`

```json
{ "metaData": { "first": 1, "rows": 10 },
  "institutionIds": [1052],
  "selectTreeNodes": [{ "key": "general" }, { "key": "totalVakant", "parentKey": "general" }] }
```

Response: `{ "general": { "items": [ { "institutionId": 1052, "totalStavka": 434, "totalEmployee": 320, "totalVakant": 114, "totalWomen": 78 } ] } }`

Leaves must be accompanied by their parent as its own entry (`{"key":"general"}`,
`{"key":"age"}`, `{"key":"pensionAge"}`, `{"key":"currentYearPensionAge"}`).

| Key | parentKey | Meaning |
|---|---|---|
| `totalStavka` | `general` | иш ўринлари |
| `totalEmployee` | `general` | амалдаги ходимлар |
| `totalVakant` | `general` | вакансиялар |
| `totalWomen` | `general` | хотин-қизлар |
| `totalAcceptEmployee` | `general` | ишга қабул қилинган |
| `totalDismissedEmployee` | `general` | ишдан бўшаган |
| `ageTo30` `ageFrom30To40` `ageFrom40To50` `ageFrom50To60` `ageFrom60` | `age` | age bands, **no gender split** |
| `totalPensionAge` `totalPensionAgeWoman` | `pensionAge` | at pension age, working |
| `totalCurrentYearPensionAge` `totalCurrentYearPensionAgeWoman` | `currentYearPensionAge` | reaches pension age in 2026 |

The constructor labels the last one «**2026** йилда…». The old report's column
header says «2024-йилда» regardless of the year requested — one of the reasons
for the switch.

## Why the tree, and not name matching

Every *report* endpoint returns `institutionId: 0` on every row — verified on
`GetAllEmployeeDistributionBySeniority` (2 284 rows) and `GetStaffComposition`
(592 rows). The tree and the constructor are the only places organisation
identity exists. The previous extraction had to group regions by running anchored
regexes over Russian organisation titles; this one reads ARGOS's own hierarchy.
