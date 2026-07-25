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

import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  CompletionManifest,
  CompletionManifestEntry,
  CompletionSnapshot,
  Manifest,
  ManifestEntry,
  Registry,
  Snapshot,
} from "./types";

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

// In-memory memo so repeated renders don't re-read the manifest on every
// request. Data changes only on upload (~daily); a publish refreshes the memo
// instantly, and other warm instances catch up within the TTL.
const MEMO_TTL = 600_000; // 10 min
let manifestMemo: { at: number; val: Manifest } | null = null;
let completionMemo: { at: number; val: CompletionManifest } | null = null;

export async function getManifest(): Promise<Manifest | null> {
  if (manifestMemo && Date.now() - manifestMemo.at < MEMO_TTL) {
    return manifestMemo.val;
  }
  const val = await readKey<Manifest>(K.manifest);
  if (val) manifestMemo = { at: Date.now(), val };
  return val;
}

export async function getSnapshotByRef(ref: string): Promise<Snapshot | null> {
  return readKey<Snapshot>(ref);
}

export async function getRegistryRef(ref: string): Promise<Registry | null> {
  return readKey<Registry>(ref);
}

export async function getCompletionManifest(): Promise<CompletionManifest | null> {
  if (completionMemo && Date.now() - completionMemo.at < MEMO_TTL) {
    return completionMemo.val;
  }
  const val = await readKey<CompletionManifest>(K.compManifest);
  if (val) completionMemo = { at: Date.now(), val };
  return val;
}

export async function getCompletionByRef(
  ref: string,
): Promise<CompletionSnapshot | null> {
  return readKey<CompletionSnapshot>(ref);
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
  manifestMemo = { at: Date.now(), val: next }; // instant freshness

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
  completionMemo = { at: Date.now(), val: next }; // instant freshness

  return { snapshots: snapshots.length };
}
