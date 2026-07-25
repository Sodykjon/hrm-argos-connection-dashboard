// Persistence for uploaded snapshots.
//
// Two interchangeable backends, chosen at runtime:
//   • Vercel Blob   — when BLOB_READ_WRITE_TOKEN is set (production & any env
//                     with the token). Shared across all viewers.
//   • Local .data/  — dev fallback so the full upload loop is testable without
//                     Blob. (Not writable on Vercel's read-only FS.)
//
// If neither yields a manifest, the read layer falls back to the committed seed.

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

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
export function hasBlob(): boolean {
  return typeof TOKEN === "string" && TOKEN.length > 0;
}

const MANIFEST_KEY = "manifest.json";
const REGISTRY_KEY = "registry.json";
const COMPLETION_MANIFEST_KEY = "completion-manifest.json";
const LOCAL_DIR = path.join(process.cwd(), ".data");

// ---------------------------------------------------------------- read helpers

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function readLocal<T>(rel: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(LOCAL_DIR, rel), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Resolve a manifest ref (blob url or local key) to its JSON payload. */
async function readRef<T>(ref: string): Promise<T | null> {
  if (/^https?:\/\//.test(ref)) return fetchJson<T>(ref);
  return readLocal<T>(ref);
}

// In-memory memo so the read path does NOT hit Blob `list` (an "advanced
// operation") on every render. Data changes only on upload (~daily), so a short
// TTL is safe; a publish refreshes the memo instantly on the writing instance,
// and other warm instances catch up within the TTL. Fluid Compute reuses
// instances, so this persists across requests. Local dev memoizes too.
const MEMO_TTL = 600_000; // 10 min
let manifestMemo: { at: number; val: Manifest } | null = null;
let completionMemo: { at: number; val: CompletionManifest } | null = null;

export async function getManifest(): Promise<Manifest | null> {
  if (manifestMemo && Date.now() - manifestMemo.at < MEMO_TTL) {
    return manifestMemo.val;
  }
  const val = await loadManifest();
  if (val) manifestMemo = { at: Date.now(), val };
  return val;
}

async function loadManifest(): Promise<Manifest | null> {
  if (hasBlob()) {
    const { list } = await import("@vercel/blob");
    try {
      const { blobs } = await list({ prefix: MANIFEST_KEY, token: TOKEN });
      const hit = blobs.find((b) => b.pathname === MANIFEST_KEY);
      if (!hit) return null;
      return fetchJson<Manifest>(hit.url);
    } catch {
      return null;
    }
  }
  return readLocal<Manifest>(MANIFEST_KEY);
}

export async function getSnapshotByRef(ref: string): Promise<Snapshot | null> {
  return readRef<Snapshot>(ref);
}

export async function getRegistryRef(ref: string): Promise<Registry | null> {
  return readRef<Registry>(ref);
}

// --- completion (separate namespace so it never touches manifest.json) ------

export async function getCompletionManifest(): Promise<CompletionManifest | null> {
  if (completionMemo && Date.now() - completionMemo.at < MEMO_TTL) {
    return completionMemo.val;
  }
  const val = await loadCompletionManifest();
  if (val) completionMemo = { at: Date.now(), val };
  return val;
}

async function loadCompletionManifest(): Promise<CompletionManifest | null> {
  if (hasBlob()) {
    const { list } = await import("@vercel/blob");
    try {
      const { blobs } = await list({ prefix: COMPLETION_MANIFEST_KEY, token: TOKEN });
      const hit = blobs.find((b) => b.pathname === COMPLETION_MANIFEST_KEY);
      if (!hit) return null;
      return fetchJson<CompletionManifest>(hit.url);
    } catch {
      return null;
    }
  }
  return readLocal<CompletionManifest>(COMPLETION_MANIFEST_KEY);
}

export async function getCompletionByRef(
  ref: string,
): Promise<CompletionSnapshot | null> {
  return readRef<CompletionSnapshot>(ref);
}

// --------------------------------------------------------------- write helpers

async function writeBlob(key: string, data: unknown): Promise<string> {
  const { put } = await import("@vercel/blob");
  const { url } = await put(key, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    allowOverwrite: true,
    token: TOKEN,
  });
  return url;
}

async function writeLocal(key: string, data: unknown): Promise<string> {
  const full = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data), "utf-8");
  return key; // local ref is the relative key
}

async function writeJson(key: string, data: unknown): Promise<string> {
  return hasBlob() ? writeBlob(key, data) : writeLocal(key, data);
}

