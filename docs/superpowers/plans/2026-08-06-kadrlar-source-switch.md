# Kadrlar Dataset — Source Switch Implementation Plan (Plan A of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the pension dataset onto the ARGOS statistics constructor, rename it to `kadrlar` now that it carries staffing and vacancies too, and replace the computed residual row with two real named rows from ARGOS's own hierarchy.

**Architecture:** The dataset keeps its existing shape — manual CSV upload, own KV keys, own manifest, React `cache()` reads. What changes is where the numbers come from and what they contain. A browser-console script walks `GetSpInstitutionTreeV2` to learn which organisations belong to which region, then batches `constructor/GetReport` calls to collect the figures. The dashboard still never calls ARGOS at runtime.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 strict, Tailwind v4, Apache ECharts 6, Upstash Redis, `node:test` with native Node 24 type stripping.

**Scope:** This is Plan A. It ends with `/pensiya` working on the new source and verified against real data. Plan B adds `/vakansiya` on top and is written separately — deliberately, so the number change lands and is checked before a new page is built on it.

## Global Constraints

- **Git author email MUST be `sodiqjonboqijonov@gmail.com`** — Vercel blocks deploys otherwise. Verify with `git config user.email`; do not change it.
- **Branch:** continue on `pensiya-yoshi`. Never commit to `main`.
- **No personal data, ever.** Aggregates only. The SSV-15 report and anything else listing individuals is off limits, including as an intermediate step.
- **Canonical region names stay Uzbek Cyrillic** and drive slugs, GeoJSON matching and KV keys. Display-only translation via `regionLabel()`.
- **`lib/i18n/ru.ts` ends with `satisfies Strings`** — a key added to `uz.ts` and missing from `ru.ts` is a compile error. Always edit both.
- **Never add a TTL memo to the manifest reads.** React `cache()` only. A TTL memo previously broke the completion trend.
- **Tests import with relative paths including the `.ts` extension** (`../lib/parse-kadrlar.ts`). The `@/` alias does not resolve under `node --test`.
- **Inside `lib/`, runtime value imports need the `.ts` extension**; `import type` stays extensionless.
- **`npm run lint` is NOT clean and never was** — `components/motion/AnimatedNumber.tsx:32` (`react-hooks/set-state-in-effect`) is byte-identical to `main`. The gate is "no NEW problems beyond that one".
- **`npm test` prints a `MODULE_TYPELESS_PACKAGE_JSON` warning** on every run. Known, ignore.
- The dev server sits behind a login gate; only `/login`, `/api/login`, `/api/logout` are exempt. Scripted checks must `POST /api/login` first and carry the `hrm_site` cookie. `SITE_PASSWORD`/`ADMIN_PASSWORD` live in git-ignored `.env.local` — read them for local verification only, never print or commit them, never disable the gate.
- **Port 3000:** kill any dev server you start (`Get-NetTCPConnection -LocalPort 3000` then `Stop-Process`) before finishing.

## Verified ARGOS facts (do not re-derive)

Captured live on 2026-08-06.

**Org tree:** `GET /api/Staff/Institution/GetSpInstitutionTreeV2`, Bearer token from `localStorage.accessToken`. ~883 KB. Node fields: `label`, `key`, `data` (institution id), `type`, `level`, `orgType`, `tin`, `rootId`, `belongCivilService`, `activeBillingStatus`, `children`.

```
Министерства (1)
└── Министерство здравоохранения Республики Узбекистан (1052)
    ├── Республиканский уровень        51 children
    ├── Территориальный уровень        14 children  ← the regions
    └── Районный/городской уровень
```

Region ids seen: Андижанской 14085 · Бухарской 14163 · Ферганской 14124 · Джизакской 14062 · Наманганской 14121 · Наваийской 14161 · Кашкадарьинской 14160.

**Constructor:** `POST /api/report/constructor/GetReport`

```json
{ "metaData": { "first": 1, "rows": 500 },
  "institutionIds": [1052],
  "selectTreeNodes": [{ "key": "general" }, { "key": "totalVakant", "parentKey": "general" }] }
```

Response: `{ "general": { "items": [ { "institutionId": 1052, "totalStavka": 434, "totalEmployee": 320, "totalVakant": 114, "totalWomen": 78 } ], "totalItems": 1 } }`

Field keys and their parents:

| Key | parentKey | Meaning |
|---|---|---|
| `totalStavka` | `general` | иш ўринлари (positions) |
| `totalEmployee` | `general` | амалдаги ходимлар |
| `totalVakant` | `general` | вакансиялар |
| `totalWomen` | `general` | хотин-қизлар |
| `ageTo30` … `ageFrom60` | `age` | 5 age bands, **no per-band gender** |
| `totalPensionAge`, `totalPensionAgeWoman` | `pensionAge` | at pension age, working |
| `totalCurrentYearPensionAge`, `totalCurrentYearPensionAgeWoman` | `currentYearPensionAge` | reaches pension age in 2026 |
| `totalAcceptEmployee`, `totalDismissedEmployee` | `general` | hired / left in period |

Parent keys must be included as their own `{ "key": "<parent>" }` entries alongside the leaves — the app sends `{"key":"general"}`, `{"key":"age"}`, `{"key":"pensionAge"}`, `{"key":"currentYearPensionAge"}`.

**Timing:** 1 institution id → 200 in **264 ms**. 2 134 ids (whole ministry) → **500 Execution Timeout Expired**. The safe batch size is unmeasured — Task 1 measures it.

**Every report endpoint returns `institutionId: 0`.** Only the tree and the constructor carry real ids.

---

## File Structure

**Renamed (content changes too — see the tasks):**
- `lib/parse-pension.ts` → `lib/parse-kadrlar.ts` — CSV parse, region resolution, snapshot build
- `data/seed-pension.json` → `data/seed-kadrlar.json`
- `tests/parse-pension.test.ts` → `tests/parse-kadrlar.test.ts`

