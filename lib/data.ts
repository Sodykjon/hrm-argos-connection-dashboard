// Server-side read API for the dashboard. Always returns something: uploaded
// data when available (Blob/local), otherwise the committed seed. Never throws.

import seedSnapshotJson from "@/data/seed-snapshot.json";
import seedRegistryJson from "@/data/registry.json";
import seedCompletionJson from "@/data/seed-completion.json";
import seedKadrlarJson from "@/data/seed-kadrlar.json";
import type {
  CompletionManifestEntry,
  CompletionSnapshot,
  ManifestEntry,
  KadrlarManifestEntry,
  KadrlarSnapshot,
  Registry,
  Snapshot,
} from "./types";
import {
  getCompletionByRef,
  getCompletionManifest,
  getManifest,
  getKadrlarByRef,
  getKadrlarManifest,
  getRegistryRef,
  getSnapshotByRef,
} from "./store";
import { getLiveManifest, tashkentDate } from "./store";
import { getLive, type LiveData } from "./argos-live-data";

const seedSnapshot = seedSnapshotJson as unknown as Snapshot;
const seedRegistry = seedRegistryJson as unknown as Registry;
const seedCompletion = seedCompletionJson as unknown as CompletionSnapshot;
const seedKadrlar = seedKadrlarJson as unknown as KadrlarSnapshot;

export interface DashboardData {
  snapshot: Snapshot;
  isSeed: boolean; // true when showing the built-in seed (no uploads yet)
  source: "live" | "upload" | "seed";
}

/**
 * The connection pages now follow the live ARGOS tree (/argos-jonli) whenever
 * the user's browser has pushed one; the uploaded report is the fallback.
 */
function liveSnapshot(live: LiveData): Snapshot {
  const at = live.manifest?.checkedAt ?? live.tree.at;
  const { totals, regions, orgs } = live.result;
  return {
    date: tashkentDate(at),
    uploadedAt: at,
    totals: { ...totals },
    regions: regions.map((r) => ({
      name: r.name,
      total: r.total,
      ulangan: r.ulangan,
      ulanmagan: r.ulanmagan,
      ochirilgan: r.ochirilgan,
      percent: r.percent,
    })),
    orgs: orgs.map((o) => ({
      region: o.region,
      name: o.name,
      stir: o.stir ?? "",
      status: o.status,
      contract: o.contract ?? "",
    })),
  };
}

export async function getLatestSnapshot(): Promise<DashboardData> {
  try {
    const live = await getLive();
    if (live) return { snapshot: liveSnapshot(live), isSeed: false, source: "live" };
  } catch {
    /* fall through to the uploaded report */
  }
  try {
    const manifest = await getManifest();
    if (manifest?.latestUrl) {
      const snap = await getSnapshotByRef(manifest.latestUrl);
      if (snap) return { snapshot: snap, isSeed: false, source: "upload" };
    }
  } catch {
    /* fall through to seed */
  }
  return { snapshot: seedSnapshot, isSeed: true, source: "seed" };
}

export async function getRegistry(): Promise<Registry> {
  try {
    const manifest = await getManifest();
    if (manifest?.registryUrl) {
      const reg = await getRegistryRef(manifest.registryUrl);
      if (reg) return reg;
    }
  } catch {
    /* fall through to seed */
  }
  return seedRegistry;
}

async function uploadHistory(): Promise<ManifestEntry[]> {
  const seedEntry: ManifestEntry = {
    date: seedSnapshot.date,
    uploadedAt: seedSnapshot.uploadedAt,
    url: "seed",
    totals: seedSnapshot.totals,
    regions: seedSnapshot.regions,
  };
  try {
    const manifest = await getManifest();
    if (manifest?.snapshots?.length) {
      // The pre-migration trend history was lost with the suspended Blob
      // store. The bundled launch report (02.07.2026, 66.9%) is the one
      // surviving record from before the gap, so it is merged back in — a
      // real report, not an estimate. Only an upload for that SAME date
      // replaces it: an older upload (the user has since backfilled a
      // January report) must not suppress it, or the trend loses the very
      // point that separates the flat months from the July climb.
      const covered = manifest.snapshots.some((s) => s.date === seedEntry.date);
      const merged = covered
        ? [...manifest.snapshots]
        : [...manifest.snapshots, seedEntry];
      return merged.sort((a, b) => a.date.localeCompare(b.date));
    }
  } catch {
    /* fall through */
  }
  // No uploads yet — the seed alone so the trend page still renders.
  return [seedEntry];
}

