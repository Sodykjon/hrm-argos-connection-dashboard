# Pension-age statistics ("Пенсия ёши") — design

Date: 2026-08-05
Status: approved, ready for implementation planning

## Goal

Add a third, fully decoupled statistic to the dashboard: how much of the MoH
workforce is already at pension age or about to reach it, by region and by
gender. Leadership needs one number they can defend ("11.6% of our staff are
working past pension age") and a map showing where the exposure is worst.

## Non-goals (decided, not oversights)

- **No personal data.** Aggregates only. No names, no birth dates, nothing that
  identifies a person reaches Vercel/Upstash. The user chose this explicitly.
- **No per-organization breakdown.** The source report paginates 10 rows at a
  time behind a ~30 s query; pulling ~1,700 orgs is slow and fragile. Region is
  the unit.
- **No position-category breakdown.** The source report has position columns
  only for the *under-30* youth-quota metrics. Pension age × position does not
  exist upstream.
- **No 3-year / 5-year windows.** The source exposes exactly two pension cuts:
  "already at pension age, still working" and "reaches pension age this year".
  A 3/5-year projection would need per-person birth dates (~690 k lookups).
  Rejected. The age buckets (50–60, 60+) are shown instead as context.

## Data source

`hrm.argos.uz` → report `#/report/all-employee-distribution-by-seniority`
("Возрастное распределение всех сотрудников организации").

- Endpoint: `POST /api/Report/Report/GetAllEmployeeDistributionBySeniority`
  (Bearer token from the logged-in session, as with the other ARGOS pulls).
- Organization filter **must be «Все организации»**. The default is
  «ГГС организации», which covers only civil servants — 2,187 people instead of
  689,461. Getting this wrong silently produces a plausible but wrong dashboard.
- Region filter «Выберите область» has exactly 14 entries, matching
  `GEO_REGIONS` one-to-one.
- Each request takes ~30 s. A full refresh is 15 requests (1 national + 14
  regional) ≈ 8–15 minutes.

### Why not the Excel export

«Экспорт в Excel» produces a sheet with **one data row** — the national total
for whatever filter is active — regardless of what the on-screen table shows.
It is useful only as a cross-check of the national figures.

### Columns consumed (exact upstream headers)

Each of these has two sub-columns: `жами` and `шундан: хотин-қизлар`.

| Field | Upstream header |
|---|---|
| `total` | `Амалдаги ходимлар сони` (screen renders it as `Амалда фаолият кўрсататёган ходимлар сони`, with the upstream typo) |
| `a3040` | `30 ёшдан 40 ёшгача ходимлар сони` |
| `a4050` | `40 ёшдан 50 ёшгача ходимлар сони` |
| `a5060` | `50 ёшдан 60 ёшгача ходимлар сони` |
| `a60p` | `60 ёшдан юқори ходимлар сони` |
| `pensionWorking` | `Ёшга доир пенсия олаётган ва пенсияга чиқиш ҳуқуқига эга бўлиб, ишлаётган ходимлар сони` |
| `reaching` | `2024-йилда пенсия ёшига етадиган ходимлар сони` |

**Trap:** the last header is hardcoded to `2024` upstream even when the report
runs for 2026. Match this column by prefix/suffix (`пенсия ёшига етадиган`), never
by the year, and label it in our UI as "shu yili" rather than echoing 2024.

### Verified national figures (2026-08-05)

| Metric | Жами | Хотин-қизлар |
|---|---|---|
| Total staff | 689 461 | 549 586 |
| 30–40 | 233 005 | 192 116 |
| 40–50 | 188 630 | 158 289 |
| 50–60 | 135 652 | 106 055 |
| 60+ | 39 362 | 18 690 |
| **Pension age, still working** | **79 672** | **59 000** |
| **Reaches pension age this year** | **15 309** | **12 177** |

Headline share: 79 672 / 689 461 = **11.6 %**. Reaching this year: **2.2 %**.

Note: two pulls minutes apart returned 689 461 and 689 466. The report is live,
so small drift between the national pull and the regional pulls is expected and
must not be treated as a parse error.

## Data model (`lib/types.ts`)

Mirrors the completion types. All counts are integers; shares are computed at
render time, not stored.

```ts
export interface PensionStat {
  name: string;            // canonical Cyrillic region name, or the residual row
  total: number;      totalWomen: number;
  a3040: number;      a3040Women: number;
  a4050: number;      a4050Women: number;
  a5060: number;      a5060Women: number;
  a60p: number;       a60pWomen: number;
  pensionWorking: number;  pensionWorkingWomen: number;
  reaching: number;        reachingWomen: number;
}

export interface PensionSnapshot {
  date: string;            // ISO report date, from the CSV filename
  uploadedAt: string;
  overall: PensionStat;    // national, name = "" (unused)
  regions: PensionStat[];  // 14 geographic + 1 residual
}

export interface PensionManifestEntry {
  date: string; uploadedAt: string; url: string;
  overall: PensionStat; regions: PensionStat[];
}
export interface PensionManifest {
  latestUrl: string;
  snapshots: PensionManifestEntry[]; // chronological
}
```

There is no `orgs[]` — a snapshot is ~15 rows, so the manifest carries the full
history inline with no size concern.

## Storage (`lib/store.ts`)

New fixed keys `pension:manifest` and `pension:snapshot:latest`. Add
`getPensionManifest()` (wrapped in React `cache()`, per-request only — do not add
a TTL memo, that is what broke the completion trend) and `publishPension()`,
a direct analogue of `publishCompletion()`: filter out the same date, append,
sort, and only overwrite `snapshot:latest` when the upload is the newest date.
The two existing datasets are untouched.

## Ingestion

Bookmarklet at `Documents\HRM_pensiya_bookmarklet.html`, following the pattern of
the existing completion bookmarklet:

- runs on a page where the user is already logged in; reads the session token
- issues the 15 requests **sequentially** (they are heavy; concurrency risks
  server-side throttling and makes partial failure hard to reason about)
- persists progress to `localStorage` so a mid-run token refresh/reload resumes
  instead of restarting
- downloads `HRM_pensiya_YYYY-MM-DD.csv`

Bookmarklet gotchas already known and to be respected: no `%` in the source,
encode with `encodeURIComponent` (not `encodeURI`).

CSV shape (`;`-separated, header row, canonical Cyrillic region names):

```
hudud;jami;jami_ayol;a3040;a3040_ayol;a4050;a4050_ayol;a5060;a5060_ayol;a60p;a60p_ayol;pensiya;pensiya_ayol;yetadigan;yetadigan_ayol
```

The national row is written with `hudud` = `МИЛЛИЙ`. The parser
(`lib/parse-pension.ts`) takes the report date from the filename, exactly as
`parse-completion.ts` does.

## Region name mapping — the critical detail

The report returns Latin Uzbek names; the dashboard's canonical keys (slugs,
GeoJSON matching, KV) are Uzbek Cyrillic and must not change.

