// Browser-side xlsx parsing for the admin upload page. Handles BOTH ARGOS export
// formats:
//   (A) two-sheet "HRM_ARGOS_hisobot": «Маълумотлар» (Ҳудуд col) + «Ҳисобот» summary
//   (B) flat "Reestr" single sheet (Лист1): region group-header rows + Latin names
// Produces the same normalized snapshot shape either way.

import * as XLSX from "xlsx";
import type { Org, Registry, RegionStat, Snapshot, Status, Totals } from "./types";

export interface ParseCheck {
  ok: boolean;
  expected: Totals | null; // from the Ҳисобот summary (format A only)
  got: Totals; // aggregated from per-org rows
}

export interface ParsedHisobot {
  snapshot: Snapshot;
  check: ParseCheck;
  warnings: string[];
}

export async function fileToBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

function readBook(buf: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buf, { type: "array" });
}

function findSheet(wb: XLSX.WorkBook, needles: string[]): XLSX.WorkSheet | null {
  for (const name of wb.SheetNames) {
    if (needles.some((n) => name.includes(n))) return wb.Sheets[name];
  }
  return null;
}

function aoa(ws: XLSX.WorkSheet): string[][] {
  return XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
}

const cell = (row: string[], i: number): string =>
  row && i >= 0 && row[i] != null ? String(row[i]).trim() : "";

