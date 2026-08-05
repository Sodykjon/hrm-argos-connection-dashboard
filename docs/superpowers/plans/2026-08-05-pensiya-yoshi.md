# Pension-Age Statistic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third decoupled dataset to the HRM ARGOS dashboard showing how much of the 689 k MoH workforce is at or approaching pension age, by region and gender, presented for a ministerial audience.

**Architecture:** Mirrors the existing "completion" dataset exactly — own types, own KV keys, own parser, own pages — so nothing about connection or completion changes. Ingestion is a manual CSV upload on `/admin`; the dashboard never calls ARGOS at runtime. Pure logic (region-name resolution, CSV parsing, derived metrics) lives in three small `lib/` modules with `node:test` coverage; the UI consumes them through server components.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 (strict), Tailwind v4, Apache ECharts 6 (tree-shaken via `lib/echarts.ts`), motion/react, Upstash Redis, `node:test` with native Node 24 type stripping.

## Global Constraints

Every task's requirements implicitly include this section.

- **Git author email MUST be `sodiqjonboqijonov@gmail.com`** — Vercel blocks git deploys from any other address. Verify with `git config user.email` before the first commit.
- **Branch:** `pensiya-yoshi` (already exists, off `main`, holds commits `292469f` and `0824392`). Do not commit to `main`.
- **No personal data, ever.** Aggregates only. No names, birth dates, or anything identifying a person reaches Vercel/Upstash.
- **Canonical region names are Uzbek Cyrillic** and drive slugs, GeoJSON matching and KV keys. They are never translated as keys — display only, via `regionLabel()` / `regionLabelShort()` from `lib/regions.ts`.
- **`lib/i18n/uz.ts` has no `as const`** (literal types would break the mirror). `lib/i18n/ru.ts` ends with `satisfies Strings`, so a key present in `uz.ts` and missing from `ru.ts` is a compile error. Always edit both.
- **Any ECharts option built in a `useMemo` must list the dictionary (`S`) and `lang` in its deps**, or the chart keeps the old language after a switch.
- **Manifest reads are wrapped in React `cache()` for per-request dedup only.** Never add a TTL memo — that is what previously broke the completion trend ("shows only latest day").
- **Tests import with relative paths including the `.ts` extension** (`../lib/parse-pension.ts`). The `@/` alias does not resolve under `node --test` (verified: `ERR_MODULE_NOT_FOUND`).
- **New pages need `export const dynamic = "force-dynamic";`** — matching every other page, so a fresh upload shows on the next request.
- **UI text is Uzbek Cyrillic** (Russian mirror in `ru.ts`). Dark "national monitoring center" theme, tokens from `app/globals.css`. Reuse existing classes: `card`, `card-link`, `eyebrow`, `tnum`, `rise`, `scroll-quiet`, `text-ink`/`text-ink-soft`/`text-ink-faint`, `border-line`/`border-line-soft`, `bg-paper`/`bg-surface`, accents `sov`/`ul`/`un`/`och`/`goal`.
- **Two claims the UI must NOT make** (from the spec, deliberate):
  1. Never headline the women's share of the pension group. Women are 79.7 % of the workforce and 74.1 % of the pension group — *below* the base rate, so "74 % of pension-age staff are women" reads as a finding but misleads. Show gender as a split, attach no claim.
  2. Never explain why "pension age" (79 672) exceeds "60+" (39 362). The likely cause is women's pension age being 55, but the statutory ages are unconfirmed. Show both figures, explain nothing.

---

## File Structure

**New — pure logic (tested):**
- `lib/parse-pension.ts` — ARGOS region-name resolution + CSV parse + snapshot build + residual row
- `lib/pension-metrics.ts` — derived figures (exposure, under-30 band, relative risk ramp). No I/O, no React.

**New — tests:**
- `tests/parse-pension.test.ts`
- `tests/pension-metrics.test.ts`

**New — data & API:**
- `data/seed-pension.json` — national-only seed so `lib/data.ts`'s static import resolves before the first upload
- `app/api/pension/route.ts` — POST publish + GET history

**New — pages:**
- `app/pensiya/page.tsx`
- `app/pensiya/[region]/page.tsx`

**New — components (`components/pension/`):**
- `PensionHero.tsx` — the headline statement
- `PensionMap.tsx` — choropleth, inverted relative ramp
- `PensionBoard.tsx` — map + ranking, two-column
- `PensionAgeChart.tsx` — age structure, women split
- `PensionTrend.tsx` — history line
- `PensionTable.tsx` — region table + xlsx export
- `PensionOverviewCard.tsx` — homepage card

**New — ingestion aid:**
- `docs/bookmarklets/pensiya.html` (copied to `Documents\HRM_pensiya_bookmarklet.html` for the user's habitual location)

**Modified:**
- `lib/types.ts` — pension block appended
- `lib/regions.ts` — residual region constant, slug, RU label
- `lib/store.ts` — two keys, `getPensionManifest()`, `publishPension()`
- `lib/data.ts` — `getLatestPension()`, `getPensionHistory()`
- `lib/i18n/uz.ts`, `lib/i18n/ru.ts` — `pension` block, nav group labels, admin keys
- `components/Nav.tsx` — two labelled groups
- `app/page.tsx` — pension card above the completion card
- `app/admin/page.tsx` — third upload section
- `package.json` — `test` script
- `tsconfig.json` — `allowImportingTsExtensions`

### Deliberate deviations from the spec

Two, both improvements found while reading the code. Note them in the commit messages.

1. **The spec had the bookmarklet write canonical Cyrillic region names into the CSV.** That would put the hardest logic (homoglyph normalization) in an untested, unversioned HTML file. Instead the bookmarklet writes whatever ARGOS returned (Latin), and `lib/parse-pension.ts` resolves it — tested. `resolveArgosRegion()` is idempotent, so an already-canonical name also resolves, and a hand-typed CSV works.
2. **The spec's age chart had four bands (30–40 … 60+), which do not sum to the total.** The gap is exactly the under-30 cohort (689 461 − 596 649 = 92 812), derivable by subtraction. The chart shows five bands so it is a complete breakdown rather than a chart with an unexplained 13 % missing.
3. **The spec put the stale-year column match (`пенсия ёшига етадиган`, never `2024`) in the parser's test list.** It cannot live there: the bookmarklet writes a fixed-column CSV, so `parsePensionCsv` reads by position and never sees an upstream header. The trap is real and still has to be handled — it moves to the bookmarklet (Task 13, Step 2), which is the only code that touches ARGOS's own column names. This is the one part of the spec's test list with no corresponding test, and it is deliberate.

---

### Task 1: Test harness, pension types, ARGOS region resolver

**Files:**
- Modify: `package.json` (scripts block)
- Modify: `tsconfig.json` (compilerOptions)
- Modify: `lib/types.ts` (append at end of file)
- Modify: `lib/regions.ts` (`SLUG_MAP`, `REGION_RU`, new export)
- Create: `lib/parse-pension.ts`
- Test: `tests/parse-pension.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `PensionStat`, `PensionSnapshot`, `PensionManifestEntry`, `PensionManifest` (from `lib/types.ts`); `PENSION_RESIDUAL: string` (from `lib/regions.ts`); `resolveArgosRegion(raw: string): string` and `isNationalRow(raw: string): boolean` (from `lib/parse-pension.ts`).

- [ ] **Step 1: Add the test script and the TS flag**

In `package.json`, add `test` to the `scripts` block (keep the others):

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "node --test \"tests/**/*.test.ts\""
  },
```

Node 24 strips TypeScript natively — no loader, no flag. Node's runner cannot discover `.ts` files from a bare directory argument, so the glob is required and must stay quoted (npm runs scripts through `cmd.exe`, which does not expand it; Node does).

In `tsconfig.json`, add one line to `compilerOptions`:

```json
    "allowImportingTsExtensions": true,
```

`tsconfig.json` includes `**/*.ts`, so `next build` type-checks the test files. Without this flag their `.ts`-extension imports fail with `TS5097`. It requires `noEmit: true`, which is already set.

- [ ] **Step 2: Append the pension types**

At the end of `lib/types.ts`:

```ts
// ---------------------------------------------------------------------------
// Pension age ("Пенсия ёши") — a THIRD statistic sourced from the hrm.argos.uz
// report GetAllEmployeeDistributionBySeniority, ingested via CSV upload. Fully
// decoupled from the two datasets above (own keys, own manifest, own pages).
// All figures are integer head-counts; shares are derived at render time.
// ---------------------------------------------------------------------------

export interface PensionStat {
  name: string; // canonical Cyrillic region name; "" for the national row
  total: number;
  totalWomen: number;
  a3040: number;
  a3040Women: number;
  a4050: number;
  a4050Women: number;
  a5060: number;
  a5060Women: number;
  a60p: number;
  a60pWomen: number;
  /** Already at pension age and still working. */
  pensionWorking: number;
  pensionWorkingWomen: number;
  /** Reaches pension age during the current year. */
  reaching: number;
  reachingWomen: number;
}

export interface PensionSnapshot {
  date: string; // ISO date of the report, e.g. "2026-08-05"
  uploadedAt: string; // ISO timestamp the snapshot entered the system
  overall: PensionStat; // national
  regions: PensionStat[]; // 14 geographic + 1 residual; [] when only national
}

// A snapshot is ~15 rows, so the manifest carries every field inline and the
// trend needs no separate payload.
export interface PensionManifestEntry {
  date: string;
  uploadedAt: string;
  url: string;
  overall: PensionStat;
  regions: PensionStat[];
}

export interface PensionManifest {
  latestUrl: string;
  snapshots: PensionManifestEntry[]; // chronological (oldest → newest)
}
```

- [ ] **Step 3: Register the residual region**

In `lib/regions.ts`, add the export just below `CENTRAL`:

```ts
/** Σ(14 regions) < national, because the central apparatus and the republican
 *  centres sit outside every viloyat. The difference is shown as this explicit
 *  row rather than left as a silent gap. Not geographic — never on the map. */
export const PENSION_RESIDUAL = "Марказий аппарат ва республика марказлари";
```

Add to `SLUG_MAP`, after the `"Республика марказлари"` line:

```ts
  "Марказий аппарат ва республика марказлари": "markaz-respublika",
```

Add to `REGION_RU`, after the `"Республика марказлари"` line:

```ts
  "Марказий аппарат ва республика марказлари":
    "Центральный аппарат и республиканские центры",
```

It is absent from `GEO_REGIONS`, so `isGeographicRegion()` already excludes it from the choropleth. No change needed there.

- [ ] **Step 4: Write the failing test**

Create `tests/parse-pension.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveArgosRegion, isNationalRow } from "../lib/parse-pension.ts";

test("resolves every plain Latin ARGOS region name", () => {
  assert.equal(resolveArgosRegion("Andijon viloyati"), "Андижон вилояти");
  assert.equal(resolveArgosRegion("Toshkent shahri"), "Тошкент шаҳри");
  assert.equal(resolveArgosRegion("Toshkent viloyati"), "Тошкент вилояти");
  assert.equal(resolveArgosRegion("Xorazm viloyati"), "Хоразм вилояти");
});

test("resolves Farg'ona spelled with a Cyrillic 'о' (U+043E)", () => {
  // This is what ARGOS actually returns — verified by code point 2026-08-05.
  const upstream = "Farg‘оna viloyati";
  assert.equal(upstream.charCodeAt(7), 0x043e, "fixture must hold Cyrillic о");
  assert.equal(resolveArgosRegion(upstream), "Фарғона вилояти");
});

test("resolves every apostrophe variant", () => {
  for (const ap of ["‘", "’", "'", "ʻ", "ʼ", "`"]) {
    assert.equal(
      resolveArgosRegion(`Qoraqalpog${ap}iston Respublikasi`),
      "Қорақалпоғистон Республикаси",
      `apostrophe U+${ap.charCodeAt(0).toString(16)} should resolve`,
    );
  }
});

test("is idempotent on an already-canonical Cyrillic name", () => {
  assert.equal(resolveArgosRegion("Фарғона вилояти"), "Фарғона вилояти");
  assert.equal(resolveArgosRegion("Тошкент шаҳри"), "Тошкент шаҳри");
});

test("tolerates case and stray whitespace", () => {
  assert.equal(resolveArgosRegion("  buxoro   VILOYATI "), "Бухоро вилояти");
});

test("throws with the offending name for an unknown region", () => {
  assert.throws(
    () => resolveArgosRegion("Atlantis viloyati"),
    /Atlantis viloyati/,
    "the error must name the string so the upload error tells the user what broke",
  );
});

