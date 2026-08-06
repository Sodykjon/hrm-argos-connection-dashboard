// Everything the pension pages derive from a stored KadrlarStat. Kept out of
// the components because each function below is a claim the dashboard makes in
// front of the Minister, and each can be wrong in a way a screenshot hides.

import type { KadrlarStat } from "./types";
import { rampColor } from "./format.ts";

export interface PensionMetrics {
  /** Already past pension age, plus those reaching it this year. */
  exposed: number;
  exposedShare: number; // 0..1
  workingShare: number; // 0..1
  reachingShare: number; // 0..1
  /** Rounded denominator for the "one in N" phrasing; 0 when undefined. */
  oneIn: number;
  /** True when "one in N" overstates, so the copy must say "деярли". */
  nearly: boolean;
}

export function pensionMetrics(s: KadrlarStat): PensionMetrics {
  const exposed = s.pensionWorking + s.reaching;
  if (s.total <= 0 || exposed <= 0) {
    return {
      exposed: Math.max(0, exposed),
      exposedShare: 0,
      workingShare: 0,
      reachingShare: 0,
      oneIn: 0,
      nearly: false,
    };
  }
  const exposedShare = exposed / s.total;
  const oneIn = Math.round(1 / exposedShare);
  return {
    exposed,
    exposedShare,
    workingShare: s.pensionWorking / s.total,
    reachingShare: s.reaching / s.total,
    oneIn,
    // "one in 7" is 14.29%. If the real share is below that, saying it plainly
    // would overstate — hence the qualifier. Above it, the claim already
    // understates, which is the safe direction.
    nearly: oneIn > 0 && exposedShare < 1 / oneIn,
  };
}

export type AgeBandKey = "u30" | "a3040" | "a4050" | "a5060" | "a60p";

export interface AgeBand {
  key: AgeBandKey;
  total: number;
}

/**
 * Five bands straight from the source. The previous implementation recovered
 * the under-30 band by subtracting the other four from the total, because the
 * old report had no under-30 column. The constructor has `ageTo30`, so the band
 * is measured now rather than inferred.
 *
 * No gender: the constructor's age group carries none. The page makes its
 * gender claims from `totalWomen` and the two pension women counts instead.
 */
export function ageBands(s: KadrlarStat): AgeBand[] {
  const band = (key: AgeBandKey, total: number): AgeBand => ({
    key,
    // Upstream drift can still deliver a negative; it must not reach a chart.
    total: Math.max(0, total),
  });
  return [
    band("u30", s.u30),
    band("a3040", s.a3040),
    band("a4050", s.a4050),
    band("a5060", s.a5060),
    band("a60p", s.a60p),
  ];
}

export interface RiskRamp {
  min: number;
  max: number;
}

/**
 * Regional pension shares cluster in a narrow band, so an absolute 0–100 %
 * scale would render 14 identical squares. The ramp spans the observed spread
 * instead — which obliges the map to print its endpoints, exactly as the
 * connection choropleth's key does.
 */
export function riskRamp(shares: number[]): RiskRamp {
  if (shares.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...shares), max: Math.max(...shares) };
}

/** Position within the ramp: 1 = worst (highest share), 0 = best. */
export function riskT(share: number, ramp: RiskRamp): number {
  const span = ramp.max - ramp.min;
  if (span <= 0) return 0.5; // flat spread — no region is worse than another
  const t = (share - ramp.min) / span;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * rampColor() is green-at-high because connection and completion are
 * good-at-high. Pension exposure is bad-at-high, so the input is inverted —
 * without this the worst regions would be painted green.
 */
export function riskColor(t: number): string {
  return rampColor(1 - t);
}
