# Vacancy Page Implementation Plan (Plan B of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/vakansiya` — vacancies and staff turnover by region — on the kadrlar dataset Plan A already delivers.

**Architecture:** Presentation only. Every field it needs (`stavka`, `vacant`, `accepted`, `dismissed`) is already parsed, stored and uploaded. It reuses `/pensiya`'s skeleton and the generic ramp helpers; nothing in the data layer changes.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 strict, Tailwind v4, Apache ECharts 6.

## Global Constraints

- Git author `sodiqjonboqijonov@gmail.com`; branch `pensiya-yoshi`; never `main`.
- No personal data. Aggregates only.
- Canonical Cyrillic region names drive slugs and GeoJSON matching; display via `regionLabel()`.
- `lib/i18n/ru.ts` ends with `satisfies Strings` — both dictionaries change together.
- ECharts options built in a memo must list `S` (and `lang` where used) in deps.
- `npm run lint` has one pre-existing error at `components/motion/AnimatedNumber.tsx:32`. Gate: no new problems.
- Tests import with relative `.ts` extensions.
- New pages need `export const dynamic = "force-dynamic";`.

## What the real data looks like (2026-08-06 pull)

Design decisions below rest on these, not on assumptions.

| | |
|---|---|
| Positions (`stavka`) | 715 137 |
| Filled (`total`) | 689 089 |
| **Vacant** | **26 048 — 3.64 %** |
| Hired in period (`accepted`) | 64 467 |
| Left in period (`dismissed`) | 8 140 |

Vacancy rate by geographic region, worst first: Тошкент шаҳри 11.04 % · Тошкент вилояти 6.76 % · Сирдарё 6.47 % · Жиззах 4.03 % · Хоразм 3.03 % · Навоий 2.94 % · Бухоро 2.89 % · Самарқанд 2.79 % · Сурхондарё 2.63 % · Қорақалпоғистон 2.08 % · Қашқадарё 1.77 % · Наманган 1.57 % · Фарғона 1.41 % · **Андижон 0.55 %**.

**The spread is 20×, unlike pension's ~1 point.** The relative ramp still applies — it is what makes any spread legible — but the "otherwise 14 identical squares" argument does not, so the endpoint key here earns its place by saying what the scale means rather than by rescuing a flat map.

**One figure to treat carefully:** Самарқанд reports 17 863 hires against a 60 148 headcount — 28 % of the national total in one region. That is either a real mass re-registration or an upstream artefact. The turnover section must not present it as a like-for-like comparison without the reader seeing the number; see Task 3.

---

## File Structure

**Created:**
- `lib/vakansiya-metrics.ts` — vacancy rate and turnover, pure, tested
- `tests/vakansiya-metrics.test.ts`
- `app/vakansiya/page.tsx`
- `components/vakansiya/VakansiyaHero.tsx`
- `components/vakansiya/VakansiyaBoard.tsx` — map + ranking
- `components/vakansiya/VakansiyaMap.tsx`
- `components/vakansiya/VakansiyaTurnover.tsx`
- `components/vakansiya/VakansiyaTable.tsx`

**Modified:**
- `lib/i18n/uz.ts`, `lib/i18n/ru.ts` — a `vakansiya` block plus `S.nav.vakansiya`
- `components/Nav.tsx` — one entry in «Кадрлар таҳлили»

**Reused unchanged:** `riskRamp`, `riskT`, `riskColor` from `lib/pension-metrics.ts` (they take plain shares and know nothing about pensions), `getLatestKadrlar()`, `isGeographicRegion`, `regionSlug`, `regionLabel`, `StatTile`, `Reveal`, `Chart`.

**No per-region page.** `/pensiya/[region]` exists because age structure is worth a page per region. Vacancies are one number per region; the table carries them. Adding `/vakansiya/[region]` would be a page with two figures on it.

---

### Task 1: Vacancy metrics

**Files:**
- Create: `lib/vakansiya-metrics.ts`
- Test: `tests/vakansiya-metrics.test.ts`

