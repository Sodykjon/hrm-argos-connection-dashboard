import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findOwnStir, orgKey } from "../lib/argos-match.ts";
import type { BaseFile, TreeRow } from "../lib/argos-live.ts";

const read = (f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf-8"));
const base: BaseFile = read("../data/argos-live-base.json");
// The 09.10.2026 hrm.argos.uz tree with each org's parent org (as the bookmarklet now sends it).
const tree: { at: string; rows: TreeRow[] } = read("./fixtures/argos-tree-2026-10-09-full.json");
// scripts/compare-argos-tree.py on the same tree, with the 72 rows fixed on 09.10 blanked again.
const expected: { blank: string[]; matches: { key: string; tin: string; strength: string }[] } = read(
  "./fixtures/own-stir-expected.json",
);

const knownOf = (orgs: { stir: string | null }[]) =>
  new Set([...orgs.map((o) => o.stir).filter((s): s is string => !!s), ...(base.ignoreStir ?? [])]);

test("matches the Python script: the 72 rows fixed on 09.10 found again, strong / weak alike", () => {
  const blank = new Set(expected.blank);
  const orgs = base.orgs.map((o) => (blank.has(o.name) ? { ...o, stir: null } : o));
  const got = findOwnStir(orgs, tree.rows, knownOf(orgs));
  assert.deepEqual(
    got.map((m) => ({ key: m.key, tin: m.tin, strength: m.strength })),
    expected.matches.map((m) => ({ key: m.key, tin: m.tin, strength: m.strength })),
  );
  assert.equal(got.filter((m) => m.strength === "strong").length, 40);
});

test("on the live registry: only Guliston district's KTMP (strong) and Chortoq OShP (weak), both billing off", () => {
  const got = findOwnStir(base.orgs, tree.rows, knownOf(base.orgs));
  assert.deepEqual(
    got.map((m) => [m.key.split("|")[2], m.tin, m.strength, m.billing]),
    [
      ["Guliston tumani Chortoq oilaviy shifokorlik punkti", "312685368", "weak", 0],
      ["Guliston tumani koʻp tarmoqli markaziy poliklinikasi", "312685264", "strong", 0],
    ],
  );
});

test("a rejected pairing is not offered again; a tree without parents (old bookmarklet) guesses nothing", () => {
  const k = base.orgs.find((o) => o.name === "Guliston tumani koʻp tarmoqli markaziy poliklinikasi")!;
  const got = findOwnStir(base.orgs, tree.rows, knownOf(base.orgs), { [orgKey(k)]: ["312685264"] });
  assert.deepEqual(got.map((m) => m.tin), ["312685368"]);
  // no region without the parent chain → nothing, rather than a guess
  const flat = tree.rows.map(([t, b, l]) => [t, b, l] as TreeRow);
  assert.deepEqual(findOwnStir(base.orgs, flat, knownOf(base.orgs)), []);
});

import { compute, decide, indexTree, EMPTY_ASSIGN, applyAssign } from "../lib/argos-live.ts";
import { resolveOwnStir } from "../lib/argos-match.ts";
import { bookmarkletSource } from "../lib/argos-bookmarklet.ts";

const blankedOrgs = () => {
  const blank = new Set(expected.blank);
  return base.orgs.map((o) => (blank.has(o.name) ? { ...o, stir: null } : o));
};

test("strong + billing on is applied automatically, the rest waits (39 applied, 33 waiting)", () => {
  const r = resolveOwnStir(blankedOrgs(), base.ignoreStir ?? [], tree.rows, EMPTY_ASSIGN, tree.at);
  assert.equal(r.grew, true);
  assert.equal(r.applied.length, 39); // 40 strong, Guliston district's KTMP has billing off
  assert.ok(r.applied.every((a) => a.mode === "auto" && a.billing === 1));
  assert.equal(r.pending.length, 33); // 32 weak + that KTMP
  assert.equal(r.pending.filter((p) => p.strength === "strong").length, 1);
  // the applied rows count as connected under their own STIR, with the reason in the note
  const live = compute(r.orgs, tree, base.ignoreStir);
  const amu = live.orgs.find((o) => o.name === "Amudaryo tumani 1-sonli oilaviy poliklinikasi")!;
  assert.deepEqual([amu.stir, amu.status, amu.assigned], ["311889708", "ulangan", "auto"]);
  assert.match(amu.note ?? "", /· Oʻz STIRi ARGOS daraxtidan qoʻyildi \d\d\.10\.2026 \(avtomatik; avval: 200975094\)$/);
  // a second tree with the same content changes nothing
  const again = resolveOwnStir(blankedOrgs(), base.ignoreStir ?? [], tree.rows, r.assign, tree.at);
  assert.equal(again.grew, false);
  assert.equal(again.applied.length, 39);
});

test("a rejected automatic pairing stays rejected; an approved one switched off later counts as switched off", () => {
  const r = resolveOwnStir(blankedOrgs(), base.ignoreStir ?? [], tree.rows, EMPTY_ASSIGN, tree.at);
  const a = r.applied[0];
  const { [a.key]: _, ...items } = r.assign.items;
  const after = resolveOwnStir(blankedOrgs(), base.ignoreStir ?? [], tree.rows, { items, rejected: { [a.key]: [a.tin] } }, tree.at);
  assert.equal(after.grew, false);
  assert.ok(!after.applied.some((x) => x.key === a.key));
  assert.ok(!after.pending.some((x) => x.key === a.key && x.tin === a.tin));
  // billing off under the assigned STIR → «ochirilgan», not «just added»
  const org = applyAssign(blankedOrgs(), r.assign).find((o) => o.stir === a.tin)!;
  assert.equal(decide(org, indexTree([[a.tin, 0]])).status, "ochirilgan");
  assert.equal(decide(org, indexTree([])).status, "ochirilgan");
});

test("a row the workbook gives a STIR keeps it, whatever is stored", () => {
  const o = base.orgs.find((x) => x.stir)!;
  const key = `${o.region}|${o.district ?? ""}|${o.name}`;
  const [kept] = applyAssign([o], { items: { [key]: { tin: "999999999", mode: "approved", at: tree.at, label: "x" } }, rejected: {} });
  assert.equal(kept.stir, o.stir);
});

test("the bookmarklet sends each org's parent org", () => {
  const src = bookmarkletSource("https://x.test");
  new Function(src); // parses
  const walk = /\(function w\(ns,up\)\{.*?\}\)\(arr,""\);/.exec(src)![0];
  const arr = [{ type: 2, tin: "200000001", label: "МЗ", activeBillingStatus: true, children: [
    { type: 1, label: "Районный уровень", children: [
      { type: 2, tin: "200000002", label: "ТТБ", activeBillingStatus: true, children: [
        { type: 2, tin: "300000003", label: "ОП №1", activeBillingStatus: false }] }] }] }];
  const out: unknown[] = [];
  new Function("arr", "out", "seen", walk)(arr, out, {});
  assert.deepEqual(out, [["200000001", 1, "МЗ"], ["200000002", 1, "ТТБ", "200000001"], ["300000003", 0, "ОП №1", "200000002"]]);
});
