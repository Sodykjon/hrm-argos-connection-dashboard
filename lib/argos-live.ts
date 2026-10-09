// «ARGOS жонли» — the per-organisation connection status recomputed from the
// latest HRM ARGOS org-tree snapshot that the user's own browser pushes here
// (bookmarklet on hrm.argos.uz → postMessage → /argos-jonli/qabul → KV).
// The dashboard never calls ARGOS itself.
//
// Pure module: no `@/` imports, so node --test can load it directly.

export type LiveStatus = "ulangan" | "ulanmagan" | "ochirilgan";

/**
 * One row of the registry workbook (data/argos-live-base.json, built from the
 * 05.10.2026 «BARCHA_HUDUDLAR_FINAL» workbook), in the workbook's order:
 * sheet → group → row.
 */
export interface BaseOrg {
  region: string; // canonical Uzbek-Cyrillic region name (lib/regions.ts) — the workbook sheet
  district: string | null; // the sheet's group (Latin): a district/city, or a republican system
  hudud?: string | null; // republican sheet only: where the branch sits («Respublika (bosh muassasa)», a region)
  name: string;
  stir: string | null;
  reestr: LiveStatus; // status in the 17.09 registry
  override: LiveStatus | null; // manual decision that wins over the tree
  contract?: string | null; // «Shartnoma (17.09)»
  pay?: number | null; // «Toʻlov, % (17.09)»
  sub?: string | null; // «Boʻysunuvi»
  note?: string | null; // workbook remark that is not a restatement of the live status
  assigned?: "auto" | "approved"; // STIR taken from the ARGOS tree (applyAssign), not from the workbook
}

/** A registry row kept out of every count (e.g. no internet in a mountain village). */
export interface ExcludedOrg {
  region: string;
  district: string | null;
  name: string;
  stir: string | null;
  reason: string; // "internet"
}

/** A row taken off the registry altogether (liquidated, left the system, …). */
export interface RemovedOrg {
  region: string;
  district: string | null;
  name: string;
  stir: string | null;
  reason: string | null;
  date: string | null;
}

export interface BaseFile {
  source: string;
  orgs: BaseOrg[];
  excluded?: ExcludedOrg[];
  removed?: RemovedOrg[];
  /** STIRs of removed/excluded rows — never listed as «in ARGOS, not in the registry». */
  ignoreStir?: string[];
}

/**
 * [tin, billing (1 = active, 0 = inactive), label?, parent org's tin?] — the parent (sent by the
 * bookmarklet since 09.10.2026) lets lib/argos-match.ts place an org in its region and district.
 */
export type TreeRow = [string, 0 | 1, string?, string?];

export interface TreeSnapshot {
  at: string; // ISO time the tree was read in the browser
  rows: TreeRow[];
}

export type Reason =
  | "override" // manual decision
  | "nostir" // no STIR in the registry → registry status kept
  | "missing" // STIR not in the ARGOS tree
  | "billing" // in the tree, billing active
  | "newBilling0" // registry said not connected, now in the tree (billing not yet on)
  | "billingOff"; // in the tree, billing inactive → treated as deleted

/**
 * A STIR found in the ARGOS tree for a STIR-less registry row (lib/argos-match.ts), stored in KV:
 * «auto» — a strong match with billing on, applied when the tree arrived; «approved» — a person
 * confirmed it. `rejected`: per row, STIRs a person turned down (never offered again).
 */
export interface StirAssign {
  items: Record<string, { tin: string; mode: "auto" | "approved"; at: string; label: string }>;
  rejected: Record<string, string[]>;
}

export const EMPTY_ASSIGN: StirAssign = { items: {}, rejected: {} };

/** Registry row identity across rebuilds: region + group + name (unique, pinned by tests). */
export function orgKey(o: Pick<BaseOrg, "region" | "district" | "name">): string {
  return `${o.region}|${o.district ?? ""}|${o.name}`;
}

function ddmmyyyy(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5 * 3600 * 1000); // Tashkent
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
}