/**
 * Delete every blob under `prefix` except `keepUrl` (best-effort). Keeps Blob
 * usage tiny — only the newest snapshot per dataset is retained. Safe because
 * the trend/history reads from the (inline) manifest, never from old snapshot
 * blobs; only the latest snapshot is ever fetched. Local dev (no Blob) is a
 * no-op.
 */
async function pruneSnapshots(prefix: string, keepUrl: string): Promise<void> {
  if (!hasBlob()) return;
  try {
    const { list, del } = await import("@vercel/blob");
    const { blobs } = await list({ prefix, token: TOKEN });
    const stale = blobs.filter((b) => b.url !== keepUrl).map((b) => b.url);
    if (stale.length) await del(stale, { token: TOKEN });
  } catch {
    /* best-effort — never fail a publish because cleanup hiccuped */
  }
}

// ------------------------------------------------------------------- public API

export interface PutResult {
  snapshots: number;
  registryUpdated: boolean;
}

/**
 * Persist a new snapshot (and optionally a fresh registry), then update the
 * manifest. Re-uploading the same report date replaces that trend point.
 */
export async function publish(
  snapshot: Snapshot,
  registry?: Registry | null,
): Promise<PutResult> {
  const manifest = (await getManifest()) ?? { latestUrl: "", snapshots: [] };

  // Free space first: drop old snapshot blobs (keep the current latest) so an
  // already-full Blob store self-heals on the next upload.
  if (manifest.latestUrl) await pruneSnapshots("snapshots/", manifest.latestUrl);

  const key = `snapshots/${snapshot.date}-${Date.now()}.json`;
  const url = await writeJson(key, snapshot);

  const entry: ManifestEntry = {
    date: snapshot.date,
    uploadedAt: snapshot.uploadedAt,
    url,
    totals: snapshot.totals,
    regions: snapshot.regions,
  };

  const kept = manifest.snapshots.filter((s) => s.date !== snapshot.date);
  const snapshots = [...kept, entry].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  let registryUrl = manifest.registryUrl;
  let registryUpdated = false;
  if (registry && Object.keys(registry).length > 0) {
    registryUrl = await writeJson(REGISTRY_KEY, registry);
    registryUpdated = true;
  }

  // Point "latest" at the newest snapshot BY DATE, not merely the one just
  // written — a re-upload/backfill of an older date must not become "latest".
  const latestUrl = snapshots[snapshots.length - 1].url;
  const next: Manifest = { latestUrl, registryUrl, snapshots };
  await writeJson(MANIFEST_KEY, next);
  manifestMemo = { at: Date.now(), val: next }; // instant freshness, no re-list

  // Keep only the newest-by-date snapshot blob (history lives in the manifest).
  await pruneSnapshots("snapshots/", latestUrl);

  return { snapshots: snapshots.length, registryUpdated };
}

export interface CompletionPutResult {
  snapshots: number;
}

/**
 * Persist a new completion snapshot and update the completion manifest.
 * Fully independent of publish() above — writes only to the
 * `completion-snapshots/` prefix and `completion-manifest.json`.
 */
export async function publishCompletion(
  snapshot: CompletionSnapshot,
): Promise<CompletionPutResult> {
  const manifest = (await getCompletionManifest()) ?? {
    latestUrl: "",
    snapshots: [],
  };

  // Free space first (see publish): keep the current latest, drop the rest.
  if (manifest.latestUrl)
    await pruneSnapshots("completion-snapshots/", manifest.latestUrl);

  const key = `completion-snapshots/${snapshot.date}-${Date.now()}.json`;
  const url = await writeJson(key, snapshot);

  const entry: CompletionManifestEntry = {
    date: snapshot.date,
    uploadedAt: snapshot.uploadedAt,
    url,
    overall: snapshot.overall,
    regions: snapshot.regions,
  };

  const kept = manifest.snapshots.filter((s) => s.date !== snapshot.date);
  const snapshots = [...kept, entry].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // Point "latest" at the newest snapshot BY DATE, not merely the one just
  // written — a re-upload/backfill of an older date must not become "latest".
  const latestUrl = snapshots[snapshots.length - 1].url;
  const next: CompletionManifest = { latestUrl, snapshots };
  await writeJson(COMPLETION_MANIFEST_KEY, next);
  completionMemo = { at: Date.now(), val: next }; // instant freshness, no re-list

  // Keep only the newest-by-date snapshot blob.
  await pruneSnapshots("completion-snapshots/", latestUrl);

  return { snapshots: snapshots.length };
}
