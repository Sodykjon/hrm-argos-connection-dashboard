// Parser for the daily "data-completion" CSV produced by the hrm.argos.uz
// bookmarklet (HRM_tuldirilish_YYYY-MM-DD.csv). Runs in the browser (admin
// upload) and in Node (seed generation). Pure functions, no framework deps.
//
// CSV: UTF-8 (BOM), ';'-delimited, decimal comma, columns
//   № ; ID ; Тўлдирилиш даражаси (%) ; orgType ; Бош ташкилот (гуруҳ) ; Ташкилот номи
// Percentages are converted to fractions 0..1 to match fmtPct / rampColor.

import type {
  CompletionOrg,
  CompletionOverall,
  CompletionRegionStat,
  CompletionSnapshot,
} from "./types";

// Canonical region names — MUST match the keys in lib/regions.ts SLUG_MAP
// (and the geojson feature names).
const CITY = "Тошкент шаҳри";
const REGION_BY_KEYWORD: Array<[RegExp, string]> = [
  [/каракалпакстан/i, "Қорақалпоғистон Республикаси"],
  [/андижан/i, "Андижон вилояти"],
  [/бухар/i, "Бухоро вилояти"],
  [/джизак/i, "Жиззах вилояти"],
  [/кашкадар/i, "Қашқадарё вилояти"],
  [/наваи/i, "Навоий вилояти"], // "Наваийской" — no "о"
  [/наманган/i, "Наманган вилояти"],
  [/самарканд/i, "Самарқанд вилояти"],
  [/сырдар/i, "Сирдарё вилояти"],
  [/сурхандар/i, "Сурхондарё вилояти"],
  [/ташкентск/i, "Тошкент вилояти"], // "Ташкентской области"
  [/ферган/i, "Фарғона вилояти"], // "Ферганской" — stem
  [/хорезм/i, "Хоразм вилояти"],
];

function regionKeyword(text: string): string | null {
  const t = text || "";
  if (/ташкент/i.test(t) && /город/i.test(t)) return CITY; // "города Ташкента" / "Ташкентское городское"
  for (const [re, name] of REGION_BY_KEYWORD) if (re.test(t)) return name;
  return null;
}

/**
 * Group an org by the SSV organisational hierarchy (its "Бош ташкилот").
 *  1. Central apparatus — the ministry HQ itself (id 1052) → own row.
 *  2. Regional SSV health administration (Управление здравоохранения … / the
 *     Karakalpakstan MoH) → its viloyat (shown on the map).
 *  3. Sanitary-epidemiological committee (and ALL its facilities) → own group.
 *  4. Republican centres / institutes / agencies / anything else → own group.
 * Grouping is by GROUP + id only (never the org name), so a republican institute
 * whose name mentions a region is not mis-filed.
 */
export function completionRegion(group: string, id?: string): string {
  const g = (group || "").trim();
  // 1. central apparatus (the ministry itself)
  if (id === "1052" || g === "Министерство здравоохранения Республики Узбекистан") {
    return "Марказий аппарат";
  }
  // 2a. Karakalpakstan republican health authority → its viloyat
  if (/каракалпакстан/i.test(g)) return "Қорақалпоғистон Республикаси";
  // 2b. regional SSV health administration → viloyat
  if (/управление здравоохранения/i.test(g)) {
    const r = regionKeyword(g);
    if (r) return r;
  }
  // 3. sanitary-epidemiological committee (and all its facilities)
  if (/санитарно-эпидемиолог/i.test(g)) return "Санитар-эпидемиология қўмитаси";
  // 4. republican centres / institutes / agencies / everything else
  return "Республика марказлари";
}

// ---------------------------------------------------------------- CSV helpers

/** Split one CSV line on ';' honoring "quoted" fields and "" escapes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ";") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

interface ColIdx {
  id: number;
  rate: number;
  orgType: number;
  group: number;
  name: number;
}

function headerIndex(header: string[]): ColIdx {
  const find = (re: RegExp, fallback: number) => {
    const i = header.findIndex((h) => re.test(h.trim().toLowerCase()));
    return i >= 0 ? i : fallback;
  };
  return {
    id: find(/^id$|\bid\b/, 1),
    rate: find(/даражаси|тўлдирилиш|тулдирилиш|%/, 2),
    orgType: find(/orgtype/, 3),
    group: find(/гуру/, 4), // "Бош ташкилот (гуруҳ/гурух)"
    name: find(/номи/, 5), // "Ташкилот номи"
  };
}

function dateFromName(fileName?: string): string | null {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(fileName ?? "");
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function mean(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ------------------------------------------------------------- build snapshot

export function buildCompletionSnapshot(
  orgs: CompletionOrg[],
  date: string,
): CompletionSnapshot {
  const byRegion = new Map<string, CompletionOrg[]>();
  for (const o of orgs) {
    const list = byRegion.get(o.region);
    if (list) list.push(o);
    else byRegion.set(o.region, [o]);
  }
  const regions: CompletionRegionStat[] = [...byRegion.entries()]
    .map(([name, list]) => ({
      name,
      orgCount: list.length,
      avg: mean(list.map((o) => o.completion)),
      zeroCount: list.filter((o) => o.completion === 0).length,
      below50: list.filter((o) => o.completion < 0.5).length,
    }))
    .sort((a, b) => a.avg - b.avg);

  const overall: CompletionOverall = {
    orgCount: orgs.length,
    avg: mean(orgs.map((o) => o.completion)),
    zeroCount: orgs.filter((o) => o.completion === 0).length,
    below50: orgs.filter((o) => o.completion < 0.5).length,
  };

  return {
    date,
    uploadedAt: new Date().toISOString(),
    overall,
    regions,
    orgs,
  };
}

export interface ParsedCompletion {
  snapshot: CompletionSnapshot;
  warnings: string[];
}

export function parseCompletionCsv(
  text: string,
  fileName?: string,
): ParsedCompletion {
  const warnings: string[] = [];
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV бўш ёки нотўғри форматда.");

  const idx = headerIndex(splitCsvLine(lines[0]));
  const orgs: CompletionOrg[] = [];

  for (let i = 1; i < lines.length; i++) {
    const f = splitCsvLine(lines[i]);
    if (f.length < 3) continue;
    const id = (f[idx.id] ?? "").trim();
    const rate = parseFloat((f[idx.rate] ?? "").trim().replace(",", "."));
    if (!id || Number.isNaN(rate)) {
      warnings.push(`Қатор ${i + 1}: ID ёки фоиз нотўғри — ўтказиб юборилди.`);
      continue;
    }
    const name = (f[idx.name] ?? "").trim();
    const group = (f[idx.group] ?? "").trim();
    const orgType = (f[idx.orgType] ?? "").trim() || undefined;
    orgs.push({
      id,
      name,
      orgType,
      completion: clamp01(rate / 100),
      region: completionRegion(group, id),
    });
  }

  if (!orgs.length) throw new Error("CSV да ташкилотлар топилмади.");

  const date = dateFromName(fileName) ?? todayIso();
  return { snapshot: buildCompletionSnapshot(orgs, date), warnings };
}
