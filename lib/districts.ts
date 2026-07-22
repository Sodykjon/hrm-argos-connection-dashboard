// District-level (tuman) aggregation for the drill-down map. Each org is placed
// into a district via STIR -> SOATO (registry) -> geojson feature. Tashkent city
// is returned as a list (the free geojson is incomplete for the capital).
import stirSoatoJson from "@/data/stir-soato.json";
import soatoMetaJson from "@/data/soato-meta.json";
import type { Org } from "./types";

const stirSoato = stirSoatoJson as Record<string, string>;
const soatoMeta = soatoMetaJson as Record<
  string,
  { name: string; viloyat: string; feature: string | null }
>;

export const TASHKENT_CITY = "Тошкент шаҳри";

export interface DistrictStat {
  key: string; // geojson feature name (map) or soato (tashkent)
  label: string; // display name (Uzbek)
  ulangan: number;
  ulanmagan: number;
  ochirilgan: number;
  total: number;
  percent: number;
}

export interface DistrictData {
  byViloyat: Record<string, DistrictStat[]>; // feature-keyed, per viloyat
  tashkent: DistrictStat[]; // capital's districts (list)
  coveragePct: number; // share of orgs placed into a district
}

interface Acc {
  vil: string;
  label: string;
  ul: number;
  un: number;
  och: number;
  total: number;
}

export function computeDistricts(orgs: Org[]): DistrictData {
  const feat = new Map<string, Acc>();
  const tk = new Map<string, Acc>();
  let placed = 0;

  for (const o of orgs) {
    const soato = stirSoato[o.stir];
    if (!soato) continue;
    const m = soatoMeta[soato];
    if (!m) continue;
    placed++;
    const bump = (a: Acc) => {
      a.total++;
      if (o.status === "ulangan") a.ul++;
      else if (o.status === "ulanmagan") a.un++;
      else a.och++;
    };
    if (m.viloyat === TASHKENT_CITY) {
      const a =
        tk.get(soato) ?? { vil: m.viloyat, label: m.name || soato, ul: 0, un: 0, och: 0, total: 0 };
      bump(a);
      tk.set(soato, a);
    } else if (m.feature) {
      const a =
        feat.get(m.feature) ??
        { vil: m.viloyat, label: m.name || m.feature, ul: 0, un: 0, och: 0, total: 0 };
      bump(a);
      feat.set(m.feature, a);
    }
  }

  const toStat = (key: string, a: Acc): DistrictStat => ({
    key,
    label: a.label,
    ulangan: a.ul,
    ulanmagan: a.un,
    ochirilgan: a.och,
    total: a.total,
    percent: a.total ? a.ul / a.total : 0,
  });

  const byViloyat: Record<string, DistrictStat[]> = {};
  for (const [name, a] of feat) (byViloyat[a.vil] ??= []).push(toStat(name, a));
  for (const v in byViloyat) byViloyat[v].sort((x, y) => x.percent - y.percent);

  const tashkent = [...tk.entries()]
    .map(([s, a]) => toStat(s, a))
    .sort((x, y) => x.percent - y.percent);

  return { byViloyat, tashkent, coveragePct: orgs.length ? placed / orgs.length : 0 };
}
