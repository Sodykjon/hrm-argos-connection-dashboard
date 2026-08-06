# Vacancies, and one source for the whole workforce dataset — design

Date: 2026-08-06
Status: approved, ready for implementation planning

## Goal

Add vacancy statistics to the dashboard, and in doing so collapse the pension
dataset and the vacancy dataset into **one pull from one source**: the ARGOS
statistics constructor.

Today the pension page is fed by the report `all-employee-distribution-by-seniority`
("Статистическая таблица 3"). The constructor supersedes it on every axis and adds
what the vacancy feature needs. One pull, one truth, two pages.

## Non-goals

- **No narrow medical specialties** (тор йўналишлар). The user asked for these and
  then withdrew the request once the exploration showed why: ARGOS's «лавозим»
  dimension is civil-service grade (мутахассис, техник ходим, бўлим бошлиғи), not
  clinical specialty. Cardiologist / surgeon / anaesthetist does not exist as an
  aggregate anywhere. The only place specialties appear is the SSV-15 report, which
  lists individuals by name, birth date and nationality — off limits under the
  standing no-personal-data rule. If this is ever needed, it has to come from a new
  ARGOS report, not from us aggregating personal records.
- **No age chart on the vacancy page.** Age belongs to `/pensiya`.
- **No reconciliation of the headcount discrepancy** — see the open question below.
  This design does not attempt to settle which ARGOS total is correct; it makes the
  dashboard use exactly one of them, consistently, and say which.

## What the exploration established

All of this was verified against the live system on 2026-08-06, not inferred.

### The org tree — this is the unlock

```
GET /api/Staff/Institution/GetSpInstitutionTreeV2      (~883 KB, Bearer token)
```

Returns the full nested hierarchy. Node fields include `label`, `key`, `data`
(the institution id), `type`, `level`, `orgType`, `tin`, `rootId`,
`belongCivilService`, `activeBillingStatus`.

```
Министерства (1)
└── Министерство здравоохранения Республики Узбекистан (1052)
    ├── Республиканский уровень        — 51 organisations
    ├── Территориальный уровень        — 14  ← exactly our regions
    └── Районный/городской уровень
```

The 14 territorial nodes carry real ids: Андижанской 14085, Бухарской 14163,
Ферганской 14124, Джизакской 14062, Наманганской 14121, Наваийской 14161,
Кашкадарьинской 14160, …

**Why this matters:** every *report* endpoint returns `institutionId: 0` on every
row — verified on `GetAllEmployeeDistributionBySeniority` (2 284 rows) and
`GetStaffComposition` (592 rows). The tree is the only place organisation identity
exists, and the constructor is the only endpoint that accepts it. Region membership
therefore stops being a name-matching heuristic and becomes ARGOS's own hierarchy.

The current pension parser matches regional rollups with anchored regexes over
Russian oblast names. That code becomes unnecessary.

### The constructor

```
POST /api/report/constructor/GetReport
{
  "metaData": { "first": 1, "rows": <n> },
  "institutionIds": [1052, 9248, ...],
  "selectTreeNodes": [{ "key": "general" }, { "key": "totalVakant", "parentKey": "general" }, ...]
}
```

Response: `{ general: { items: [ { institutionId, ...fields } ], totalItems } }`.

Field keys, captured from the app's own request:

| Group | Keys |
|---|---|
| general | `totalStavka` · `totalEmployee` · `totalVakant` · `totalWomen` |
| age (parent `age`) | `ageTo30` · `ageFrom30To40` · `ageFrom40To50` · `ageFrom50To60` · `ageFrom60` |
| pension (parent `pensionAge`) | `totalPensionAge` · `totalPensionAgeWoman` |
| reaching (parent `currentYearPensionAge`) | `totalCurrentYearPensionAge` · `totalCurrentYearPensionAgeWoman` |
| turnover | `totalAcceptEmployee` · `totalDismissedEmployee` |
| also available, not used | `education`/`secondary`/`vocational`/`higher`, `nation`/`uzbek`/… |

Verified single-institution response (id 1052):

```json
{"institutionId":1052,"totalStavka":434,"totalEmployee":320,"totalVakant":114,"totalWomen":78}
```

Note `434 = 320 + 114` — vacancies are positions minus filled positions.

**The label is right here.** The constructor calls the column
«**2026** йилда пенсия ёшига етадиган ходимлар сони». The report we use today says
«2024-йилда» — a stale hardcoded year documented as a trap in the previous spec.
Moving to the constructor removes that trap rather than working around it.

### The timeout constraint

| Request | Result |
|---|---|
| 1 institution id | 200, **264 ms** |
| 2 134 ids (whole ministry) | **500 — Execution Timeout Expired** |

So the pull must be batched. The natural batch is a region: walk each of the 14
territorial subtrees, collect their ids, one request each, plus one for the
republican level and one for the district level. 16 requests total.

**Unmeasured risk, to be settled in the plan's first step:** a single region may
hold ~150 organisations, and no batch of that size has been timed. If a
region-sized batch also times out, the batch has to be split further. The
implementation must therefore measure before it commits to a batch size, and the
ingestion script must handle a 500 by halving the batch and retrying rather than
failing the whole pull.

## The residual row disappears

Today `/pensiya` shows a computed residual — national minus the sum of regions —
because organisations outside the viloyat administrations had no other home. It
came to 66 117, and its composition could not be established from the report data:
the label named "central apparatus and republican centres" and 38 % of it turned
out to be the sanitary-epidemiological committee.

The tree removes the guesswork. Instead of one subtracted row there are two real,
named ones:

| Row | Source |
|---|---|
| 14 viloyats | Территориальный уровень |
| Республика даражаси | Республиканский уровень (51 organisations) |
| Туман/шаҳар даражаси | Районный/городской уровень |

