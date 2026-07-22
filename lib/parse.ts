// Browser-side xlsx parsing for the admin upload page. Mirrors the validated
// Python seed generator so uploaded data has the exact same normalized shape.

import * as XLSX from "xlsx";
import type { Org, Registry, RegionStat, Snapshot, Status, Totals } from "./types";

export interface ParseCheck {
  ok: boolean; // aggregated totals match the file's own ЖАМИ row
  expected: Totals | null; // from the Ҳисобот sheet
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
  row && row[i] != null ? String(row[i]).trim() : "";

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
  return "ulanmagan"; // only "Уланмаган" lands here
}

// ------------------------------------------------------------------- hisobot

export function parseHisobot(buf: ArrayBuffer): ParsedHisobot {
  const wb = readBook(buf);
  const warnings: string[] = [];

  const details = findSheet(wb, ["Маълумот"]);
  const summary = findSheet(wb, ["Ҳисобот", "исобот"]);
  if (!details) throw new Error("«Маълумотлар» варағи топилмади");

  // --- report date from the summary title, else today ---
  let date = new Date().toISOString().slice(0, 10);
  if (summary) {
    const rows = aoa(summary);
    for (const r of rows) {
      const joined = r.join(" ");
      const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(joined);
      if (m && joined.includes("ҳолат")) {
        date = `${m[3]}-${m[2]}-${m[1]}`;
        break;
      }
    }
  }

  // --- per-org rows (source of truth) ---
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

  // --- the file's own ЖАМИ, read column-agnostically (SheetJS may trim a
  //     leading blank column, so we can't rely on fixed indices) ---
  let expected: Totals | null = null;
  if (summary) {
    for (const r of aoa(summary)) {
      if (!r.some((c) => String(c).trim() === "ЖАМИ")) continue;
      // pure-integer cells in order: total, ulangan, ulanmagan, ochirilgan
      // (the "%" cell is excluded — it contains a "%" sign)
      const nums = r
        .map((c) => String(c).trim())
        .filter((s) => /^\d[\d\s ]*$/.test(s))
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

  // --- aggregate by region ---
  const agg = new Map<
    string,
    { total: number; ulangan: number; ulanmagan: number; ochirilgan: number }
  >();
  for (const o of orgs) {
    const a =
      agg.get(o.region) ??
      { total: 0, ulangan: 0, ulanmagan: 0, ochirilgan: 0 };
    a.total += 1;
    a[o.status] += 1;
    agg.set(o.region, a);
  }

  // region order = first appearance in the details sheet (i.e. report order)
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

  const ok =
    !!expected &&
    expected.total === got.total &&
    expected.ulangan === got.ulangan &&
    expected.ulanmagan === got.ulanmagan &&
    expected.ochirilgan === got.ochirilgan;
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
