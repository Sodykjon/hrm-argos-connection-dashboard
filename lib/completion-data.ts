// /toldirilish read layer: the latest completion snapshot re-filed under the registry's top-level
// groups, and its organisations placed in the registry tree when the CSV carries STIRs.

import { cache } from "react";
import { getCompletionHistory, getLatestCompletion } from "./data";
import { getLive, liveTree } from "./argos-live-data";
import { completionTree, regroup, regroupDay, type CRegion, type PlacedOrg } from "./completion-tree";
import type { CompletionManifestEntry, CompletionSnapshot } from "./types";

export interface CompletionView {
  snapshot: CompletionSnapshot & { orgs: PlacedOrg[] };
  /** The 17-bucket snapshot as stored, STIRs filled in (the central-apparatus card reads its bucket). */
  raw: CompletionSnapshot;
  tree: CRegion[];
  /** Organisations placed in the registry by STIR (0 without a live tree). */
  placed: number;
  isSeed: boolean;
}

export const getCompletionView = cache(async (): Promise<CompletionView> => {
  const { snapshot: stored, isSeed } = await getLatestCompletion();
  const live = await getLive();
  // CSVs before 15.10.2026 carry no STIR. Their org names are the very `label` of the ARGOS tree
  // node the live tree also holds, so a label that is unique in the tree gives the STIR (96% of the
  // 14.10 file); anything ambiguous stays unplaced.
  const byLabel = new Map<string, string | null>();
  for (const [tin, , label] of live?.tree.rows ?? []) {
    const l = (label ?? "").trim();
    if (l) byLabel.set(l, byLabel.has(l) ? null : tin);
  }
  const raw: CompletionSnapshot = {
    ...stored,
    orgs: stored.orgs.map((o) => (o.stir ? o : { ...o, ...(byLabel.get(o.name.trim()) ? { stir: byLabel.get(o.name.trim())! } : {}) })),
  };
  const regionOf = new Map<string, string>();
  for (const o of live?.result.orgs ?? []) if (o.stir && !regionOf.has(o.stir)) regionOf.set(o.stir, o.region);
  const snapshot = regroup(raw, (s) => regionOf.get(s));
  const tree = completionTree(snapshot.orgs, live ? liveTree(live.result) : undefined);
  const placed = live ? snapshot.orgs.filter((o) => o.stir && regionOf.has(o.stir)).length : 0;
  return { snapshot, raw, tree, placed, isSeed };
});

export async function getCompletionDays(): Promise<CompletionManifestEntry[]> {
  return (await getCompletionHistory()).map(regroupDay);
}