**Interfaces:**
- Consumes: `KadrlarStat` (`lib/types.ts`).
- Produces: `vacancyMetrics(stat): VacancyMetrics` with `{ vacant, stavka, filled, rate, accepted, dismissed, net }`.

- [ ] **Step 1: Write the failing test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { vacancyMetrics } from "../lib/vakansiya-metrics.ts";
import type { KadrlarStat } from "../lib/types.ts";

/** The verified national figures, 2026-08-06. */
const NATIONAL: KadrlarStat = {
  name: "",
  stavka: 715137, total: 689089, totalWomen: 549311, vacant: 26048,
  accepted: 64467, dismissed: 8140,
  u30: 92763, a3040: 232933, a4050: 188472, a5060: 135589, a60p: 39332,
  pensionWorking: 79596, pensionWorkingWomen: 58956,
  reaching: 14113, reachingWomen: 11156,
};

test("the rate is vacancies over established positions, not over staff", () => {
  const m = vacancyMetrics(NATIONAL);
  // 26 048 / 715 137 = 3.64%. Dividing by filled posts instead gives 3.78% --
  // a different, wronger number that would still look plausible.
  assert.ok(Math.abs(m.rate - 0.03642) < 0.0001);
  assert.equal(m.vacant, 26048);
  assert.equal(m.filled, 689089);
});

test("net turnover is hires minus departures", () => {
  const m = vacancyMetrics(NATIONAL);
  assert.equal(m.net, 64467 - 8140);
});

test("an establishment of zero does not divide by zero", () => {
  const m = vacancyMetrics({ ...NATIONAL, stavka: 0, vacant: 0, total: 0 });
  assert.equal(m.rate, 0);
});

