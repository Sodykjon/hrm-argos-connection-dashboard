// Parser for the pension-age CSV pulled from the hrm.argos.uz report
// GetAllEmployeeDistributionBySeniority (HRM_pensiya_YYYY-MM-DD.csv).
// Runs in the browser (admin upload). Pure functions, no framework deps.
//
// The CSV carries whatever region names ARGOS returned — Latin, and in one case
// misspelled. Resolving them to the dashboard's canonical Uzbek-Cyrillic keys
// happens HERE, under test, not in the bookmarklet.

import type { KadrlarSnapshot, KadrlarStat } from "./types";
import { GEO_REGIONS, PENSION_RESIDUAL } from "./regions.ts";

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

// ---------------------------------------------------------------- CSV parsing

const COLUMNS = [
  "total", "totalWomen",
  "a3040", "a3040Women",
  "a4050", "a4050Women",
  "a5060", "a5060Women",
  "a60p", "a60pWomen",
  "pensionWorking", "pensionWorkingWomen",
  "reaching", "reachingWomen",
] as const satisfies ReadonlyArray<keyof KadrlarStat>;

/** "689 461" / "689461" / "" -> number. Strips every kind of grouping space. */
const HEADER = [
  "hudud",
  "jami", "jami_ayol",
  "a3040", "a3040_ayol",
  "a4050", "a4050_ayol",
  "a5060", "a5060_ayol",
  "a60p", "a60p_ayol",
  "pensiya", "pensiya_ayol",
  "yetadigan", "yetadigan_ayol",
] as const;

/**
 * Every field below is read by POSITION, so the header is the only contract
 * this parser has with its input. If the bookmarklet ever emits the columns in
 * a different order, reading them positionally would produce plausible,
 * completely wrong numbers with no error anywhere — on this dashboard that
 * means a wrong figure in front of the Minister. Hence a hard throw.
 */
function assertHeader(line: string): void {
  const got = line.split(";").map((h) => h.trim().toLowerCase());
  for (let k = 0; k < HEADER.length; k++) {
    if (got[k] !== HEADER[k]) {
      throw new Error(
        `CSV сарлавҳаси мос келмади: ${k + 1}-устун "${HEADER[k]}" ` +
          `бўлиши керак, "${got[k] ?? ""}" келди. Юклаш бекор қилинди.`,
      );
    }
  }
}

/** A non-empty cell that will not parse is reported through `onBad` rather
 *  than quietly becoming 0 — a masked zero reads as a real figure downstream. */
function count(raw: string | undefined, onBad?: () => void): number {
  const cleaned = (raw ?? "").replace(/[\s  ']/g, "").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) {
    onBad?.();
    return 0;
  }
  return Math.round(n);
}

function emptyStat(name: string): KadrlarStat {
  const s = { name } as KadrlarStat;
  for (const c of COLUMNS) s[c] = 0;
  return s;
}

function subtract(a: KadrlarStat, b: KadrlarStat, name: string): KadrlarStat {
  const out = emptyStat(name);
  for (const c of COLUMNS) out[c] = a[c] - b[c];
  return out;
}

function addInto(acc: KadrlarStat, r: KadrlarStat): void {
  for (const c of COLUMNS) acc[c] += r[c];
}

function dateFromName(fileName?: string): string | null {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(fileName ?? "");
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function buildKadrlarSnapshot(
  overall: KadrlarStat,
  regions: KadrlarStat[],
  date: string,
): KadrlarSnapshot {
  return { date, uploadedAt: new Date().toISOString(), overall, regions };
}

export interface ParsedKadrlar {
  snapshot: KadrlarSnapshot;
  warnings: string[];
}

export function parseKadrlarCsv(
  text: string,
  fileName?: string,
): ParsedKadrlar {
  const warnings: string[] = [];
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV бўш ёки нотўғри форматда.");
  assertHeader(lines[0]);

  let overall: KadrlarStat | null = null;
  const regions: KadrlarStat[] = [];
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
      stat[c] = count(f[k + 1], () => {
        warnings.push(
          `${i + 1}-қатор, "${c}" устуни: "${(f[k + 1] ?? "").trim()}" сон эмас — 0 деб олинди.`,
        );
      });
    });

    if (national) {
      // Mirror the duplicate-region path below: warn and keep the first.
      // Silently overwriting would replace the national totals — the figures
      // every share on the page is computed against.
      if (overall) {
        warnings.push(
          `${i + 1}-қатор: иккинчи миллий қатор ўтказиб юборилди, биринчиси сақланди.`,
        );
        continue;
      }
      overall = stat;
      continue;
    }
    if (seen.has(name)) {
      warnings.push(`Такрорланган ҳудуд қатори ўтказиб юборилди: ${name}`);
      continue;
    }
    // A zero-total region is almost always a truncated row or a failed regional
    // pull. Left alone it becomes the LOWEST exposure share, so the map paints
    // that viloyat the healthiest in the country and the worst-first ranking
    // sorts it last — the opposite of the truth. Warn; the operator decides.
    if (stat.total === 0) {
      warnings.push(
        `${name}: жами ходимлар сони 0 — қатор тўлиқ юкланмаган бўлиши мумкин.`,
      );
    }
    seen.add(name);
    regions.push(stat);
  }

  if (!overall) {
    throw new Error('CSV да миллий қатор ("МИЛЛИЙ") топилмади.');
  }

  if (regions.length > 0) {
    // An omitted region is not visible anywhere downstream: it is silently
    // absorbed into the residual row, inflating "Марказий аппарат ва
    // республика марказлари" by that region's whole staff.
    const missing = GEO_REGIONS.filter((g) => !seen.has(g));
    if (missing.length > 0) {
      warnings.push(
        `${GEO_REGIONS.length} та ҳудуддан ${GEO_REGIONS.length - missing.length} таси юкланди. ` +
          `Йўқ: ${missing.join(", ")}. Улар қолдиқ қаторига қўшилиб кетади.`,
      );
    }
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
      const residual = subtract(overall, sum, PENSION_RESIDUAL);
      // `total` is guarded hard above: if the two pulls disagree about the size
      // of the population, nothing downstream is trustworthy. The other columns
      // are a different case -- the 15 rows come from 15 requests against a live
      // report over 8-15 minutes, and pulls minutes apart are already known to
      // differ by a handful of people. Clamping a small negative and naming it
      // beats refusing a 15-minute pull over three people.
      for (const c of COLUMNS) {
        if (residual[c] < 0) {
          warnings.push(
            `"${c}" устуни бўйича ҳудудлар йиғиндиси миллий кўрсаткичдан ${-residual[c]} тага катта — қолдиқ қатори 0 га тенглаштирилди.`,
          );
          residual[c] = 0;
        }
      }
      regions.push(residual);
    }
  }

  const date = dateFromName(fileName) ?? new Date().toISOString().slice(0, 10);
  return { snapshot: buildKadrlarSnapshot(overall, regions, date), warnings };
}