**Modified:**
- `lib/types.ts` — `Pension*` → `Kadrlar*`, six new fields, per-band gender fields removed
- `lib/store.ts` — keys `pension:*` → `kadrlar:*`, `publishPension` → `publishKadrlar`
- `lib/data.ts` — `getLatestPension` → `getLatestKadrlar`, same for history
- `lib/pension-metrics.ts` — **keeps its name**; `ageBands` loses the gender split, `u30` stops being derived
- `lib/regions.ts` — `PENSION_RESIDUAL` removed, two level constants added
- `app/api/pension/route.ts` → `app/api/kadrlar/route.ts`
- `app/pensiya/page.tsx`, `app/pensiya/[region]/page.tsx`, `app/admin/page.tsx`, `app/page.tsx`
- `components/pension/*.tsx` — import updates; `PensionAgeChart` becomes single-series
- `lib/i18n/uz.ts`, `lib/i18n/ru.ts`
- `tests/pension-metrics.test.ts`

**Created:**
- `docs/bookmarklets/kadrlar.md` — the tree-walk + batched-constructor extraction, replacing `pensiya.md`

**Not touched:** the connection and completion datasets, and every file that serves them.

---

### Task 1: Measure the constructor's batch ceiling

**Files:**
- Create: `docs/bookmarklets/kadrlar.md` (the "Measured limits" section only; the script itself lands in Task 5)

**Interfaces:**
- Consumes: nothing.
- Produces: a documented safe batch size, and the per-region organisation counts. Task 5's batching strategy depends on both.

**This task requires the user's live ARGOS session** and runs in the browser console — it cannot be scripted from Node. It is first because its result can invalidate Task 5's design, and the spec explicitly forbids assuming a batch size.

Everything else in this plan can proceed without it; if the session is unavailable, note that and start at Task 2, but do not write Task 5 until this is answered.

- [ ] **Step 1: Load the tree and count each region's subtree**

In the browser console on any logged-in `hrm.argos.uz` page:

```js
const tok = localStorage.accessToken;
const tree = await (await fetch("/api/Staff/Institution/GetSpInstitutionTreeV2",
  { headers: { authorization: "Bearer " + tok } })).json();

const moh = tree[0].children[0];                       // Министерство здравоохранения (1052)
const branch = (label) => moh.children.find(c => new RegExp(label, "i").test(c.label || ""));
const ids = (node) => { const out = []; (function walk(n) {
  if (n.data) out.push(Number(n.data));
  (n.children || []).forEach(walk);
})(node); return out; };

const territorial = branch("Территориальн");
const report = territorial.children.map(c => ({ region: (c.label||"").slice(0,44), ids: ids(c).length }));
console.table(report);
console.log("republican:", ids(branch("Республиканск")).length,
            "| district:", ids(branch("Районн")).length,
            "| biggest region:", Math.max(...report.map(r => r.ids)));
```

Record the biggest region's organisation count — that is the batch size the design has to survive.

- [ ] **Step 2: Time the biggest region as one batch**

```js
const nodes = [
  { key: "general" }, { key: "totalStavka", parentKey: "general" },
  { key: "totalEmployee", parentKey: "general" }, { key: "totalVakant", parentKey: "general" },
  { key: "totalWomen", parentKey: "general" },
  { key: "age" }, { key: "ageTo30", parentKey: "age" }, { key: "ageFrom30To40", parentKey: "age" },
  { key: "ageFrom40To50", parentKey: "age" }, { key: "ageFrom50To60", parentKey: "age" },
  { key: "ageFrom60", parentKey: "age" },
  { key: "pensionAge" }, { key: "totalPensionAge", parentKey: "pensionAge" },
  { key: "totalPensionAgeWoman", parentKey: "pensionAge" },
  { key: "currentYearPensionAge" }, { key: "totalCurrentYearPensionAge", parentKey: "currentYearPensionAge" },
  { key: "totalCurrentYearPensionAgeWoman", parentKey: "currentYearPensionAge" },
  { key: "totalAcceptEmployee", parentKey: "general" },
  { key: "totalDismissedEmployee", parentKey: "general" },
];

const timeBatch = async (idList) => {
  const t0 = performance.now();
  const r = await fetch("/api/report/constructor/GetReport", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + tok },
    body: JSON.stringify({ metaData: { first: 1, rows: 5000 }, institutionIds: idList, selectTreeNodes: nodes }),
  });
  const t = await r.text();
  let items = null;
  try { items = JSON.parse(t).general?.items?.length ?? null; } catch {}
  return { n: idList.length, ms: Math.round(performance.now() - t0), status: r.status, items, err: r.status !== 200 ? t.slice(0, 120) : null };
};

const biggest = territorial.children
  .map(c => ({ c, n: ids(c).length })).sort((a, b) => b.n - a.n)[0];
console.log("biggest region:", biggest.c.label, biggest.n);
console.log(await timeBatch(ids(biggest.c)));
```

- [ ] **Step 3: If that 500s, bisect down to a size that holds**

Only if Step 2 returned a non-200. Halve until it passes, then record the largest size that did:

```js
let list = ids(biggest.c), size = list.length;
while (size > 8) {
  size = Math.floor(size / 2);
  const r = await timeBatch(list.slice(0, size));
  console.log(r);
  if (r.status === 200) break;
}
```

- [ ] **Step 4: Also time the republican branch**

It holds 51 organisations but they are large ones, so it may behave differently from a region of the same count:

```js
console.log("republican:", await timeBatch(ids(branch("Республиканск"))));
console.log("district:", await timeBatch(ids(branch("Районн"))));
```

- [ ] **Step 5: Write the measurements down**

Create `docs/bookmarklets/kadrlar.md` with only this section for now — Task 5 appends the script:

```markdown
# Pulling the kadrlar CSV out of hrm.argos.uz

## Measured limits (YYYY-MM-DD)

| Batch | Organisations | Result |
|---|---|---|
| 1 institution (1052) | 1 | 200, 264 ms |
| whole ministry | 2 134 | **500 Execution Timeout** |
| biggest region (<name>) | <n> | <status, ms> |
| republican level | 51 | <status, ms> |
| district level | <n> | <status, ms> |

**Safe batch size: <n>.** Larger batches must be split.
```

Fill every `<…>` with a real measurement. If a row could not be measured, write why — do not leave a placeholder.

