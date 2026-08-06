// Derived vacancy figures. Kept out of the components because the denominator
// below is a claim, and the wrong one still looks plausible.

import type { KadrlarStat } from "./types";

export interface VacancyMetrics {
  /** Иш ўринлари — the establishment, filled or not. */
  stavka: number;
  /** Амалдаги ходимлар. */
  filled: number;
  vacant: number;
  /** vacant / stavka, 0..1. */
  rate: number;
  accepted: number;
  dismissed: number;
  /** Hires minus departures over the reporting period. */
  net: number;
}

export function vacancyMetrics(s: KadrlarStat): VacancyMetrics {
  const stavka = Math.max(0, s.stavka);
  const vacant = Math.max(0, s.vacant);
  // Over the ESTABLISHMENT, not over filled posts. Nationally that is
  // 26 048 / 715 137 = 3.64 %; dividing by the 689 089 people actually in post
  // gives 3.78 %, which answers a question nobody asked and reads identically.
  //
  // Clamped to [0,1] because upstream drift can deliver vacant > stavka, and a
  // share outside that range would be silently clamped later by riskT instead.
  const rate = stavka > 0 ? Math.min(1, vacant / stavka) : 0;
  return {
    stavka,
    filled: Math.max(0, s.total),
    vacant,
    rate,
    accepted: Math.max(0, s.accepted),
    dismissed: Math.max(0, s.dismissed),
    net: s.accepted - s.dismissed,
  };
}
