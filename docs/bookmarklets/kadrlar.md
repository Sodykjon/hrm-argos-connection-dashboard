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

## Measured limits

| Batch | Organisations | Result |
|---|---|---|
| 1 institution (1052) | 1 | **200, 264 ms** |
| whole ministry | 2 134 | **500 Execution Timeout Expired** |
| biggest region (Самаркандская) | 488 | **400 validation error, 67 ms** — see below |
| republican level | 358 | not measured — session expired |
| district level | 2 | not measured — session expired |

**Safe batch size: NOT YET ESTABLISHED.** Do not write the extraction script
against a guessed number.

### The unresolved 400

The 488-organisation request failed in 67 ms with
`One or more validation errors occurred` — a *validation* rejection, not the
timeout the whole-ministry request produced. That is a different failure mode
and it is not yet understood. Candidates, in order of likelihood:

1. `metaData.rows` was set to 5000; the app itself sends 10. There may be a
   server-side cap.
2. `institutionIds` may have a length limit lower than 488.
3. The `selectTreeNodes` set used here is larger than any the app sends in one
   request, and some combination may be rejected.

**This matters for the script's retry logic.** The plan's Task 5 halves a batch
on a 500 and retries; a 400 would fall straight through that and abort the pull.
Whatever the cause turns out to be, the retry has to handle both codes, or the
cause has to be removed.

Next session, with a live token, isolate it by varying one thing at a time:
send `rows: 10` at 488 ids; send the full node set at 50 ids; send a minimal
node set at 488 ids. The one that flips the result names the constraint.

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
