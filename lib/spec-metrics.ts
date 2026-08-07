// Types and pure derivations for the per-specialty dataset
// (data/mutaxassislik-*.json). Same split as tarkib-metrics: no JSON import
// here so node --test can exercise these against readFileSync-loaded data.

/**
 * One region's values for one specialty:
 * [shtat, band, jismoniy, bosh, pens, yaqin, dekret].
 * jismoniy comes from the штат sheet (trustworthy even where the таҳлил row is
 * broken); pens/yaqin/dekret are null where the таҳлил row failed validation.
 */
export type SpecVals = [
  number,
  number,
  number,
  number,
  number | null,
  number | null,
  number | null,
];

export interface SpecCat {
  slug: string;
  /** Display name, Uzbek Cyrillic (transliterated from the workbook). */
  name: string;
  /** Original workbook spelling (Latin) — kept so search matches both. */
  src: string;
  grp: "vrach" | "notibbiy" | "orta" | "farm" | "kichik" | "boshqa";
  /** True for the group-total rows (Врачлар жами, Жами ўрта тиббий). */
  agg: boolean;
  nat: SpecVals;
  /** Aligned with SpecData.regionOrder. */
  r: SpecVals[];
}

export interface SpecData {
  date: string;
  regionOrder: string[];
  cats: SpecCat[];
}

export const SV = {
  shtat: 0,
  band: 1,
  jismoniy: 2,
  bosh: 3,
  pens: 4,
  yaqin: 5,
  dekret: 6,
} as const;

export function specTaminl(v: SpecVals): number {
  return v[SV.shtat] > 0 ? v[SV.jismoniy] / v[SV.shtat] : 0;
}

export function specGap(v: SpecVals): number {
  return v[SV.shtat] - v[SV.jismoniy];
}

export function specKoef(v: SpecVals): number {
  return v[SV.jismoniy] > 0 ? v[SV.band] / v[SV.jismoniy] : 0;
}

/** Pension share of the working headcount; null where the source row is broken. */
export function specPensShare(v: SpecVals): number | null {
  const pens = v[SV.pens];
  if (pens === null || v[SV.jismoniy] <= 0) return null;
  return pens / v[SV.jismoniy];
}

/** 5-year exposure (pension-age + reaching); null where unknown. */
export function specR5Share(v: SpecVals): number | null {
  const pens = v[SV.pens];
  const yaqin = v[SV.yaqin];
  if (pens === null || yaqin === null || v[SV.jismoniy] <= 0) return null;
  return (pens + yaqin) / v[SV.jismoniy];
}