/**
 * The registry as the dashboard counts it: a STIR-less row with a stored assignment takes that STIR.
 * It then counts as a connected row of the registry («reestr: ulangan»), so a later billing switch-off
 * shows it as switched off, not as «just added». A row the workbook already gives a STIR is left alone.
 */
export function applyAssign(base: readonly BaseOrg[], assign: StirAssign): BaseOrg[] {
  return base.map((o) => {
    const a = !o.stir ? assign.items[orgKey(o)] : undefined;
    if (!a) return o;
    const old = /eski: (\d+)/.exec(o.note ?? "")?.[1];
    const keep = (o.note ?? "")
      .split("·")
      .map((x) => x.trim())
      .filter((x) => x && !/^STIR TTB bilan bir xil edi|^STIR boshqa muassasaniki edi/.test(x));
    keep.push(
      `Oʻz STIRi ARGOS daraxtidan qoʻyildi ${ddmmyyyy(a.at)} (${a.mode === "auto" ? "avtomatik" : "tasdiqlangan"}` +
        `${old ? `; avval: ${old}` : ""})`,
    );
    return { ...o, stir: a.tin, reestr: "ulangan" as const, assigned: a.mode, note: keep.join(" · ") };
  });
}

export interface LiveOrg extends BaseOrg {
  status: LiveStatus;
  billing: 0 | 1 | null; // null = not in the tree
  reason: Reason;
}

export type TreeIndex = Map<string, 0 | 1>;

export function indexTree(rows: TreeRow[]): TreeIndex {
  const m: TreeIndex = new Map();
  for (const [tin, b] of rows) m.set(String(tin).trim(), b ? 1 : 0);
  return m;
}

/**
 * The rule the workbook was maintained with (24–25.09.2026):
 *  override wins → no STIR keeps the registry status → STIR missing from the
 *  tree: a registry-connected org counts as deleted, others keep their status →
 *  in the tree with billing on: connected → in the tree with billing off: a
 *  registry-unconnected org has just been added (billing switches on hours
 *  later), anything else has been switched off.
 */
export function decide(org: BaseOrg, tree: TreeIndex): { status: LiveStatus; reason: Reason; billing: 0 | 1 | null } {
  const billing = org.stir ? (tree.get(org.stir) ?? null) : null;
  if (org.override) return { status: org.override, reason: "override", billing };
  if (!org.stir) return { status: org.reestr, reason: "nostir", billing };
  if (billing === null)
    return { status: org.reestr === "ulangan" ? "ochirilgan" : org.reestr, reason: "missing", billing };
  if (billing === 1) return { status: "ulangan", reason: "billing", billing };
  return org.reestr === "ulanmagan"
    ? { status: "ulangan", reason: "newBilling0", billing }
    : { status: "ochirilgan", reason: "billingOff", billing };
}

export interface Counts {
  total: number;
  ulangan: number;
  ulanmagan: number;
  ochirilgan: number;
  percent: number; // 0..1
}

function emptyCounts(): Counts {
  return { total: 0, ulangan: 0, ulanmagan: 0, ochirilgan: 0, percent: 0 };
}
function add(c: Counts, s: LiveStatus) {
  c.total++;
  c[s]++;
}
function finish(c: Counts): Counts {
  c.percent = c.total ? c.ulangan / c.total : 0;
  return c;
}

export interface DistrictLive extends Counts {
  name: string;
}
export interface RegionLive extends Counts {
  name: string;
  districts: DistrictLive[];
}

export interface StirGroup {
  stir: string;
  region: string;
  district: string | null;
  names: string[];
  statuses: LiveStatus[];
  inTree: boolean;
  mixed: boolean; // rows under one STIR disagree
}

export interface LiveResult {
  orgs: LiveOrg[];
  totals: Counts;
  regions: RegionLive[]; // workbook order
  stirGroups: StirGroup[]; // largest first
  extraInTree: { tin: string; billing: 0 | 1; label: string }[]; // in ARGOS, not in the registry
}

