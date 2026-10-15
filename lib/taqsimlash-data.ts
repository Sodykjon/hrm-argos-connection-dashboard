// Server-side read layer for /taqsimlash: the registry (with own-STIR assignments, as /argos-jonli
// counts it), the latest ARGOS tree and the latest constructor head counts, all from the store.

import masullarRaw from "@/data/masullar.json";
import { BASE } from "./argos-live-data";
import type { BaseOrg, TreeSnapshot } from "./argos-live";
import { resolveOwnStir } from "./argos-match";
import { getLiveTree, getStaff, getStaffHistory, getStirAssign } from "./store";
import { computeTaq, type Masul, type StaffSnapshot, type TaqDay, type TaqResult } from "./taqsimlash";

export const MASULLAR = masullarRaw as Masul[];

export interface TaqData {
  tree: TreeSnapshot;
  staff: StaffSnapshot | null;
  history: TaqDay[];
  result: TaqResult;
}

/** The registry rows for one tree, own STIRs applied (same as getLive and POST /api/argos-tree). */
export async function registryFor(tree: TreeSnapshot): Promise<BaseOrg[]> {
  return resolveOwnStir(BASE.orgs, BASE.ignoreStir ?? [], tree.rows, await getStirAssign(), tree.at).orgs;
}

export async function getTaq(): Promise<TaqData | null> {
  const [tree, staff, history] = await Promise.all([getLiveTree(), getStaff(), getStaffHistory()]);
  if (!tree) return null;
  const orgs = await registryFor(tree);
  return { tree, staff, history, result: computeTaq(orgs, tree.rows, staff) };
}
