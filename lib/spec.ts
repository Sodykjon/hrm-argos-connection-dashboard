// The per-specialty dataset: every lavozim category (237) from the 14 regional
// «Кадр 03.08.2026» workbooks, viloyat-level, regenerated offline together with
// data/tarkib-*.json. «Жами лавозимлар» is excluded (its summary row is broken
// in every file); the two group totals are kept and flagged `agg`.

import raw from "@/data/mutaxassislik-2026-08-03.json";
import type { SpecData } from "./spec-metrics";

export type { SpecVals, SpecCat, SpecData } from "./spec-metrics";
export {
  SV,
  specTaminl,
  specGap,
  specKoef,
  specPensShare,
  specR5Share,
} from "./spec-metrics";

export const SPEC = raw as unknown as SpecData;