test("recognises the national row marker", () => {
  for (const s of ["МИЛЛИЙ", "milliy", " Жами ", "ИТОГО", "total", ""]) {
    assert.equal(isNationalRow(s), true, `${JSON.stringify(s)} is national`);
  }
  assert.equal(isNationalRow("Andijon viloyati"), false);
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `ERR_MODULE_NOT_FOUND: Cannot find module '../lib/parse-pension.ts'`

- [ ] **Step 6: Write the resolver**

Create `lib/parse-pension.ts`:

```ts
// Parser for the pension-age CSV pulled from the hrm.argos.uz report
// GetAllEmployeeDistributionBySeniority (HRM_pensiya_YYYY-MM-DD.csv).
// Runs in the browser (admin upload). Pure functions, no framework deps.
//
// The CSV carries whatever region names ARGOS returned — Latin, and in one case
// misspelled. Resolving them to the dashboard's canonical Uzbek-Cyrillic keys
// happens HERE, under test, not in the bookmarklet.

import type { PensionSnapshot, PensionStat } from "./types";
import { PENSION_RESIDUAL } from "./regions";

// --------------------------------------------------------------- region names

/**
 * ARGOS region filter → canonical dashboard key. Exactly 14 entries, matching
 * GEO_REGIONS one-to-one.
 *
 * `Farg‘оna viloyati` is reproduced verbatim: upstream writes a Cyrillic `о`
 * (U+043E) where a Latin `o` belongs. Normalization below handles it, but the
 * table keeps the real spelling so the bug stays visible to the next reader.
 */
const ARGOS_TO_CANONICAL: Array<[string, string]> = [
  ["Qoraqalpog‘iston Respublikasi", "Қорақалпоғистон Республикаси"],
  ["Andijon viloyati", "Андижон вилояти"],
  ["Buxoro viloyati", "Бухоро вилояти"],
  ["Jizzax viloyati", "Жиззах вилояти"],
  ["Qashqadaryo viloyati", "Қашқадарё вилояти"],
  ["Navoiy viloyati", "Навоий вилояти"],
  ["Namangan viloyati", "Наманган вилояти"],
  ["Samarqand viloyati", "Самарқанд вилояти"],
  ["Sirdaryo viloyati", "Сирдарё вилояти"],
  ["Surxondaryo viloyati", "Сурхондарё вилояти"],
  ["Toshkent viloyati", "Тошкент вилояти"],
  ["Farg‘оna viloyati", "Фарғона вилояти"],
  ["Xorazm viloyati", "Хоразм вилояти"],
  ["Toshkent shahri", "Тошкент шаҳри"],
];

/**
 * Cyrillic letters that are visually identical to a Latin letter *after
 * lowercasing*, mapped to that letter. Only these — `в` and `н` are left out on
 * purpose because their intended Latin equivalent is ambiguous, and guessing
 * wrong is worse than the loud failure resolveArgosRegion() raises.
 *
 * This runs only on the incoming ARGOS side, to build a lookup key. It never
 * touches the canonical Cyrillic names, which are a different script entirely
 * and are bridged by the explicit table above, not by transliteration.
 */
const HOMOGLYPH: Record<string, string> = {
  а: "a", е: "e", о: "o", р: "p", с: "c",
  у: "y", х: "x", к: "k", м: "m", т: "t",
};

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[аеорсухкмт]/g, (ch) => HOMOGLYPH[ch] ?? ch)
    .replace(/[‘’'ʻʼ`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Both directions are registered, so an already-canonical Cyrillic name (a
// hand-typed CSV, or a re-upload of our own export) resolves to itself.
const LOOKUP = new Map<string, string>();
for (const [argos, canonical] of ARGOS_TO_CANONICAL) {
  LOOKUP.set(normalize(argos), canonical);
  LOOKUP.set(normalize(canonical), canonical);
}
LOOKUP.set(normalize(PENSION_RESIDUAL), PENSION_RESIDUAL);

/** Resolve an incoming region name, or throw naming the offender. */
export function resolveArgosRegion(raw: string): string {
  const hit = LOOKUP.get(normalize(raw));
  if (!hit) throw new Error(`Номаълум ҳудуд номи: "${raw}"`);
  return hit;
}

// Deliberately checked on the RAW string, not the normalized one: the
// homoglyph map would turn "миллий" into "mиллий" and has no business
// touching a marker word.
const NATIONAL = /^(миллий|milliy|жами|итого|total)$/i;

/** The national total row — written by the bookmarklet as "МИЛЛИЙ". */
export function isNationalRow(raw: string): boolean {
  const t = (raw || "").trim();
  return t === "" || NATIONAL.test(t);
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 7 tests.

- [ ] **Step 8: Verify the build still type-checks**

Run: `npx tsc --noEmit`
Expected: no output. This confirms `allowImportingTsExtensions` is doing its job and the new types compile.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json lib/types.ts lib/regions.ts lib/parse-pension.ts tests/parse-pension.test.ts
git commit -m "Resolve ARGOS region names to the dashboard's canonical keys

ARGOS writes Farg'ona with a Cyrillic 'о' where a Latin 'o' belongs, so a
plain string compare never finds Fergana. Normalize the incoming side
before lookup, and throw naming the offender rather than dropping a
region silently.

Adds the first test harness in the repo: Node 24 strips types natively,
but its runner cannot discover .ts from a bare directory, hence the glob.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: CSV parser, snapshot builder, residual row

**Files:**
- Modify: `lib/parse-pension.ts` (append below the resolver)
- Test: `tests/parse-pension.test.ts` (append)

**Interfaces:**
- Consumes: `resolveArgosRegion`, `isNationalRow`, `PENSION_RESIDUAL`, `PensionStat`, `PensionSnapshot` (Task 1).
- Produces: `parsePensionCsv(text: string, fileName?: string): ParsedPension` where `interface ParsedPension { snapshot: PensionSnapshot; warnings: string[] }`, and `buildPensionSnapshot(overall: PensionStat, regions: PensionStat[], date: string): PensionSnapshot`.

**CSV contract.** UTF-8 (BOM tolerated), `;`-delimited, one header row, 15 columns:

```
hudud;jami;jami_ayol;a3040;a3040_ayol;a4050;a4050_ayol;a5060;a5060_ayol;a60p;a60p_ayol;pensiya;pensiya_ayol;yetadigan;yetadigan_ayol
```

Exactly one row has `hudud` = `МИЛЛИЙ` (the national total); the rest carry ARGOS region names. Column order is fixed by position — the bookmarklet writes this file, so there is no header-sniffing to do. The report date comes from the filename (`HRM_pensiya_2026-08-05.csv`), falling back to today, exactly as `parse-completion.ts` does.

- [ ] **Step 1: Write the failing tests**

Append to `tests/parse-pension.test.ts`:

```ts
import { parsePensionCsv } from "../lib/parse-pension.ts";

const HEADER =
  "hudud;jami;jami_ayol;a3040;a3040_ayol;a4050;a4050_ayol;a5060;a5060_ayol;" +
  "a60p;a60p_ayol;pensiya;pensiya_ayol;yetadigan;yetadigan_ayol";

/** A row with `total` split evenly across the shape, so sums are easy to check. */
function row(name: string, total: number): string {
  const w = Math.round(total * 0.8);
  return [name, total, w, 0, 0, 0, 0, 0, 0, 0, 0, total, w, 0, 0].join(";");
}

test("parses a national-only CSV into an empty region list", () => {
  const csv = `${HEADER}\n${row("МИЛЛИЙ", 1000)}`;
  const { snapshot } = parsePensionCsv(csv, "HRM_pensiya_2026-08-05.csv");
  assert.equal(snapshot.date, "2026-08-05");
  assert.equal(snapshot.overall.total, 1000);
  assert.equal(snapshot.overall.totalWomen, 800);
  assert.deepEqual(snapshot.regions, []);
});

test("appends the residual row = national minus the sum of regions", () => {
  const csv = [
    HEADER,
    row("МИЛЛИЙ", 1000),
    row("Andijon viloyati", 300),
    row("Buxoro viloyati", 200),
  ].join("\n");
  const { snapshot } = parsePensionCsv(csv, "HRM_pensiya_2026-08-05.csv");

  assert.equal(snapshot.regions.length, 3, "2 regions + 1 residual");
  const residual = snapshot.regions.at(-1);
  assert.equal(residual?.name, "Марказий аппарат ва республика марказлари");
  assert.equal(residual?.total, 500);
  assert.equal(residual?.totalWomen, 800 - 240 - 160);
  assert.equal(residual?.pensionWorking, 500);
});

test("omits the residual row when the regions already account for everything", () => {
  const csv = [HEADER, row("МИЛЛИЙ", 500), row("Andijon viloyati", 500)].join("\n");
  const { snapshot } = parsePensionCsv(csv, "HRM_pensiya_2026-08-05.csv");
  assert.equal(snapshot.regions.length, 1);
  assert.equal(snapshot.regions[0].name, "Андижон вилояти");
});

test("rejects a CSV whose regions exceed the national total", () => {
  const csv = [HEADER, row("МИЛЛИЙ", 100), row("Andijon viloyati", 300)].join("\n");
  assert.throws(
    () => parsePensionCsv(csv, "HRM_pensiya_2026-08-05.csv"),
    /Ҳудудлар йиғиндиси/,
    "a negative residual means the national and regional pulls disagree",
  );
});

test("rejects a CSV with no national row", () => {
  const csv = [HEADER, row("Andijon viloyati", 300)].join("\n");
  assert.throws(() => parsePensionCsv(csv, "x.csv"), /МИЛЛИЙ/);
});

test("names the offending region when one cannot be resolved", () => {
  const csv = [HEADER, row("МИЛЛИЙ", 900), row("Atlantis viloyati", 100)].join("\n");
  assert.throws(() => parsePensionCsv(csv, "x.csv"), /Atlantis viloyati/);
});

test("warns but does not fail on a duplicated region row", () => {
  const csv = [
    HEADER,
    row("МИЛЛИЙ", 1000),
    row("Andijon viloyati", 300),
    row("Andijon viloyati", 300),
  ].join("\n");
  const { snapshot, warnings } = parsePensionCsv(csv, "x.csv");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Андижон вилояти/);
  assert.equal(
    snapshot.regions.filter((r) => r.name === "Андижон вилояти").length,
    1,
    "the duplicate is dropped, not summed",
  );
});

test("tolerates a BOM, CRLF line endings and thin-space grouped numbers", () => {
  const csv =
    "﻿" + [HEADER, "МИЛЛИЙ;689 461;549 586;0;0;0;0;0;0;0;0;79 672;59 000;15 309;12 177"].join("\r\n");
  const { snapshot } = parsePensionCsv(csv, "HRM_pensiya_2026-08-05.csv");
  assert.equal(snapshot.overall.total, 689461);
  assert.equal(snapshot.overall.pensionWorking, 79672);
  assert.equal(snapshot.overall.reachingWomen, 12177);
});
```

The thin-space case is not hypothetical: the report renders grouped numbers, so a hand-built CSV will contain them.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `parsePensionCsv is not a function` (8 new failures; the 7 from Task 1 still pass).

- [ ] **Step 3: Write the parser**

Append to `lib/parse-pension.ts`:

```ts
// ---------------------------------------------------------------- CSV parsing

const COLUMNS = [
  "total", "totalWomen",
  "a3040", "a3040Women",
  "a4050", "a4050Women",
  "a5060", "a5060Women",
  "a60p", "a60pWomen",
  "pensionWorking", "pensionWorkingWomen",
  "reaching", "reachingWomen",
] as const satisfies ReadonlyArray<keyof PensionStat>;

type CountField = (typeof COLUMNS)[number];

/** "689 461" / "689461" / "" -> number. Strips every kind of grouping space. */
function count(raw: string | undefined): number {
  const cleaned = (raw ?? "").replace(/[\s  ']/g, "").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function emptyStat(name: string): PensionStat {
  const s = { name } as PensionStat;
  for (const c of COLUMNS) s[c] = 0;
  return s;
}

function subtract(a: PensionStat, b: PensionStat, name: string): PensionStat {
  const out = emptyStat(name);
  for (const c of COLUMNS) out[c] = a[c] - b[c];
  return out;
}

function addInto(acc: PensionStat, r: PensionStat): void {
  for (const c of COLUMNS) acc[c] += r[c];
}

function dateFromName(fileName?: string): string | null {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(fileName ?? "");
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function buildPensionSnapshot(
  overall: PensionStat,
  regions: PensionStat[],
  date: string,
): PensionSnapshot {
  return { date, uploadedAt: new Date().toISOString(), overall, regions };
}

export interface ParsedPension {
  snapshot: PensionSnapshot;
  warnings: string[];
}

export function parsePensionCsv(
  text: string,
  fileName?: string,
): ParsedPension {
  const warnings: string[] = [];
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV бўш ёки нотўғри форматда.");

  let overall: PensionStat | null = null;
  const regions: PensionStat[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(";");
    const label = (f[0] ?? "").trim();
    const national = isNationalRow(label);
    // resolveArgosRegion throws naming the offender — let it propagate so the
    // upload fails loudly instead of quietly losing a region.
    const name = national ? "" : resolveArgosRegion(label);

    const stat = emptyStat(name);
    COLUMNS.forEach((c, k) => {
      stat[c] = count(f[k + 1]);
    });

    if (national) {
      overall = stat;
      continue;
    }
    if (seen.has(name)) {
      warnings.push(`Такрорланган ҳудуд қатори ўтказиб юборилди: ${name}`);
      continue;
    }
    seen.add(name);
    regions.push(stat);
  }

  if (!overall) {
    throw new Error('CSV да миллий қатор ("МИЛЛИЙ") топилмади.');
  }

  if (regions.length > 0) {
    const sum = emptyStat("");
    for (const r of regions) addInto(sum, r);

    if (sum.total > overall.total) {
      throw new Error(
        `Ҳудудлар йиғиндиси миллий кўрсаткичдан катта ` +
          `(${sum.total} > ${overall.total}). Юклаш бекор қилинди.`,
      );
    }
    // The central apparatus and the republican centres sit outside every
    // viloyat, so the gap is real and is shown, not hidden.
    if (sum.total < overall.total) {
      regions.push(subtract(overall, sum, PENSION_RESIDUAL));
    }
  }

  const date = dateFromName(fileName) ?? new Date().toISOString().slice(0, 10);
  return { snapshot: buildPensionSnapshot(overall, regions, date), warnings };
}
```

`as const satisfies ReadonlyArray<keyof PensionStat>` makes a typo in `COLUMNS` a compile error while keeping the tuple's literal types, so `stat[c] = …` type-checks without a cast.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 15 tests.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add lib/parse-pension.ts tests/parse-pension.test.ts
git commit -m "Parse the pension CSV and surface the regional gap

The 14 viloyats do not add up to the national total -- the central
apparatus and the republican centres belong to no region. Emit that
difference as an explicit residual row instead of letting the map and
the KPI tiles disagree by 90k people with no explanation.

A sum larger than the national total means the two pulls disagree, so
the upload is refused rather than producing a negative row.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Derived metrics

**Files:**
- Create: `lib/pension-metrics.ts`
- Test: `tests/pension-metrics.test.ts`

**Interfaces:**
- Consumes: `PensionStat` (Task 1), `rampColor` from `lib/format.ts`.
- Produces: `pensionMetrics(stat): PensionMetrics`, `ageBands(stat): AgeBand[]`, `riskRamp(shares): RiskRamp`, `riskT(share, ramp): number`, `riskColor(t): string`.

Three things belong here rather than in a component, because each is a claim the dashboard makes and each can be wrong in a way a screenshot will not reveal.

**Why `oneIn` / `nearly` exist.** The hero says "one in N". 94 981 / 689 461 = 13.78 %, but one-in-seven is 14.29 % — so a bare "ҳар 7 нафардан бири" *overstates* the problem in front of the Minister. `nearly` is true exactly when the rounded claim overstates, and the copy adds "деярли". When the share lands above 1/N the claim already understates, which is the safe direction, and no qualifier appears.

**Why the ramp is inverted and relative.** `rampColor()` is green-at-high, built for connection and completion where high is good. Pension exposure is bad-at-high, so passing a share straight in would paint the worst regions green. Inverting alone is not enough either: every region sits around 10–15 %, so an absolute 0–100 % scale renders 14 identical squares. The ramp is therefore relative to the observed spread — and the map must state its endpoints, the same honesty the connection choropleth's key provides.

- [ ] **Step 1: Write the failing test**

Create `tests/pension-metrics.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pensionMetrics,
  ageBands,
  riskRamp,
  riskT,
  riskColor,
} from "../lib/pension-metrics.ts";
import type { PensionStat } from "../lib/types.ts";

/** The verified national figures, 2026-08-05. */
const NATIONAL: PensionStat = {
  name: "",
  total: 689461, totalWomen: 549586,
  a3040: 233005, a3040Women: 192116,
  a4050: 188630, a4050Women: 158289,
  a5060: 135652, a5060Women: 106055,
  a60p: 39362, a60pWomen: 18690,
  pensionWorking: 79672, pensionWorkingWomen: 59000,
  reaching: 15309, reachingWomen: 12177,
};

test("exposure is pension-age-working plus reaching-this-year", () => {
  const m = pensionMetrics(NATIONAL);
  assert.equal(m.exposed, 94981);
  assert.ok(Math.abs(m.exposedShare - 0.13776) < 0.0001);
  assert.ok(Math.abs(m.workingShare - 0.11556) < 0.0001);
  assert.ok(Math.abs(m.reachingShare - 0.02221) < 0.0001);
});

test('the national figure needs the "nearly" qualifier', () => {
  const m = pensionMetrics(NATIONAL);
  assert.equal(m.oneIn, 7);
  assert.equal(
    m.nearly,
    true,
    "13.78% is below one-in-seven (14.29%), so a bare 'one in 7' overstates",
  );
});

test("a share above 1/N drops the qualifier", () => {
  // 15% -> rounds to one-in-7 (14.29%), which understates. Safe, no qualifier.
  const m = pensionMetrics({ ...NATIONAL, total: 1000, pensionWorking: 150, reaching: 0 });
  assert.equal(m.oneIn, 7);
  assert.equal(m.nearly, false);
});

test("an empty population does not divide by zero", () => {
  const m = pensionMetrics({ ...NATIONAL, total: 0, pensionWorking: 0, reaching: 0 });
  assert.equal(m.exposed, 0);
  assert.equal(m.exposedShare, 0);
  assert.equal(m.oneIn, 0);
  assert.equal(m.nearly, false);
});

test("the under-30 band is the remainder and completes the breakdown", () => {
  const bands = ageBands(NATIONAL);
  assert.equal(bands.length, 5);
  assert.equal(bands[0].key, "u30");
  assert.equal(bands[0].total, 92812);
  assert.equal(bands[0].women, 74436);
  assert.equal(
    bands.reduce((a, b) => a + b.total, 0),
    NATIONAL.total,
    "five bands must account for every employee",
  );
});

test("men are never negative when a band's women exceed its total", () => {
  // Upstream drift can make a sub-count exceed its parent by a handful.
  const bands = ageBands({ ...NATIONAL, a60p: 100, a60pWomen: 140 });
  const b60 = bands.find((b) => b.key === "a60p");
  assert.equal(b60?.men, 0);
});

test("the under-30 band clamps at zero rather than going negative", () => {
  const bands = ageBands({ ...NATIONAL, total: 100 });
  assert.equal(bands[0].total, 0);
});

test("the risk ramp spans the observed spread, worst mapped to 1", () => {
  const ramp = riskRamp([0.1, 0.12, 0.15]);
  assert.equal(ramp.min, 0.1);
  assert.equal(ramp.max, 0.15);
  assert.equal(riskT(0.15, ramp), 1, "highest share = worst");
  assert.equal(riskT(0.1, ramp), 0, "lowest share = best");
  assert.ok(Math.abs(riskT(0.125, ramp) - 0.5) < 1e-9);
});

test("a flat spread does not divide by zero", () => {
  const ramp = riskRamp([0.12, 0.12, 0.12]);
  assert.equal(riskT(0.12, ramp), 0.5);
});

test("an empty region list yields a usable ramp", () => {
  const ramp = riskRamp([]);
  assert.equal(riskT(0.5, ramp), 0.5);
});

test("worst is red and best is green, the opposite of rampColor", () => {
  assert.equal(riskColor(1), "rgb(228, 72, 61)", "worst = red");
  assert.equal(riskColor(0), "rgb(16, 160, 109)", "best = green");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/pension-metrics.ts'`

- [ ] **Step 3: Write the implementation**

Create `lib/pension-metrics.ts`:

```ts
// Everything the pension pages derive from a stored PensionStat. Kept out of
// the components because each function below is a claim the dashboard makes in
// front of the Minister, and each can be wrong in a way a screenshot hides.

import type { PensionStat } from "./types";
import { rampColor } from "./format";

export interface PensionMetrics {
  /** Already past pension age, plus those reaching it this year. */
  exposed: number;
  exposedShare: number; // 0..1
  workingShare: number; // 0..1
  reachingShare: number; // 0..1
  /** Rounded denominator for the "one in N" phrasing; 0 when undefined. */
  oneIn: number;
  /** True when "one in N" overstates, so the copy must say "деярли". */
  nearly: boolean;
}

export function pensionMetrics(s: PensionStat): PensionMetrics {
  const exposed = s.pensionWorking + s.reaching;
  if (s.total <= 0 || exposed <= 0) {
    return {
      exposed: Math.max(0, exposed),
      exposedShare: 0,
      workingShare: 0,
      reachingShare: 0,
      oneIn: 0,
      nearly: false,
    };
  }
  const exposedShare = exposed / s.total;
  const oneIn = Math.round(1 / exposedShare);
  return {
    exposed,
    exposedShare,
    workingShare: s.pensionWorking / s.total,
    reachingShare: s.reaching / s.total,
    oneIn,
    // "one in 7" is 14.29%. If the real share is below that, saying it plainly
    // would overstate — hence the qualifier. Above it, the claim already
    // understates, which is the safe direction.
    nearly: oneIn > 0 && exposedShare < 1 / oneIn,
  };
}

export type AgeBandKey = "u30" | "a3040" | "a4050" | "a5060" | "a60p";

export interface AgeBand {
  key: AgeBandKey;
  total: number;
  women: number;
  men: number;
}

/**
 * The report publishes 30–40, 40–50, 50–60 and 60+, which together fall ~13 %
 * short of the workforce. That shortfall is exactly the under-30 cohort (there
 * is no single under-30 column upstream — only youth-quota splits by position),
 * so it is recovered by subtraction and the chart becomes a complete breakdown.
 */
export function ageBands(s: PensionStat): AgeBand[] {
  const namedTotal = s.a3040 + s.a4050 + s.a5060 + s.a60p;
  const namedWomen = s.a3040Women + s.a4050Women + s.a5060Women + s.a60pWomen;
  const band = (key: AgeBandKey, total: number, women: number): AgeBand => {
    const t = Math.max(0, total);
    const w = Math.min(Math.max(0, women), t);
    return { key, total: t, women: w, men: t - w };
  };
  return [
    band("u30", s.total - namedTotal, s.totalWomen - namedWomen),
    band("a3040", s.a3040, s.a3040Women),
    band("a4050", s.a4050, s.a4050Women),
    band("a5060", s.a5060, s.a5060Women),
    band("a60p", s.a60p, s.a60pWomen),
  ];
}

export interface RiskRamp {
  min: number;
  max: number;
}

/**
 * Regional pension shares cluster in a narrow band, so an absolute 0–100 %
 * scale would render 14 identical squares. The ramp spans the observed spread
 * instead — which obliges the map to print its endpoints, exactly as the
 * connection choropleth's key does.
 */
export function riskRamp(shares: number[]): RiskRamp {
  if (shares.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...shares), max: Math.max(...shares) };
}

/** Position within the ramp: 1 = worst (highest share), 0 = best. */
export function riskT(share: number, ramp: RiskRamp): number {
  const span = ramp.max - ramp.min;
  if (span <= 0) return 0.5; // flat spread — no region is worse than another
  const t = (share - ramp.min) / span;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * rampColor() is green-at-high because connection and completion are
 * good-at-high. Pension exposure is bad-at-high, so the input is inverted —
 * without this the worst regions would be painted green.
 */
export function riskColor(t: number): string {
  return rampColor(1 - t);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 26 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/pension-metrics.ts tests/pension-metrics.test.ts
git commit -m "Derive the pension figures the pages will claim

Three of these are easy to get wrong invisibly. 'One in 7' is 14.29% but
the real share is 13.78%, so the bare phrasing overstates in front of the
Minister -- nearly=true drives the qualifier. rampColor is green-at-high,
so feeding it an exposure share would paint the worst regions green. And
the four published age bands fall 13% short of the workforce; the gap is
the under-30 cohort, recovered by subtraction.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Storage, read API, seed

**Files:**
- Modify: `lib/store.ts` (the `K` map, plus new read/write functions)
- Modify: `lib/data.ts` (new import + two functions at end)
- Create: `data/seed-pension.json`

**Interfaces:**
- Consumes: `PensionManifest`, `PensionManifestEntry`, `PensionSnapshot` (Task 1).
- Produces: `getPensionManifest()`, `getPensionByRef(ref)`, `publishPension(snapshot): Promise<PensionPutResult>` where `interface PensionPutResult { snapshots: number }` (all `lib/store.ts`); `getLatestPension(): Promise<PensionData>` where `interface PensionData { snapshot: PensionSnapshot; isSeed: boolean }`, and `getPensionHistory(): Promise<PensionManifestEntry[]>` (both `lib/data.ts`).

**Why a seed exists.** `lib/data.ts` imports its seeds statically at module scope, so `/pensiya` would fail to compile without one. The seed carries the real verified national figures and an **empty** `regions` array — honest about what has actually been pulled. The pages treat `regions.length === 0` as "regional cut not loaded yet" and hide the map, so the Minister still sees a true headline before the 14 regional pulls are run.

- [ ] **Step 1: Write the seed**

Create `data/seed-pension.json` — one line, matching how `seed-completion.json` is stored:

```json
{"date":"2026-08-05","uploadedAt":"2026-08-05T00:00:00.000Z","overall":{"name":"","total":689461,"totalWomen":549586,"a3040":233005,"a3040Women":192116,"a4050":188630,"a4050Women":158289,"a5060":135652,"a5060Women":106055,"a60p":39362,"a60pWomen":18690,"pensionWorking":79672,"pensionWorkingWomen":59000,"reaching":15309,"reachingWomen":12177},"regions":[]}
```

These are the figures verified against the live report on 2026-08-05. Do not adjust them to make any total tidier — two pulls minutes apart already differed by 5, and the drift is upstream, not ours.

- [ ] **Step 2: Add the storage layer**

In `lib/store.ts`, extend the type import at the top:

```ts
import type {
  CompletionManifest,
  CompletionManifestEntry,
  CompletionSnapshot,
  Manifest,
  ManifestEntry,
  PensionManifest,
  PensionManifestEntry,
  PensionSnapshot,
  Registry,
  Snapshot,
} from "./types";
```

Add two keys to `K`:

```ts
const K = {
  manifest: "manifest",
  snapshot: "snapshot:latest",
  registry: "registry",
  compManifest: "completion:manifest",
  compSnapshot: "completion:snapshot:latest",
  penManifest: "pension:manifest",
  penSnapshot: "pension:snapshot:latest",
} as const;
```

Add the reads next to `getCompletionByRef`:

```ts
export const getPensionManifest = cache(
  async (): Promise<PensionManifest | null> =>
    readKey<PensionManifest>(K.penManifest),
);

export async function getPensionByRef(
  ref: string,
): Promise<PensionSnapshot | null> {
  return readKey<PensionSnapshot>(ref);
}
```

And the write at the end of the file:

```ts
export interface PensionPutResult {
  snapshots: number;
}

/**
 * Persist a new pension snapshot and update its manifest. Independent of
 * publish() and publishCompletion() — own keys, own manifest.
 */
export async function publishPension(
  snapshot: PensionSnapshot,
): Promise<PensionPutResult> {
  const manifest = (await getPensionManifest()) ?? {
    latestUrl: "",
    snapshots: [],
  };

  const entry: PensionManifestEntry = {
    date: snapshot.date,
    uploadedAt: snapshot.uploadedAt,
    url: K.penSnapshot,
    overall: snapshot.overall,
    regions: snapshot.regions,
  };
  const kept = manifest.snapshots.filter((s) => s.date !== snapshot.date);
  const snapshots = [...kept, entry].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const newestDate = snapshots[snapshots.length - 1].date;

  // Backfilling an older report must never replace the current dashboard data.
  if (snapshot.date === newestDate) {
    await writeKey(K.penSnapshot, snapshot);
  }

  const next: PensionManifest = { latestUrl: K.penSnapshot, snapshots };
  await writeKey(K.penManifest, next);

  return { snapshots: snapshots.length };
}
```

`getPensionManifest` is wrapped in `cache()` for per-request dedup only. Do not add a TTL memo — see Global Constraints.

- [ ] **Step 3: Add the read API**

In `lib/data.ts`, add the seed import beside the others:

```ts
import seedPensionJson from "@/data/seed-pension.json";
```

extend the type import with `PensionManifestEntry` and `PensionSnapshot`, extend the store import with `getPensionByRef` and `getPensionManifest`, and add the cast beside `seedCompletion`:

```ts
const seedPension = seedPensionJson as unknown as PensionSnapshot;
```

Then append to the end of the file:

```ts
// --- pension age ("Пенсия ёши") ---------------------------------------------

export interface PensionData {
  snapshot: PensionSnapshot;
  isSeed: boolean;
}

export async function getLatestPension(): Promise<PensionData> {
  try {
    const manifest = await getPensionManifest();
    if (manifest?.latestUrl) {
      const snap = await getPensionByRef(manifest.latestUrl);
      if (snap) return { snapshot: snap, isSeed: false };
    }
  } catch {
    /* fall through to seed */
  }
  return { snapshot: seedPension, isSeed: true };
}

export async function getPensionHistory(): Promise<PensionManifestEntry[]> {
  try {
    const manifest = await getPensionManifest();
    if (manifest?.snapshots?.length) return manifest.snapshots;
  } catch {
    /* fall through */
  }
  return [
    {
      date: seedPension.date,
      uploadedAt: seedPension.uploadedAt,
      url: "seed",
      overall: seedPension.overall,
      regions: seedPension.regions,
    },
  ];
}
```

- [ ] **Step 4: Verify the round trip against the local file backend**

With no KV env vars set, `lib/store.ts` falls back to `.data/`. Run this from the repo root:

```bash
node --input-type=module -e "
const { publishPension } = await import('./lib/store.ts');
const { getLatestPension, getPensionHistory } = await import('./lib/data.ts');
const seed = (await import('./data/seed-pension.json', { with: { type: 'json' } })).default;
await publishPension({ ...seed, date: '2026-08-06', uploadedAt: new Date().toISOString() });
const { snapshot, isSeed } = await getLatestPension();
console.log('isSeed:', isSeed, '| date:', snapshot.date, '| history:', (await getPensionHistory()).length);
"
```

Expected: `isSeed: false | date: 2026-08-06 | history: 1`

Then delete the scratch state so it does not leak into dev: `rm -rf .data/pension_manifest.json .data/pension_snapshot_latest.json`

If the import of `./lib/data.ts` fails on the `@/data/...` specifier, that is expected — the alias does not resolve outside the bundler. In that case verify `publishPension` alone and confirm the two `.data/pension_*.json` files appear with the right shape.

- [ ] **Step 5: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean. The build is what proves the JSON seed satisfies `PensionSnapshot`.

- [ ] **Step 6: Commit**

```bash
git add lib/store.ts lib/data.ts data/seed-pension.json
git commit -m "Store pension snapshots under their own keys

Third dataset, third manifest -- connection and completion are untouched.

The seed carries the real national figures with an empty regions array
rather than a fabricated regional spread: the 14 regional pulls have not
been run yet, and inventing them for a ministerial dashboard is the one
thing worse than an empty map.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Bilingual dictionary

**Files:**
- Modify: `lib/i18n/uz.ts`
- Modify: `lib/i18n/ru.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `S.nav.pension`, `S.nav.groupRollout`, `S.nav.groupAnalytics`, `S.map.pensionShare`, `S.map.people`, the whole `S.pension.*` block, and `S.admin.pen*`. Every later UI task consumes these.

`RU satisfies Strings` makes `ru.ts` a compile error the moment `uz.ts` gains a key it lacks, so both files change together or the build breaks. Function-valued keys must keep identical signatures.

**Why the hero sentence is a function, not a template.** Uzbek and Russian order the clause differently and Russian would need numeral agreement for "94 981 сотрудник". The component renders the big number itself and then appends `heroTail(oneIn, nearly)`, so each language composes its own remainder and the Russian noun agrees with "каждый", never with the count. This is the same split `OverviewHero` already makes with its `lang === "ru"` branch.

- [ ] **Step 1: Extend `lib/i18n/uz.ts`**

Add three keys to the existing `nav` block:

```ts
  nav: {
    overview: "Умумий кўриниш",
    regions: "Ҳудудлар",
    unconnected: "Уланмаганлар",
    trend: "Динамика",
    completion: "Маълумотлар тўлдириш даражаси",
    admin: "Маълумот юклаш",
    pension: "Пенсия ёши",
    groupRollout: "АРГОС жорий этилиши",
    groupAnalytics: "Кадрлар таҳлили",
  },
```

Add two keys to the existing `map` block:

```ts
    pensionShare: "Пенсия ёши улуши",
    people: "Ходимлар",
```

Add a whole `pension` block after `completion`:

```ts
  pension: {
    navTitle: "Пенсия ёши",
    title: "Пенсия ёшидаги ва унга яқинлашган ходимлар",
    subtitle:
      "hrm.argos.uz ёш тақсимоти ҳисоботи асосида — ҳудуд ва жинс кесимида",
    asOf: "ҳолатига",

    heroEyebrow: "Кадрлар алмашинуви эҳтиёжи",
    // The big number is rendered separately; this is the sentence after it.
    heroTail: (oneIn: number, nearly: boolean) =>
      `ходим — ${nearly ? "деярли " : ""}ҳар ${oneIn} нафардан бири — бугун пенсия ёшида ёки шу йил ичида пенсия ёшига етади`,
    // Used when the share is too small for an honest "one in N".
    heroTailPlain:
      "ходим бугун пенсия ёшида ёки шу йил ичида пенсия ёшига етади",

    working: "Пенсия ёшида, ишламоқда",
    workingHint: "Пенсия ҳуқуқига эга бўлиб, фаолиятда",
    reaching: "Шу йили пенсия ёшига етади",
    reachingHint: "Жорий йил ичида",
    total: "Жами ходимлар",
    totalHint: "Амалдаги ходимлар сони",
    women: "Шундан хотин-қизлар",
    womenHint: "Пенсия ёшидагилар ичида",

    mapTitle: "Ҳудудлар бўйича пенсия ёши улуши",
    mapHint: "Ҳудуд устига босиб, батафсил кўринг",
    mapKey: (lo: string, hi: string) =>
      `Шкала ${lo} — ${hi} оралиғида (нисбий)`,
    rankingTitle: "Ҳудудлар рейтинги",
    rankingHint: "юқоридан пастга",

    ageTitle: "Ёш таркиби",
    ageHint: "Ходимларнинг ёш гуруҳлари бўйича тақсимоти",
    band: {
      u30: "30 ёшгача",
      a3040: "30–40 ёш",
      a4050: "40–50 ёш",
      a5060: "50–60 ёш",
      a60p: "60 ёшдан юқори",
    },
    seriesWomen: "Хотин-қизлар",
    seriesMen: "Эркаклар",

    trendTitle: "Динамика",
    trendSubtitle: "Пенсия ёшидагилар улушининг вақт бўйича ўзгариши",
    trendLine: "Алмашинув улуши, %",
    trendSingle:
      "Ҳозирча битта ҳисобот мавжуд. Янги ҳисоботлар юкланган сари динамика тўлдирилиб боради.",
    totalOption: "Жами (Республика бўйича)",

    tableTitle: "Ҳудудлар кесими",
    search: "Ҳудуд бўйича қидириш…",
    export: "Excel'га юклаш",
    sheet: "Пенсия ёши",
    count: (n: number) => `${n} та ҳудуд`,
    empty: "Танланган шарт бўйича ҳудуд топилмади.",
    col: {
      n: "№",
      region: "Ҳудуд",
      total: "Жами ходим",
      women: "Хотин-қизлар",
      working: "Пенсия ёшида",
      reaching: "Шу йили етади",
      share: "Алмашинув улуши",
    },

    noRegions: "Ҳудудлар кесими ҳали юкланмаган",
    noRegionsHint:
      "Ҳозирча фақат республика бўйича умумий кўрсаткич мавжуд. 14 та ҳудуд бўйича маълумот юклангач, харита ва рейтинг кўринади.",

    overviewCard: "Пенсия ёши ва кадрлар алмашинуви",
    peopleUnit: "нафар",
    regionsUnit: "та ҳудуд",
  },
```

Add to the existing `admin` block:

```ts
    penSection: "Пенсия ёши (CSV)",
    penSubtitle:
      "hrm.argos.uz ёш тақсимоти ҳисоботидан олинган CSV файлни юкланг (bookmarklet юклаб берган).",
    penFile: "Пенсия ёши CSV файли",
    penHint: "HRM_pensiya_ЙИЛ-ОЙ-КУН.csv",
    penTotal: "Жами",
    penWorking: "Пенсия ёшида",
    penReaching: "Шу йили етади",
    penRegions: "Ҳудудлар",
    penPublish: "Пенсия дашбордини янгилаш",
    penHistory: "Юкланган ҳисоботлар",
    penErrParse:
      "CSV файлни ўқиб бўлмади. hrm.argos.uz bookmarklet юклаган .csv файл эканига ишонч ҳосил қилинг.",
```

- [ ] **Step 2: Mirror every key in `lib/i18n/ru.ts`**

`nav`:

```ts
    pension: "Пенсионный возраст",
    groupRollout: "Внедрение АРГОС",
    groupAnalytics: "Кадровая аналитика",
```

`map`:

```ts
    pensionShare: "Доля пенсионного возраста",
    people: "Сотрудники",
```

`pension`:

```ts
  pension: {
    navTitle: "Пенсионный возраст",
    title: "Сотрудники пенсионного и предпенсионного возраста",
    subtitle:
      "По отчёту возрастного распределения hrm.argos.uz — в разрезе регионов и пола",
    asOf: "по состоянию на",

    heroEyebrow: "Потребность в замещении кадров",
    // The count precedes this string, so the noun agrees with "каждый",
    // never with the number — no numeral-agreement problem.
    heroTail: (oneIn: number, nearly: boolean) =>
      `— ${nearly ? "почти " : ""}каждый ${oneIn}-й сотрудник — сегодня находится в пенсионном возрасте или достигнет его в этом году`,
    heroTailPlain:
      "— столько сотрудников находятся в пенсионном возрасте или достигнут его в этом году",

    working: "В пенсионном возрасте, работают",
    workingHint: "Имеют право на пенсию и продолжают работать",
    reaching: "Достигнут пенсионного возраста в этом году",
    reachingHint: "В течение текущего года",
    total: "Всего сотрудников",
    totalHint: "Фактическая численность",
    women: "Из них женщины",
    womenHint: "Среди лиц пенсионного возраста",

    mapTitle: "Доля пенсионного возраста по регионам",
    mapHint: "Нажмите на регион для подробностей",
    mapKey: (lo: string, hi: string) =>
      `Шкала в диапазоне ${lo} — ${hi} (относительная)`,
    rankingTitle: "Рейтинг регионов",
    rankingHint: "сверху вниз",

    ageTitle: "Возрастная структура",
    ageHint: "Распределение сотрудников по возрастным группам",
    band: {
      u30: "до 30 лет",
      a3040: "30–40 лет",
      a4050: "40–50 лет",
      a5060: "50–60 лет",
      a60p: "старше 60 лет",
    },
    seriesWomen: "Женщины",
    seriesMen: "Мужчины",

    trendTitle: "Динамика",
    trendSubtitle: "Изменение доли пенсионного возраста во времени",
    trendLine: "Доля замещения, %",
    trendSingle:
      "Пока доступен один отчёт. Динамика будет заполняться по мере загрузки новых отчётов.",
    totalOption: "Всего (по Республике)",

    tableTitle: "Разрез по регионам",
    search: "Поиск по региону…",
    export: "Выгрузить в Excel",
    sheet: "Пенсионный возраст",
    count: (n: number) => `${n} регионов`,
    empty: "По заданным условиям регион не найден.",
    col: {
      n: "№",
      region: "Регион",
      total: "Всего сотрудников",
      women: "Женщины",
      working: "В пенсионном возрасте",
      reaching: "Достигнут в этом году",
      share: "Доля замещения",
    },

    noRegions: "Разрез по регионам ещё не загружен",
    noRegionsHint:
      "Пока доступен только общий показатель по Республике. Карта и рейтинг появятся после загрузки данных по 14 регионам.",

    overviewCard: "Пенсионный возраст и замещение кадров",
    peopleUnit: "чел.",
    regionsUnit: "регионов",
  },
```

`admin`:

```ts
    penSection: "Пенсионный возраст (CSV)",
    penSubtitle:
      "Загрузите CSV из отчёта возрастного распределения hrm.argos.uz (выгружен bookmarklet'ом).",
    penFile: "CSV файл пенсионного возраста",
    penHint: "HRM_pensiya_ГГГГ-ММ-ДД.csv",
    penTotal: "Всего",
    penWorking: "В пенс. возрасте",
    penReaching: "Достигнут в этом году",
    penRegions: "Регионы",
    penPublish: "Обновить дашборд пенсионного возраста",
    penHistory: "Загруженные отчёты",
    penErrParse:
      "Не удалось прочитать CSV. Убедитесь, что это файл .csv, выгруженный bookmarklet'ом hrm.argos.uz.",
```

- [ ] **Step 3: Verify the mirror compiles**

Run: `npx tsc --noEmit`
Expected: no output. A missing or misspelled key in `ru.ts` surfaces here as a `satisfies` error naming the key — fix it rather than loosening the constraint.

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/uz.ts lib/i18n/ru.ts
git commit -m "Add the pension dictionary in both languages

The hero sentence is a function rather than a template because Uzbek and
Russian order the clause differently, and because '94 981 сотрудник'
would need numeral agreement. Rendering the count separately lets the
Russian noun agree with 'каждый' instead.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Upload API and admin section

**Files:**
- Create: `app/api/pension/route.ts`
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `parsePensionCsv`, `ParsedPension` (Task 2); `publishPension`, `hasBlob` (Task 4); `getPensionHistory` (Task 4); `S.admin.pen*` (Task 5).
- Produces: `POST /api/pension` (body `{ password, snapshot }` → `{ ok: true, snapshots }`) and `GET /api/pension` (→ `{ count, snapshots: [{ date, uploadedAt, overall }] }`). No later task consumes these — this is the ingestion path.

After this task the feature is end-to-end usable: a CSV can be uploaded and lands in KV, even though no page renders it yet.

- [ ] **Step 1: Create the route**

`app/api/pension/route.ts` — a direct analogue of `app/api/completion/route.ts`:

```ts
import { getPensionHistory } from "@/lib/data";
import { hasBlob, publishPension } from "@/lib/store";
import type { PensionSnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UploadBody {
  password?: string;
  snapshot?: PensionSnapshot;
}

function validSnapshot(s: unknown): s is PensionSnapshot {
  const x = s as PensionSnapshot;
  return (
    !!x &&
    typeof x.date === "string" &&
    Array.isArray(x.regions) &&
    !!x.overall &&
    typeof x.overall.total === "number" &&
    x.overall.total > 0
  );
}

export async function POST(request: Request) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    return Response.json({ error: "nostore" }, { status: 501 });
  }

  let body: UploadBody;
  try {
    body = (await request.json()) as UploadBody;
  } catch {
    return Response.json({ error: "bad" }, { status: 400 });
  }

  if (body.password !== pw) {
    return Response.json({ error: "auth" }, { status: 401 });
  }

  if (!validSnapshot(body.snapshot)) {
    return Response.json({ error: "bad" }, { status: 400 });
  }

  if (!hasBlob() && process.env.NODE_ENV === "production") {
    return Response.json({ error: "nostore" }, { status: 501 });
  }

  try {
    const result = await publishPension(body.snapshot);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { error: "server", detail: String(e) },
      { status: 500 },
    );
  }
}

// Lightweight history for the admin panel.
export async function GET() {
  const history = await getPensionHistory();
  return Response.json({
    count: history.length,
    snapshots: history.map((h) => ({
      date: h.date,
      uploadedAt: h.uploadedAt,
      overall: h.overall,
    })),
  });
}
```

Note `regions` is validated as an array but **not** required to be non-empty — a national-only upload is legitimate before the 14 regional pulls are run. This is where it differs from the completion route, which demands `orgs.length > 0`.

- [ ] **Step 2: Wire the admin page state**

In `app/admin/page.tsx`, add the import beside the completion parser:

```ts
import { parsePensionCsv, type ParsedPension } from "@/lib/parse-pension";
```

Add the history item type beside `CompHistoryItem`:

```ts
interface PenHistoryItem {
  date: string;
  uploadedAt: string;
  overall: { total: number; pensionWorking: number; reaching: number };
}
```

Add state below the completion state block:

```ts
  // pension (separate dataset)
  const [penParsed, setPenParsed] = useState<ParsedPension | null>(null);
  const [penParsing, setPenParsing] = useState(false);
  const [penPublishing, setPenPublishing] = useState(false);
  const [penError, setPenError] = useState<string | null>(null);
  const [penDone, setPenDone] = useState(false);
  const [penHistory, setPenHistory] = useState<PenHistoryItem[]>([]);
```

Add the fetch effect below the completion one:

```ts
  useEffect(() => {
    fetch("/api/pension")
      .then((r) => r.json())
      .then((d) => setPenHistory(d.snapshots ?? []))
      .catch(() => {});
  }, [penDone]);
```

Add the two handlers below `publishCompletion`:

```ts
  async function onPension(file: File | undefined) {
    if (!file) return;
    setPenError(null);
    setPenDone(false);
    setPenParsing(true);
    try {
      const text = await file.text();
      setPenParsed(parsePensionCsv(text, file.name));
    } catch (e) {
      setPenParsed(null);
      // parsePensionCsv throws a specific Uzbek message (unknown region,
      // missing national row, regions exceeding the total) — show it verbatim,
      // it is the only thing that tells the user which row is wrong.
      setPenError(e instanceof Error ? e.message : S.admin.penErrParse);
    } finally {
      setPenParsing(false);
    }
  }

  async function publishPensionSnapshot() {
    if (!penParsed || !password) return;
    setPenPublishing(true);
    setPenError(null);
    try {
      const res = await fetch("/api/pension", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, snapshot: penParsed.snapshot }),
      });
      if (res.ok) {
        setPenDone(true);
      } else if (res.status === 401) setPenError(S.admin.errAuth);
      else if (res.status === 501) setPenError(S.admin.errNoStore);
      else if (res.status === 400) setPenError(S.admin.penErrParse);
      else setPenError(S.admin.errGeneric);
    } catch {
      setPenError(S.admin.errGeneric);
    } finally {
      setPenPublishing(false);
    }
  }
