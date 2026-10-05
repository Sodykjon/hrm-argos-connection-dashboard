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
}

export interface TreeGroup extends Counts {
  name: string;
  orgs: TreeOrg[];
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

export function buildTree(result: LiveResult, onlyRegion?: string): TreeRegion[] {
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
    const gs: TreeGroup[] = [...groups].map(([gname, orgs]) => ({
      name: gname,
      ...counts(orgs),
      orgs: orgs.map((o) => ({
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
      })),
    }));
    return { name, ...counts(gs.flatMap((g) => g.orgs)), groups: gs };
  });
}
