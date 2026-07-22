// Server-side read API for the dashboard. Always returns something: uploaded
// data when available (Blob/local), otherwise the committed seed. Never throws.

import seedSnapshotJson from "@/data/seed-snapshot.json";
import seedRegistryJson from "@/data/registry.json";
import type { ManifestEntry, Registry, Snapshot } from "./types";
import { getManifest, getRegistryRef, getSnapshotByRef } from "./store";

const seedSnapshot = seedSnapshotJson as unknown as Snapshot;
const seedRegistry = seedRegistryJson as unknown as Registry;

export interface DashboardData {
  snapshot: Snapshot;
  isSeed: boolean; // true when showing the built-in seed (no uploads yet)
}

export async function getLatestSnapshot(): Promise<DashboardData> {
  try {
    const manifest = await getManifest();
    if (manifest?.latestUrl) {
      const snap = await getSnapshotByRef(manifest.latestUrl);
      if (snap) return { snapshot: snap, isSeed: false };
    }
  } catch {
    /* fall through to seed */
  }
  return { snapshot: seedSnapshot, isSeed: true };
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

export async function getHistory(): Promise<ManifestEntry[]> {
  try {
    const manifest = await getManifest();
    if (manifest?.snapshots?.length) return manifest.snapshots;
  } catch {
    /* fall through */
  }
  // No uploads yet — a single point from the seed so the trend page still renders.
  return [
    {
      date: seedSnapshot.date,
      uploadedAt: seedSnapshot.uploadedAt,
      url: "seed",
      totals: seedSnapshot.totals,
      regions: seedSnapshot.regions,
    },
  ];
}
