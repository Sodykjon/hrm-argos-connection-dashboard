// The /argos-jonli tree in the registry workbook's own shape: sheet (region or
// the republican sheet) → group (district/city, or republican system) → rows,
// all in workbook order. Built on the server, rendered by LiveTree.
//
// Pure module: no `@/` imports, so node --test can load it directly.

import type { Counts, LiveOrg, LiveResult, LiveStatus, Reason } from "./argos-live.ts";

export interface TreeOrg {
  n: number; // row number within the sheet, as the workbook numbers it
  name: string;
  stir: string | null;
  status: LiveStatus;
  reason: Reason;
  /** Status change since the 17.09 registry: 1 = became connected, -1 = lost it, 0 = same. */
  ch: -1 | 0 | 1;
  was: LiveStatus; // 17.09 registry status
  contract: string | null;
  pay: number | null;
  sub: string | null;
  hudud: string | null;
  note: string | null;
  dup: number; // rows sharing this STIR (1 = unique)
  /** Place in the SES committee's two-level structure (SES group only). */
  role?: SesRole;
}

export type SesRole = "markaz" | "resp" | "boshqarma" | "bolim" | "bevosita";

/**
 * The SES committee's structure from the workbook's «SES tuzilmasi» sheet (data/ses-tuzilma.json,
 * scripts/make-ses-tuzilma.py): the republican centre, then one block per region — its regional
 * department, the district/city departments under it, and the institutions reporting to the
 * committee directly. Display only: the counts stay those of the group.
 */
export interface SesStructure {
  group: string; // the republican system it reorders
  blocks: { name: string; rows: { name: string; role: SesRole }[] }[]; // name: region, or "markaz"
}

export interface TreeBlock extends Counts {
  name: string; // a region's canonical name, or "markaz"
  orgs: TreeOrg[];
}

export interface TreeGroup extends Counts {
  name: string;
  orgs: TreeOrg[];
  blocks?: TreeBlock[]; // the SES group, in its structure
}

export interface TreeRegion extends Counts {
  name: string;
  groups: TreeGroup[];
}

function counts(orgs: { status: LiveStatus }[]): Counts {
  const c: Counts = { total: orgs.length, ulangan: 0, ulanmagan: 0, ochirilgan: 0, percent: 0 };
  for (const o of orgs) c[o.status]++;
  c.percent = c.total ? c.ulangan / c.total : 0;
  return c;
}

function sesPlaces(ses: SesStructure): Map<string, { i: number; role: SesRole }> {
  const m = new Map<string, { i: number; role: SesRole }>();
  let i = 0;
  for (const b of ses.blocks) for (const r of b.rows) m.set(r.name, { i: i++, role: r.role });
  return m;
}

export function buildTree(result: LiveResult, onlyRegion?: string, ses?: SesStructure): TreeRegion[] {
  const dup = new Map<string, number>();
  for (const o of result.orgs) if (o.stir) dup.set(o.stir, (dup.get(o.stir) ?? 0) + 1);

  const regions = new Map<string, Map<string, LiveOrg[]>>();
  for (const o of result.orgs) {
    if (onlyRegion && o.region !== onlyRegion) continue;
    let g = regions.get(o.region);
    if (!g) regions.set(o.region, (g = new Map()));
    const key = o.district ?? "—";
    const l = g.get(key);
    if (l) l.push(o);
    else g.set(key, [o]);
  }

  return [...regions].map(([name, groups]) => {
    let n = 0;
    const gs: TreeGroup[] = [...groups].map(([gname, list]) => {
      // The SES group follows its structure; rows the structure does not know keep their place after it.
      const place = ses && gname === ses.group ? sesPlaces(ses) : null;
      const orgs = place ? [...list].sort((a, b) => (place.get(a.name)?.i ?? 1e9) - (place.get(b.name)?.i ?? 1e9)) : list;
      const rows: TreeOrg[] = orgs.map((o) => ({
        n: ++n,
        name: o.name,
        stir: o.stir,
        status: o.status,
        reason: o.reason,
        ch: o.status === "ulangan" && o.reestr !== "ulangan" ? 1 : o.reestr === "ulangan" && o.status !== "ulangan" ? -1 : 0,
        was: o.reestr,
        contract: o.contract ?? null,
        pay: o.pay ?? null,
        sub: o.sub ?? null,
        hudud: o.hudud ?? null,
        note: o.note ?? null,
        dup: o.stir ? (dup.get(o.stir) ?? 1) : 1,
        ...(place?.get(o.name) ? { role: place.get(o.name)!.role } : {}),
      }));
      const g: TreeGroup = { name: gname, ...counts(rows), orgs: rows };
      if (place) {
        const byName = new Map(rows.map((r) => [r.name, r]));
        g.blocks = ses!.blocks
          .map((b) => {
            const bo = b.rows.map((x) => byName.get(x.name)).filter((x): x is TreeOrg => !!x);
            return { name: b.name, ...counts(bo), orgs: bo };
          })
          .filter((b) => b.orgs.length > 0);
        const rest = rows.filter((r) => !place.has(r.name));
        if (rest.length) g.blocks.push({ name: "—", ...counts(rest), orgs: rest });
      }
      return g;
    });
    return { name, ...counts(gs.flatMap((g) => g.orgs)), groups: gs };
  });
}