Nothing is computed by subtraction, so nothing needs explaining. The parser's
residual logic, its clamp, and its negative-residual guard all go away — along
with the tests that cover them.

**Keep one check in their place:** Σ(rows) must equal the national row within a
small tolerance, and a mismatch must warn with the difference. The drift that
motivated the clamp (15 requests against a live report over several minutes) still
exists here.

## Rename: `pension` → `kadrlar`

The dataset now carries staffing, vacancies, age, pension and turnover. Calling it
`pension` would be a name that lies — the same defect fixed today in the residual
row's label, reintroduced one level up.

- `lib/parse-pension.ts` → `lib/parse-kadrlar.ts`
- `PensionSnapshot`/`PensionStat` → `KadrlarSnapshot`/`KadrlarStat`
- KV keys `pension:manifest` / `pension:snapshot:latest` → `kadrlar:*`
- `getLatestPension()` → `getLatestKadrlar()`
- `data/seed-pension.json` → `data/seed-kadrlar.json`

`lib/pension-metrics.ts` keeps its name: it computes pension-specific claims
(`nearly`, the exposure share, the risk ramp) and stays owned by `/pensiya`.

No migration is required: production holds no pension data, and the local `.data/`
is scratch. This is mechanical renaming, and `tsc` catches every miss.

## Data model

`KadrlarStat` extends today's `PensionStat` with six fields:

```ts
export interface KadrlarStat {
  name: string;            // canonical Cyrillic region name, or a level name
  // staffing — new
  stavka: number;          // totalStavka   — иш ўринлари
  vacant: number;          // totalVakant   — вакансиялар
  accepted: number;        // totalAcceptEmployee
  dismissed: number;       // totalDismissedEmployee
  // existing shape, unchanged in meaning
  total: number;           // totalEmployee — амалдаги ходимлар
  totalWomen: number;
  u30: number;             // ageTo30 — now supplied, no longer derived
  a3040: number;  a4050: number;  a5060: number;  a60p: number;
  pensionWorking: number;  pensionWorkingWomen: number;
  reaching: number;        reachingWomen: number;
}
```

Two consequences worth stating:

1. **`u30` becomes a real field.** Today it is recovered by subtraction in
   `ageBands()` because the report has no under-30 column. The constructor has
   `ageTo30`. `ageBands()` keeps its clamping (upstream drift can still make a band
   exceed its parent) but stops inventing the first band.
2. **The age bands lose their per-gender splits.** The constructor's `age` group is
   `ageTo30 … ageFrom60` with no `…Woman` variants — only `totalWomen` overall, plus
   the two pension figures' women splits. Today's age chart splits every band by
   gender, so this is a real loss.

   **Decision: drop the split.** `PensionAgeChart` becomes single-series. The
   alternative — keeping the old report as a second pull purely for that one visual
   — would reintroduce the two-source problem this whole design exists to remove,
   and would put two different `total`s on the same page. The chart's job is the age
   structure; the gender story is already carried by the KPI tiles and the hero.

## Ingestion

Unchanged in shape: a browser-console script produces a CSV, the operator uploads
it at `/admin`. The dashboard never calls ARGOS at runtime.

CSV columns:

```
hudud;shtat;jami;jami_ayol;vakansiya;qabul;boshagan;u30;a3040;a4050;a5060;a60p;pensiya;pensiya_ayol;yetadigan;yetadigan_ayol
```

17 rows: `МИЛЛИЙ`, 14 viloyats, `Республика даражаси`, `Туман/шаҳар даражаси`.

The script walks the tree, groups ids by branch, batches the constructor calls,
halves a batch on a 500, and writes the CSV. It is documented in
`docs/bookmarklets/` beside the existing pension one, which it replaces.

**Region naming:** the script emits the canonical Uzbek-Cyrillic names directly,
taken from the tree's position rather than from string matching. The homoglyph
normalisation in `resolveArgosRegion` stays — a hand-typed CSV must still work, and
it costs nothing — but it is no longer load-bearing.

## Pages

`/pensiya` is unchanged in layout. It reads the new dataset; the residual row
becomes two named rows; the age chart loses its gender split.

`/vakansiya` is new, built on the same skeleton because it works and is familiar:

- **Hero** — total vacancies, and the share of positions unfilled (`vacant / stavka`)
- **Map + ranking** — vacancy share by region, on the same inverted relative ramp
  as the pension map (high is bad), with the endpoint key that makes a narrow
  spread honest
- **Turnover** — hired vs left, by region
- **Table** — 17 rows, xlsx export

Nav: `/vakansiya` joins «Кадрлар таҳлили» beside `/pensiya`.

Both pages carry the source note, updated to name the constructor.

## Tests

`node:test`, extending the existing suite:

- the tree walk assigns every leaf to exactly one branch, and the 14 territorial
  ids match `GEO_REGIONS` one-to-one
- CSV header validation still throws naming the offending column
- Σ(rows) vs the national row: equal passes, a difference warns with the amount
- `vacant + total === stavka` per row, warning when it does not
- the existing region-resolution, zero-total, missing-region, duplicate-row and
  second-national-row guards all survive the rename

## Open question, carried forward

ARGOS reports at least five different staff totals: the pension report 689 485,
«Возраст сотрудников» 578 450, filled positions 632 493, «Учет кадров» 630 296,
filled stavka 491 993. The ministry's own working figure is around 570 000.

This design does not resolve that. It reduces the dashboard to **one** of those
numbers — the constructor's `totalEmployee` — and names its source on the page. The
reconciliation is a question for ARGOS's administrators, and the numbers above are
the evidence to put in front of them.

Note that switching sources may change the figures currently on `/pensiya`. That is
expected and is the point: one number that can be traced beats two that cannot be
reconciled.
