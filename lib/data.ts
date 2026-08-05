// Server-side read API for the dashboard. Always returns something: uploaded
// data when available (Blob/local), otherwise the committed seed. Never throws.

import seedSnapshotJson from "@/data/seed-snapshot.json";
import seedRegistryJson from "@/data/registry.json";
import seedCompletionJson from "@/data/seed-completion.json";
import seedPensionJson from "@/data/seed-pension.json";
import type {
  CompletionManifestEntry,
  CompletionSnapshot,
  ManifestEntry,
  PensionManifestEntry,
  PensionSnapshot,
  Registry,
  Snapshot,
} from "./types";
import {
  getCompletionByRef,
  getCompletionManifest,
  getManifest,
  getPensionByRef,
  getPensionManifest,
  getRegistryRef,
  getSnapshotByRef,
} from "./store";

const seedSnapshot = seedSnapshotJson as unknown as Snapshot;
const seedRegistry = seedRegistryJson as unknown as Registry;
const seedCompletion = seedCompletionJson as unknown as CompletionSnapshot;
const seedPension = seedPensionJson as unknown as PensionSnapshot;

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

// --- pension age ("Пенсия ёши") ---------------------------------------------

export interface PensionData {
  snapshot: PensionSnapshot;
  isSeed: boolean;
}

export async function getLatestPension(): Promise<PensionData> {
  try {
    const manifest = await getPensionManifest();
    if (manifest?.latestUrl) {
      const snap = await getPensionByRef(manifest.latestUrl);
      if (snap) return { snapshot: snap, isSeed: false };
    }
  } catch {
    /* fall through to seed */
  }
  return { snapshot: seedPension, isSeed: true };
}

export async function getPensionHistory(): Promise<PensionManifestEntry[]> {
  try {
    const manifest = await getPensionManifest();
    if (manifest?.snapshots?.length) return manifest.snapshots;
  } catch {
    /* fall through */
  }
  return [
    {
      date: seedPension.date,
      uploadedAt: seedPension.uploadedAt,
      url: "seed",
      overall: seedPension.overall,
      regions: seedPension.regions,
    },
  ];
}