- [ ] **Step 6: Commit**

```bash
git add docs/bookmarklets/kadrlar.md
git commit -m "Measure the constructor's batch ceiling

The whole ministry times out and one id answers in 264ms; everything
between was guesswork. These are the numbers the ingestion batching
is designed against.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Rename pension → kadrlar

**Files:**
- Rename: `lib/parse-pension.ts` → `lib/parse-kadrlar.ts`, `data/seed-pension.json` → `data/seed-kadrlar.json`, `tests/parse-pension.test.ts` → `tests/parse-kadrlar.test.ts`, `app/api/pension/route.ts` → `app/api/kadrlar/route.ts`
- Modify: `lib/types.ts`, `lib/store.ts`, `lib/data.ts`, `lib/pension-metrics.ts`, `tests/pension-metrics.test.ts`, `app/pensiya/page.tsx`, `app/pensiya/[region]/page.tsx`, `app/admin/page.tsx`, `app/page.tsx`, all seven files under `components/pension/`

**Interfaces:**
- Consumes: nothing.
- Produces: `KadrlarStat`, `KadrlarSnapshot`, `KadrlarManifestEntry`, `KadrlarManifest` (`lib/types.ts`); `getKadrlarManifest()`, `getKadrlarByRef(ref)`, `publishKadrlar(snapshot)` (`lib/store.ts`); `getLatestKadrlar()`, `getKadrlarHistory()` (`lib/data.ts`); `parseKadrlarCsv(text, fileName?)`, `buildKadrlarSnapshot(overall, regions, date)`, `ParsedKadrlar` (`lib/parse-kadrlar.ts`).

**This task changes no behaviour.** Same fields, same numbers, same rendering — only names. Do it as one mechanical pass so the next task's diff is about substance. `npx tsc --noEmit` catches every miss, so lean on it rather than grepping.

**What keeps its name and why:** `lib/pension-metrics.ts`, `pensionMetrics()`, `PensionMetrics`, `components/pension/`, the `/pensiya` route and the `S.pension.*` dictionary block. Those are genuinely about pension age — the page, its claims and its copy. Only the *dataset* is being renamed, because the dataset now carries staffing and vacancies too. Renaming the pension page's own vocabulary would be churn with no gain, and would make Plan B's `/vakansiya` look like it owns the pension metrics.

- [ ] **Step 1: Rename the four files with git**

```bash
git mv lib/parse-pension.ts lib/parse-kadrlar.ts
git mv data/seed-pension.json data/seed-kadrlar.json
git mv tests/parse-pension.test.ts tests/parse-kadrlar.test.ts
git mv app/api/pension app/api/kadrlar
```

- [ ] **Step 2: Rename the types**

In `lib/types.ts`, in the pension block only: `PensionStat` → `KadrlarStat`, `PensionSnapshot` → `KadrlarSnapshot`, `PensionManifestEntry` → `KadrlarManifestEntry`, `PensionManifest` → `KadrlarManifest`. Replace the block's header comment with:

```ts
// ---------------------------------------------------------------------------
// Kadrlar ("Кадрлар") — the third statistic, sourced from the hrm.argos.uz
// statistics constructor and ingested via CSV upload. Carries staffing,
// vacancies, age structure, pension exposure and turnover. Fully decoupled
// from the two datasets above (own keys, own manifest, own pages).
// All figures are integer head-counts; shares are derived at render time.
// ---------------------------------------------------------------------------
```

- [ ] **Step 3: Rename the storage layer**

In `lib/store.ts`: keys `penManifest: "pension:manifest"` → `kadrManifest: "kadrlar:manifest"` and `penSnapshot: "pension:snapshot:latest"` → `kadrSnapshot: "kadrlar:snapshot:latest"`; `getPensionManifest` → `getKadrlarManifest`; `getPensionByRef` → `getKadrlarByRef`; `publishPension` → `publishKadrlar`; `PensionPutResult` → `KadrlarPutResult`. Leave the `cache()` wrapper and the newest-date guard exactly as they are.

- [ ] **Step 4: Rename the read API and the rest**

`lib/data.ts`: `getLatestPension` → `getLatestKadrlar`, `getPensionHistory` → `getKadrlarHistory`, `PensionData` → `KadrlarData`, seed import path to `@/data/seed-kadrlar.json`, `seedPension` → `seedKadrlar`.

`lib/parse-kadrlar.ts`: `parsePensionCsv` → `parseKadrlarCsv`, `buildPensionSnapshot` → `buildKadrlarSnapshot`, `ParsedPension` → `ParsedKadrlar`.

`app/api/kadrlar/route.ts`: import `publishKadrlar` and `getKadrlarHistory`, type `KadrlarSnapshot`.

`app/admin/page.tsx`: the fetch URLs `/api/pension` → `/api/kadrlar`, `parsePensionCsv` → `parseKadrlarCsv`, `ParsedPension` → `ParsedKadrlar`. **Leave the `pen*` state variable names and the `S.admin.pen*` dictionary keys alone** — that section is still the pension upload from the operator's point of view, and renaming them buys nothing.

Everything else follows from `tsc`.

- [ ] **Step 5: Verify nothing changed but names**

```bash
npx tsc --noEmit && npm test && npm run build
```

Expected: tsc clean, 34/34 tests, build clean.

Then confirm the rendered page is byte-identical apart from nothing:

```bash
git stash && npm run build 2>&1 | tail -3   # baseline still builds
git stash pop
```

- [ ] **Step 6: Confirm no stale references**

```bash
grep -rn "parsePensionCsv\|publishPension\|getLatestPension\|getPensionHistory\|PensionSnapshot\|PensionStat\|pension:manifest\|api/pension" lib/ app/ components/ tests/
```

Expected: no output. `pensionMetrics`, `PensionMetrics`, `S.pension.*` and `components/pension/` are expected to remain and are not part of this grep.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Rename the pension dataset to kadrlar

It is about to carry staffing, vacancies and turnover as well as
pension age, and a dataset named for one of its five subjects is the
same defect as the residual row's old label.

Names only -- same fields, same numbers, same rendering. The pension
page keeps its own vocabulary: pension-metrics.ts, components/pension,
/pensiya and S.pension.* are genuinely about pension age.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Extend the model, and give up the per-band gender split

**Files:**
- Modify: `lib/types.ts` (`KadrlarStat`), `lib/pension-metrics.ts` (`AgeBand`, `ageBands`), `components/pension/PensionAgeChart.tsx`, `lib/i18n/uz.ts`, `lib/i18n/ru.ts`
- Test: `tests/pension-metrics.test.ts`

**Interfaces:**
- Consumes: `KadrlarStat` (Task 2).
- Produces: `KadrlarStat` with `stavka`, `vacant`, `accepted`, `dismissed`, a real `u30`, and no `*Women` age fields; `AgeBand = { key: AgeBandKey; total: number }`.

**The loss, stated plainly.** The constructor's `age` group is `ageTo30 … ageFrom60` with **no per-band gender**. Today's chart stacks women and men in every band. That split cannot survive the source switch, and the spec's decision is to drop it rather than keep a second source alive for one visual — two sources on one page is the exact problem this work exists to end. Gender is still carried by `totalWomen`, `pensionWorkingWomen` and `reachingWomen`, which is where the page actually makes gender claims.

**The gain:** `u30` stops being a subtraction. `ageTo30` is a real column, so the first band is measured rather than inferred.

- [ ] **Step 1: Write the failing tests**

Replace the `ageBands` tests in `tests/pension-metrics.test.ts` with these, and extend `NATIONAL` with the new fields. The fixture below keeps today's verified figures and adds plausible staffing ones:

```ts
const NATIONAL: KadrlarStat = {
  name: "",
  stavka: 780000, vacant: 90515, accepted: 4210, dismissed: 3980,
  total: 689485, totalWomen: 549622,
  u30: 92780,
  a3040: 233081, a4050: 188588, a5060: 135681, a60p: 39355,
  pensionWorking: 79686, pensionWorkingWomen: 59019,
  reaching: 15306, reachingWomen: 12176,
};