function toInt(s: string): number {
  const n = parseInt(String(s).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function normStir(v: string): string {
  let s = String(v ?? "").trim();
  if (s.endsWith(".0")) s = s.slice(0, -2);
  return s;
}

function normStatus(v: string): Status {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "faol") return "ulangan";
  if (s.includes("chiril") || s.includes("ochiril") || s.includes("ўчирил"))
    return "ochirilgan";
  return "ulanmagan"; // "Уланмаган" / "Ulanmagan"
}

// Latin region names (new format) -> Cyrillic (used by the map/slugs)
const LAT_TO_CYR: Record<string, string> = {
  "Respublika muassasalari": "Республика муассасалари",
  "Qoraqalpogʻiston Respublikasi": "Қорақалпоғистон Республикаси",
  "Andijon viloyati": "Андижон вилояти",
  "Buxoro viloyati": "Бухоро вилояти",
  "Jizzax viloyati": "Жиззах вилояти",
  "Qashqadaryo viloyati": "Қашқадарё вилояти",
  "Navoiy viloyati": "Навоий вилояти",
  "Namangan viloyati": "Наманган вилояти",
  "Samarqand viloyati": "Самарқанд вилояти",
  "Surxondaryo viloyati": "Сурхондарё вилояти",
  "Sirdaryo viloyati": "Сирдарё вилояти",
  "Toshkent viloyati": "Тошкент вилояти",
  "Fargʻona viloyati": "Фарғона вилояти",
  "Xorazm viloyati": "Хоразм вилояти",
  "Toshkent shahri": "Тошкент шаҳри",
};
const normKey = (s: string) =>
  s.toLowerCase().replace(/[ʻʼ'`´]/g, "").replace(/\s+/g, " ").trim();
const LAT_NORM = new Map(
  Object.entries(LAT_TO_CYR).map(([k, v]) => [normKey(k), v]),
);
function latToCyr(name: string): string {
  return LAT_TO_CYR[name] ?? LAT_NORM.get(normKey(name)) ?? name;
}

// ---- shared: aggregate orgs -> regions/totals + build the snapshot ----
function buildSnapshot(
  orgs: Org[],
  date: string,
  expected: Totals | null,
  warnings: string[],
): ParsedHisobot {
  const agg = new Map<
    string,
    { total: number; ulangan: number; ulanmagan: number; ochirilgan: number }
  >();
  for (const o of orgs) {
    const a =
      agg.get(o.region) ?? { total: 0, ulangan: 0, ulanmagan: 0, ochirilgan: 0 };
    a.total += 1;
    a[o.status] += 1;
    agg.set(o.region, a);
  }

  const regions: RegionStat[] = [...agg.keys()].map((name) => {
    const a = agg.get(name)!;
    return {
      name,
      total: a.total,
      ulangan: a.ulangan,
      ulanmagan: a.ulanmagan,
      ochirilgan: a.ochirilgan,
      percent: a.total ? a.ulangan / a.total : 0,
    };
  });

  const got: Totals = regions.reduce(
    (t, r) => ({
      total: t.total + r.total,
      ulangan: t.ulangan + r.ulangan,
      ulanmagan: t.ulanmagan + r.ulanmagan,
      ochirilgan: t.ochirilgan + r.ochirilgan,
      percent: 0,
    }),
    { total: 0, ulangan: 0, ulanmagan: 0, ochirilgan: 0, percent: 0 },
  );
  got.percent = got.total ? got.ulangan / got.total : 0;

  const ok = expected
    ? expected.total === got.total &&
      expected.ulangan === got.ulangan &&
      expected.ulanmagan === got.ulanmagan &&
      expected.ochirilgan === got.ochirilgan
    : true; // flat format has no summary to cross-check
  if (expected && !ok)
    warnings.push("Файлдаги ЖАМИ йиғиндиси ҳисобланган йиғинди билан фарқ қилади.");

  const snapshot: Snapshot = {
    date,
    uploadedAt: new Date().toISOString(),
    totals: got,
    regions,
    orgs,
  };
  return { snapshot, check: { ok, expected, got }, warnings };
}

function extractDate(...texts: string[]): string {
  for (const t of texts) {
    const m = /(\d{2})[.\-_/](\d{2})[.\-_/](\d{4})/.exec(t || "");
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return new Date().toISOString().slice(0, 10);
}

// ---- format A: two-sheet «Маълумотлар» + «Ҳисобот» ----
function parseTwoSheet(
  wb: XLSX.WorkBook,
  details: XLSX.WorkSheet,
  warnings: string[],
): ParsedHisobot {
  const summary = findSheet(wb, ["Ҳисобот", "исобот"]);

  let date = new Date().toISOString().slice(0, 10);
  if (summary) {
    for (const r of aoa(summary)) {
      const joined = r.join(" ");
      const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(joined);
      if (m && joined.includes("ҳолат")) {
        date = `${m[3]}-${m[2]}-${m[1]}`;
        break;
      }
    }
  }

  const drows = aoa(details);
  const orgs: Org[] = [];
  for (let i = 1; i < drows.length; i++) {
    const r = drows[i];
    const region = cell(r, 0);
    const name = cell(r, 1);
    const stir = normStir(cell(r, 2));
    if (!name && !stir) continue;
    orgs.push({
      region,
      name,
      stir,
      status: normStatus(cell(r, 3)),
      contract: cell(r, 4),
    });
  }
  if (orgs.length === 0) throw new Error("Ташкилотлар рўйхати бўш");

  let expected: Totals | null = null;
  if (summary) {
    for (const r of aoa(summary)) {
      if (!r.some((c) => String(c).trim() === "ЖАМИ")) continue;
      const nums = r
        .map((c) => String(c).trim())
        .filter((s) => /^\d[\d\s ]*$/.test(s))
        .map(toInt);
      if (nums.length >= 4) {
        expected = {
          total: nums[0],
          ulangan: nums[1],
          ulanmagan: nums[2],
          ochirilgan: nums[3],
          percent: nums[0] ? nums[1] / nums[0] : 0,
        };
      }
      break;
    }
  }

  return buildSnapshot(orgs, date, expected, warnings);
}

// ---- format B: flat single sheet (Лист1) with region group-header rows ----
function parseFlat(
  wb: XLSX.WorkBook,
  fileName: string | undefined,
  warnings: string[],
): ParsedHisobot {
  // pick the sheet whose header row mentions STIR + Status; else the first
  let ws: XLSX.WorkSheet | null = null;
  for (const name of wb.SheetNames) {
    const first = (aoa(wb.Sheets[name])[0] ?? []).map((c) =>
      String(c).toLowerCase(),
    );
    const j = first.join("|");
    if ((j.includes("stir") || j.includes("стир")) && j.includes("нома")) {
      ws = wb.Sheets[name];
      break;
    }
  }
  if (!ws) ws = wb.Sheets[wb.SheetNames[0]];
  const rows = aoa(ws);
  if (rows.length < 2) throw new Error("Файл бўш ёки нотаниш формат");

  const header = rows[0].map((c) => String(c).toLowerCase().trim());
  const findCol = (...keys: string[]) =>
    header.findIndex((h) => keys.some((k) => h.includes(k)));
  const nameCol = Math.max(0, findCol("muassasa", "nomi", "номи", "название"));
  const stirCol = Math.max(1, findCol("stir", "стир", "inn", "инн"));
  const statusCol = Math.max(2, findCol("статус", "status", "holat", "ҳолат"));
  const contractCol = findCol("шартнома", "shartnoma", "contract");

  const orgs: Org[] = [];
  let region = "";
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = cell(r, nameCol);
    const stir = normStir(cell(r, stirCol));
    if (name && !stir) {
      region = latToCyr(name); // region group-header row
      continue;
    }
    if (!stir) continue;
    orgs.push({
      region,
      name,
      stir,
      status: normStatus(cell(r, statusCol)),
      contract: cell(r, contractCol),
    });
  }
  if (orgs.length === 0) throw new Error("Ташкилотлар рўйхати бўш");

  return buildSnapshot(orgs, extractDate(fileName ?? ""), null, warnings);
}

// ------------------------------------------------------------------- hisobot

export function parseHisobot(buf: ArrayBuffer, fileName?: string): ParsedHisobot {
  const wb = readBook(buf);
  const warnings: string[] = [];
  const details = findSheet(wb, ["Маълумот"]);
  if (details) return parseTwoSheet(wb, details, warnings);
  return parseFlat(wb, fileName, warnings);
}

// ------------------------------------------------------------------ registry

export function parseRegistry(buf: ArrayBuffer): Registry {
  const wb = readBook(buf);
  const reg: Registry = {};

  const contacts = findSheet(wb, ["ум.реестр", "реестр"]);
  if (contacts) {
    const rows = aoa(contacts);
    for (let i = 4; i < rows.length; i++) {
      const r = rows[i];
      const stir = normStir(cell(r, 10));
      if (!stir) continue;
      if (!reg[stir]) {
        reg[stir] = {
          name: cell(r, 1),
          rahbar: cell(r, 7),
          manzil: cell(r, 4),
          email: cell(r, 11),
          tel: cell(r, 12) || cell(r, 13),
          mhobt: cell(r, 20),
        };
      }
    }
  }

  const dir = findSheet(wb, ["directory"]);
  if (dir) {
    const rows = aoa(dir);
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const stir = normStir(cell(r, 1));
      if (!stir) continue;
      const tulov = cell(r, 4);
      if (reg[stir]) reg[stir].tulov = tulov;
      else reg[stir] = { tulov };
    }
  }

  return reg;
}
