// Persistence for uploaded snapshots.
//
// Backends, chosen at runtime:
//   • Upstash Redis (KV) — when KV_REST_API_URL/KV_REST_API_TOKEN (Vercel KV
//     naming) or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN is set. Shared
//     across all viewers. This is what production uses.
//   • Local .data/ files — dev fallback so the upload loop is testable without a
//     store. (Vercel's filesystem is read-only, so prod always needs the KV.)
//
// If neither yields a manifest, the read layer (data.ts) falls back to the seed.
//
// Only the *latest* full snapshot per dataset is stored, under one fixed key;
// the trend/history lives inline in the manifest. There is no per-day
// accumulation, so nothing to prune and storage stays tiny.

import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  CompletionManifest,
  CompletionManifestEntry,
  CompletionSnapshot,
  Manifest,
  ManifestEntry,
  KadrlarManifest,
  KadrlarManifestEntry,
  KadrlarSnapshot,
  Registry,
  Snapshot,
} from "./types";
import type { TreeSnapshot } from "./argos-live";

const KV_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function hasStore(): boolean {
  return !!KV_URL && !!KV_TOKEN;
}
// Back-compat name still imported by the upload/completion routes.
export const hasBlob = hasStore;

const LOCAL_DIR = path.join(process.cwd(), ".data");

// Fixed keys — one manifest + one latest snapshot per dataset.
const K = {
  manifest: "manifest",
  snapshot: "snapshot:latest",
  registry: "registry",
  compManifest: "completion:manifest",
  compSnapshot: "completion:snapshot:latest",
  kadrManifest: "kadrlar:manifest",
  kadrSnapshot: "kadrlar:snapshot:latest",
  liveTree: "argoslive:tree:latest",
  livePrev: "argoslive:tree:prev",
  liveManifest: "argoslive:manifest",
} as const;

// ---------------------------------------------------------------- redis client

type RedisClient = import("@upstash/redis").Redis;
let _redis: RedisClient | null = null;
async function redis(): Promise<RedisClient> {
  if (!_redis) {
    const { Redis } = await import("@upstash/redis");
    _redis = new Redis({ url: KV_URL as string, token: KV_TOKEN as string });
  }
  return _redis;
}

// ---------------------------------------------------------------- read / write

function localPath(key: string): string {
  return path.join(LOCAL_DIR, `${key.replace(/:/g, "_")}.json`);
}