test("age bands are read straight from the source, not derived", () => {
  const b = ageBands(NATIONAL);
  assert.equal(b.length, 5);
  assert.deepEqual(b.map((x) => x.key), ["u30", "a3040", "a4050", "a5060", "a60p"]);
  assert.equal(b[0].total, 92780, "u30 is now a real column, not total minus the rest");
});

test("age bands clamp a negative to zero", () => {
  // Upstream drift can still make a band arrive negative; it must not reach a chart.
  const b = ageBands({ ...NATIONAL, a60p: -5 });
  assert.equal(b.find((x) => x.key === "a60p")?.total, 0);
});

test("age bands carry no gender — the constructor does not supply it", () => {
  const b = ageBands(NATIONAL);
  for (const band of b) {
    assert.deepEqual(Object.keys(band).sort(), ["key", "total"]);
  }
});
```

Keep every other test in the file unchanged; they use `NATIONAL` and still hold.

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL — `NATIONAL` has excess properties and `ageBands` still returns `women`/`men`.

- [ ] **Step 3: Extend `KadrlarStat`**

Replace the interface body in `lib/types.ts`:

```ts
export interface KadrlarStat {
  name: string; // canonical Cyrillic region name; "" for the national row
  /** Иш ўринлари — established positions, filled or not. */
  stavka: number;
  /** Амалдаги ходимлар — people actually in post. */
  total: number;
  totalWomen: number;
  /** Вакансиялар. Upstream satisfies stavka = total + vacant. */
  vacant: number;
  /** Ҳисобот даврида ишга қабул қилинган. */
  accepted: number;
  /** Ҳисобот даврида ишдан бўшаган. */
  dismissed: number;
  // Age bands. The constructor supplies no gender split for these.
  u30: number;
  a3040: number;
  a4050: number;
  a5060: number;
  a60p: number;
  /** Already at pension age and still working. */
  pensionWorking: number;
  pensionWorkingWomen: number;
  /** Reaches pension age during the current year. */
  reaching: number;
  reachingWomen: number;
}
```

- [ ] **Step 4: Simplify `ageBands`**

In `lib/pension-metrics.ts`, replace the `AgeBand` interface and the function:

```ts
export interface AgeBand {
  key: AgeBandKey;
  total: number;
}

/**
 * Five bands straight from the source. The old implementation recovered the
 * under-30 band by subtracting the other four from the total, because the
 * previous report had no under-30 column; the constructor has `ageTo30`, so
 * the band is measured now.
 *
 * No gender: the constructor's age group carries none. The page makes its
 * gender claims from totalWomen and the two pension women counts instead.
 */
export function ageBands(s: KadrlarStat): AgeBand[] {
  const band = (key: AgeBandKey, total: number): AgeBand => ({
    key,
    total: Math.max(0, total),
  });
  return [
    band("u30", s.u30),
    band("a3040", s.a3040),
    band("a4050", s.a4050),
    band("a5060", s.a5060),
    band("a60p", s.a60p),
  ];
}
```

Update the file's other signatures from `PensionStat` to `KadrlarStat`.

- [ ] **Step 5: Make the chart single-series**

In `components/pension/PensionAgeChart.tsx`, replace the two stacked series with one, and drop the legend:

```tsx
      legend: { show: false },
      series: [
        {
          type: "bar",
          barMaxWidth: 26,
          itemStyle: { color: WOMEN, borderRadius: [0, 3, 3, 0] },
          data: bands.map((b) => b.total),
        },
      ],
```

Keep the constant named `WOMEN`? No — rename it to `BAR` and delete `MEN`, since neither meaning survives. Update the tooltip formatter to drop the women/men lines, keeping the band label, the count and the share:

```tsx
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number }>;
          const b = bands[arr[0].dataIndex];
          const share = totalAll > 0 ? b.total / totalAll : 0;
          return `<b>${S.pension.band[b.key as AgeBandKey]}</b><br/>${fmtInt(b.total)} (${fmtPct(share, 1)})`;
        },
