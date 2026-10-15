// «Тўлдирилиш даражаси» in the same shape as every other page (user, 15.10.2026): the republican
// institutions as one top-level group plus the 14 regions, and — when the CSV carries STIRs — each
// organisation in its registry place (region → district / republican system → SES block).
//
// The completion CSV groups orgs by their ARGOS parent into 17 buckets; three of them are not
// regions (Марказий аппарат, the SES committee, republican centres) and all three sit under
// «Республика муассасалари» in the registry, so they merge into it.
//
// Pure module: no `@/` imports, so node --test can load it directly.

import type { CompletionManifestEntry, CompletionOrg, CompletionRegionStat, CompletionSnapshot } from "./types.ts";
import type { TreeOrg, TreeRegion } from "./argos-live-view.ts";

export const REPUBLIC = "Республика муассасалари";
const NON_GEO = new Set(["Марказий аппарат", "Санитар-эпидемиология қўмитаси", "Республика марказлари"]);

/** The 17 completion buckets folded onto the registry's 15 top-level groups. */
export function topRegion(region: string): string {
  return NON_GEO.has(region) ? REPUBLIC : region;
}

export interface PlacedOrg extends CompletionOrg {
  bucket: string; // the CSV's own 17-way bucket, kept for the STIR-less fallback
}

function stat(name: string, list: { completion: number }[]): CompletionRegionStat {
  return {
    name,
    orgCount: list.length,
    avg: list.length ? list.reduce((s, o) => s + o.completion, 0) / list.length : 0,
    zeroCount: list.filter((o) => o.completion === 0).length,
    below50: list.filter((o) => o.completion < 0.5).length,
  };
}

/**
 * Orgs re-filed under the registry's top-level groups: the registry region of their STIR when it is
 * known (`regionOf`), otherwise their bucket folded by topRegion(). Region stats are recomputed;
 * the national figures do not change.
 */
export function regroup(
  snap: CompletionSnapshot,
  regionOf?: (stir: string) => string | undefined,
): CompletionSnapshot & { orgs: PlacedOrg[] } {
  const orgs: PlacedOrg[] = snap.orgs.map((o) => ({
    ...o,
    bucket: o.region,
    region: (o.stir && regionOf?.(o.stir)) || topRegion(o.region),
  }));
  const by = new Map<string, PlacedOrg[]>();
  for (const o of orgs) by.set(o.region, [...(by.get(o.region) ?? []), o]);
  const regions = [...by].map(([n, l]) => stat(n, l)).sort((a, b) => a.avg - b.avg);
  return { ...snap, orgs, regions };
}

/** A stored day folded the same way (counts summed, averages weighted by org count). */
export function regroupDay(e: CompletionManifestEntry): CompletionManifestEntry {
  const by = new Map<string, CompletionRegionStat>();
  for (const r of e.regions) {
    const n = topRegion(r.name);
    const cur = by.get(n);
    if (!cur) by.set(n, { ...r, name: n });
    else {
      const count = cur.orgCount + r.orgCount;
      by.set(n, {
        name: n,
        orgCount: count,
        avg: count ? (cur.avg * cur.orgCount + r.avg * r.orgCount) / count : 0,
        zeroCount: cur.zeroCount + r.zeroCount,
        below50: cur.below50 + r.below50,
      });
    }
  }
  return { ...e, regions: [...by.values()] };
}

// ------------------------------------------------------------------------------------ the tree

export interface CNode {
  count: number;
  avg: number; // 0..1
  zero: number;
  below50: number;
}

export interface COrg {
  name: string;
  stir: string | null;
  pct: number; // 0..1
  role?: TreeOrg["role"];
}

export interface CBlock extends CNode {
  name: string; // a region's canonical name, or "markaz" (SES structure)
  orgs: COrg[];
}

export interface CGroup extends CNode {
  name: string; // district / republican system; "" = organisations straight under the region
  orgs: COrg[];
  blocks?: CBlock[];
  /** Orgs whose STIR the registry does not have (or the CSV has no STIR). */
  unplaced?: boolean;
}

export interface CRegion extends CNode {
  name: string;
  groups: CGroup[];
}

function node(orgs: COrg[]): CNode {
  return {
    count: orgs.length,
    avg: orgs.length ? orgs.reduce((s, o) => s + o.pct, 0) / orgs.length : 0,
    zero: orgs.filter((o) => o.pct === 0).length,
    below50: orgs.filter((o) => o.pct < 0.5).length,
  };
}

/**
 * The registry tree (lib/argos-live-view buildTree output) filled with completion figures: an
 * organisation appears where its STIR sits in the registry, once (rows sharing a STIR take it at the
 * first). Orgs the registry cannot place stay under their region as «unplaced». Without a registry,
 * or with a STIR-less CSV, the tree is region → republican bucket → organisations.
 */
export function completionTree(orgs: PlacedOrg[], registry?: TreeRegion[]): CRegion[] {
  const byStir = new Map<string, PlacedOrg>();
  for (const o of orgs) if (o.stir && !byStir.has(o.stir)) byStir.set(o.stir, o);
  const used = new Set<PlacedOrg>();
  const out = new Map<string, CGroup[]>();

  if (registry && byStir.size) {
    for (const r of registry) {
      const groups: CGroup[] = [];
      for (const g of r.groups) {
        const take = (list: TreeOrg[]) => {
          const res: COrg[] = [];
          for (const t of list) {
            const c = t.stir ? byStir.get(t.stir) : undefined;
            if (!c || used.has(c)) continue;
            used.add(c);
            res.push({ name: t.name, stir: t.stir, pct: c.completion, ...(t.role ? { role: t.role } : {}) });
          }
          return res;
        };
        if (g.blocks) {
          const blocks = g.blocks.map((b) => ({ name: b.name, orgs: take(b.orgs) })).filter((b) => b.orgs.length);
          const all = blocks.flatMap((b) => b.orgs);
          if (all.length) groups.push({ name: g.name, ...node(all), orgs: all, blocks: blocks.map((b) => ({ ...b, ...node(b.orgs) })) });
        } else {
          const list = take(g.orgs);
          if (list.length) groups.push({ name: g.name, ...node(list), orgs: list });
        }
      }
      out.set(r.name, groups);
    }
  }

  // Everything the registry did not place: by region, then (republican) by the CSV's bucket.
  const rest = new Map<string, Map<string, COrg[]>>();
  for (const o of orgs) {
    if (used.has(o)) continue;
    const key = o.region === REPUBLIC && o.bucket !== REPUBLIC ? o.bucket : "";
    const m = rest.get(o.region) ?? new Map<string, COrg[]>();
    m.set(key, [...(m.get(key) ?? []), { name: o.name, stir: o.stir ?? null, pct: o.completion }]);
    rest.set(o.region, m);
  }
  const placed = out.size > 0;
  for (const [region, m] of rest) {
    const groups = out.get(region) ?? [];
    for (const [key, list] of m) groups.push({ name: key, ...node(list), orgs: list, ...(placed ? { unplaced: true } : {}) });
    out.set(region, groups);
  }

  // registry order first (republic, then the regions), then anything else
  const order = registry ? registry.map((r) => r.name) : [];
  const names = [...out.keys()].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib) || (a === REPUBLIC ? -1 : b === REPUBLIC ? 1 : 0);
  });
  return names
    .map((name) => {
      const groups = out.get(name)!.filter((g) => g.count > 0);
      return { name, ...node(groups.flatMap((g) => g.orgs)), groups };
    })
    .filter((r) => r.count > 0);
}