| ARGOS | Canonical |
|---|---|
| Andijon viloyati | Андижон вилояти |
| Buxoro viloyati | Бухоро вилояти |
| Jizzax viloyati | Жиззах вилояти |
| Qashqadaryo viloyati | Қашқадарё вилояти |
| Navoiy viloyati | Навоий вилояти |
| Namangan viloyati | Наманган вилояти |
| Samarqand viloyati | Самарқанд вилояти |
| Sirdaryo viloyati | Сирдарё вилояти |
| Surxondaryo viloyati | Сурхондарё вилояти |
| Toshkent viloyati | Тошкент вилояти |
| Farg‘оna viloyati | Фарғона вилояти |
| Xorazm viloyati | Хоразм вилояти |
| Toshkent shahri | Тошкент шаҳри |
| Qoraqalpog‘iston Respublikasi | Қорақалпоғистон Республикаси |

**`Farg‘оna viloyati` contains a Cyrillic `о` (U+043E) where Latin `o` belongs.**
Verified on 2026-08-05 by code point. A naive string compare will never match
Fergana. Therefore the lookup must normalize before comparing:

1. lowercase
2. map Cyrillic homoglyphs that turn up inside otherwise-Latin text to their
   Latin look-alikes: `а→a`, `е→e`, `о→o`, `р→p`, `с→c`, `у→y`, `х→x`, `к→k`,
   `м→m`, `т→t`. These are the pairs that are visually identical after
   lowercasing. Letters whose intended Latin equivalent is ambiguous (`в`, `н`)
   are deliberately left out — if one ever appears, the loud failure below
   catches it, which is better than guessing wrong.
