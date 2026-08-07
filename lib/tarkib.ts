// The «Кадрлар таркиби» dataset: a deep staffing snapshot computed from the 14
// regional «Кадр 03.08.2026» штат/таҳлил workbooks — NOT from the ARGOS
// statistics constructor that feeds KadrlarSnapshot. The two disagree on
// coverage and must not be mixed: this file's numbers were re-derived from the
// raw workbooks because the workbooks' own summary rows are broken (their
// «кадрлар билан таъминланиш» column divides by occupied stavka, not by штат).
//
// The JSON is regenerated offline from the source workbooks; every regional
// aggregate reconciles to its district rows and the national row to the 14
// regions with zero drift (see tests/tarkib.test.ts).

import raw from "@/data/tarkib-2026-08-03.json";
import type { TarkibData } from "./tarkib-metrics";

export type {
  TarkibCat,
  TarkibDistrict,
  TarkibGap,
  TarkibVrach,
  TarkibRegion,
  TarkibData,
} from "./tarkib-metrics";
export {
  taminlShare,
  vakShare,
  vrachTaminlShare,
  vrachHidden,
  risk5Share,
  vrachRisk5Share,
  koef,
} from "./tarkib-metrics";

export const TARKIB = raw as unknown as TarkibData;