```

- [ ] **Step 6: Remove the now-unused dictionary keys**

`S.pension.seriesWomen` and `S.pension.seriesMen` have no consumer left. Delete them from **both** `lib/i18n/uz.ts` and `lib/i18n/ru.ts` — `satisfies Strings` fails the build if only one goes.

- [ ] **Step 7: Run the tests and the build**

```bash
npm test && npx tsc --noEmit && npm run build
```

Expected: tests pass, tsc clean, build clean. The parser will not compile yet if it references removed fields — that is Task 4's job; if `tsc` complains only inside `lib/parse-kadrlar.ts`, note it and continue.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Extend the stat with staffing, and drop the per-band gender split

The constructor supplies stavka, vacancies and turnover, and a real
under-30 column -- so that band stops being total minus the other four.

What it does not supply is gender per age band. The chart becomes
single-series rather than keeping the old report alive as a second
source for one visual, which would put two different totals on one page.
Gender still comes through totalWomen and the two pension women counts,
which is where the page actually makes gender claims.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: New CSV contract, and the residual row's replacement

**Files:**
- Modify: `lib/parse-kadrlar.ts`, `lib/regions.ts`
- Test: `tests/parse-kadrlar.test.ts`

**Interfaces:**
- Consumes: `KadrlarStat` (Task 3), `resolveArgosRegion`, `isNationalRow` (existing in `lib/parse-kadrlar.ts`).
- Produces: `parseKadrlarCsv(text, fileName?): ParsedKadrlar` over the new 16-column contract; `LEVEL_REPUBLICAN` and `LEVEL_DISTRICT` from `lib/regions.ts`.

**The residual row goes away.** It existed because organisations outside the viloyat administrations had no other home, and its composition could not be established — the label named "central apparatus and republican centres" while 38 % of it was the sanitary committee. The tree gives two real branches instead, so the parser stops subtracting and starts reading.

What replaces the residual's guards: Σ(rows) must reconcile with the national row. The drift that motivated the old clamp is still real — the rows come from separate requests against a live system — so a mismatch **warns with the amount** rather than failing.

New CSV contract, `;`-separated, one header row, 16 columns:

```
hudud;shtat;jami;jami_ayol;vakansiya;qabul;boshagan;u30;a3040;a4050;a5060;a60p;pensiya;pensiya_ayol;yetadigan;yetadigan_ayol
```

17 rows: `МИЛЛИЙ`, the 14 viloyats, `Республика даражаси`, `Туман/шаҳар даражаси`.

- [ ] **Step 1: Add the two level constants**

In `lib/regions.ts`, delete `PENSION_RESIDUAL` and its `SLUG_MAP` / `REGION_RU` entries, and add:

```ts
/** ARGOS's own top-level branches beside the 14 viloyats. Not geographic —
 *  never on the map, but real rows with real organisations behind them, which
 *  is what the old computed residual row could never claim. */
export const LEVEL_REPUBLICAN = "Республика даражаси";
export const LEVEL_DISTRICT = "Туман/шаҳар даражаси";
```

Add to `SLUG_MAP`:

```ts
  "Республика даражаси": "respublika-darajasi",
  "Туман/шаҳар даражаси": "tuman-shahar",
```

Add to `REGION_RU`:

```ts
  "Республика даражаси": "Республиканский уровень",
  "Туман/шаҳар даражаси": "Районный/городской уровень",
```

- [ ] **Step 2: Write the failing tests**

Replace the residual tests in `tests/parse-kadrlar.test.ts` with these. Keep every guard test (header order, zero-total region, missing region, duplicate row, second national row, unparseable cell) — update their fixtures to the new 16-column shape.

```ts
import { LEVEL_REPUBLICAN, LEVEL_DISTRICT } from "../lib/regions.ts";

const HEADER =
  "hudud;shtat;jami;jami_ayol;vakansiya;qabul;boshagan;u30;a3040;a4050;a5060;a60p;" +
  "pensiya;pensiya_ayol;yetadigan;yetadigan_ayol";

/** total split across the shape so sums are easy to check. */
function row(name: string, total: number, vacant = 0): string {
  const w = Math.round(total * 0.8);
  return [name, total + vacant, total, w, vacant, 0, 0,
          total, 0, 0, 0, 0, total, w, 0, 0].join(";");
}

test("keeps the two ARGOS level rows as ordinary rows", () => {
  const csv = [
    HEADER,
    row("МИЛЛИЙ", 1000),
    row("Andijon viloyati", 300),
    row("Республика даражаси", 500),
    row("Туман/шаҳар даражаси", 200),
  ].join("\n");
  const { snapshot, warnings } = parseKadrlarCsv(csv, "HRM_kadrlar_2026-08-06.csv");
  assert.equal(snapshot.regions.length, 3);
  const names = snapshot.regions.map((r) => r.name);
  assert.ok(names.includes(LEVEL_REPUBLICAN));
  assert.ok(names.includes(LEVEL_DISTRICT));
  assert.equal(warnings.length, 0, "300 + 500 + 200 reconciles with 1000");
});

test("warns with the amount when the rows do not reconcile", () => {
  const csv = [HEADER, row("МИЛЛИЙ", 1000), row("Andijon viloyati", 300)].join("\n");
  const { warnings } = parseKadrlarCsv(csv, "x.csv");
  const w = warnings.find((x) => /700/.test(x));
  assert.ok(w, "the shortfall must be named, not silently absorbed");
});

test("no row is ever synthesised by subtraction", () => {
  const csv = [HEADER, row("МИЛЛИЙ", 1000), row("Andijon viloyati", 300)].join("\n");
  const { snapshot } = parseKadrlarCsv(csv, "x.csv");
  assert.equal(snapshot.regions.length, 1, "only rows that were in the file");
});

test("reads vacancies and staffing", () => {
  const csv = [HEADER, row("МИЛЛИЙ", 1000, 120)].join("\n");
  const { snapshot } = parseKadrlarCsv(csv, "x.csv");
  assert.equal(snapshot.overall.vacant, 120);
  assert.equal(snapshot.overall.stavka, 1120);
  assert.equal(snapshot.overall.total, 1000);
});