```

Add the preview shorthand beside `const ct = …`:

```ts
  const pt = penParsed?.snapshot.overall;
```

- [ ] **Step 3: Add the third section's markup**

Insert this immediately before the final `</div>` that closes the page container, i.e. after the completion section's closing `</div>`:

```tsx
      {/* ---- pension age (separate dataset) ---- */}
      <div className="space-y-4 border-t border-line pt-6">
        <div>
          <h2 className="text-[1.05rem] font-semibold">{S.admin.penSection}</h2>
          <p className="mt-0.5 text-[0.8rem] text-ink-soft">{S.admin.penSubtitle}</p>
        </div>

        {penDone ? (
          <div className="card space-y-4 p-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ul-soft">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m5 12.5 4.5 4.5L19 7" stroke="var(--color-ul)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-[1.05rem] font-semibold">{S.admin.success}</p>
              <p className="mt-1 text-[0.83rem] text-ink-soft">{S.admin.successHint}</p>
            </div>
            <div className="flex justify-center gap-3">
              <Link href="/pensiya" className="rounded-lg bg-sov px-5 py-2.5 text-[0.85rem] font-semibold text-white hover:bg-sov-deep">
                {S.admin.goDashboard}
              </Link>
              <button
                onClick={() => { setPenDone(false); setPenParsed(null); }}
                className="rounded-lg border border-line px-5 py-2.5 text-[0.85rem] font-semibold text-ink-soft hover:bg-paper"
              >
                {S.admin.again}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FileCard
                label={S.admin.penFile}
                hint={S.admin.penHint}
                accept=".csv,text/csv"
                onPick={onPension}
                picked={
                  penParsed
                    ? `${fmtDate(penParsed.snapshot.date)} · ${fmtInt(penParsed.snapshot.regions.length)} ${S.pension.regionsUnit}`
                    : penParsing
                      ? S.admin.parsing
                      : undefined
                }
                required
              />
              {pt && (
                <div className="card p-5">
                  <span className="eyebrow">{S.admin.preview}</span>
                  <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <PreviewStat label={S.admin.penTotal} value={fmtInt(pt.total)} />
                    <PreviewStat label={S.admin.penWorking} value={fmtInt(pt.pensionWorking)} tone="un" />
                    <PreviewStat label={S.admin.penReaching} value={fmtInt(pt.reaching)} tone="un" />
                    <PreviewStat label={S.admin.penRegions} value={fmtInt(penParsed?.snapshot.regions.length ?? 0)} />
                  </div>
                </div>
              )}
            </div>

            {penParsed && penParsed.warnings.length > 0 && (
              <ul className="card space-y-1 p-4 text-[0.8rem] text-goal">
                {penParsed.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}

            <div className="card space-y-4 p-5">
              <label className="block">
                <span className="mb-1.5 block text-[0.82rem] font-medium text-ink-soft">
                  {S.admin.password}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={S.admin.passwordPh}
                  className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[0.9rem] outline-none focus:border-sov focus:bg-surface"
                />
              </label>

              {penError && (
                <p className="rounded-lg bg-un-soft px-3.5 py-2.5 text-[0.82rem] font-medium text-un">
                  {penError}
                </p>
              )}

              <button
                onClick={publishPensionSnapshot}
                disabled={!penParsed || !password || penPublishing}
                className="w-full rounded-lg bg-sov px-5 py-3 text-[0.9rem] font-semibold text-white transition-colors hover:bg-sov-deep disabled:cursor-not-allowed disabled:opacity-40"
              >
                {penPublishing ? S.admin.publishing : S.admin.penPublish}
              </button>
            </div>
          </div>
        )}

        {penHistory.length > 0 && (
          <div className="card p-5">
            <span className="eyebrow">{S.admin.penHistory}</span>
            <ul className="mt-3 divide-y divide-line-soft">
              {[...penHistory].reverse().map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-[0.82rem]">
                  <span className="tnum font-medium">{fmtDate(h.date)}</span>
                  <span className="tnum text-ink-soft">
                    {fmtInt(h.overall.pensionWorking)} / {fmtInt(h.overall.total)}
                  </span>
                  <span className="tnum text-[0.72rem] text-ink-faint">{fmtDateTime(h.uploadedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
```

The warnings list is new relative to the completion section: `parsePensionCsv` reports duplicated region rows as warnings rather than failing, and a silently-dropped region on a 15-row upload is worth showing.

- [ ] **Step 4: Verify the round trip in the browser**

Run: `npm run dev`, open `http://127.0.0.1:3000/admin`.

Build a minimal CSV to upload — save as `HRM_pensiya_2026-08-05.csv`:

```
hudud;jami;jami_ayol;a3040;a3040_ayol;a4050;a4050_ayol;a5060;a5060_ayol;a60p;a60p_ayol;pensiya;pensiya_ayol;yetadigan;yetadigan_ayol
МИЛЛИЙ;689461;549586;233005;192116;188630;158289;135652;106055;39362;18690;79672;59000;15309;12177
```

Expected: the preview shows `689 461`, `79 672`, `15 309`, `0` regions. Enter the admin password from `.env.local` and publish. Expected: the success card appears and the history list gains a `05.08.2026` row.

Then confirm the API directly: `curl http://127.0.0.1:3000/api/pension` returns `count: 1` and the national `overall`.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add app/api/pension/route.ts app/admin/page.tsx
git commit -m "Accept pension CSV uploads

Unlike the completion route, an empty regions array is valid: the
national row alone is a legitimate upload, and it is what the dashboard
has until the 14 regional pulls are run.

Parser errors reach the admin verbatim -- 'unknown region X' is the only
thing that says which of the 15 rows is wrong.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: The hero and the `/pensiya` page

**Files:**
- Create: `components/pension/PensionHero.tsx`
- Create: `app/pensiya/page.tsx`

**Interfaces:**
- Consumes: `getLatestPension` (Task 4), `pensionMetrics` (Task 3), `S.pension.*` (Task 5).
- Produces: `<PensionHero stat={PensionStat} />`, and the `/pensiya` route. Tasks 8–11 insert their sections into this page.

**The design constraint.** This page is projected and walked through for the Minister, so everything above the fold must read at 2–3 m and fit one 1920×1080 screen. The completion page opens with an average percentage; that is the wrong opening here. This one opens with the replacement-demand count, because that is the figure that implies an action.

- [ ] **Step 1: Build the hero**

Create `components/pension/PensionHero.tsx`:

```tsx
import type { PensionStat } from "@/lib/types";
import { pensionMetrics } from "@/lib/pension-metrics";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

/**
 * Opens with the replacement-demand count rather than a percentage: 94 981 is
 * the number that implies an action (how many people must be ready to be
 * replaced), where "13.8%" is just a statistic.
 *
 * The "one in N" phrasing is generated, not written — see pensionMetrics().
 * A bare "one in 7" would overstate, so the copy carries "деярли" whenever the
 * rounded claim exceeds the real share.
 */
export async function PensionHero({ stat }: { stat: PensionStat }) {
  const S = await getS();
  const m = pensionMetrics(stat);

  return (
    <section className="border-live card rise overflow-hidden p-6 sm:p-8">
      <span className="eyebrow text-sov">{S.pension.heroEyebrow}</span>

      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <AnimatedNumber
          value={m.exposed}
          className="text-grad-ul tnum text-[3.2rem] font-bold leading-[0.9] sm:text-[4.6rem]"
        />
        <span className="max-w-[52ch] text-[1.05rem] leading-snug text-ink-soft sm:text-[1.3rem]">
          {m.oneIn > 0
            ? S.pension.heroTail(m.oneIn, m.nearly)
            : S.pension.heroTailPlain}
        </span>
      </p>

      {/* the two components of the headline, kept adjacent to it so the
          number is never quoted without its parts */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Component
          label={S.pension.working}
          hint={S.pension.workingHint}
          value={stat.pensionWorking}
          share={m.workingShare}
        />
        <Component
          label={S.pension.reaching}
          hint={S.pension.reachingHint}
          value={stat.reaching}
          share={m.reachingShare}
        />
      </div>
    </section>
  );
}

function Component({
  label,
  hint,
  value,
  share,
}: {
  label: string;
  hint: string;
  value: number;
  share: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.82rem] font-medium text-ink-soft">{label}</span>
        <span className="tnum shrink-0 text-[0.82rem] font-semibold text-un">
          {fmtPct(share, 1)}
        </span>
      </div>
      <div className="tnum mt-1.5 text-[1.75rem] font-semibold leading-none">
        {fmtInt(value)}
      </div>
      <div className="mt-1 text-[0.72rem] text-ink-faint">{hint}</div>
    </div>
  );
}
```

- [ ] **Step 2: Build the page**

Create `app/pensiya/page.tsx`. Sections from Tasks 8–11 slot into the marked places; until then the page is hero + KPI row + the no-regions notice.

```tsx
import { getLatestPension } from "@/lib/data";
import { PensionHero } from "@/components/pension/PensionHero";
import { StatTile } from "@/components/StatTile";
import { LiveSync } from "@/components/LiveSync";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { fmtDate } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PensionPage() {
  const S = await getS();
  const { snapshot } = await getLatestPension();
  const { overall, regions } = snapshot;

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
            {S.pension.title}
          </h1>
          <p className="mt-1 text-[0.82rem] text-ink-soft">{S.pension.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <LiveSync />
          <p className="tnum text-[0.75rem] text-ink-faint">
            {fmtDate(snapshot.date)} {S.pension.asOf}
          </p>
        </div>
      </header>

      <PensionHero stat={overall} />

      <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <RevealItem className="h-full">
          <StatTile label={S.pension.total} value={overall.total} accent="sov" hint={S.pension.totalHint} />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile
            label={S.pension.working}
            value={overall.pensionWorking}
            accent="un"
            shareOfTotal={overall.total > 0 ? overall.pensionWorking / overall.total : undefined}
          />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile
            label={S.pension.reaching}
            value={overall.reaching}
            accent="och"
            shareOfTotal={overall.total > 0 ? overall.reaching / overall.total : undefined}
          />
        </RevealItem>
        <RevealItem className="h-full">
          {/* Shown as a plain split, with no claim attached: women are 79.7% of
              the workforce, so their 74.1% of this group is BELOW the base rate
              and must never be headlined as a finding. */}
          <StatTile
            label={S.pension.women}
            value={overall.pensionWorkingWomen}
            accent="sov"
            hint={S.pension.womenHint}
          />
        </RevealItem>
      </RevealGroup>

      {regions.length === 0 ? (
        <Reveal>
          <div className="card p-6 text-center">
            <p className="text-[0.95rem] font-semibold">{S.pension.noRegions}</p>
            <p className="mx-auto mt-1.5 max-w-[62ch] text-[0.82rem] text-ink-soft">
              {S.pension.noRegionsHint}
            </p>
          </div>
        </Reveal>
      ) : null}

      {/* Task 8 inserts the map + ranking board here */}
      {/* Task 9 inserts the age structure chart here */}
      {/* Task 10 inserts the trend here */}
      {/* Task 11 inserts the region table here */}
    </div>
  );
}
```

- [ ] **Step 3: Check it renders**

Run: `npm run dev`, open `http://127.0.0.1:3000/pensiya`.

Expected, against the seed (or the Task 6 upload): eyebrow «Кадрлар алмашинуви эҳтиёжи», the number **94 981** counting up, then «ходим — **деярли** ҳар **7** нафардан бири — бугун пенсия ёшида ёки шу йил ичида пенсия ёшига етади». Below it two component cards (79 672 / 11,6 % and 15 309 / 2,2 %), then four KPI tiles, then the no-regions notice.

The word «деярли» must be present. If it is missing, `pensionMetrics` is wrong, not the copy — the tests in Task 3 cover exactly this.

- [ ] **Step 4: Check the Russian rendering**

Switch to РУ with the header toggle. Expected: «94 981 — почти каждый 7-й сотрудник — сегодня находится в пенсионном возрасте или достигнет его в этом году». Confirm no Uzbek-only letters (ў, қ, ғ, ҳ) appear anywhere outside data values.

- [ ] **Step 5: Type-check, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add components/pension/PensionHero.tsx app/pensiya/page.tsx
git commit -m "Open the pension page with a count, not a percentage

94 981 is the figure that implies an action -- how many people must be
ready to be replaced. '13.8%' is the same fact with the decision removed,
and the completion page already proves how quickly an average reads as
background noise.

The women's tile carries no claim: at 74.1% of this group against 79.7%
of the workforce, headlining it would present a below-base-rate number as
a finding.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Choropleth and regional ranking

**Files:**
- Create: `components/pension/PensionMap.tsx`
- Create: `components/pension/PensionBoard.tsx`
- Modify: `app/pensiya/page.tsx` (replace the Task 8 marker)

**Interfaces:**
- Consumes: `pensionMetrics`, `riskRamp`, `riskT`, `riskColor` (Task 3); `isGeographicRegion`, `regionSlug`, `regionLabel`, `regionLabelShort` (existing `lib/regions.ts`); `S.pension.*`, `S.map.*` (Task 5).
- Produces: `<PensionBoard regions={PensionStat[]} />`. Task 12 reuses nothing from it.

**The two things that make this map honest.** `rampColor()` is green-at-high, so a raw exposure share would paint the worst regions green — `riskColor()` inverts it. And every region sits within a few points of the others, so an absolute 0–100 % scale renders 14 identical squares; the ramp is relative to the observed spread, which obliges the map to print its endpoints. That key is not decoration. Do not remove it.

- [ ] **Step 1: Build the map**

Create `components/pension/PensionMap.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { echarts, type EChartsType, FONT_SANS, FONT_MONO } from "@/lib/echarts";
import type { PensionStat } from "@/lib/types";
import { pensionMetrics, riskRamp, riskT, riskColor } from "@/lib/pension-metrics";
import { toPct, fmtInt, fmtPct } from "@/lib/format";
import { regionLabel, regionLabelShort } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

interface PensionMapProps {
  regions: PensionStat[]; // geographic regions only
  activeRegion: string | null;
  onHover?: (name: string | null) => void;
  onSelect?: (name: string) => void;
}

// Reversed relative to CompletionMap's RAMP: here a high value is bad.
const RAMP = ["#2fd07a", "#9ee34f", "#f7b23b", "#ff5a63"];

const ENCLAVE_MARKERS: Record<string, [number, number]> = {
  "Тошкент шаҳри": [69.28, 41.31],
};
const MAP_LAYOUT = { center: ["52%", "52%"] as [string, string], size: "118%" };

export function PensionMap({
  regions,
  activeRegion,
  onHover,
  onSelect,
}: PensionMapProps) {
  const S = useS();
  const lang = useLang();
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      const res = await fetch("/uzbekistan.geo.json", { cache: "force-cache" });
      const geo = await res.json();
      if (disposed || !elRef.current) return;

      echarts.registerMap("uzbekistan", geo);
      const chart = echarts.init(elRef.current, undefined, { renderer: "canvas" });
      chartRef.current = chart;

      chart.on("mouseover", (p: { name?: string }) => {
        if (p.name) onHover?.(p.name);
      });
      chart.on("mouseout", () => onHover?.(null));
      chart.on("click", (p: { name?: string }) => {
        if (p.name) onSelect?.(p.name);
      });

      ro = new ResizeObserver(() => chart.resize());
      ro.observe(elRef.current);
      setReady(true);
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;

    const rows = regions.map((r) => ({ stat: r, m: pensionMetrics(r) }));
    const ramp = riskRamp(rows.map((r) => r.m.exposedShare));

    const mapData = rows.map(({ stat, m }) => ({
      name: stat.name,
      value: toPct(m.exposedShare),
      share: m.exposedShare,
      working: stat.pensionWorking,
      reaching: stat.reaching,
      total: stat.total,
    }));

    const enclaveData = rows
      .filter(({ stat }) => ENCLAVE_MARKERS[stat.name])
      .map(({ stat, m }) => {
        const [lng, lat] = ENCLAVE_MARKERS[stat.name];
        return {
          name: stat.name,
          value: [lng, lat, toPct(m.exposedShare)],
          share: m.exposedShare,
          working: stat.pensionWorking,
          reaching: stat.reaching,
          total: stat.total,
          itemStyle: { color: riskColor(riskT(m.exposedShare, ramp)) },
        };
      });

    const tooltipFormatter = (p: {
      name: string;
      data?: { share: number; working: number; reaching: number; total: number };
    }) => {
      const label = regionLabel(p.name, lang);
      const d = p.data;
      if (!d || d.share === undefined) return label;
      return `<b>${label}</b><br/>${S.map.pensionShare}: <b>${fmtPct(
        d.share,
      )}</b><br/>${S.pension.col.working}: ${fmtInt(d.working)}<br/>${
        S.pension.col.reaching
      }: ${fmtInt(d.reaching)}<br/>${S.map.people}: ${fmtInt(d.total)}`;
    };

    chart.setOption(
      {
        tooltip: {
          trigger: "item",
          backgroundColor: "#0b3663",
          borderWidth: 0,
          padding: [10, 12],
          textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
          formatter: tooltipFormatter,
        },
        visualMap: {
          seriesIndex: 0,
          // The scale spans only the observed spread, so its endpoints are
          // printed. An absolute 0-100% scale would render 14 identical squares.
          min: toPct(ramp.min),
          max: toPct(ramp.max),
          left: "left",
          bottom: 8,
          itemWidth: 10,
          itemHeight: 90,
          calculable: true,
          text: [fmtPct(ramp.max, 1), fmtPct(ramp.min, 1)],
          inRange: { color: RAMP },
          textStyle: { color: "#8ba0bd", fontFamily: FONT_MONO, fontSize: 10 },
        },
        geo: {
          map: "uzbekistan",
          roam: false,
          silent: true,
          layoutCenter: MAP_LAYOUT.center,
          layoutSize: MAP_LAYOUT.size,
          itemStyle: { areaColor: "transparent", borderColor: "transparent" },
          emphasis: { disabled: true },
        },
        series: [
          {
            type: "map",
            map: "uzbekistan",
            roam: false,
            selectedMode: false,
            layoutCenter: MAP_LAYOUT.center,
            layoutSize: MAP_LAYOUT.size,
            itemStyle: {
              borderColor: "rgba(140,175,225,0.16)",
              borderWidth: 1,
              areaColor: "#152c4e",
            },
            emphasis: {
              label: {
                show: true,
                color: "#eaf1fb",
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: 11,
              },
              itemStyle: {
                borderColor: "#3fb6ff",
                borderWidth: 1.5,
                shadowBlur: 16,
                shadowColor: "rgba(63,182,255,0.6)",
              },
            },
            label: { show: false },
            data: mapData,
          },
          {
            type: "scatter",
            coordinateSystem: "geo",
            geoIndex: 0,
            z: 12,
            symbolSize: 16,
            data: enclaveData,
            itemStyle: {
              borderColor: "#ffffff",
              borderWidth: 2,
              shadowBlur: 5,
              shadowColor: "rgba(11,27,43,0.35)",
            },
            label: { show: false },
            emphasis: {
              scale: 1.4,
              label: {
                show: true,
                position: "right",
                distance: 6,
                formatter: (p: { name: string }) => regionLabelShort(p.name, lang),
                color: "#eaf1fb",
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: 10.5,
                backgroundColor: "#0c1f3b",
                padding: [3, 6],
                borderRadius: 5,
                borderColor: "#3fb6ff",
                borderWidth: 1,
              },
            },
          },
        ],
      },
      { notMerge: true },
    );
    // `lang` and `S` are dependencies: a language switch must redraw the
    // labels and the tooltip, not just the surrounding React tree.
  }, [regions, ready, lang, S]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;
    chart.dispatchAction({ type: "downplay", seriesIndex: 0 });
    if (activeRegion) {
      chart.dispatchAction({ type: "highlight", seriesIndex: 0, name: activeRegion });
    }
  }, [activeRegion, ready]);

  return (
    <div className="relative">
      <div
        ref={elRef}
        className="h-[320px] w-full sm:h-[420px]"
        role="img"
        aria-label={S.pension.mapTitle}
      />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-[0.8rem] text-ink-faint">
          {S.map.loading}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build the board**

Create `components/pension/PensionBoard.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PensionStat } from "@/lib/types";
import { PensionMap } from "./PensionMap";
import { pensionMetrics, riskRamp, riskT, riskColor } from "@/lib/pension-metrics";
import { isGeographicRegion, regionSlug, regionLabel } from "@/lib/regions";
import { fmtInt, fmtPct } from "@/lib/format";
import { useS, useLang } from "@/lib/i18n/client";

export function PensionBoard({ regions }: { regions: PensionStat[] }) {
  const S = useS();
  const lang = useLang();
  const [active, setActive] = useState<string | null>(null);
  const router = useRouter();

  const geographic = useMemo(
    () => regions.filter((r) => isGeographicRegion(r.name)),
    [regions],
  );

  // Ranked worst-first: the point of this page is where the exposure is
  // greatest. The residual row is included -- it is a real population.
  const ranked = useMemo(
    () =>
      regions
        .map((r) => ({ stat: r, m: pensionMetrics(r) }))
        .sort((a, b) => b.m.exposedShare - a.m.exposedShare),
    [regions],
  );

  // The colour scale spans only the geographic spread, matching the map.
  const ramp = useMemo(
    () => riskRamp(geographic.map((r) => pensionMetrics(r).exposedShare)),
    [geographic],
  );

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-12">
        <div className="border-b border-line p-3 sm:p-4 lg:col-span-7 lg:border-b-0 lg:border-r">
          <div className="mb-1 flex items-baseline justify-between px-1">
            <h2 className="text-[0.95rem] font-semibold">{S.pension.mapTitle}</h2>
            <span className="hidden text-[0.72rem] text-ink-faint sm:block">
              {S.pension.mapHint}
            </span>
          </div>
          <PensionMap
            regions={geographic}
            activeRegion={active}
            onHover={setActive}
            onSelect={(name) => router.push(`/pensiya/${regionSlug(name)}`)}
          />
          {/* The scale is relative, so it states its own endpoints. Removing
              this line would let a 2pp spread read as a national crisis. */}
          <p className="mt-1 px-1 text-[0.7rem] text-ink-faint">
            {S.pension.mapKey(fmtPct(ramp.min, 1), fmtPct(ramp.max, 1))}
          </p>
        </div>

        <div className="p-3 sm:p-4 lg:col-span-5">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-[0.95rem] font-semibold">
              {S.pension.rankingTitle}
            </h2>
            <span className="eyebrow">{S.pension.rankingHint}</span>
          </div>
          <ol className="scroll-quiet flex max-h-[420px] flex-col gap-0.5 overflow-y-auto pr-1">
            {ranked.map(({ stat, m }, i) => {
              const isActive = active === stat.name;
              const color = riskColor(riskT(m.exposedShare, ramp));
              // Bars are scaled to the worst region, not to 100% -- at ~14%
              // every bar would otherwise be a stub.
              const width =
                ramp.max > 0 ? (m.exposedShare / ramp.max) * 100 : 0;
              return (
                <li key={stat.name}>
                  <Link
                    href={`/pensiya/${regionSlug(stat.name)}`}
                    onMouseEnter={() => setActive(stat.name)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(stat.name)}
                    onBlur={() => setActive(null)}
                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors ${
                      isActive ? "bg-paper" : "hover:bg-paper"
                    }`}
                  >
                    <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-md bg-line-soft text-[0.72rem] font-semibold text-ink-soft">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[0.83rem] font-medium">
                          {regionLabel(stat.name, lang)}
                        </span>
                        <span
                          className="tnum shrink-0 text-[0.83rem] font-semibold"
                          style={{ color }}
                        >
                          {fmtPct(m.exposedShare, 1)}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${width}%`, background: color }}
                          />
                        </span>
                        <span className="tnum shrink-0 text-[0.66rem] text-ink-faint">
                          {fmtInt(m.exposed)} {S.pension.peopleUnit}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Insert it into the page**

In `app/pensiya/page.tsx`, add the import:

```ts
import { PensionBoard } from "@/components/pension/PensionBoard";
```

and replace the Task 8 marker comment with:

```tsx
      {regions.length > 0 && (
        <Reveal>
          <PensionBoard regions={regions} />
        </Reveal>
      )}
```

- [ ] **Step 4: Verify against real regional data**

The seed has no regions, so upload a CSV with at least three of them first. Extend the Task 6 CSV — the numbers need not be real, only internally consistent (regions must not exceed the national row):

```
hudud;jami;jami_ayol;a3040;a3040_ayol;a4050;a4050_ayol;a5060;a5060_ayol;a60p;a60p_ayol;pensiya;pensiya_ayol;yetadigan;yetadigan_ayol
МИЛЛИЙ;689461;549586;233005;192116;188630;158289;135652;106055;39362;18690;79672;59000;15309;12177
Andijon viloyati;52000;41000;18000;15000;14000;12000;10000;8000;3000;1400;6800;5000;1200;900
Farg‘оna viloyati;61000;48000;20000;17000;16000;13000;12000;9000;3800;1700;8900;6600;1500;1100
Toshkent shahri;74000;57000;25000;20000;20000;16000;14000;11000;4500;2000;7100;5200;1300;1000
```

Note the third row's Cyrillic `о` in `Farg‘оna` — that is the real upstream spelling and the upload must accept it. Expected: 4 region rows in the ranking (3 + residual), the map coloured across the observed spread, and the key line reading «Шкала 9,6% — 17,0% оралиғида (нисбий)» or similar.

Check: the region with the **highest** share is **red**, and hovering it highlights the matching list row. If high shares are green, `riskColor` was bypassed.

- [ ] **Step 5: Type-check, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add components/pension/PensionMap.tsx components/pension/PensionBoard.tsx app/pensiya/page.tsx
git commit -m "Map regional exposure on an inverted, relative scale

Two inversions the other maps do not need. rampColor is green-at-high
because connection and completion are good-at-high; pension exposure is
not, so feeding it a raw share would paint the worst regions green.

And the regional spread is a few points wide, so an absolute 0-100% scale
renders 14 identical squares. The scale spans the observed range instead
and prints its endpoints -- without that line a 2pp spread reads as a
national crisis.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Age structure chart

**Files:**
- Create: `components/pension/PensionAgeChart.tsx`
- Modify: `app/pensiya/page.tsx` (replace the Task 9 marker)

**Interfaces:**
- Consumes: `ageBands`, `AgeBandKey` (Task 3); `Chart` (existing `components/Chart.tsx`); `S.pension.band.*`, `S.pension.seriesWomen`, `S.pension.seriesMen` (Task 5).
- Produces: `<PensionAgeChart stat={PensionStat} />`. Task 11's region page reuses it.

Context rather than headline, so it sits below the map. Horizontal stacked bars, women split out, five bands — the under-30 band is recovered by subtraction in `ageBands()`, which is what makes this a complete breakdown instead of a chart missing 13 % of the workforce with no explanation.

- [ ] **Step 1: Build the chart**

Create `components/pension/PensionAgeChart.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { Chart } from "../Chart";
import type { PensionStat } from "@/lib/types";
import { ageBands, type AgeBandKey } from "@/lib/pension-metrics";
import { fmtInt, fmtPct } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { useS } from "@/lib/i18n/client";

const WOMEN = "#3fb6ff";
const MEN = "#7c8ea8";

export function PensionAgeChart({ stat }: { stat: PensionStat }) {
  const S = useS();

  const bands = useMemo(() => ageBands(stat), [stat]);

  const option: EChartsOption = useMemo(() => {
    const labels = bands.map((b) => S.pension.band[b.key as AgeBandKey]);
    const totalAll = bands.reduce((a, b) => a + b.total, 0);

    return {
      grid: { left: 92, right: 24, top: 34, bottom: 24 },
      legend: {
        top: 0,
        right: 0,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: "#8ba0bd", fontFamily: FONT_SANS, fontSize: 11 },
        data: [S.pension.seriesWomen, S.pension.seriesMen],
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#0b3663",
        borderWidth: 0,
        textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number }>;
          const b = bands[arr[0].dataIndex];
          const share = totalAll > 0 ? b.total / totalAll : 0;
          return [
            `<b>${S.pension.band[b.key as AgeBandKey]}</b>`,
            `${fmtInt(b.total)} (${fmtPct(share, 1)})`,
            `${S.pension.seriesWomen}: ${fmtInt(b.women)}`,
            `${S.pension.seriesMen}: ${fmtInt(b.men)}`,
          ].join("<br/>");
        },
      },
      xAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#172a45" } },
        axisLabel: {
          color: "#8ba0bd",
          fontFamily: FONT_MONO,
          fontSize: 11,
          // Head-counts run to six digits; thousands keep the axis readable.
          formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`),
        },
      },
      yAxis: {
        type: "category",
        data: labels,
        inverse: true, // youngest at the top, reading downward into old age
        axisLine: { lineStyle: { color: "#22334f" } },
        axisTick: { show: false },
        axisLabel: { color: "#8ba0bd", fontFamily: FONT_SANS, fontSize: 11 },
      },
      series: [
        {
          name: S.pension.seriesWomen,
          type: "bar",
          stack: "age",
          barMaxWidth: 26,
          itemStyle: { color: WOMEN, borderRadius: [3, 0, 0, 3] },
          data: bands.map((b) => b.women),
        },
        {
          name: S.pension.seriesMen,
          type: "bar",
          stack: "age",
          barMaxWidth: 26,
          itemStyle: { color: MEN, borderRadius: [0, 3, 3, 0] },
          data: bands.map((b) => b.men),
        },
      ],
    };
    // `S` is a dependency: without it the chart keeps the old language.
  }, [bands, S]);

  return <Chart option={option} className="h-[300px] w-full sm:h-[340px]" />;
}
```

- [ ] **Step 2: Insert it into the page**

In `app/pensiya/page.tsx`, add the import:

```ts
import { PensionAgeChart } from "@/components/pension/PensionAgeChart";
```

and replace the Task 9 marker with:

```tsx
      <Reveal>
        <div className="card p-4 sm:p-5">
          <div className="mb-2">
            <h2 className="text-[0.95rem] font-semibold">{S.pension.ageTitle}</h2>
            <p className="text-[0.78rem] text-ink-soft">{S.pension.ageHint}</p>
          </div>
          <PensionAgeChart stat={overall} />
        </div>
      </Reveal>
```

- [ ] **Step 3: Verify the bands add up**

Run `npm run dev` and open `/pensiya`. Against the national figures, expected bar totals top to bottom: 92 812 · 233 005 · 188 630 · 135 652 · 39 362. Hover each and confirm the shares read 13,5 % · 33,8 % · 27,4 % · 19,7 % · 5,7 %, summing to 100 %.

If the first bar is missing or zero, `ageBands` clamped it — that means the stored `total` is smaller than the four published bands combined, which is an upload problem, not a chart problem.

- [ ] **Step 4: Type-check, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add components/pension/PensionAgeChart.tsx app/pensiya/page.tsx
git commit -m "Chart the age structure with the under-30 band restored

The report publishes 30-40 through 60+, which together fall 92 812 short
of the workforce. Charting only those four would show a breakdown that
silently omits 13% of staff; the gap is the under-30 cohort and is
recovered by subtraction, so the five bands sum to the total.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Trend

**Files:**
- Create: `components/pension/PensionTrend.tsx`
- Modify: `app/pensiya/page.tsx` (replace the Task 10 marker)

**Interfaces:**
- Consumes: `getPensionHistory`, `PensionManifestEntry` (Task 4); `pensionMetrics` (Task 3); `Chart`; `S.pension.trend*`, `S.pension.totalOption` (Task 5).
- Produces: `<PensionTrend history={PensionManifestEntry[]} />`.

Starts with exactly one point, so it must render sensibly at n=1 — a single dot plus the explanatory line, never an empty frame. Unlike the completion trend the y-axis is **not** 0–100: exposure sits near 14 %, and a full-height axis would flatten every future movement into a horizontal line.

- [ ] **Step 1: Build the trend**

Create `components/pension/PensionTrend.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Chart } from "../Chart";
import type { PensionManifestEntry } from "@/lib/types";
import { pensionMetrics } from "@/lib/pension-metrics";
import { fmtDate, fmtPct, fmtInt, toPct } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

const TOTAL = "__total__";

export function PensionTrend({
  history,
}: {
  history: PensionManifestEntry[];
}) {
  const S = useS();
  const lang = useLang();
  const [scope, setScope] = useState(TOTAL);

  // Union across all snapshots: a region can appear once the regional pulls
  // start, so the selector must not be built from the latest snapshot alone.
  const regionNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const h of history) {
      for (const r of h.regions ?? []) {
        if (!seen.has(r.name)) {
          seen.add(r.name);
          names.push(r.name);
        }
      }
    }
    return names;
  }, [history]);

  const points = useMemo(() => {
    return history.map((h) => {
      const stat =
        scope === TOTAL ? h.overall : h.regions.find((x) => x.name === scope);
      // A region absent from this snapshot is a gap, not a real 0%.
      if (!stat) return { date: h.date, share: null, exposed: 0, total: 0 };
      const m = pensionMetrics(stat);
      return {
        date: h.date,
        share: m.exposedShare as number | null,
        exposed: m.exposed,
        total: stat.total,
      };
    });
  }, [history, scope]);

  const option: EChartsOption = useMemo(() => {
    const values = points
      .map((p) => p.share)
      .filter((v): v is number => v != null);
    // Exposure sits near 14%, so a 0-100 axis would flatten every movement.
    // Pad the observed range instead, with a floor of zero.
    const lo = values.length ? Math.max(0, Math.min(...values) - 0.02) : 0;
    const hi = values.length ? Math.max(...values) + 0.02 : 0.2;

    return {
      grid: { left: 48, right: 18, top: 20, bottom: 34 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#0b3663",
        borderWidth: 0,
        textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number }>;
          const p = points[arr[0].dataIndex];
          const val = p.share == null ? "—" : fmtPct(p.share);
          return `${fmtDate(p.date)}<br/>${S.map.pensionShare}: <b>${val}</b><br/>${
            S.pension.peopleUnit
          }: ${fmtInt(p.exposed)} / ${fmtInt(p.total)}`;
        },
      },
      xAxis: {
        type: "category",
        data: points.map((p) => fmtDate(p.date)),
        axisLine: { lineStyle: { color: "#22334f" } },
        axisTick: { show: false },
        axisLabel: { color: "#8ba0bd", fontFamily: FONT_MONO, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        min: toPct(lo),
        max: toPct(hi),
        splitLine: { lineStyle: { color: "#172a45" } },
        axisLabel: {
          color: "#8ba0bd",
          fontFamily: FONT_MONO,
          fontSize: 11,
          formatter: "{value}%",
        },
      },
      series: [
        {
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 9,
          data: points.map((p) => (p.share == null ? null : toPct(p.share))),
          lineStyle: {
            color: "#ff8a4c",
            width: 3,
            shadowBlur: 12,
            shadowColor: "rgba(255,138,76,0.5)",
          },
          itemStyle: { color: "#ff8a4c", borderColor: "#081222", borderWidth: 2 },
          areaStyle: { color: "rgba(255,138,76,0.14)" },
        },
      ],
    };
  }, [points, S]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="eyebrow">{S.pension.trendLine}</span>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[0.8rem] font-medium text-ink outline-none focus:border-sov"
        >
          <option value={TOTAL}>{S.pension.totalOption}</option>
          {regionNames.map((n) => (
            // value stays the canonical name — only the label is translated
            <option key={n} value={n}>
              {regionLabel(n, lang)}
            </option>
          ))}
        </select>
      </div>
      <Chart option={option} className="h-[280px] w-full sm:h-[320px]" />
      {history.length < 2 && (
        <p className="mt-2 text-[0.78rem] text-ink-faint">
          {S.pension.trendSingle}
        </p>
      )}
    </div>
  );
}
```

There is no goal `markLine` here. Connection and completion both target 100 %; there is no target share of staff working past pension age, and drawing one would invent policy.

- [ ] **Step 2: Insert it into the page**

In `app/pensiya/page.tsx`, extend the data import and add the component import:

```ts
import { getLatestPension, getPensionHistory } from "@/lib/data";
import { PensionTrend } from "@/components/pension/PensionTrend";
```

Fetch the history beside the snapshot:

```ts
  const history = await getPensionHistory();
