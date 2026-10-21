import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { changedSince, compute, type BaseFile, type TreeRow } from "../lib/argos-live.ts";
import {
  byStir,
  changes,
  completionList,
  type CompletionData,
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

test("every org carries the registry's «Boʻysunuvi»", () => {
  const all = regionOrgs(r, "andijon")!;
  assert.ok(all.every((o) => o.boysunuvi === (base.orgs.find((b) => orgId(b) === o.id)!.sub ?? null)));
  const [o] = byStir(r, "200254651");
  assert.equal(o.boysunuvi, "Hududiy SSB va tuman hokimligi");
  assert.ok(all.some((x) => x.boysunuvi === "Tuman tibbiyot birlashmasi"));
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

test("completion: per org by STIR, region and district figures, the low-first list", () => {
  const a = r.orgs.find((o) => o.region === "Андижон вилояти" && o.stir && o.district)!;
  const b = r.orgs.find((o) => o.region === "Андижон вилояти" && o.stir && o.stir !== a.stir && o.district === a.district)!;
  const c: CompletionData = {
    sana: "2026-10-14",
    overall: { orgCount: 3, avg: 0.5, zeroCount: 1, below50: 1 },
    regions: [{ name: "Андижон вилояти", orgCount: 2, avg: 0.75, zeroCount: 0, below50: 0 }],
    orgs: [
      { name: "A", stir: a.stir!, region: "Андижон вилояти", completion: 0.9 },
      { name: "B", stir: b.stir!, region: "Андижон вилояти", completion: 0.6 },
      { name: "Z", region: "Республика муассасалари", completion: 0 },
    ],
  };
  const [o] = byStir(r, a.stir!, c);
  assert.deepEqual(o.toldirish, { foiz: 90, sana: "2026-10-14" });
  assert.equal(byStir(r, a.stir!)[0].toldirish, null, "no file → null");
  assert.ok(regionOrgs(r, "andijon", undefined, c)!.some((x) => x.toldirish === null), "STIR not in the file → null");

  const s = summary(r, c);
  assert.deepEqual(s.toldirish, { tashkilotlar: 3, ortacha: 50, nol: 1, ellikdanKam: 1, sana: "2026-10-14" });
  assert.equal(s.hududlar.find((h) => h.slug === "andijon")!.toldirish!.ortacha, 75);
  assert.equal(s.hududlar.find((h) => h.slug === "xorazm")!.toldirish, null);
  assert.equal(summary(r).toldirish, null);

  const d = regionSummary(r, "andijon", c)!.tumanlar.find((t) => t.nomi === a.district)!;
  assert.equal(d.toldirish!.tashkilotlar, 2);
  assert.equal(d.toldirish!.ortacha, 75);

  const all = completionList(r, c);
  assert.deepEqual(all.tashkilotlar.map((x) => x.nomi), ["Z", "B", "A"]);
  assert.equal(all.tashkilotlar[0].reestrId, null);
  assert.equal(all.tashkilotlar[2].reestrId, orgId(a));
  assert.equal(all.tashkilotlar[2].tuman, a.district);
  const low = completionList(r, c, { slug: "andijon", kam: 70 });
  assert.deepEqual(low.tashkilotlar.map((x) => x.nomi), ["B"]);
  assert.equal(low.toldirish!.tashkilotlar, 2, "region figure, not the filtered list's");
  assert.equal(completionList(r, c, { limit: 1 }).jami, 3);
});