test("warns when stavka does not equal total plus vacant", () => {
  const bad = ["МИЛЛИЙ", 999, 1000, 800, 120, 0, 0, 1000, 0, 0, 0, 0, 1000, 800, 0, 0].join(";");
  const { warnings } = parseKadrlarCsv([HEADER, bad].join("\n"), "x.csv");
  assert.ok(warnings.some((w) => /shtat|штат/i.test(w)));
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npm test`
Expected: FAIL — the header assertion rejects the new columns, and `LEVEL_REPUBLICAN` is not exported yet.

- [ ] **Step 4: Update the parser**

In `lib/parse-kadrlar.ts`:

Replace `COLUMNS` and `HEADER`:

```ts
const COLUMNS = [
  "stavka", "total", "totalWomen", "vacant", "accepted", "dismissed",
  "u30", "a3040", "a4050", "a5060", "a60p",
  "pensionWorking", "pensionWorkingWomen", "reaching", "reachingWomen",
] as const satisfies ReadonlyArray<keyof KadrlarStat>;

const HEADER = [
  "hudud",
  "shtat", "jami", "jami_ayol", "vakansiya", "qabul", "boshagan",
  "u30", "a3040", "a4050", "a5060", "a60p",
  "pensiya", "pensiya_ayol", "yetadigan", "yetadigan_ayol",
] as const;
```

Register both level names so `resolveArgosRegion` accepts them — beside the existing `PENSION_RESIDUAL` registration, which is being deleted:

```ts
LOOKUP.set(normalize(LEVEL_REPUBLICAN), LEVEL_REPUBLICAN);
LOOKUP.set(normalize(LEVEL_DISTRICT), LEVEL_DISTRICT);
```

Delete `subtract()` and the whole residual block — the `sum.total > overall.total` throw, the `sum.total < overall.total` branch, the per-column clamp loop. Replace it with a reconciliation check:

```ts
  if (regions.length > 0) {
    const sum = emptyStat("");
    for (const r of regions) addInto(sum, r);

    // Rows arrive from separate requests against a live system, so exact
    // equality is not expected. A real gap is named rather than absorbed --
    // the old computed residual row hid exactly this, and nobody could say
    // afterwards what was inside it.
    const gap = overall.total - sum.total;
    if (gap !== 0) {
      warnings.push(
        `Қаторлар йиғиндиси миллий кўрсаткичдан ${Math.abs(gap)} тага ` +
          `${gap > 0 ? "кам" : "кўп"} (${sum.total} / ${overall.total}).`,
      );
    }
  }
```

Keep the missing-geographic-region warning, but expect 14 geographic rows plus the two levels rather than a residual.

Add the staffing identity check inside the row loop, after `stat` is built:

```ts
    // Upstream computes vacancies as positions minus filled posts. If that
    // stops holding, one of the three numbers is wrong and the vacancy page
    // built on them would be too.
    if (stat.stavka !== stat.total + stat.vacant) {
      warnings.push(
        `${name || "МИЛЛИЙ"}: shtat (${stat.stavka}) ≠ ходимлар (${stat.total}) + вакансия (${stat.vacant}).`,
      );
    }
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS. Count will be higher than 34 — record the actual number in the commit.

- [ ] **Step 6: Type-check and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both clean. `data/seed-kadrlar.json` still has the old shape and will fail the build — regenerate it as a national-only row in the new 16-column shape, using the verified 2026-08-06 figures and `stavka`/`vacant`/`accepted`/`dismissed` set to 0 with a comment in the commit that they arrive with the first real pull.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Replace the computed residual with ARGOS's own two branches

The residual existed because organisations outside the viloyat
administrations had nowhere else to go, and its contents were
unknowable -- 38% of it turned out to be the sanitary committee under a
label naming something else. The tree gives Республика даражаси and
Туман/шаҳар даражаси as real rows, so the parser stops subtracting.

The guards it carried are replaced, not dropped: a reconciliation
warning that names the gap, and a check that stavka still equals
employees plus vacancies -- the identity the vacancy page will rest on.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: The extraction script

**Files:**
- Modify: `docs/bookmarklets/kadrlar.md` (append the script below Task 1's measurements)
- Delete: `docs/bookmarklets/pensiya.md`

**Interfaces:**
- Consumes: the safe batch size measured in Task 1; the CSV contract from Task 4.
- Produces: `HRM_kadrlar_YYYY-MM-DD.csv`, uploaded at `/admin`.

**Do not start this task until Task 1's measurements are written down.** The batching below is parameterised on them; guessing the number is the one thing the spec forbids.

The script runs in the browser console on a logged-in `hrm.argos.uz` page. It never touches personal data — the tree carries organisation names and ids, the constructor returns counts.

- [ ] **Step 1: Write the script into the doc**

Append to `docs/bookmarklets/kadrlar.md`:

````markdown
## The script

Set `BATCH` from the measured limit above.

```js
// NOT a measured value — replace it with the number from "Measured limits"
// above before running. Leaving an invented batch size here is exactly the
// mistake this plan's Task 1 exists to prevent.
const BATCH = null;
if (!BATCH) throw new Error("set BATCH from the measured limits first");

const tok = localStorage.accessToken;

const NODES = [
  { key: "general" },
  { key: "totalStavka", parentKey: "general" },
  { key: "totalEmployee", parentKey: "general" },
  { key: "totalVakant", parentKey: "general" },
  { key: "totalWomen", parentKey: "general" },
  { key: "totalAcceptEmployee", parentKey: "general" },
  { key: "totalDismissedEmployee", parentKey: "general" },
  { key: "age" },
  { key: "ageTo30", parentKey: "age" },
  { key: "ageFrom30To40", parentKey: "age" },
  { key: "ageFrom40To50", parentKey: "age" },
  { key: "ageFrom50To60", parentKey: "age" },
  { key: "ageFrom60", parentKey: "age" },
  { key: "pensionAge" },
  { key: "totalPensionAge", parentKey: "pensionAge" },
  { key: "totalPensionAgeWoman", parentKey: "pensionAge" },
  { key: "currentYearPensionAge" },
  { key: "totalCurrentYearPensionAge", parentKey: "currentYearPensionAge" },
  { key: "totalCurrentYearPensionAgeWoman", parentKey: "currentYearPensionAge" },
];

// ARGOS oblast name -> the dashboard's canonical key. Taken from the tree's
// Территориальный уровень, which is ARGOS's own hierarchy -- not name matching
// against organisation titles the way the previous extraction had to.
const REGION = [
  [/Каракалпакстан/i, "Қорақалпоғистон Республикаси"],
  [/Андижан/i, "Андижон вилояти"],
  [/Бухар/i, "Бухоро вилояти"],
  [/Джизак/i, "Жиззах вилояти"],
  [/Кашкадар/i, "Қашқадарё вилояти"],
  [/Нава[ий]+/i, "Навоий вилояти"],
  [/Наманган/i, "Наманган вилояти"],
  [/Самарканд/i, "Самарқанд вилояти"],
  [/Сырдар/i, "Сирдарё вилояти"],
  [/Сурхандар/i, "Сурхондарё вилояти"],
  [/Ташкентск/i, "Тошкент вилояти"],
  [/Ферган/i, "Фарғона вилояти"],
  [/Хорезм/i, "Хоразм вилояти"],
  [/город.{0,3} Ташкент|Ташкент.{0,3} город/i, "Тошкент шаҳри"],
];

const idsOf = (node) => { const out = []; (function walk(n) {
  if (n.data) out.push(Number(n.data));
  (n.children || []).forEach(walk);
})(node); return out; };

const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

// One request. On a 500 the batch is halved and retried rather than losing the
// whole pull -- the ceiling was measured on one day's data and can move.
async function fetchIds(ids, depth = 0) {
  const r = await fetch("/api/report/constructor/GetReport", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + tok },
    body: JSON.stringify({ metaData: { first: 1, rows: 5000 }, institutionIds: ids, selectTreeNodes: NODES }),
  });
  if (r.status !== 200) {
    if (ids.length <= 4 || depth > 6) throw new Error(`batch of ${ids.length} failed: ${r.status}`);
    const half = Math.ceil(ids.length / 2);
    console.warn(`  batch ${ids.length} -> ${r.status}, splitting`);
    const a = await fetchIds(ids.slice(0, half), depth + 1);
    const b = await fetchIds(ids.slice(half), depth + 1);
    return a.concat(b);
  }
  return ((await r.json()).general?.items) || [];
}

const F = {
  stavka: "totalStavka", total: "totalEmployee", totalWomen: "totalWomen",
  vacant: "totalVakant", accepted: "totalAcceptEmployee", dismissed: "totalDismissedEmployee",
  u30: "ageTo30", a3040: "ageFrom30To40", a4050: "ageFrom40To50",
  a5060: "ageFrom50To60", a60p: "ageFrom60",
  pensionWorking: "totalPensionAge", pensionWorkingWomen: "totalPensionAgeWoman",
  reaching: "totalCurrentYearPensionAge", reachingWomen: "totalCurrentYearPensionAgeWoman",
};
const ORDER = ["stavka","total","totalWomen","vacant","accepted","dismissed",
               "u30","a3040","a4050","a5060","a60p",
               "pensionWorking","pensionWorkingWomen","reaching","reachingWomen"];

async function totalsFor(ids, label) {
  const acc = Object.fromEntries(ORDER.map((k) => [k, 0]));
  for (const c of chunk(ids, BATCH)) {
    for (const it of await fetchIds(c)) {
      for (const k of ORDER) acc[k] += Number(it[F[k]] || 0);
    }
  }
  console.log(`${label}: ${acc.total} ходим, ${acc.vacant} вакансия`);
  return acc;
}

const tree = await (await fetch("/api/Staff/Institution/GetSpInstitutionTreeV2",
  { headers: { authorization: "Bearer " + tok } })).json();
const moh = tree[0].children[0];
const branch = (re) => moh.children.find((c) => re.test(c.label || ""));

const rows = [];
const territorial = branch(/Территориальн/i);
if (!territorial || territorial.children.length !== 14) {
  throw new Error(`expected 14 territorial children, got ${territorial?.children?.length}`);
}
for (const node of territorial.children) {
  const hit = REGION.find(([re]) => re.test(node.label || ""));
  if (!hit) throw new Error(`unmapped region: ${node.label}`);
  rows.push([hit[1], await totalsFor(idsOf(node), hit[1])]);
}
rows.push(["Республика даражаси", await totalsFor(idsOf(branch(/Республиканск/i)), "Республика")]);
rows.push(["Туман/шаҳар даражаси", await totalsFor(idsOf(branch(/Районн/i)), "Туман/шаҳар")]);

const national = await totalsFor(idsOf(moh), "МИЛЛИЙ");

const line = (name, a) => [name, ...ORDER.map((k) => a[k])].join(";");
const csv = [
  "hudud;shtat;jami;jami_ayol;vakansiya;qabul;boshagan;u30;a3040;a4050;a5060;a60p;pensiya;pensiya_ayol;yetadigan;yetadigan_ayol",
  line("МИЛЛИЙ", national),
  ...rows.map(([n, a]) => line(n, a)),
].join("\n");

const sum = rows.reduce((s, [, a]) => s + a.total, 0);
console.log(`rows: ${rows.length + 1} | national ${national.total} | parts ${sum} | gap ${national.total - sum}`);
copy(csv);
csv;
```

Save as `HRM_kadrlar_YYYY-MM-DD.csv` — the parser reads the date from the filename — and upload it in the pension section of `/admin`.

## Sanity checks before uploading

- 17 rows including the header.
- `national` and `parts` should be close; the printed `gap` is what the parser will warn about.
- If any region throws `unmapped region`, ARGOS renamed a branch — add the pattern to `REGION`, do not loosen the existing ones.
````

- [ ] **Step 2: Delete the superseded doc**

```bash
git rm docs/bookmarklets/pensiya.md
```

It describes the old report and would be followed by mistake.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Replace the extraction script with a tree-walking one

The old script matched regional rollups with anchored regexes over
Russian organisation titles, because report rows carry institutionId 0
and there was nothing else to group by. The tree carries real ids and a
Территориальный уровень branch, so grouping is now ARGOS's own
hierarchy and the fragile part is gone.

Batches are halved and retried on a 500 rather than losing the pull --
the ceiling was measured on one day's data and can move.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Adapt `/pensiya` to the new dataset

**Files:**
- Modify: `app/pensiya/page.tsx`, `app/pensiya/[region]/page.tsx`, `lib/i18n/uz.ts`, `lib/i18n/ru.ts`

**Interfaces:**
- Consumes: `getLatestKadrlar()` (Task 2), `KadrlarStat` (Task 3), `LEVEL_REPUBLICAN`/`LEVEL_DISTRICT` (Task 4).
- Produces: nothing downstream in this plan. Plan B's `/vakansiya` copies this page's skeleton.

The page's structure does not change. What changes is the source note's wording and the fact that two named rows now appear where one computed residual did — which needs no code, since both are ordinary rows in `snapshot.regions`.

- [ ] **Step 1: Update the source note**

The note names the old report. In `lib/i18n/uz.ts`:

```ts
    sourceNote: (date: string) =>
      `Манба: hrm.argos.uz — статистика конструктори, ${date} ҳолатига. Кўрсаткич «Амалдаги ходимлар сони» устунидан олинган; тизимнинг бошқа ҳисоботларида қамров фарқ қилиши мумкин.`,
```

And `lib/i18n/ru.ts`:

```ts
    sourceNote: (date: string) =>
      `Источник: hrm.argos.uz — конструктор статистики, по состоянию на ${date}. Показатель взят из столбца «Фактическая численность»; в других отчётах системы охват может отличаться.`,
```

The second sentence stays: five ARGOS totals still disagree, and the page still has to say which one it is showing.

- [ ] **Step 2: Confirm the page needs no structural change**

Read `app/pensiya/page.tsx` and verify:
- `regions.length === 0` still drives the empty state
- `PensionBoard` filters with `isGeographicRegion()`, so the two level rows stay off the map and appear in the ranking and the table — the same treatment the residual had
- `PensionTable` shows all rows

If any of those assumptions is wrong, fix it here and say so in the commit rather than in a later task.

- [ ] **Step 3: Verify the region pages resolve**

The two level rows need working slugs. With a real snapshot loaded (Task 7 provides one; until then use a hand-made CSV), fetch:

```
/pensiya/respublika-darajasi   → 200
/pensiya/tuman-shahar          → 200
/pensiya/markaz-respublika     → 404   (the old residual slug is gone)
```

- [ ] **Step 4: Type-check, test, build**

```bash
npx tsc --noEmit && npm test && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Point the pension page's source note at the constructor

Same structure, same components. The two level rows need no special
handling -- they are ordinary rows, which is the whole gain over a
computed residual that needed its own branch everywhere.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Pull real data and verify end to end

**Files:** none — this task changes no code. Its deliverable is a verified dataset and a written comparison.

**Interfaces:**
- Consumes: everything above.
- Produces: a real `HRM_kadrlar_YYYY-MM-DD.csv` in storage, and a recorded before/after of the headline figures.

**This task requires the user's live ARGOS session.**

- [ ] **Step 1: Run the script and check the console output**

Expected: 17 rows, and the printed `gap` small relative to the national total. If the gap is large, stop and report it — that is a data question, not something to upload past.

- [ ] **Step 2: Parse it locally before uploading**

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const { parseKadrlarCsv } = await import('./lib/parse-kadrlar.ts');
const { snapshot, warnings } = parseKadrlarCsv(readFileSync(process.argv[1], 'utf8'), process.argv[1]);
console.log('rows:', snapshot.regions.length + 1, '| warnings:', warnings.length);
warnings.forEach(w => console.log('  !', w));
const o = snapshot.overall;
console.log('shtat', o.stavka, '| xodim', o.total, '| vakansiya', o.vacant);
console.log('pensiya', o.pensionWorking, '| yetadigan', o.reaching);
" "C:/Users/Admin/Downloads/HRM_kadrlar_<date>.csv"
```

Expected: 17 rows. Warnings are acceptable if they are the reconciliation gap; a `shtat ≠ ходимлар + вакансия` warning is not — investigate before uploading.

- [ ] **Step 3: Record the before/after**

The old source gave, on 2026-08-06: total **689 485**, pension-working **79 686**, reaching **15 306**, exposure share **13,78 %**.

Write the constructor's figures beside them in the commit message. **If they differ materially, say so plainly — do not smooth it over.** A changed headline is the expected outcome of a source switch and the user has been told to expect it; a hidden one is the failure mode.

- [ ] **Step 4: Upload and walk the pages**

Upload at `/admin`, then check `/`, `/pensiya`, one viloyat page, `/pensiya/respublika-darajasi`, and both languages. Confirm the hero's «деярли» qualifier still matches `pensionMetrics` — if the share moved across the 1/7 boundary, the qualifier should have flipped, and that is correct behaviour, not a bug.

- [ ] **Step 5: Commit the outcome**

```bash
git commit --allow-empty -m "Verify the kadrlar dataset against real ARGOS data

<old figures> -> <new figures>

<one line on whether the headline moved and why that is expected>

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Final verification

- [ ] `npm test` — all pass
- [ ] `npx tsc --noEmit` — clean
- [ ] `npm run lint` — no new problems beyond `AnimatedNumber.tsx:32`
- [ ] `npm run build` — clean
- [ ] The connection and completion datasets are untouched: `/`, `/toldirilish`, `/trend`, `/ulanmaganlar`, `/hududlar/fargona` all still 200 and show their own numbers
- [ ] `grep -rn "PENSION_RESIDUAL\|markaz-respublika" lib/ app/ components/ tests/` returns nothing
- [ ] Both languages render on every pension page
- [ ] All commits authored `sodiqjonboqijonov@gmail.com`, branch still `pensiya-yoshi`

Not pushed to `main` — deployment is the user's call.

## What Plan B will add

`/vakansiya`: hero (total vacancies, unfilled share), map and ranking on the inverted relative ramp, turnover (hired vs left) by region, and a 17-row table. Every field it needs arrives with this plan; Plan B is presentation only.
