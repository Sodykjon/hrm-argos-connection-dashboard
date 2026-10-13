import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { changedSince, compute, type BaseFile, type TreeRow } from "../lib/argos-live.ts";
import {
  byStir,
  changes,
  fold,
  orgId,
  regionOrgs,
  regionSummary,
  search,
  summary,
} from "../lib/bot-api.ts";

const base = JSON.parse(
  readFileSync(new URL("../data/argos-live-base.json", import.meta.url), "utf-8"),
) as BaseFile;
const rows: TreeRow[] = readFileSync(new URL("./fixtures/argos-tree-2026-10-09.txt", import.meta.url), "utf-8")
  .trim()
  .split(",")
  .map((x) => {
    const [t, b] = x.split(":");
    return [t, b === "1" ? 1 : 0];
  });
const tree = { at: "2026-10-09T06:00:00Z", rows };
const r = compute(base.orgs, tree, base.ignoreStir);

test("every registry row gets its own 12-hex id", () => {
  const ids = base.orgs.map(orgId);
  assert.ok(ids.every((x) => /^[0-9a-f]{12}$/.test(x)));
  assert.equal(new Set(ids).size, ids.length);
});

test("fold: case, apostrophes and Cyrillic do not matter", () => {
  assert.equal(fold("Oltinkoʻl"), "oltinkol");
  assert.equal(fold("OLTINKO'L"), "oltinkol");
  assert.equal(fold("Олтинкўл"), "oltinkol");
  assert.equal(fold("42-sonli  oilaviy"), "42 sonli oilaviy");
});

test("search: every word must match, region filter, limit", () => {
  const s = search(r, "oltinkol 42");
  assert.equal(s.jami, 1);
  assert.equal(s.natijalar[0].nomi, "Oltinkoʻl tumani 42-sonli oilaviy poliklinikasi");
  assert.equal(s.natijalar[0].hududSlug, "andijon");
  assert.equal(search(r, "Олтинкўл 42").natijalar[0]?.nomi, "Oltinkoʻl tumani 42-sonli oilaviy poliklinikasi");
  assert.equal(search(r, "oltinkol", { slug: "xorazm" }).jami, 0);
  // word starts only: «42» is not «142»
  assert.ok(search(r, "42").natijalar.every((o) => /(^|[^0-9])42/.test(o.nomi)));
  const many = search(r, "poliklinika", { limit: 5 });
  assert.ok(many.jami > 5);
  assert.equal(many.natijalar.length, 5);
  assert.equal(search(r, "  ").jami, 0);
});

test("byStir returns every row sharing the STIR", () => {
  const shared = r.stirGroups[0]; // the largest group of rows under one STIR
  assert.ok(shared.names.length > 1);
  const l = byStir(r, shared.stir);
  assert.deepEqual(l.map((o) => o.nomi), shared.names);
  assert.deepEqual(l.map((o) => o.holat), shared.statuses);
  const one = byStir(r, "200254651");
  assert.deepEqual(one.map((o) => o.nomi), ["Oltinkoʻl tumani tibbiyot birlashmasi"]);
  assert.equal(one[0].holatMatn, "Уланган");
  assert.equal(one[0].billing, 1);
  assert.deepEqual(byStir(r, "999999999"), []);
});

test("summary and region totals equal the live page's counts", () => {
  const s = summary(r);
  assert.equal(s.jami, r.totals.total);
  assert.equal(s.ulangan, r.totals.ulangan);
  assert.equal(s.foiz, Math.round(r.totals.percent * 1000) / 10);
  assert.equal(s.hududlar.length, r.regions.length);
  assert.ok(s.hududlar.every((h) => !h.slug.startsWith("r-")), "every region has a readable slug");
  assert.equal(s.hududlar.reduce((a, h) => a + h.jami, 0), s.jami);

  const a = regionSummary(r, "andijon")!;
  const g = r.regions.find((x) => x.name === "Андижон вилояти")!;
  assert.equal(a.jami, g.total);
  assert.equal(a.ulanmagan, g.ulanmagan);
  assert.equal(a.tumanlar.reduce((n, d) => n + d.jami, 0), g.total);
  assert.equal(regionSummary(r, "yoq-hudud"), null);
});

test("region list, whole and by status", () => {
  const g = r.regions.find((x) => x.name === "Сирдарё вилояти")!;
  assert.equal(regionOrgs(r, "sirdaryo")!.length, g.total);
  assert.equal(regionOrgs(r, "sirdaryo", "ulanmagan")!.length, g.ulanmagan);
  assert.ok(regionOrgs(r, "sirdaryo", "ochirilgan")!.every((o) => o.holat === "ochirilgan"));
  assert.equal(regionOrgs(r, "yoq-hudud"), null);
});

test("changes between two trees, with the region filter", () => {
  // Switch billing off for one connected Andijon STIR and on for one unconnected Xorazm row's STIR.
  const on = r.orgs.find((o) => o.region === "Андижон вилояти" && o.reason === "billing")!;
  const cur = { at: "2026-10-09T07:00:00Z", rows: rows.map(([t, b]): TreeRow => [t, t === on.stir ? 0 : b]) };
  const list = changes(changedSince(base.orgs, tree, cur));
  const shared = base.orgs.filter((o) => o.stir === on.stir).length;
  assert.equal(list.length, shared);
  assert.ok(list.every((c) => c.oldin === "ulangan" && c.holat === "ochirilgan" && c.holatMatn === "Ўчирилган"));
  assert.ok(list.some((c) => c.id === orgId(on)));
  assert.equal(changes(changedSince(base.orgs, tree, cur), "andijon").length, shared);
  assert.equal(changes(changedSince(base.orgs, tree, cur), "xorazm").length, 0);
});