/**
 * Trend = uploaded reports + one live point per day (the day's last ARGOS push);
 * a live point replaces an upload of the same date, and today's point is
 * recomputed from the current tree + registry so manual corrections show at once.
 */
export async function getHistory(): Promise<ManifestEntry[]> {
  const base = await uploadHistory();
  let liveEntries: ManifestEntry[] = [];
  try {
    const m = await getLiveManifest();
    liveEntries = (m?.history ?? []).map((h) => {
      const pct = (u: number, t: number) => (t ? u / t : 0);
      return {
        date: h.date ?? tashkentDate(h.at),
        uploadedAt: h.at,
        url: "live",
        totals: {
          total: h.total,
          ulangan: h.ulangan,
          ulanmagan: h.ulanmagan,
          ochirilgan: h.ochirilgan,
          percent: pct(h.ulangan, h.total),
        },
        regions: h.regions.map((r) => ({
          name: r.name,
          total: r.total,
          ulangan: r.ulangan,
          ulanmagan: r.ulanmagan ?? 0,
          ochirilgan: r.ochirilgan ?? 0,
          percent: pct(r.ulangan, r.total),
        })),
      };
    });
    const live = await getLive();
    if (live) {
      const snap = liveSnapshot(live);
      liveEntries = [
        ...liveEntries.filter((e) => e.date !== snap.date),
        { date: snap.date, uploadedAt: snap.uploadedAt, url: "live", totals: snap.totals, regions: snap.regions },
      ];
    }
  } catch {
    /* live history is optional */
  }
  const liveDates = new Set(liveEntries.map((e) => e.date));
  return [...base.filter((e) => !liveDates.has(e.date)), ...liveEntries].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

// --- completion ("Тўлдирилиш даражаси") -------------------------------------

export interface CompletionData {
  snapshot: CompletionSnapshot;
  isSeed: boolean;
}

export async function getLatestCompletion(): Promise<CompletionData> {
  try {
    const manifest = await getCompletionManifest();
    if (manifest?.latestUrl) {
      const snap = await getCompletionByRef(manifest.latestUrl);
      if (snap) return { snapshot: snap, isSeed: false };
    }
  } catch {
    /* fall through to seed */
  }
  return { snapshot: seedCompletion, isSeed: true };
}

export async function getCompletionHistory(): Promise<CompletionManifestEntry[]> {
  try {
    const manifest = await getCompletionManifest();
    if (manifest?.snapshots?.length) return manifest.snapshots;
  } catch {
    /* fall through */
  }
  return [
    {
      date: seedCompletion.date,
      uploadedAt: seedCompletion.uploadedAt,
      url: "seed",
      overall: seedCompletion.overall,
      regions: seedCompletion.regions,
    },
  ];
}

// --- kadrlar ("Кадрлар") ---------------------------------------------

export interface KadrlarData {
  snapshot: KadrlarSnapshot;
  isSeed: boolean;
}

export async function getLatestKadrlar(): Promise<KadrlarData> {
  try {
    const manifest = await getKadrlarManifest();
    if (manifest?.latestUrl) {
      const snap = await getKadrlarByRef(manifest.latestUrl);
      if (snap) return { snapshot: snap, isSeed: false };
    }
  } catch {
    /* fall through to seed */
  }
  return { snapshot: seedKadrlar, isSeed: true };
}

export async function getKadrlarHistory(): Promise<KadrlarManifestEntry[]> {
  try {
    const manifest = await getKadrlarManifest();
    if (manifest?.snapshots?.length) return manifest.snapshots;
  } catch {
    /* fall through */
  }
  return [
    {
      date: seedKadrlar.date,
      uploadedAt: seedKadrlar.uploadedAt,
      url: "seed",
      overall: seedKadrlar.overall,
      regions: seedKadrlar.regions,
    },
  ];
}
