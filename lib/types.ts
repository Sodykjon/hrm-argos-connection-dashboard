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