export function compute(base: BaseOrg[], tree: TreeSnapshot, ignoreStir: readonly string[] = []): LiveResult {
  const idx = indexTree(tree.rows);
  const orgs: LiveOrg[] = base.map((o) => ({ ...o, ...decide(o, idx) }));

  const totals = emptyCounts();
  const regionMap = new Map<string, { c: Counts; d: Map<string, Counts> }>();
  for (const o of orgs) {
    add(totals, o.status);
    let r = regionMap.get(o.region);
    if (!r) regionMap.set(o.region, (r = { c: emptyCounts(), d: new Map() }));
    add(r.c, o.status);
    if (o.district) {
      let d = r.d.get(o.district);
      if (!d) r.d.set(o.district, (d = emptyCounts()));
      add(d, o.status);
    }
  }
  const regions: RegionLive[] = [...regionMap].map(([name, r]) => ({
    name,
    ...finish(r.c),
    districts: [...r.d].map(([dn, dc]) => ({ name: dn, ...finish(dc) })),
  }));

  const byStir = new Map<string, LiveOrg[]>();
  for (const o of orgs) {
    if (!o.stir) continue;
    const l = byStir.get(o.stir);
    if (l) l.push(o);
    else byStir.set(o.stir, [o]);
  }
  const stirGroups: StirGroup[] = [...byStir]
    .filter(([, l]) => l.length > 1)
    .map(([stir, l]) => ({
      stir,
      region: l[0].region,
      district: l[0].district,
      names: l.map((o) => o.name),
      statuses: l.map((o) => o.status),
      inTree: idx.has(stir),
      mixed: new Set(l.map((o) => o.status)).size > 1,
    }))
    .sort((a, b) => b.names.length - a.names.length || a.region.localeCompare(b.region));

  const known = new Set([...base.map((o) => o.stir).filter(Boolean), ...ignoreStir]);
  const extraInTree = tree.rows
    .filter(([tin]) => !known.has(String(tin)))
    .map(([tin, billing, label]) => ({ tin: String(tin), billing, label: label ?? "" }));

  return { orgs, totals: finish(totals), regions, stirGroups, extraInTree };
}

/** Orgs whose status differs between two tree snapshots (for «since the last change»). */
export function changedSince(base: BaseOrg[], prev: TreeSnapshot, cur: TreeSnapshot) {
  const a = indexTree(prev.rows);
  const b = indexTree(cur.rows);
  const out: { org: BaseOrg; from: LiveStatus; to: LiveStatus }[] = [];
  for (const o of base) {
    const x = decide(o, a).status;
    const y = decide(o, b).status;
    if (x !== y) out.push({ org: o, from: x, to: y });
  }
  return out;
}

/**
 * Stable fingerprint of a tree's content (tin + billing, + parent when the bookmarklet sends it),
 * order-independent. Trees without parents keep their old fingerprints.
 */
export function treeFingerprint(rows: TreeRow[]): string {
  const parts = rows.map(([t, b, , p]) => `${t}:${b ? 1 : 0}${p ? `:${p}` : ""}`).sort();
  let h = 2166136261;
  for (const p of parts)
    for (let i = 0; i < p.length; i++) {
      h ^= p.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  return `${parts.length}-${(h >>> 0).toString(16)}`;
}

export function validTree(x: unknown): x is TreeSnapshot {
  const t = x as TreeSnapshot;
  return (
    !!t &&
    typeof t.at === "string" &&
    Array.isArray(t.rows) &&
    t.rows.length > 500 &&
    t.rows.every(
      (r) =>
        Array.isArray(r) &&
        typeof r[0] === "string" &&
        /^\d{6,12}$/.test(r[0]) &&
        (r[1] === 0 || r[1] === 1) &&
        (r[2] === undefined || typeof r[2] === "string") &&
        (r[3] === undefined || (typeof r[3] === "string" && /^\d{6,12}$/.test(r[3]))),
    )
  );
}
