// Types and pure derivations for the «Кадрлар таркиби» dataset. No JSON
// import here on purpose: node --test resolves no "@/" alias, so the tests
// exercise these functions against the raw file read with readFileSync —
// the same split pension-metrics uses.

export interface TarkibCat {
  /** i18n key into S.tarkib.cat — labels are translated, data stays numeric. */
  key: string;
  shtat: number;
  bosh: number;
  jismoniy: number;
  band: number;
  dekret: number;
}

export interface TarkibDistrict {
  /** Display name (Uzbek Cyrillic), transliterated from the workbook. */
  name: string;
  shtat: number;
  bosh: number;
  jismoniy: number;
  pens: number;
  /** 5-year pension exposure, already in percent (e.g. 15.3). */
  r5: number;
  /** hired − left over the reporting year. */
  sof: number;
  /** Doctor coverage, already in percent. */
  vrachTaminl: number;
}

export interface TarkibGap {
  name: string;
  shtat: number;
  jismoniy: number;
  gap: number;
  /** Moonlighting coefficient (band ÷ jismoniy); 0 where not meaningful. */
  koef: number;
  pens: number;
}

export interface TarkibVrach {
  shtat: number;
  bosh: number;
  jismoniy: number;
  band: number;
  pens: number;
  /** Estimated to reach pension age within ~5 years (half the 50–59 band). */
  yaqin: number;
}

export interface TarkibRegion {
  shtat: number;
  band: number;
  bosh: number;
  jismoniy: number;
  dekret: number;
  pens: number;
  yaqin: number;
  qabul: number;
  boshagan: number;
  ayol: number;
  erkak: number;
  fanD: number;
  fanN: number;
  vrach: TarkibVrach;
  cats: TarkibCat[];
  /** Age bands: [<30, 30–39, 40–49, 50–59, 60+]. */
  yosh: number[];
  /** Tenure bands: [0–4, 5–9, 10–19, 20+]. */
  staj: number[];
  /** Qualification: [олий, 1+2-тоифа, тоифасиз]. */
  toifa: number[];
  /** Empty on the national row. */
  districts: TarkibDistrict[];
  gaps: TarkibGap[];
}

export interface TarkibData {
  date: string;
  national: TarkibRegion;
  /** Keyed by the canonical Uzbek-Cyrillic region names from lib/regions. */
  regions: Record<string, TarkibRegion>;
}
// ------------------------------------------------------------ derived shares

/** Real coverage: physical people ÷ штат positions (can exceed 1). */
export function taminlShare(r: { jismoniy: number; shtat: number }): number {
  return r.shtat > 0 ? r.jismoniy / r.shtat : 0;
}

export function vakShare(r: { bosh: number; shtat: number }): number {
  return r.shtat > 0 ? r.bosh / r.shtat : 0;
}

export function vrachTaminlShare(r: TarkibRegion): number {
  return taminlShare(r.vrach);
}

/**
 * Stavka missing from the doctor штат but NOT shown as vacant — closed by
 * moonlighting instead. The workbooks' headline vacancy hides this entirely.
 */
export function vrachHidden(r: TarkibRegion): number {
  return Math.max(0, r.vrach.shtat - r.vrach.jismoniy - r.vrach.bosh);
}

/** Pension-age plus reaching within ~5 years, over today's workforce. */
export function risk5Share(r: { pens: number; yaqin: number; jismoniy: number }): number {
  return r.jismoniy > 0 ? (r.pens + r.yaqin) / r.jismoniy : 0;
}

export function vrachRisk5Share(r: TarkibRegion): number {
  return risk5Share(r.vrach);
}

/** Moonlighting coefficient: occupied stavka per physical person. */
export function koef(r: { band: number; jismoniy: number }): number {
  return r.jismoniy > 0 ? r.band / r.jismoniy : 0;
}
