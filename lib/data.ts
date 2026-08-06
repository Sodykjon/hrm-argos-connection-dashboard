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

const seedSnapshot = seedSnapshotJson as unknown as Snapshot;
const seedRegistry = seedRegistryJson as unknown as Registry;
const seedCompletion = seedCompletionJson as unknown as CompletionSnapshot;
const seedKadrlar = seedKadrlarJson as unknown as KadrlarSnapshot;

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