3. collapse apostrophe variants (`‘ ’ ' ʻ ʼ`) to a single form
4. collapse whitespace

Normalization runs only on the incoming ARGOS side, to produce a lookup key. It
never touches the canonical Cyrillic names — those are a different script and are
bridged by the explicit table above, not by transliteration.

An unmapped region name must fail the upload loudly with the offending string in
the error `detail` — never be silently dropped.

## Residual row

Σ(14 regions) < national total, because the central apparatus and the republican
centers do not belong to any region. The difference is surfaced as an explicit
row, `Марказий аппарат ва республика марказлари`, computed as
`overall − Σ(regions)`. It is excluded from the choropleth via
`isGeographicRegion()` but shown in the table and in the totals, matching how the
completion dashboard handles its non-geographic groups.

If the residual comes out negative, the upload is rejected — that means the
national and regional pulls disagree beyond drift.

## Pages and UI

- `/pensiya` — main dashboard
- `/pensiya/[region]` — per-region detail
- new nav entry; third upload section on `/admin`

Components, reusing the existing primitives (`StatTile`, `Chart`, `UzMap`,
`SahifaShapka` equivalents already used by the completion board):

- **KPI tiles** — total staff · pension-age working (count + %) · reaching this
  year (count + %) · women's share within the pension-age group
- **Choropleth** — regions by pension-age share. If the national spread turns out
  to be narrow, keep the explicit key stating the ramp endpoints, as the
  connection map does; the honesty of that key is the point.
- **Age pyramid** — 30–40 / 40–50 / 50–60 / 60+ stacked, women split out
- **Region table** — sorted by share, with the gender columns and the residual row
- **Trend** — accumulates as uploads land

Dark "national monitoring center" styling, tokens from `app/globals.css`. No
auto-refresh (settled earlier: static display of uploaded data).

## i18n

New `pension` section in `lib/i18n/uz.ts` and `lib/i18n/ru.ts`. `ru.ts` uses
`satisfies Strings`, so a missing key fails the build. Region names are never
translated as keys — only through `regionLabel()`. Any ECharts option memo must
list the dictionary in its deps, or the chart keeps the old language.

## Tests

`node:test` for `lib/parse-pension.ts`:

- the Cyrillic-`о` Fergana name resolves to `Фарғона вилояти`
- each apostrophe variant resolves
- an unknown region name throws with the name in the message
- residual = overall − Σ(regions); negative residual rejected
- the "reaches pension age" column matches even when the header says a stale year

Run TypeScript locally via `node --experimental-strip-types` with a **relative**
`./lib/x.ts` import — an absolute Windows path fails the ESM loader.

## Risks

- The 15-request refresh is slow and depends on a live session. If ARGOS changes
  the endpoint or the filter semantics, the bookmarklet breaks; the parser and
  dashboard are unaffected because ingestion is a plain CSV upload.
- The upstream year label is already stale (2024). If upstream ever fixes it,
  prefix matching still works.
- `Farg‘оna` may be corrected upstream at some point; the normalization handles
  both spellings, so no action needed if that happens.
