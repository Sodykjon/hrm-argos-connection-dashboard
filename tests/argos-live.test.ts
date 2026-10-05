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

// 25.09.2026 ARGOS tree (tin:billing) — a real tree, for the invariants below.
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
const tree = { at: "2026-09-25T11:50:00Z", rows };

// The 05.10.2026 «BARCHA_HUDUDLAR_FINAL» workbook: its status column, and the
// tree those statuses imply (in the tree with billing on unless the row says
// «daraxtda yoʻq» / «billing nofaol» / manual) — written by make-argos-base.py.
const excel = JSON.parse(
  readFileSync(new URL("./fixtures/argos-excel-expected.json", import.meta.url), "utf-8"),
) as { status: string[]; tree: TreeRow[] };
const excelTree = { at: "2026-10-05T06:00:00Z", rows: excel.tree };

test("reproduces the 05.10 workbook row by row", () => {
  const r = compute(base.orgs, excelTree, base.ignoreStir);
  assert.equal(r.orgs.length, excel.status.length);
  const diff = r.orgs
    .map((o, i) => [o, excel.status[i]] as const)
    .filter(([o, e]) => o.status !== e)
    .map(([o, e]) => `${o.region} | ${o.district} | ${o.name} | ${o.stir} | ${o.status} ≠ ${e}`);
  assert.deepEqual(diff, []);
});

test("national totals: 05.10 workbook minus the 29.09 removals (3 865 / 3 718 / 50 / 97)", () => {
  // workbook 3 874 / 3 718 / 55 / 101 − 6 rows the dashboard had removed on 29.09
  // (5 ulanmagan, 1 ochirilgan) − 3 mountain-village hospitals without internet (ochirilgan).
  const { totals } = compute(base.orgs, excelTree, base.ignoreStir);
  assert.deepEqual(
    [totals.total, totals.ulangan, totals.ulanmagan, totals.ochirilgan],
    [3865, 3718, 50, 97],
  );
});

test("workbook structure: sheet order, republican systems, merged district spellings", () => {
  const { regions } = compute(base.orgs, excelTree);
  assert.deepEqual(
    regions.map((r) => r.name),
    [
      "Республика муассасалари", "Қорақалпоғистон Республикаси", "Андижон вилояти", "Бухоро вилояти",
      "Жиззах вилояти", "Қашқадарё вилояти", "Навоий вилояти", "Наманган вилояти", "Самарқанд вилояти",
      "Сурхондарё вилояти", "Сирдарё вилояти", "Тошкент вилояти", "Фарғона вилояти", "Хоразм вилояти",
      "Тошкент шаҳри",
    ],
  );
  const rep = regions[0];
  assert.equal(rep.total, 496);
  assert.equal(rep.districts.length, 20);
  assert.equal(rep.districts[0].name, "Sanitariya-epidemiologiya qoʻmitasi tizimi");
  assert.equal(rep.districts.at(-1)?.name, "Vazirlikka bevosita boʻysunuvchilar");
  const andijon = regions.find((r) => r.name === "Андижон вилояти")!;
  assert.equal(andijon.districts[0].name, "Viloyat darajasidagi muassasalar");
  assert.equal(andijon.districts.find((d) => d.name === "Asaka tumani")?.total, 24); // 23 + «ASAKA tumani» 1
  const all = new Set(regions.flatMap((r) => r.districts.map((d) => d.name)));
  for (const raw of ["ASAKA tumani", "Chipchiq shahri", "Yashnabod tumani", "Toylok tumani", "1-son shahri"])
    assert.ok(!all.has(raw), raw);
  const tash = regions.find((r) => r.name === "Тошкент шаҳри")!;
  assert.equal(tash.districts.find((d) => d.name === "Shahar darajasidagi muassasalar")?.total, 46);
  assert.ok(base.orgs.filter((o) => o.region === "Республика муассасалари").every((o) => o.hudud));
});

test("removed and excluded rows count nowhere, not even as «in ARGOS, not in the registry»", () => {
  const gone = [
    ...["200676926", "206838917", "202139705", "203387999"], // Qashqadaryo, removed
    ...["207200681", "207200698", "207200674"], // Qashqadaryo, no internet
    ...["202611253", "202611245", "201290315", "203317578", "206949249", "202636696"], // Namangan, Surxondaryo, Andijon
  ];
  assert.deepEqual(base.ignoreStir, [...gone].sort());
  assert.equal(base.removed?.length, 10);
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

test("same-STIR groups match the workbook's «Takroriy STIR» sheet: 145 STIRs / 667 rows, none mixed", () => {
  const { stirGroups } = compute(base.orgs, excelTree, base.ignoreStir);
  assert.equal(stirGroups.length, 145);
  assert.equal(stirGroups.reduce((s, g) => s + g.names.length, 0), 667);
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
