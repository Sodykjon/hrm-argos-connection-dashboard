// «ТТБ → поликлиника» — has each district's staff left the district association (TTB) for the
// polyclinic they actually work in? Regional HR staff move people in YaMMT (my.mehnat.uz); once
// YaMMT syncs with ARGOS the staff appear under the polyclinic's own node. So a polyclinic whose
// ARGOS node has at least one employee is done (user, 15.10.2026).
//
// Head counts come from the ARGOS statistics constructor (GetReport → totalEmployee per
// institution, no personal data), pulled once a day by the «ARGOS жонли» bookmarklet.
//
// Pure module: no `@/` imports, so node --test can load it directly.

import type { BaseOrg, TreeRow } from "./argos-live.ts";

/** «Boʻysunuvi» values that make a registry row a target: under a TTB, or in a pilot district. */
export const SUB_TTB = "Tuman tibbiyot birlashmasi";
export const SUB_PILOT = "Tuman SSB boʻlimi (pilot)";
/** The district body itself (TTB, or the pilot district's health department) — where staff wait. */
export const SUB_PARENT = "Hududiy SSB va tuman hokimligi";

/** One constructor pull: STIR → employees on that STIR's node(s). Absent = no staff record. */
export interface StaffSnapshot {
  at: string; // ISO time the browser read it
  ids: number; // institution ids queried
  rows: [string, number][]; // [tin, totalEmployee]
}

export type TaqStatus =
  | "otkazilgan" // the polyclinic's node has staff
  | "ttbda" // own STIR in ARGOS, no staff yet — still on the TTB
  | "stirYoq" // no own STIR (or the TTB's) — needs its STIR first
  | "daraxtdaYoq"; // own STIR, not in the ARGOS tree

export const TAQ_STATUSES: TaqStatus[] = ["otkazilgan", "ttbda", "stirYoq", "daraxtdaYoq"];

export interface TaqCounts {
  total: number;
  otkazilgan: number;
  ttbda: number;
  stirYoq: number;
  daraxtdaYoq: number;
  staff: number; // employees already on the target polyclinics
  percent: number; // otkazilgan / total
}

export interface TaqOrg {
  name: string;
  stir: string | null;
  pilot: boolean;
  status: TaqStatus;
  staff: number | null; // null = not measurable (no STIR / not in the tree)
}

export interface TaqParent {
  name: string;
  stir: string | null;
  staff: number | null; // employees still on the district body; null = not in the tree
}

export interface TaqDistrict extends TaqCounts {
  name: string;
  parents: TaqParent[];
  orgs: TaqOrg[];
}

export interface TaqRegion extends TaqCounts {
  name: string;
  districts: TaqDistrict[];
}

export interface TaqResult {
  totals: TaqCounts;
  regions: TaqRegion[]; // registry order
}

export function emptyCounts(): TaqCounts {
  return { total: 0, otkazilgan: 0, ttbda: 0, stirYoq: 0, daraxtdaYoq: 0, staff: 0, percent: 0 };
}

function addTo(c: TaqCounts, o: TaqOrg) {
  c.total++;
  c[o.status]++;
  if (o.status === "otkazilgan") c.staff += o.staff ?? 0;
}

function addCounts(c: TaqCounts, x: TaqCounts) {
  c.total += x.total;
  c.otkazilgan += x.otkazilgan;
  c.ttbda += x.ttbda;
  c.stirYoq += x.stirYoq;
  c.daraxtdaYoq += x.daraxtdaYoq;
  c.staff += x.staff;
}

function finish<C extends TaqCounts>(c: C): C {
  c.percent = c.total ? c.otkazilgan / c.total : 0;
  return c;
}

export function isTarget(o: Pick<BaseOrg, "sub">): boolean {
  return o.sub === SUB_TTB || o.sub === SUB_PILOT;
}

/** STIR → employees, summed when several nodes share a STIR. */
export function staffIndex(s: StaffSnapshot | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const [tin, n] of s?.rows ?? []) m.set(tin, (m.get(tin) ?? 0) + n);
  return m;
}

/**
 * Status of every target row. `orgs` is the registry as the dashboard counts it (after own-STIR
 * assignments), `tree` the latest ARGOS tree, `staff` the latest constructor pull.
 */
