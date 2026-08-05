// Parser for the pension-age CSV pulled from the hrm.argos.uz report
// GetAllEmployeeDistributionBySeniority (HRM_pensiya_YYYY-MM-DD.csv).
// Runs in the browser (admin upload). Pure functions, no framework deps.
//
// The CSV carries whatever region names ARGOS returned — Latin, and in one case
// misspelled. Resolving them to the dashboard's canonical Uzbek-Cyrillic keys
// happens HERE, under test, not in the bookmarklet.

import type { PensionSnapshot, PensionStat } from "./types";
import { PENSION_RESIDUAL } from "./regions.ts";

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