test("a rate is never negative or above 1", () => {
  // Upstream drift could deliver vacant > stavka; the map must not receive
  // a share outside [0,1], which riskT would then clamp silently.
  const over = vacancyMetrics({ ...NATIONAL, stavka: 100, vacant: 150 });
  assert.equal(over.rate, 1);
  const under = vacancyMetrics({ ...NATIONAL, stavka: 100, vacant: -5 });
  assert.equal(under.rate, 0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/vakansiya-metrics.ts'`

- [ ] **Step 3: Implement**

```ts
// Derived vacancy figures. Kept out of the components because the denominator
// choice below is a claim, and a wrong one still looks plausible.

import type { KadrlarStat } from "./types";

export interface VacancyMetrics {
  /** Иш ўринлари — the establishment. */
  stavka: number;
  /** Амалдаги ходимлар. */
  filled: number;
  vacant: number;
  /** vacant / stavka, 0..1. */
  rate: number;
  accepted: number;
  dismissed: number;
  /** Hires minus departures over the reporting period. */
  net: number;
}

export function vacancyMetrics(s: KadrlarStat): VacancyMetrics {
  const stavka = Math.max(0, s.stavka);
  const vacant = Math.max(0, s.vacant);
  // Over the ESTABLISHMENT, not over filled posts. Nationally that is
  // 26 048 / 715 137 = 3.64 %; dividing by the 689 089 people actually in post
  // gives 3.78 %, which answers a question nobody asked and reads the same.
  const rate = stavka > 0 ? Math.min(1, vacant / stavka) : 0;
  return {
    stavka,
    filled: Math.max(0, s.total),
    vacant,
    rate,
    accepted: Math.max(0, s.accepted),
    dismissed: Math.max(0, s.dismissed),
    net: s.accepted - s.dismissed,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test` — expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add lib/vakansiya-metrics.ts tests/vakansiya-metrics.test.ts
git commit -m "Derive the vacancy rate over the establishment

26 048 / 715 137 = 3.64%. Dividing by the 689 089 people actually in
post gives 3.78% -- a different number that reads exactly as plausible,
which is why the denominator lives in a tested function rather than
inline in a component.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Dictionary

**Files:**
- Modify: `lib/i18n/uz.ts`, `lib/i18n/ru.ts`

**Interfaces:**
- Produces: `S.nav.vakansiya`, and the whole `S.vakansiya.*` block consumed by Tasks 3–4.

- [ ] **Step 1: Add to `uz.ts`**

Into `nav`: `vakansiya: "Вакансиялар",`

A new `vakansiya` block after `pension`:

```ts
  vakansiya: {
    navTitle: "Вакансиялар",
    title: "Бўш иш ўринлари ва кадрлар ҳаракати",
    subtitle: "hrm.argos.uz статистика конструктори асосида — ҳудудлар кесимида",
    asOf: "ҳолатига",

    heroEyebrow: "Тўлдирилмаган иш ўринлари",
    heroTail: (rate: string) =>
      `бўш иш ўрни — штатнинг ${rate} қисми тўлдирилмаган`,

    stavka: "Жами иш ўринлари",
    stavkaHint: "Штат бўйича",
    filled: "Тўлдирилган",
    filledHint: "Амалдаги ходимлар",
    vacant: "Бўш",
    vacantHint: "Тўлдирилмаган иш ўринлари",
    rate: "Бўшлик даражаси",

    mapTitle: "Ҳудудлар бўйича бўшлик даражаси",
    mapHint: "Ҳудуд устига босиб, батафсил кўринг",
    mapKey: (lo: string, hi: string) =>
      `Шкала ${lo} — ${hi} оралиғида (нисбий)`,
    rankingTitle: "Ҳудудлар рейтинги",
    rankingHint: "юқоридан пастга",

    turnoverTitle: "Кадрлар ҳаракати",
    turnoverHint: "Ҳисобот даврида ишга қабул қилинган ва ишдан бўшаган ходимлар",
    accepted: "Ишга қабул қилинган",
    dismissed: "Ишдан бўшаган",
    net: "Соф ўзгариш",

    tableTitle: "Ҳудудлар кесими",
    search: "Ҳудуд бўйича қидириш…",
    export: "Excel'га юклаш",
    sheet: "Вакансиялар",
    count: (n: number) => `${n} та ҳудуд`,
    empty: "Танланган шарт бўйича ҳудуд топилмади.",
    col: {
      n: "№",
      region: "Ҳудуд",
      stavka: "Иш ўринлари",
      filled: "Тўлдирилган",
      vacant: "Бўш",
      rate: "Бўшлик, %",
      accepted: "Қабул қилинган",
      dismissed: "Бўшаган",
    },

    noRegions: "Ҳудудлар кесими ҳали юкланмаган",
    noRegionsHint:
      "Ҳозирча фақат республика бўйича умумий кўрсаткич мавжуд. Ҳудудлар кесими юклангач, харита ва рейтинг кўринади.",

    overviewCard: "Бўш иш ўринлари",
    sourceNote: (date: string) =>
      `Манба: hrm.argos.uz — статистика конструктори, ${date} ҳолатига. Бўшлик даражаси «Вакансиялар сони»нинг «Иш ўринлари сони»га нисбати сифатида ҳисобланган.`,
  },
```

- [ ] **Step 2: Mirror in `ru.ts`**

Into `nav`: `vakansiya: "Вакансии",`

```ts
  vakansiya: {
    navTitle: "Вакансии",
    title: "Вакантные места и движение кадров",
    subtitle: "По конструктору статистики hrm.argos.uz — в разрезе регионов",
    asOf: "по состоянию на",

    heroEyebrow: "Незаполненные рабочие места",
    heroTail: (rate: string) =>
      `вакантных мест — ${rate} штата не заполнено`,

    stavka: "Всего рабочих мест",
    stavkaHint: "По штату",
    filled: "Заполнено",
    filledHint: "Фактическая численность",
    vacant: "Вакантно",
    vacantHint: "Незаполненные рабочие места",
    rate: "Уровень вакантности",

    mapTitle: "Уровень вакантности по регионам",
    mapHint: "Нажмите на регион для подробностей",
    mapKey: (lo: string, hi: string) =>
      `Шкала в диапазоне ${lo} — ${hi} (относительная)`,
    rankingTitle: "Рейтинг регионов",
    rankingHint: "сверху вниз",

    turnoverTitle: "Движение кадров",
    turnoverHint: "Принятые и уволенные сотрудники за отчётный период",
    accepted: "Принято",
    dismissed: "Уволено",
    net: "Чистое изменение",

    tableTitle: "Разрез по регионам",
    search: "Поиск по региону…",
    export: "Скачать в Excel",
    sheet: "Вакансии",
    count: (n: number) => `${n} регионов`,
    empty: "По заданным условиям регион не найден.",
    col: {
      n: "№",
      region: "Регион",
      stavka: "Рабочие места",
      filled: "Заполнено",
      vacant: "Вакантно",
      rate: "Вакантность, %",
      accepted: "Принято",
      dismissed: "Уволено",
    },

    noRegions: "Разрез по регионам ещё не загружен",
    noRegionsHint:
      "Пока доступен только общий показатель по Республике. Карта и рейтинг появятся после загрузки разреза по регионам.",

    overviewCard: "Вакантные места",
    sourceNote: (date: string) =>
      `Источник: hrm.argos.uz — конструктор статистики, по состоянию на ${date}. Уровень вакантности рассчитан как отношение «Вакансиялар сони» к «Иш ўринлари сони».`,
  },
```

- [ ] **Step 3: Verify the mirror compiles**

Run: `npx tsc --noEmit` — a missing key surfaces here as a `satisfies` error naming it.

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/uz.ts lib/i18n/ru.ts
git commit -m "Add the vacancy dictionary in both languages

The source note states the denominator, because vacancies over the
establishment and vacancies over filled posts are both defensible and
differ by 0.14pp nationally -- a reader has to be told which one is on
screen.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: The page

**Files:**
- Create: `app/vakansiya/page.tsx`, and the five components under `components/vakansiya/`

**Interfaces:**
- Consumes: `getLatestKadrlar()`, `vacancyMetrics()`, `riskRamp`/`riskT`/`riskColor` from `lib/pension-metrics.ts`, `isGeographicRegion`, `regionSlug`, `regionLabel`, `regionLabelShort`, `StatTile`, `Reveal`/`RevealGroup`/`RevealItem`, `Chart`, `fmtInt`/`fmtPct`/`toPct`/`fmtDate`.
- Produces: the `/vakansiya` route.

Build it as `/pensiya`'s sibling — same section order, same card classes, same map interaction. Four things differ and each is deliberate:

1. **The hero leads with the count, then the rate**, mirroring the pension hero's count-first decision for the same reason: 26 048 unfilled posts is a staffing problem, "3.6 %" is a statistic.
2. **The ranking and both ramps are geographic-only.** This was a live defect on `/pensiya` — a two-organisation branch ranked first and set the scale. Do not repeat it: filter with `isGeographicRegion` for the ranking, the map and the table's ramp. The level rows still appear in the table.
3. **The turnover section replaces the age chart.** Horizontal bars per region, hired vs left, with the net printed.
4. **No per-region page.** Region names in the ranking and table are plain text, not links.

- [ ] **Step 1: `VakansiyaHero.tsx`** — server component, mirroring `PensionHero`'s structure: eyebrow, `AnimatedNumber` on `m.vacant`, the tail sentence from `S.vakansiya.heroTail(fmtPct(m.rate, 1))`, then two component cards showing `stavka` and `filled`.

- [ ] **Step 2: `VakansiyaMap.tsx`** — copy `PensionMap.tsx` and change three things: the value is `vacancyMetrics(r).rate`, the tooltip lines are vacant / filled / stavka, and the aria label is a new `S.map.ariaVacancy` key (add it to both dictionaries). Keep `RAMP` green→red and the `visualMap` spanning `ramp.min`..`ramp.max`.

- [ ] **Step 3: `VakansiyaBoard.tsx`** — copy `PensionBoard.tsx`. `geographic` filters with `isGeographicRegion`; `ranked` sorts **geographic only**, worst-first by rate; the ramp comes from the geographic rates; the map key renders `S.vakansiya.mapKey`. Region rows are `<div>`s, not `<Link>`s.

- [ ] **Step 4: `VakansiyaTurnover.tsx`** — client component using `Chart`. Horizontal grouped bars, one pair per geographic region: hired and left. Sort by hires descending.

  **State the Samarkand figure rather than hiding it.** It reports 17 863 hires against 60 148 staff — 28 % of the national total in one region, which is either a mass re-registration or an upstream artefact. Because it dominates any shared axis, add a one-line note under the chart in both languages:

  ```ts
  turnoverNote: "Самарқанд вилоятидаги қабул кўрсаткичи бошқа ҳудудлардан кескин фарқ қилади — манбадаги оммавий қайта рўйхатга олиш бўлиши мумкин.",
  ```
  ```ts
  turnoverNote: "Показатель приёма по Самаркандской области резко отличается от других регионов — возможна массовая перерегистрация в источнике.",
  ```

- [ ] **Step 5: `VakansiyaTable.tsx`** — copy `PensionTable.tsx`. Columns: №, region, stavka, filled, vacant, rate, accepted, dismissed. Ramp from geographic rows only. xlsx export named `HRM_vakansiya_<date>`.

- [ ] **Step 6: `app/vakansiya/page.tsx`** — `export const dynamic = "force-dynamic";`, header with `LiveSync` and the date, hero, source note, four `StatTile`s (stavka / filled / vacant / rate), the no-regions notice when `regions.length === 0`, board, turnover, table.

- [ ] **Step 7: Verify**

```bash
npx tsc --noEmit && npm test && npm run build
```

Then, with the dev server up and logged in, fetch `/vakansiya` in both locales and confirm: the hero reads 26 048, the rate 3,6 %, Тошкент шаҳри is rank 1 at 11,0 %, Андижон is last at 0,6 %, and «Туман/шаҳар даражаси» does **not** appear in the ranking.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add the vacancy page

Same skeleton as /pensiya, with the ranking and every ramp restricted to
geographic regions from the start -- that was a live defect there, where
a two-organisation branch ranked first and flattened the scale.

The turnover chart names the Samarkand anomaly instead of letting it
dominate a shared axis unexplained: 17 863 hires against 60 148 staff,
28% of the national total in one region.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Navigation and final verification

**Files:**
- Modify: `components/Nav.tsx`

- [ ] **Step 1: Add the entry**

In the «Кадрлар таҳлили» group, between `/pensiya` and `/admin`:

```ts
        { href: "/vakansiya", label: S.nav.vakansiya },
```

That group now holds three pills. Check the header still does not wrap at 390 px — it already scrolls horizontally, but the group labels add height.

- [ ] **Step 2: Full verification**

- [ ] `npm test` — all pass
- [ ] `npx tsc --noEmit` — clean
- [ ] `npm run lint` — no new problems beyond `AnimatedNumber.tsx:32`
- [ ] `npm run build` — clean, `/vakansiya` in the route table
- [ ] `/`, `/pensiya`, `/toldirilish`, `/trend`, `/ulanmaganlar`, `/hududlar/fargona` all still 200
- [ ] Both languages render on `/vakansiya`
- [ ] All commits authored `sodiqjonboqijonov@gmail.com`, branch `pensiya-yoshi`

- [ ] **Step 3: Commit**

```bash
git add components/Nav.tsx
git commit -m "Put vacancies in the analytics nav group

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Not in this plan

- A per-region vacancy page. Vacancies are one number per region; the table carries them.
- A homepage card. `/` already has three cards; a fourth needs a conversation about what the front page is for, not a task in a plan about vacancies.
- Any change to the data layer. If one turns out to be needed, that is a signal the spec was wrong — stop and say so rather than widening this plan.
