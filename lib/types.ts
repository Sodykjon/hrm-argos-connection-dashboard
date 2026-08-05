// Core data shapes shared by the parser, storage layer, and UI.

export type Status = "ulangan" | "ulanmagan" | "ochirilgan";

export interface Org {
  region: string; // Cyrillic region name, exactly as in the ARGOS report
  name: string;
  stir: string; // 9-digit tax id (join key to the registry)
  status: Status;
  contract: string;
}

export interface RegionStat {
  name: string;
  total: number;
  ulangan: number;
  ulanmagan: number;
  ochirilgan: number;
  percent: number; // ulangan / total  (ARGOS formula)
}

export interface Totals {
  total: number;
  ulangan: number;
  ulanmagan: number;
  ochirilgan: number;
  percent: number;
}

export interface Snapshot {
  date: string; // ISO date of the report, e.g. "2026-07-02"
  uploadedAt: string; // ISO timestamp the snapshot entered the system
  totals: Totals;
  regions: RegionStat[];
  orgs: Org[];
}

// A registry entry keyed by STIR — used to enrich the "ulanmaganlar" list.
export interface RegistryEntry {
  name?: string;
  rahbar?: string;
  manzil?: string;
  email?: string;
  tel?: string;
  mhobt?: string;
  tulov?: string; // to'lov % (bonus metric from directory ИНН)
}

export type Registry = Record<string, RegistryEntry>;

// Lightweight per-snapshot record kept in the manifest for the trend page
// (no per-org data — keeps the manifest small).
export interface ManifestEntry {
  date: string;
  uploadedAt: string;
  url: string; // location of the full snapshot json
  totals: Totals;
  regions: RegionStat[];
}

export interface Manifest {
  latestUrl: string;
  registryUrl?: string;
  snapshots: ManifestEntry[]; // chronological (oldest → newest)
}

// ---------------------------------------------------------------------------
// Data-completion ("Тўлдирилиш даражаси") — a SEPARATE daily statistic sourced
// from hrm.argos.uz CompletionRateByOrg, ingested via CSV upload. Fully
// decoupled from the connection data above (different population, own key, own
// manifest). All percentages are fractions 0..1, matching fmtPct/rampColor.
// ---------------------------------------------------------------------------

export interface CompletionOrg {
  region: string; // canonical Cyrillic region name (lib/regions.ts key)
  name: string;
  id: string; // institutionId from ARGOS (its own key space, NOT the STIR)
  orgType?: string;
  completion: number; // 0..1
}

export interface CompletionRegionStat {
  name: string;
  orgCount: number;
  avg: number; // mean of member completion, 0..1
  zeroCount: number; // orgs at exactly 0%
  below50: number; // orgs strictly below 50%
}

export interface CompletionOverall {
  orgCount: number;
  avg: number; // 0..1
  zeroCount: number;
  below50: number;
}

export interface CompletionSnapshot {
  date: string; // ISO date of the report, e.g. "2026-07-24"
  uploadedAt: string; // ISO timestamp the snapshot entered the system
  overall: CompletionOverall;
  regions: CompletionRegionStat[];
  orgs: CompletionOrg[];
}

// Lightweight per-day record for the completion trend (no per-org payload).
export interface CompletionManifestEntry {
  date: string;
  uploadedAt: string;
  url: string;
  overall: CompletionOverall;
  regions: CompletionRegionStat[];
}

export interface CompletionManifest {
  latestUrl: string;
  snapshots: CompletionManifestEntry[]; // chronological (oldest → newest)
}

// ---------------------------------------------------------------------------
// Pension age ("Пенсия ёши") — a THIRD statistic sourced from the hrm.argos.uz
// report GetAllEmployeeDistributionBySeniority, ingested via CSV upload. Fully
// decoupled from the two datasets above (own keys, own manifest, own pages).
// All figures are integer head-counts; shares are derived at render time.
// ---------------------------------------------------------------------------

export interface PensionStat {
  name: string; // canonical Cyrillic region name; "" for the national row
  total: number;
  totalWomen: number;
  a3040: number;
  a3040Women: number;
  a4050: number;
  a4050Women: number;
  a5060: number;
  a5060Women: number;
  a60p: number;
  a60pWomen: number;
  /** Already at pension age and still working. */
  pensionWorking: number;
  pensionWorkingWomen: number;
  /** Reaches pension age during the current year. */
  reaching: number;
  reachingWomen: number;
}

export interface PensionSnapshot {
  date: string; // ISO date of the report, e.g. "2026-08-05"
  uploadedAt: string; // ISO timestamp the snapshot entered the system
  overall: PensionStat; // national
  regions: PensionStat[]; // 14 geographic + 1 residual; [] when only national
}

// A snapshot is ~15 rows, so the manifest carries every field inline and the
// trend needs no separate payload.
export interface PensionManifestEntry {
  date: string;
  uploadedAt: string;
  url: string;
  overall: PensionStat;
  regions: PensionStat[];
}

export interface PensionManifest {
  latestUrl: string;
  snapshots: PensionManifestEntry[]; // chronological (oldest → newest)
}
