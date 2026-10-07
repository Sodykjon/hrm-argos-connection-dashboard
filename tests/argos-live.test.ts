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

test("national totals: workbook v3 (3 897 / 3 757 / 39 / 101)", () => {
  // FINAL 3 874 / 3 718 / 55 / 101 − 6 rows removed on 29.09 (5 ulanmagan, 1 ochirilgan) − 3
  // mountain-village hospitals without internet = 3 718 / 50 / 97; v2 (05.10 ARGOS tree): 110 rows
  // got their own STIR → 3 726 / 39 / 100; v3 (user's review): 7 more STIRs (Xiva 1–2 OP read
  // connected) and 45 tree orgs added (31 billing on, 14 off) → 3 910 / 3 758 / 39 / 113; the
  // doubled Ketenler OShP row deleted (user) → 3 909 / 3 757 / 39 / 113; 12 blank rows (no name,
  // no STIR) under Yashnobod deleted (user) → 3 897 / 3 757 / 39 / 101.
  const { totals } = compute(base.orgs, excelTree, base.ignoreStir);
  assert.deepEqual(
    [totals.total, totals.ulangan, totals.ulanmagan, totals.ochirilgan],
    [3897, 3757, 39, 101],
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
  assert.equal(rep.total, 499); // 496 + 3 republican-centre branches added 05.10
  assert.equal(rep.districts.length, 20);
  assert.equal(rep.districts[0].name, "Sanitariya-epidemiologiya qoʻmitasi tizimi");
  assert.equal(rep.districts.at(-1)?.name, "Vazirlikka bevosita boʻysunuvchilar");
  const andijon = regions.find((r) => r.name === "Андижон вилояти")!;
  assert.equal(andijon.districts[0].name, "Viloyat darajasidagi muassasalar");
  assert.equal(andijon.districts.find((d) => d.name === "Asaka tumani")?.total, 25); // 23 + «ASAKA tumani» 1 + district health dept added 05.10
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

test("same-STIR groups: the workbook's 145 / 667 less the rows given their own STIR on 05.10 (123 / 540), none mixed", () => {
  const { stirGroups } = compute(base.orgs, excelTree, base.ignoreStir);
  assert.equal(stirGroups.length, 123);
  assert.equal(stirGroups.reduce((s, g) => s + g.names.length, 0), 540);
  assert.deepEqual(stirGroups.filter((g) => g.mixed).map((g) => g.stir), []);
});

// The real hrm.argos.uz tree of 05.10.2026 (tin:billing), read for the registry check.
const tree1005: TreeRow[] = readFileSync(new URL("./fixtures/argos-tree-2026-10-05.txt", import.meta.url), "utf-8")
  .trim()
  .split(",")
  .map((x) => {
    const [t, b] = x.split(":");
    return [t, b === "1" ? 1 : 0];
  });

test("05.10 ARGOS tree: registry agrees with the workbook (3 897 / 3 757 / 39 / 101), 35 tree orgs left out on purpose", () => {
  // Before the fixes the same tree gave exactly the workbook's 3 718 / 50 / 97 and 195 outside.
  const r = compute(base.orgs, { at: "2026-10-05T12:00:00Z", rows: tree1005 }, base.ignoreStir);
  assert.deepEqual([r.totals.total, r.totals.ulangan, r.totals.ulanmagan, r.totals.ochirilgan], [3897, 3757, 39, 101]);
  // every registry row is a named organisation with a STIR, and no group lists one name twice
  assert.deepEqual(base.orgs.filter((o) => !o.name.trim() || !o.stir).map((o) => o.region), []);
  const seen = new Map<string, number>();
  for (const o of base.orgs) {
    const k = `${o.region}|${o.district}|${o.name.trim().toLowerCase().replace(/\s+/g, " ")}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  assert.deepEqual([...seen].filter(([, c]) => c > 1).map(([k]) => k), []);
  // the 34 the user marked «yo'q» (colleges, depots, project units…) + the Xiva college whose STIR
  // the Xiva OPs had been filed under
  assert.equal(r.extraInTree.length, 35);
  assert.equal(new Set(base.orgs.map((o) => o.stir).filter(Boolean)).size, 3480);
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