```

Replace the Task 10 marker with:

```tsx
      <Reveal>
        <div className="card p-4 sm:p-5">
          <div className="mb-2">
            <h2 className="text-[0.95rem] font-semibold">{S.pension.trendTitle}</h2>
            <p className="text-[0.78rem] text-ink-soft">{S.pension.trendSubtitle}</p>
          </div>
          <PensionTrend history={history} />
        </div>
      </Reveal>
```

- [ ] **Step 3: Verify at n=1 and n=2**

Open `/pensiya`. Expected with one upload: a single dot, the y-axis spanning roughly 11,8 %–15,8 % (not 0–100), and the «Ҳозирча битта ҳисобот мавжуд…» line beneath.

Then upload the same CSV renamed to `HRM_pensiya_2026-08-06.csv` and reload. Expected: two dots, the explanatory line gone, the region selector listing the uploaded regions.

- [ ] **Step 4: Type-check, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add components/pension/PensionTrend.tsx app/pensiya/page.tsx
git commit -m "Track exposure over time on a padded axis

The completion trend pins its y-axis to 0-100 because it is chasing 100%.
Exposure sits near 14%, so the same axis would flatten every future
movement into a flat line; this one spans the observed range instead.

No goal marker either -- there is no correct share of staff working past
pension age, and drawing a target line would invent policy.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Region table and the per-region page

**Files:**
- Create: `components/pension/PensionTable.tsx`
- Create: `app/pensiya/[region]/page.tsx`
- Modify: `app/pensiya/page.tsx` (replace the Task 11 marker)

**Interfaces:**
- Consumes: `pensionMetrics`, `riskRamp`, `riskT`, `riskColor`, `ageBands` (Task 3); `PensionAgeChart` (Task 9); `regionFromSlug`, `regionLabel` (existing); `S.pension.col.*`, `S.pension.table*` (Task 5).
- Produces: `<PensionTable rows={PensionStat[]} exportName={string} />` and the `/pensiya/[region]` route.

The table is the last section, below the fold — the Minister will not read it, the HR department will. Fifteen rows, so no pagination and no region filter (the search box alone is enough); `xlsx` is dynamically imported exactly as `CompletionTable` does it.

- [ ] **Step 1: Build the table**

Create `components/pension/PensionTable.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import type { PensionStat } from "@/lib/types";
import { pensionMetrics, riskRamp, riskT, riskColor } from "@/lib/pension-metrics";
import { fmtInt, fmtPct, toPct } from "@/lib/format";
import { regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

export function PensionTable({
  rows,
  exportName,
}: {
  rows: PensionStat[];
  exportName: string;
}) {
  const S = useS();
  const lang = useLang();
  const [q, setQ] = useState("");
  const [desc, setDesc] = useState(true); // worst-first by default

  const enriched = useMemo(
    () => rows.map((stat) => ({ stat, m: pensionMetrics(stat) })),
    [rows],
  );

  const ramp = useMemo(
    () => riskRamp(enriched.map((r) => r.m.exposedShare)),
    [enriched],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = enriched.filter(({ stat }) => {
      if (!needle) return true;
      return (
        stat.name.toLowerCase().includes(needle) ||
        regionLabel(stat.name, lang).toLowerCase().includes(needle)
      );
    });
    return [...out].sort((a, b) =>
      desc
        ? b.m.exposedShare - a.m.exposedShare
        : a.m.exposedShare - b.m.exposedShare,
    );
  }, [enriched, q, desc, lang]);

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    // Headers follow the chosen language; region names go through
    // regionLabel for display only — the canonical key is never exported.
    const data = filtered.map(({ stat, m }, i) => ({
      [S.pension.col.n]: i + 1,
      [S.pension.col.region]: regionLabel(stat.name, lang),
      [S.pension.col.total]: stat.total,
      [S.pension.col.women]: stat.totalWomen,
      [S.pension.col.working]: stat.pensionWorking,
      [S.pension.col.reaching]: stat.reaching,
      [S.pension.col.share]: toPct(m.exposedShare),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 5 }, { wch: 34 }, { wch: 14 },
      { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, S.pension.sheet);
    XLSX.writeFile(wb, `${exportName}.xlsx`);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={S.pension.search}
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3.5 py-2 text-[0.85rem] outline-none focus:border-sov focus:bg-surface"
        />
        <button
          onClick={exportXlsx}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sov px-4 py-2 text-[0.82rem] font-semibold text-white transition-colors hover:bg-sov-deep"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 1.5v8m0 0 3-3m-3 3-3-3M2.5 12v1.5A1 1 0 0 0 3.5 14.5h9a1 1 0 0 0 1-1V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {S.pension.export}
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-[0.75rem] text-ink-faint">
        <span className="tnum font-medium text-ink-soft">
          {S.pension.count(filtered.length)}
        </span>
      </div>

      <div className="scroll-quiet max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-left text-[0.82rem]">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-y border-line text-[0.7rem] uppercase tracking-wide text-ink-faint">
              <th className="w-10 px-3 py-2.5 font-medium">{S.pension.col.n}</th>
              <th className="px-3 py-2.5 font-medium">{S.pension.col.region}</th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                {S.pension.col.total}
              </th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium md:table-cell">
                {S.pension.col.women}
              </th>
              <th className="tnum px-3 py-2.5 text-right font-medium">
                {S.pension.col.working}
              </th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                {S.pension.col.reaching}
              </th>
              <th className="px-3 py-2.5 font-medium">
                <button
                  onClick={() => setDesc((v) => !v)}
                  className="inline-flex items-center gap-1 hover:text-ink"
                >
                  {S.pension.col.share}
                  <span className="text-[0.9em]">{desc ? "↓" : "↑"}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ stat, m }, i) => {
              const color = riskColor(riskT(m.exposedShare, ramp));
              const width = ramp.max > 0 ? (m.exposedShare / ramp.max) * 100 : 0;
              return (
                <tr
                  key={stat.name}
                  className="border-b border-line-soft align-top hover:bg-paper"
                >
                  <td className="tnum px-3 py-2.5 text-ink-faint">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="max-w-[38ch] font-medium leading-snug">
                      {regionLabel(stat.name, lang)}
                    </div>
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink-soft sm:table-cell">
                    {fmtInt(stat.total)}
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink-soft md:table-cell">
                    {fmtInt(stat.totalWomen)}
                  </td>
                  <td className="tnum px-3 py-2.5 text-right font-medium">
                    {fmtInt(stat.pensionWorking)}
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink-soft sm:table-cell">
                    {fmtInt(stat.reaching)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line-soft">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${width}%`, background: color }}
                        />
                      </span>
                      <span
                        className="tnum shrink-0 text-[0.82rem] font-semibold"
                        style={{ color }}
                      >
                        {fmtPct(m.exposedShare, 1)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-faint">
                  {S.pension.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Insert it into the main page**

Add the import to `app/pensiya/page.tsx`:

```ts
import { PensionTable } from "@/components/pension/PensionTable";
```

Replace the Task 11 marker with:

```tsx
      {regions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[0.95rem] font-semibold">{S.pension.tableTitle}</h2>
          <PensionTable
            rows={regions}
            exportName={`HRM_pensiya_${snapshot.date}`}
          />
        </section>
      )}
```

- [ ] **Step 3: Build the region page**

Create `app/pensiya/[region]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLatestPension } from "@/lib/data";
import { regionFromSlug, regionLabel } from "@/lib/regions";
import { pensionMetrics } from "@/lib/pension-metrics";
import { PensionHero } from "@/components/pension/PensionHero";
import { PensionAgeChart } from "@/components/pension/PensionAgeChart";
import { StatTile } from "@/components/StatTile";
import { fmtDate } from "@/lib/format";
import { getLang, getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PensionRegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const S = await getS();
  const lang = await getLang();
  const { region: slug } = await params;
  const { snapshot } = await getLatestPension();

  const known = snapshot.regions.map((r) => r.name);
  const name = regionFromSlug(slug, known);
  if (!name) notFound();

  const stat = snapshot.regions.find((r) => r.name === name);
  if (!stat) notFound();

  // Ranked worst-first, matching the board: rank 1 is the most exposed.
  const rankOrder = [...snapshot.regions].sort(
    (a, b) => pensionMetrics(b).exposedShare - pensionMetrics(a).exposedShare,
  );
  const rank = rankOrder.findIndex((r) => r.name === name) + 1;

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <div>
        <Link
          href="/pensiya"
          className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-sov hover:text-sov-deep"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {S.pension.navTitle}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[1.4rem] font-bold tracking-tight sm:text-[1.7rem]">
            {regionLabel(name, lang)}
          </h1>
          <p className="text-[0.78rem] text-ink-faint">
            {S.region.rankOf(rank, snapshot.regions.length)} ·{" "}
            <span className="tnum">{fmtDate(snapshot.date)}</span> {S.pension.asOf}
          </p>
        </div>
      </div>

      <PensionHero stat={stat} />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={S.pension.total} value={stat.total} accent="sov" hint={S.pension.totalHint} />
        <StatTile
          label={S.pension.working}
          value={stat.pensionWorking}
          accent="un"
          shareOfTotal={stat.total > 0 ? stat.pensionWorking / stat.total : undefined}
        />
        <StatTile
          label={S.pension.reaching}
          value={stat.reaching}
          accent="och"
          shareOfTotal={stat.total > 0 ? stat.reaching / stat.total : undefined}
        />
        <StatTile
          label={S.pension.women}
          value={stat.pensionWorkingWomen}
          accent="sov"
          hint={S.pension.womenHint}
        />
      </section>

      <section className="card p-4 sm:p-5">
        <div className="mb-2">
          <h2 className="text-[0.95rem] font-semibold">{S.pension.ageTitle}</h2>
          <p className="text-[0.78rem] text-ink-soft">{S.pension.ageHint}</p>
        </div>
        <PensionAgeChart stat={stat} />
      </section>
    </div>
  );
}
```

`rankOf` is reused from `S.region` — it already reads «Рейтингда N / M» and needs no pension-specific copy.

- [ ] **Step 4: Verify both**

Open `/pensiya`. Expected: the table lists every region including the residual «Марказий аппарат ва республика марказлари», sorted worst-first, share bars matching the map's colours. Export and confirm the xlsx opens with translated headers and untranslated data.

Click the top-ranked region. Expected: `/pensiya/<slug>` renders the same hero scaled to that region, four tiles, and its age chart. Check the residual row too: its slug is `markaz-respublika` and it must resolve rather than 404 — that is what the `SLUG_MAP` entry from Task 1 is for.

Visit `/pensiya/nonexistent`. Expected: the 404 page.

- [ ] **Step 5: Type-check, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add components/pension/PensionTable.tsx app/pensiya/[region]/page.tsx app/pensiya/page.tsx
git commit -m "Add the region table and per-region pages

Fifteen rows, so no pagination and no region filter -- the search box
covers it. The residual row is a navigable region like any other; it
holds the central apparatus and the republican centres, which are real
people and not a rounding artefact.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Placement — grouped nav and the homepage card

**Files:**
- Create: `components/pension/PensionOverviewCard.tsx`
- Modify: `components/Nav.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getLatestPension` (Task 4), `pensionMetrics` (Task 3), `S.nav.group*`, `S.pension.overviewCard` (Task 5).
- Produces: nothing downstream. This is the last UI task.

**Why this task exists at all.** The five existing pages all answer *how far along is the ARGOS rollout*. Pension age is the first page that says something about the workforce itself, and as pill #6 in a flat row it would be the least findable item in the product while carrying its most consequential number. The grouped nav says the dashboard now does two things; the homepage card puts the figure in front of the Minister on open. The connection hero is **not** displaced — the 15.08 and 15.09 deadlines are what he is actively tracking.

- [ ] **Step 1: Group the nav**

Rewrite `components/Nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useS } from "@/lib/i18n/client";

interface NavLink {
  href: string;
  label: string;
  exact?: boolean;
  highlight?: boolean;
}

export function Nav() {
  const S = useS();
  const path = usePathname();
  // Built inside the component: at module scope the labels would freeze in
  // whichever language was loaded first.
  const groups: { label: string; links: NavLink[] }[] = [
    {
      label: S.nav.groupRollout,
      links: [
        { href: "/", label: S.nav.overview, exact: true },
        { href: "/ulanmaganlar", label: S.nav.unconnected },
        { href: "/trend", label: S.nav.trend },
        { href: "/toldirilish", label: S.nav.completion, highlight: true },
      ],
    },
    {
      label: S.nav.groupAnalytics,
      links: [
        { href: "/pensiya", label: S.nav.pension },
        { href: "/admin", label: S.nav.admin },
      ],
    },
  ];

  return (
    <nav className="scroll-quiet -mx-1 flex items-center gap-3 overflow-x-auto">
      {groups.map((g, gi) => (
        <div key={g.label} className="flex items-center gap-3">
          {gi > 0 && (
            <span className="h-7 w-px shrink-0 bg-white/15" aria-hidden />
          )}
          <div className="flex flex-col gap-0.5">
            <span className="whitespace-nowrap px-3.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-white/40">
              {g.label}
            </span>
            <div className="flex items-center gap-1">
              {g.links.map((l) => {
                const active = l.exact
                  ? path === l.href
                  : path.startsWith(l.href);
                const cls = l.highlight
                  ? active
                    ? "bg-goal text-band font-semibold shadow-[0_0_14px_rgba(247,193,75,0.5)]"
                    : "border border-goal/60 bg-goal-soft text-goal font-semibold hover:bg-goal/20"
                  : active
                    ? "bg-white text-band"
                    : "text-white/70 hover:bg-white/10 hover:text-white";
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors",
                      cls,
                    ].join(" ")}
                  >
                    {l.highlight && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-goal"
                        style={{ boxShadow: "0 0 6px var(--color-goal)" }}
                        aria-hidden
                      />
                    )}
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </nav>
  );
}
```

The active/highlight styling is carried over verbatim — this task changes the arrangement, not the appearance of any pill.

- [ ] **Step 2: Build the homepage card**

Create `components/pension/PensionOverviewCard.tsx`:

```tsx
import Link from "next/link";
import type { PensionStat } from "@/lib/types";
import { pensionMetrics } from "@/lib/pension-metrics";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

/** Mirrors the completion card's shape, one rung higher on the page. */
export async function PensionOverviewCard({ stat }: { stat: PensionStat }) {
  const S = await getS();
  const m = pensionMetrics(stat);

  return (
    <Link
      href="/pensiya"
      className="card card-link group flex items-center gap-4 p-5 sm:gap-5"
    >
      <span
        className="grid h-[92px] w-[92px] shrink-0 flex-col place-items-center rounded-2xl border border-un/30 bg-un-soft"
        aria-hidden
      >
        <span className="tnum text-[1.5rem] font-bold leading-none text-un">
          {fmtPct(m.exposedShare, 1)}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-semibold">
          {S.pension.overviewCard}
        </span>
        <span className="mt-0.5 block text-[0.8rem] text-ink-soft">
          <span className="tnum font-semibold text-un">{fmtInt(m.exposed)}</span>{" "}
          {S.pension.peopleUnit} ·{" "}
          <span className="tnum">{fmtInt(stat.pensionWorking)}</span>{" "}
          {S.pension.col.working} ·{" "}
          <span className="tnum">{fmtInt(stat.reaching)}</span>{" "}
          {S.pension.col.reaching}
        </span>
      </div>
      <Arrow />
    </Link>
  );
}

function Arrow() {
  return (
    <svg
      className="shrink-0 text-sov transition-transform group-hover:translate-x-0.5"
      width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden
    >
      <path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 3: Place it on the homepage**

In `app/page.tsx`, extend the data import and add the component import:

```ts
import { getLatestSnapshot, getLatestCompletion, getLatestPension } from "@/lib/data";
import { PensionOverviewCard } from "@/components/pension/PensionOverviewCard";
```

Fetch it beside the others:

```ts
  const { snapshot: pension } = await getLatestPension();
```

Insert the card **immediately above** the existing completion card — that is, between the `AttentionStrip` block and the `{/* data-completion summary */}` block:

```tsx
      {/* pension exposure — above completion: the more consequential figure */}
      <Reveal>
        <PensionOverviewCard stat={pension.overall} />
      </Reveal>
```

- [ ] **Step 4: Verify the placement**

Open `/`. Expected: the connection hero is unchanged at the top, and below the attention strip the pension card appears above the completion card, reading «13,8 %» and «94 981 нафар · 79 672 Пенсия ёшида · 15 309 Шу йили етади». Clicking it lands on `/pensiya`.

Check the header nav: two labelled groups separated by a hairline, «АРГОС ЖОРИЙ ЭТИЛИШИ» over four pills and «КАДРЛАР ТАҲЛИЛИ» over two. The completion pill keeps its gold highlight and dot. Navigate to `/pensiya` and confirm its pill goes active while the overview pill does not.

Narrow the window to phone width. Expected: the nav scrolls horizontally without breaking the header layout — `scroll-quiet` and `overflow-x-auto` already handle this, but the group labels add height, so confirm the header does not wrap into two rows on a 390 px viewport.

Switch to РУ. Expected: «ВНЕДРЕНИЕ АРГОС» / «КАДРОВАЯ АНАЛИТИКА» and a fully Russian card.

- [ ] **Step 5: Type-check, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add components/pension/PensionOverviewCard.tsx components/Nav.tsx app/page.tsx
git commit -m "Surface pension exposure instead of burying it as pill six

The five existing pages all measure the ARGOS rollout. Pension age is the
first page about the workforce itself, and in a flat nav row it would be
the least findable item carrying the most consequential number.

Two labelled groups say the dashboard now does two things, and the
homepage card puts the figure in front of the Minister on open. The
connection hero stays where it is -- the 15.08 and 15.09 deadlines are
what he is actively tracking.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Ingestion bookmarklet

**Files:**
- Create: `docs/bookmarklets/pensiya.html`
- Copy to: `Documents\HRM_pensiya_bookmarklet.html` (the user's habitual location; the repo copy is the version-controlled original)

**Interfaces:**
- Consumes: the CSV contract from Task 2.
- Produces: `HRM_pensiya_YYYY-MM-DD.csv`, uploaded through the Task 6 admin section.

**This task requires the user.** It needs a live, logged-in ARGOS session to capture the request payload, and only the user can authenticate. Everything before this task is complete and testable without it — the dashboard already works, and a national-only CSV can be typed by hand from the report screen in under a minute (one row, fourteen numbers). Do not block the earlier tasks on this one.

**Known constraints** (carried from the completion bookmarklet):
- No literal `%` anywhere in the source — it breaks the `javascript:` URL.
- Encode with `encodeURIComponent`, never `encodeURI`.
- Requests are sequential, not concurrent: each takes ~30 s, and concurrency risks server-side throttling while making partial failure hard to reason about. Fifteen requests is 8–15 minutes.
- Progress is persisted to `localStorage` so a mid-run token refresh or reload resumes instead of restarting.

- [ ] **Step 1: Capture the request payload (needs the user's session)**

Ask the user to open `https://hrm.argos.uz/#/report/all-employee-distribution-by-seniority` while logged in, set the organisation filter to **«Все организации»**, and run the report once for the whole republic.

Then capture the exact request with DevTools → Network → the `GetAllEmployeeDistributionBySeniority` entry → Copy → Copy as fetch. Record three things before writing any code:

1. The full request body JSON, including whatever the org-type filter is called and the value that means «Все организации» (**not** the default «ГГС организации», which returns 2 187 people instead of 689 461).
2. The parameter that carries the region filter, and the value shape for one region.
3. Where the token lives — `localStorage.accessToken` in the session captured on 2026-08-05, and the `Authorization: Bearer <token>` header.

Do not guess any of these. A bookmarklet built on a guessed filter value produces a plausible CSV with the wrong population, which is exactly the failure mode the report is known for.

- [ ] **Step 2: Confirm the response shape**

From the same captured response, record the JSON path to each of the seven column pairs. Match the last one by the substring `пенсия ёшига етадиган` — **never** by the year, because the header is hardcoded to `2024` upstream even when the report runs for 2026.

- [ ] **Step 3: Write the bookmarklet**

Create `docs/bookmarklets/pensiya.html`: a page holding a short explanation and a draggable `javascript:` link, following the structure of the existing completion bookmarklet. The embedded script must:

1. Read the bearer token from the live session.
2. Issue the national request first, then one request per region, sequentially, using the payload shape captured in Step 1.
3. After each response, append a row to an array held in `localStorage` under a key that includes the run's date, so a reload resumes from where it stopped.
4. Write the `hudud` column as **the region name ARGOS returned**, untransformed. Resolving it to the dashboard's canonical Cyrillic key is `lib/parse-pension.ts`'s job, under test — the bookmarklet must not carry that mapping.
5. Write the national row with `hudud` = `МИЛЛИЙ`.
6. Emit the 15-column CSV from Task 2, `;`-separated, with a UTF-8 BOM so Excel opens it correctly.
7. Trigger a download named `HRM_pensiya_YYYY-MM-DD.csv` using today's date.
8. Show progress as it goes (`3/15 …`), because a 15-minute silent run is indistinguishable from a hung one.

- [ ] **Step 4: Run it end to end**

Ask the user to run the bookmarklet on the report page. Expected: a `HRM_pensiya_<today>.csv` in Downloads with 16 lines (header + national + 14 regions).

Verify before uploading: the national `jami` should be within a few units of 689 461 — the report is live and two pulls minutes apart already differed by 5. **If it reads ≈2 187, the org filter is still «ГГС организации» and the whole file is wrong.**

- [ ] **Step 5: Upload and verify the full dashboard**

Upload the CSV at `/admin`. Expected: 15 regions in the preview (14 + residual), no warnings, and a successful publish.

Then walk the whole feature: `/` shows the card, `/pensiya` shows hero + map + ranking + age chart + trend + table, a region click lands on `/pensiya/<slug>`, and the export downloads. Check that Farg‘ona resolved — if the upload failed with «Номаълум ҳудуд номи», the spelling changed upstream and the table in `lib/parse-pension.ts` needs the new variant added (the normalization already covers homoglyphs and apostrophes).

- [ ] **Step 6: Copy to the user's location and commit**

```bash
cp docs/bookmarklets/pensiya.html "/c/Users/Admin/Documents/HRM_pensiya_bookmarklet.html"
git add docs/bookmarklets/pensiya.html
git commit -m "Add the pension bookmarklet

Fifteen sequential requests at ~30s each, resumable from localStorage so
a token refresh mid-run does not restart the 15-minute pull.

It writes the region names ARGOS returned, untransformed. Resolving them
to canonical keys stays in lib/parse-pension.ts where it is tested --
including the Cyrillic 'о' in Farg'ona, which no bookmarklet should be
carrying.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Final verification

Run once after Task 13 (or after Task 12 if the bookmarklet is deferred):

- [ ] `npm test` — all tests pass
- [ ] `npx tsc --noEmit` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run build` — clean
- [ ] The three datasets are independent: uploading a pension CSV changes nothing on `/` (connection), `/toldirilish`, `/trend`, or `/ulanmaganlar`
- [ ] Every page renders in both УЗ and РУ with no Uzbek-only letters (ў, қ, ғ, ҳ) leaking into Russian UI text outside data values
- [ ] `git log --oneline main..pensiya-yoshi` shows the spec commits plus one commit per task, all authored by `sodiqjonboqijonov@gmail.com`

Deployment is a push to `main`, which Vercel picks up. That is the user's call, not part of this plan — ask before pushing.

## Open question carried from the spec

"Pension age and still working" (79 672) is roughly double the 60+ count (39 362). The likely explanation is that women's pension age is 55, so women aged 55–60 sit in the pension group while appearing in the 50–60 age band. The arithmetic fits, but the current statutory pension ages are unconfirmed. **Until the user confirms them, the UI shows both figures and explains nothing.** If he confirms, a one-line footnote under the age chart is the right place for it — not the hero.
