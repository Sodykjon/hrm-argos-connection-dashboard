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
import type { Manifest, ManifestEntry, Registry, Snapshot } from "./types";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
export function hasBlob(): boolean {
  return typeof TOKEN === "string" && TOKEN.length > 0;
}

const MANIFEST_KEY = "manifest.json";
const REGISTRY_KEY = "registry.json";
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

export async function getManifest(): Promise<Manifest | null> {
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
  const key = `snapshots/${snapshot.date}-${Date.now()}.json`;
  const url = await writeJson(key, snapshot);

  const manifest = (await getManifest()) ?? { latestUrl: "", snapshots: [] };

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

  const next: Manifest = { latestUrl: url, registryUrl, snapshots };
  await writeJson(MANIFEST_KEY, next);

  return { snapshots: snapshots.length, registryUpdated };
}
