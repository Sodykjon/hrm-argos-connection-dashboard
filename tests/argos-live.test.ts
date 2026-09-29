import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  compute,
  decide,
  indexTree,
  treeFingerprint,
  validTree,
  type BaseFile,
  type TreeRow,
} from "../lib/argos-live.ts";

const base = JSON.parse(
  readFileSync(new URL("../data/argos-live-base.json", import.meta.url), "utf-8"),
) as BaseFile;

// 25.09.2026 ARGOS tree (tin:billing) and the workbook statuses that were
// maintained by hand-run scripts against exactly that tree. One later manual
// decision is folded into the fixture: on 25.09 the user confirmed Yangiqo'rg'on
// (Namangan) is connected, so its 19 «ulanmagan» overrides were lifted.
// 29.09.2026 (user's Qashqadaryo workbook + 6 rows named in chat for Namangan,
// Surxondaryo, Andijon): 10 rows removed from the registry,
// 3 mountain-village hospitals without internet excluded from every count, and
// 3 wrong STIRs corrected — two of those are in the 25.09 tree, so with the
// right STIR they now read «ulangan»; the third (Kukdala, not in that tree) the
// user confirmed as connected by hand → «faol» override. All three were
// «ulanmagan» in the 25.09 workbook.
const STIR_FIXED_CONNECTED = new Set([
  '"Talimarjon" shifoxonasi',
  "Nuristan poliklinikasi",
  "Kukdala tumani koʻp tarmoqli markaziy poliklinikasi",
]);
const rows: TreeRow[] = readFileSync(
  new URL("./fixtures/argos-tree-2026-09-25.txt", import.meta.url),
  "utf-8",
)
  .trim()
  .split(",")
  .map((x) => {
    const [t, b] = x.split(":");
    return [t, b === "1" ? 1 : 0];
  });
const expected = JSON.parse(
  readFileSync(new URL("./fixtures/argos-live-expected.json", import.meta.url), "utf-8"),
) as string[];

const tree = { at: "2026-09-25T11:50:00Z", rows };

test("reproduces the 25.09 workbook row by row", () => {
  const r = compute(base.orgs, tree);
  assert.equal(r.orgs.length, expected.length);
  const diff = r.orgs
    .map((o, i) => [o, STIR_FIXED_CONNECTED.has(o.name) ? "ulangan" : expected[i]] as const)
    .filter(([o, e]) => o.status !== e)
    .map(([o, e]) => `${o.region} | ${o.name} | ${o.stir} | ${o.status} ≠ ${e}`);
  assert.deepEqual(diff, []);
});

test("national totals: 25.09 workbook minus the 29.09 registry changes (3 865 / 3 513 / 255 / 97)", () => {
  // 3 878 / 3 510 / 267 / 101 − 10 removed (9 ulanmagan, 1 ochirilgan) − 3 excluded (ochirilgan);
  // Talimarjon, Nuristan, Kukdala ulanmagan → ulangan after the STIR fix.
  const { totals } = compute(base.orgs, tree, base.ignoreStir);
  assert.deepEqual(
    [totals.total, totals.ulangan, totals.ulanmagan, totals.ochirilgan],
    [3865, 3513, 255, 97],
  );
  assert.equal((totals.percent * 100).toFixed(1), "90.9");
});

test("removed and excluded rows count nowhere, not even as «in ARGOS, not in the registry»", () => {
  const gone = [
    ...["200676926", "206838917", "202139705", "203387999"], // Qashqadaryo, removed
    ...["207200681", "207200698", "207200674"], // Qashqadaryo, no internet
    ...["202611253", "202611245", "201290315", "203317578", "206949249", "202636696"], // Namangan, Surxondaryo, Andijon
  ];
  assert.deepEqual(base.ignoreStir, [...gone].sort());
  assert.deepEqual(
    (base.excluded ?? []).map((e) => [e.name, e.reason]),
    [
      ["Gʻelon qishloq uchastka kasalxonasi", "internet"],
      ["Sarchashma qishloq uchastka kasalxonasi", "internet"],
      ["Hisarak qishloq uchastka kasalxonasi", "internet"],
    ],
  );
  assert.ok(!base.orgs.some((o) => o.stir && gone.includes(o.stir)));
  const t = { at: tree.at, rows: [...rows, ...gone.map((g) => [g, 1] as TreeRow)] };
  const extra = new Set(compute(base.orgs, t, base.ignoreStir).extraInTree.map((e) => e.tin));
  assert.deepEqual(gone.filter((g) => extra.has(g)), []);
  // without the ignore list they would surface there
  const raw = new Set(compute(base.orgs, t).extraInTree.map((e) => e.tin));
  assert.deepEqual(gone.filter((g) => raw.has(g)), gone);
});

test("region and district sums reconcile with the national total", () => {
  const { totals, regions } = compute(base.orgs, tree);
  assert.equal(regions.length, 15);
  assert.equal(regions.reduce((s, r) => s + r.total, 0), totals.total);
  for (const r of regions) {
    if (!r.districts.length) continue;
    assert.equal(r.districts.reduce((s, d) => s + d.total, 0), r.total, r.name);
  }
});

test("same-STIR groups: 144 groups / 665 rows, none mixed", () => {
  const { stirGroups } = compute(base.orgs, tree);
  assert.equal(stirGroups.length, 144);
  assert.equal(stirGroups.reduce((s, g) => s + g.names.length, 0), 665);
  assert.deepEqual(stirGroups.filter((g) => g.mixed).map((g) => g.stir), []);
});

test("decide(): each branch of the rule", () => {
  const t = indexTree([["111111111", 1], ["222222222", 0]]);
  const o = (reestr: "ulangan" | "ulanmagan" | "ochirilgan", stir: string | null, override = null as null | "ulangan" | "ulanmagan") =>
    decide({ region: "x", district: null, name: "n", stir, reestr, override }, t).status;
  assert.equal(o("ulanmagan", "111111111"), "ulangan");
  assert.equal(o("ulanmagan", "222222222"), "ulangan"); // new, billing not yet on
  assert.equal(o("ulangan", "222222222"), "ochirilgan"); // switched off
  assert.equal(o("ochirilgan", "111111111"), "ulangan");
  assert.equal(o("ulangan", "999999999"), "ochirilgan"); // gone from the tree
  assert.equal(o("ulanmagan", "999999999"), "ulanmagan");
  assert.equal(o("ochirilgan", null), "ochirilgan");
  assert.equal(o("ulangan", "222222222", "ulangan"), "ulangan"); // override wins
});

test("fingerprint ignores order, validTree rejects junk", () => {
  assert.equal(treeFingerprint([["1", 1], ["2", 0]]), treeFingerprint([["2", 0], ["1", 1]]));
  assert.notEqual(treeFingerprint([["1", 1]]), treeFingerprint([["1", 0]]));
  assert.ok(validTree(tree));
  assert.ok(!validTree({ at: "x", rows: [["abc", 1]] }));
});

test("bookmarklet source is valid JS and targets the given origin", async () => {
  const { bookmarkletSource, bookmarkletHref } = await import("../lib/argos-bookmarklet.ts");
  const src = bookmarkletSource("https://example.vercel.app");
  assert.doesNotThrow(() => new Function(src));
  assert.ok(src.includes('D="https://example.vercel.app"'));
  assert.ok(!src.includes("__ORIGIN__"));
  assert.ok(bookmarkletHref("https://x.y").startsWith("javascript:"));
});