export function computeTaq(orgs: readonly BaseOrg[], tree: readonly TreeRow[], staff: StaffSnapshot | null): TaqResult {
  const inTree = new Set(tree.map((r) => r[0]));
  const emp = staffIndex(staff);
  const staffOf = (tin: string | null) => (tin && inTree.has(tin) ? (emp.get(tin) ?? 0) : null);

  // district key → district bodies, and their STIRs (a target on its TTB's STIR is not measurable)
  const parents = new Map<string, TaqParent[]>();
  for (const o of orgs)
    if (o.sub === SUB_PARENT) {
      const k = o.region + "|" + (o.district ?? "");
      const l = parents.get(k) ?? [];
      l.push({ name: o.name, stir: o.stir, staff: staffOf(o.stir) });
      parents.set(k, l);
    }

  const regions = new Map<string, Map<string, TaqOrg[]>>();
  for (const o of orgs) {
    if (!isTarget(o)) continue;
    const k = o.region + "|" + (o.district ?? "");
    const parentStir = new Set((parents.get(k) ?? []).map((p) => p.stir).filter(Boolean));
    let status: TaqStatus;
    let n: number | null = null;
    if (!o.stir || parentStir.has(o.stir)) status = "stirYoq";
    else if (!inTree.has(o.stir)) status = "daraxtdaYoq";
    else {
      n = emp.get(o.stir) ?? 0;
      status = n > 0 ? "otkazilgan" : "ttbda";
    }
    let g = regions.get(o.region);
    if (!g) regions.set(o.region, (g = new Map()));
    const d = o.district ?? "—";
    const row: TaqOrg = { name: o.name, stir: o.stir, pilot: o.sub === SUB_PILOT, status, staff: n };
    const l = g.get(d);
    if (l) l.push(row);
    else g.set(d, [row]);
  }

  const totals = emptyCounts();
  const out: TaqRegion[] = [...regions].map(([name, ds]) => {
    const rc = emptyCounts();
    const districts: TaqDistrict[] = [...ds].map(([dname, list]) => {
      const c = emptyCounts();
      for (const o of list) addTo(c, o);
      addCounts(rc, c);
      return finish({ ...c, name: dname, parents: parents.get(name + "|" + (dname === "—" ? "" : dname)) ?? [], orgs: list });
    });
    addCounts(totals, rc);
    return finish({ ...rc, name, districts });
  });
  return { totals: finish(totals), regions: out };
}

// ------------------------------------------------------------------ responsible staff

export interface Masul {
  ism: string;
  hududlar: string[]; // canonical Uzbek-Cyrillic region names
}

export interface MasulSummary extends TaqCounts {
  ism: string;
  hududlar: string[];
  /** Polyclinics done since the previous day's pull; null when there is no earlier day. */
  delta: number | null;
}

/** One day's figures, kept per Tashkent day (the day's last pull). */
export interface TaqDay {
  date: string; // YYYY-MM-DD, Tashkent
  at: string;
  total: number;
  otkazilgan: number;
  staff: number;
  regions: { name: string; total: number; otkazilgan: number }[];
}

export function daySummary(r: TaqResult, date: string, at: string): TaqDay {
  return {
    date,
    at,
    total: r.totals.total,
    otkazilgan: r.totals.otkazilgan,
    staff: r.totals.staff,
    regions: r.regions.map((x) => ({ name: x.name, total: x.total, otkazilgan: x.otkazilgan })),
  };
}

/** The last day before `date` in the history, if any. */
export function previousDay(history: readonly TaqDay[], date: string): TaqDay | null {
  let best: TaqDay | null = null;
  for (const d of history) if (d.date < date && (!best || d.date > best.date)) best = d;
  return best;
}

export function masulSummaries(masullar: readonly Masul[], r: TaqResult, prev: TaqDay | null): MasulSummary[] {
  return masullar.map((m) => {
    const c = emptyCounts();
    let before = 0;
    for (const reg of r.regions)
      if (m.hududlar.includes(reg.name)) {
        addCounts(c, reg);
        before += prev?.regions.find((x) => x.name === reg.name)?.otkazilgan ?? 0;
      }
    return { ...finish(c), ism: m.ism, hududlar: m.hududlar, delta: prev ? c.otkazilgan - before : null };
  });
}

/** Only the regions one person is responsible for. */
export function filterRegions(r: TaqResult, hududlar: readonly string[]): TaqResult {
  const regions = r.regions.filter((x) => hududlar.includes(x.name));
  const totals = emptyCounts();
  for (const x of regions) addCounts(totals, x);
  return { totals: finish(totals), regions };
}

export function validStaff(x: unknown): x is StaffSnapshot {
  const s = x as StaffSnapshot;
  return (
    !!s &&
    typeof s.at === "string" &&
    !Number.isNaN(Date.parse(s.at)) &&
    typeof s.ids === "number" &&
    s.ids > 500 &&
    Array.isArray(s.rows) &&
    s.rows.length >= 100 &&
    s.rows.length <= 20000 &&
    s.rows.every(
      (r) =>
        Array.isArray(r) &&
        r.length === 2 &&
        typeof r[0] === "string" &&
        /^\d{6,12}$/.test(r[0]) &&
        Number.isInteger(r[1]) &&
        r[1] >= 0 &&
        r[1] < 100000,
    )
  );
}
