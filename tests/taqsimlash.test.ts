import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { BaseFile, BaseOrg, TreeRow } from "../lib/argos-live.ts";
import {
  SUB_PARENT,
  SUB_PILOT,
  SUB_TTB,
  computeTaq,
  daySummary,
  filterRegions,
  isTarget,
  masulSummaries,
  previousDay,
  validStaff,
  type Masul,
  type StaffSnapshot,
} from "../lib/taqsimlash.ts";

const read = (f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf-8"));
const base: BaseFile = read("../data/argos-live-base.json");
const masullar: Masul[] = read("../data/masullar.json");
const tree: { at: string; rows: TreeRow[] } = read("./fixtures/argos-tree-2026-10-09-full.json");
const GEO = [
  "Қорақалпоғистон Республикаси", "Андижон вилояти", "Бухоро вилояти", "Жиззах вилояти", "Қашқадарё вилояти",
  "Навоий вилояти", "Наманган вилояти", "Самарқанд вилояти", "Сирдарё вилояти", "Сурхондарё вилояти",
  "Тошкент вилояти", "Фарғона вилояти", "Хоразм вилояти", "Тошкент шаҳри",
];

const org = (o: Partial<BaseOrg>): BaseOrg => ({
  region: "Андижон вилояти",
  district: "Asaka tumani",
  name: "x",
  stir: null,
  reestr: "ulangan",
  override: null,
  ...o,
});

test("scope: every row under a TTB or in a pilot district, Tashkent region included", () => {
  const t = base.orgs.filter(isTarget);
  assert.equal(t.length, base.orgs.filter((o) => o.sub === SUB_TTB).length + base.orgs.filter((o) => o.sub === SUB_PILOT).length);
  assert.ok(t.length > 2900, `${t.length}`);
  assert.ok(t.some((o) => o.region === "Тошкент вилояти"));
  const r = computeTaq(base.orgs, tree.rows, null);
  assert.equal(r.totals.total, t.length);
  // with no head counts nothing is done, and every measurable row waits on its TTB
  assert.equal(r.totals.otkazilgan, 0);
  assert.equal(r.totals.ttbda + r.totals.stirYoq + r.totals.daraxtdaYoq, r.totals.total);
});

test("the four states, and staff summed over nodes sharing a STIR", () => {
  const orgs = [
    org({ name: "TTB", sub: SUB_PARENT, stir: "900000001" }),
    org({ name: "1-OP", sub: SUB_TTB, stir: "900000002" }),
    org({ name: "2-OP", sub: SUB_TTB, stir: "900000003" }),
    org({ name: "3-OP", sub: SUB_TTB, stir: null }),
    org({ name: "4-OP", sub: SUB_TTB, stir: "900000001" }), // still on the TTB's STIR
    org({ name: "5-OP", sub: SUB_PILOT, stir: "900000009" }), // not in the tree
    org({ name: "Hospital", sub: "Viloyat SSB", stir: "900000004" }), // out of scope
  ];
  const rows: TreeRow[] = ["900000001", "900000002", "900000003", "900000004"].map((t) => [t, 1]);
  const staff: StaffSnapshot = { at: "2026-10-15T05:00:00Z", ids: 600, rows: [["900000001", 120], ["900000002", 7], ["900000002", 3]] };
  const r = computeTaq(orgs, rows, staff);
  const d = r.regions[0].districts[0];
  assert.deepEqual(
    d.orgs.map((o) => [o.name, o.status, o.staff]),
    [
      ["1-OP", "otkazilgan", 10],
      ["2-OP", "ttbda", 0],
      ["3-OP", "stirYoq", null],
      ["4-OP", "stirYoq", null],
      ["5-OP", "daraxtdaYoq", null],
    ],
  );
  assert.deepEqual(d.parents, [{ name: "TTB", stir: "900000001", staff: 120 }]);
  assert.equal(r.totals.total, 5);
  assert.equal(r.totals.otkazilgan, 1);
  assert.equal(r.totals.staff, 10);
  assert.equal(r.totals.percent, 0.2);
});

test("real tree, synthetic pull: done = targets whose own STIR has staff", () => {
  const targets = base.orgs.filter(isTarget);
  const inTree = new Set(tree.rows.map((r) => r[0]));
  const parentStir = new Set(base.orgs.filter((o) => o.sub === SUB_PARENT).map((o) => o.stir));
  const measurable = targets.filter((o) => o.stir && inTree.has(o.stir) && !parentStir.has(o.stir));
  const given = measurable.filter((_, i) => i % 3 === 0);
  const staff: StaffSnapshot = { at: tree.at, ids: 3000, rows: given.map((o) => [o.stir!, 5]) };
  const r = computeTaq(base.orgs, tree.rows, staff);
  // a polyclinic's branches sit on its STIR: staff on that node count for all of them
  const withStaff = new Set(given.map((o) => o.stir));
  assert.equal(r.totals.otkazilgan, measurable.filter((o) => withStaff.has(o.stir)).length);
  assert.ok(r.totals.otkazilgan > given.length);
  assert.equal(r.regions.reduce((s, x) => s + x.otkazilgan, 0), r.totals.otkazilgan);
});

test("responsible staff: summaries, day-over-day change and the filter", () => {
  const orgs = [
    org({ region: "Андижон вилояти", name: "a", sub: SUB_TTB, stir: "900000002" }),
    org({ region: "Бухоро вилояти", district: "Buxoro", name: "b", sub: SUB_TTB, stir: "900000003" }),
  ];
  const rows: TreeRow[] = [["900000002", 1], ["900000003", 1]];
  const day1 = daySummary(computeTaq(orgs, rows, { at: "x", ids: 0, rows: [["900000002", 1]] }), "2026-10-14", "x");
  const r = computeTaq(orgs, rows, { at: "y", ids: 0, rows: [["900000002", 1], ["900000003", 4]] });
  const m: Masul[] = [{ ism: "A", hududlar: ["Андижон вилояти"] }, { ism: "B", hududlar: ["Бухоро вилояти"] }];
  const prev = previousDay([day1, daySummary(r, "2026-10-15", "y")], "2026-10-15");
  assert.equal(prev?.date, "2026-10-14");
  assert.deepEqual(masulSummaries(m, r, prev).map((s) => [s.ism, s.otkazilgan, s.delta]), [["A", 1, 0], ["B", 1, 1]]);
  assert.deepEqual(masulSummaries(m, r, null).map((s) => s.delta), [null, null]);
  const f = filterRegions(r, ["Бухоро вилояти"]);
  assert.equal(f.regions.length, 1);
  assert.equal(f.totals.total, 1);
});

test("masullar.json: each region at most once, names canonical", () => {
  const seen = new Set<string>();
  for (const m of masullar)
    for (const h of m.hududlar) {
      assert.ok(GEO.includes(h), `unknown region ${h}`);
      assert.ok(!seen.has(h), `${h} twice`);
      seen.add(h);
    }
  if (masullar.length) assert.equal(seen.size, 14, "every region has someone");
});

test("validStaff: shape and bounds", () => {
  const rows: [string, number][] = Array.from({ length: 150 }, (_, i) => [String(300000000 + i), i]);
  assert.ok(validStaff({ at: "2026-10-15T05:00:00Z", ids: 3000, rows }));
  assert.ok(!validStaff({ at: "2026-10-15T05:00:00Z", ids: 3000, rows: rows.slice(0, 50) }), "too few rows");
  assert.ok(!validStaff({ at: "2026-10-15T05:00:00Z", ids: 10, rows }), "too few ids");
  assert.ok(!validStaff({ at: "nope", ids: 3000, rows }));
  assert.ok(!validStaff({ at: "2026-10-15T05:00:00Z", ids: 3000, rows: [...rows, ["12", 1]] }));
  assert.ok(!validStaff({ at: "2026-10-15T05:00:00Z", ids: 3000, rows: [...rows, ["300000999", -1]] }));
  assert.ok(!validStaff({ at: "2026-10-15T05:00:00Z", ids: 3000, rows: [...rows, ["300000999", 1.5]] }));
});