async function readKey<T>(key: string): Promise<T | null> {
  if (hasStore()) {
    try {
      const r = await redis();
      return (await r.get<T>(key)) ?? null;
    } catch {
      return null;
    }
  }
  try {
    const raw = await fs.readFile(localPath(key), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeKey(key: string, data: unknown): Promise<void> {
  if (hasStore()) {
    const r = await redis();
    await r.set(key, data); // @upstash/redis serializes objects to JSON
    return;
  }
  const full = localPath(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data), "utf-8");
}

// ------------------------------------------------------------------- read API

// Per-request memo (React cache): collapses the several getManifest() calls in a
// single page render into ONE KV read, without caching across requests — so a
// fresh upload is visible on the very next request, with no stale window. KV
// reads are cheap, so there is no reason for a longer-lived cache.
export const getManifest = cache(
  async (): Promise<Manifest | null> => readKey<Manifest>(K.manifest),
);

export async function getSnapshotByRef(ref: string): Promise<Snapshot | null> {
  return readKey<Snapshot>(ref);
}

export async function getRegistryRef(ref: string): Promise<Registry | null> {
  return readKey<Registry>(ref);
}

export const getCompletionManifest = cache(
  async (): Promise<CompletionManifest | null> =>
    readKey<CompletionManifest>(K.compManifest),
);

export async function getCompletionByRef(
  ref: string,
): Promise<CompletionSnapshot | null> {
  return readKey<CompletionSnapshot>(ref);
}

export const getKadrlarManifest = cache(
  async (): Promise<KadrlarManifest | null> =>
    readKey<KadrlarManifest>(K.kadrManifest),
);

export async function getKadrlarByRef(
  ref: string,
): Promise<KadrlarSnapshot | null> {
  return readKey<KadrlarSnapshot>(ref);
}

// ------------------------------------------------------------------ write API

export interface PutResult {
  snapshots: number;
  registryUpdated: boolean;
}

/**
 * Persist a new snapshot (and optionally a fresh registry), then update the
 * manifest. Re-uploading the same report date replaces that trend point. Only
 * the newest-by-date snapshot's full data is retained as "latest".
 */
export async function publish(
  snapshot: Snapshot,
  registry?: Registry | null,
): Promise<PutResult> {
  const manifest = (await getManifest()) ?? { latestUrl: "", snapshots: [] };

  const entry: ManifestEntry = {
    date: snapshot.date,
    uploadedAt: snapshot.uploadedAt,
    url: K.snapshot,
    totals: snapshot.totals,
    regions: snapshot.regions,
  };
  const kept = manifest.snapshots.filter((s) => s.date !== snapshot.date);
  const snapshots = [...kept, entry].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const newestDate = snapshots[snapshots.length - 1].date;

  // Store the full latest snapshot only when this upload is the newest date, so
  // backfilling an older report never replaces the current dashboard data.
  if (snapshot.date === newestDate) {
    await writeKey(K.snapshot, snapshot);
  }

  let registryUpdated = false;
  if (registry && Object.keys(registry).length > 0) {
    await writeKey(K.registry, registry);
    registryUpdated = true;
  }
  const registryUrl = registryUpdated ? K.registry : manifest.registryUrl;

  const next: Manifest = { latestUrl: K.snapshot, registryUrl, snapshots };
  await writeKey(K.manifest, next);

  return { snapshots: snapshots.length, registryUpdated };
}

export interface CompletionPutResult {
  snapshots: number;
}

/**
 * Persist a new completion snapshot and update the completion manifest. Fully
 * independent of publish() — uses its own keys.
 */
export async function publishCompletion(
  snapshot: CompletionSnapshot,
): Promise<CompletionPutResult> {
  const manifest = (await getCompletionManifest()) ?? {
    latestUrl: "",
    snapshots: [],
  };

  const entry: CompletionManifestEntry = {
    date: snapshot.date,
    uploadedAt: snapshot.uploadedAt,
    url: K.compSnapshot,
    overall: snapshot.overall,
    regions: snapshot.regions,
  };
  const kept = manifest.snapshots.filter((s) => s.date !== snapshot.date);
  const snapshots = [...kept, entry].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const newestDate = snapshots[snapshots.length - 1].date;

  if (snapshot.date === newestDate) {
    await writeKey(K.compSnapshot, snapshot);
  }

  const next: CompletionManifest = { latestUrl: K.compSnapshot, snapshots };
  await writeKey(K.compManifest, next);

  return { snapshots: snapshots.length };
}

export interface KadrlarPutResult {
  snapshots: number;
}

/**
 * Persist a new kadrlar snapshot and update its manifest. Independent of
 * publish() and publishCompletion() — own keys, own manifest.
 */
export async function publishKadrlar(
  snapshot: KadrlarSnapshot,
): Promise<KadrlarPutResult> {
  const manifest = (await getKadrlarManifest()) ?? {
    latestUrl: "",
    snapshots: [],
  };

  const entry: KadrlarManifestEntry = {
    date: snapshot.date,
    uploadedAt: snapshot.uploadedAt,
    url: K.kadrSnapshot,
    overall: snapshot.overall,
    regions: snapshot.regions,
  };
  const kept = manifest.snapshots.filter((s) => s.date !== snapshot.date);
  const snapshots = [...kept, entry].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const newestDate = snapshots[snapshots.length - 1].date;

  // Backfilling an older report must never replace the current dashboard data.
  if (snapshot.date === newestDate) {
    await writeKey(K.kadrSnapshot, snapshot);
  }

  const next: KadrlarManifest = { latestUrl: K.kadrSnapshot, snapshots };
  await writeKey(K.kadrManifest, next);

  return { snapshots: snapshots.length };
}

// ------------------------------------------------------------ ARGOS жонли

/**
 * The ARGOS org-tree snapshots pushed from the user's browser (/argos-jonli).
 * `latest` is the newest tree whose *content* changed; `prev` the one before it
 * (for «what changed»). `history` keeps ONE summary per Tashkent calendar day —
 * the day's last push — so a bookmarklet polling every 10 minutes neither grows
 * it nor leaves a day's point stale.
 */
export interface LiveSummary {
  at: string;
  date: string; // YYYY-MM-DD, Tashkent
  fingerprint: string;
  total: number;
  ulangan: number;
  ulanmagan: number;
  ochirilgan: number;
  regions: { name: string; total: number; ulangan: number; ulanmagan?: number; ochirilgan?: number }[];
}

export interface LiveManifest {
  checkedAt: string; // last push, changed or not
  fingerprint: string;
  history: LiveSummary[]; // one entry per day, oldest first
}

const LIVE_HISTORY_MAX = 800;

export const getLiveManifest = cache(
  async (): Promise<LiveManifest | null> => readKey<LiveManifest>(K.liveManifest),
);

export async function getLiveTree(): Promise<TreeSnapshot | null> {
  return readKey<TreeSnapshot>(K.liveTree);
}

export async function getLivePrevTree(): Promise<TreeSnapshot | null> {
  return readKey<TreeSnapshot>(K.livePrev);
}

export async function publishLiveTree(
  tree: TreeSnapshot,
  summary: LiveSummary,
): Promise<{ changed: boolean; history: number }> {
  const m = (await readKey<LiveManifest>(K.liveManifest)) ?? {
    checkedAt: "",
    fingerprint: "",
    history: [],
  };
  const changed = summary.fingerprint !== m.fingerprint;
  if (changed) {
    const cur = await readKey<TreeSnapshot>(K.liveTree);
    if (cur) await writeKey(K.livePrev, cur);
    await writeKey(K.liveTree, tree);
    m.fingerprint = summary.fingerprint;
  }
  // Older entries (before per-day keeping) have no `date`: derive it.
  const day = (x: LiveSummary) => x.date ?? tashkentDate(x.at);
  m.history = [...m.history.filter((x) => day(x) !== summary.date), summary]
    .sort((a, b) => day(a).localeCompare(day(b)))
    .slice(-LIVE_HISTORY_MAX);
  m.checkedAt = tree.at;
  await writeKey(K.liveManifest, m);
  return { changed, history: m.history.length };
}

/** YYYY-MM-DD in Tashkent (UTC+5, no DST). */
export function tashkentDate(iso: string): string {
  return new Date(new Date(iso).getTime() + 5 * 3600 * 1000).toISOString().slice(0, 10);
}
