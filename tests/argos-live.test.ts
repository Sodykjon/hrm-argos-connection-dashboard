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
// maintained by hand-run scripts against exactly that tree.
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
    .map((o, i) => [o, expected[i]] as const)
    .filter(([o, e]) => o.status !== e)
    .map(([o, e]) => `${o.region} | ${o.name} | ${o.stir} | ${o.status} ≠ ${e}`);
  assert.deepEqual(diff, []);
});

test("national totals match the workbook (3 878 / 3 491 / 286 / 101)", () => {
  const { totals } = compute(base.orgs, tree);
  assert.deepEqual(
    [totals.total, totals.ulangan, totals.ulanmagan, totals.ochirilgan],
    [3878, 3491, 286, 101],
  );
  assert.equal((totals.percent * 100).toFixed(1), "90.0");
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

test("same-STIR groups: 144 groups / 665 rows, only Yangiqo'rg'on is mixed", () => {
  const { stirGroups } = compute(base.orgs, tree);
  assert.equal(stirGroups.length, 144);
  assert.equal(stirGroups.reduce((s, g) => s + g.names.length, 0), 665);
  assert.deepEqual(stirGroups.filter((g) => g.mixed).map((g) => g.stir), ["200118029"]);
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
