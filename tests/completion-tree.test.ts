import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compute, type BaseFile, type TreeSnapshot } from "../lib/argos-live.ts";
import { buildTree, type SesStructure } from "../lib/argos-live-view.ts";
import { parseCompletionCsv } from "../lib/parse-completion.ts";
import { REPUBLIC, completionTree, regroup, regroupDay, topRegion } from "../lib/completion-tree.ts";
import type { CompletionSnapshot } from "../lib/types.ts";

const read = (f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf-8"));
const base: BaseFile = read("../data/argos-live-base.json");
const ses: SesStructure = read("../data/ses-tuzilma.json");
const tree: TreeSnapshot = read("./fixtures/argos-tree-2026-10-09-full.json");
const registry = buildTree(compute(base.orgs, tree, base.ignoreStir), undefined, ses);

const HEAD = "№;ID;Тулдирилиш даражаси (%);orgType;Бош ташкилот (гурух);Ташкилот номи";

test("CSV: the STIR column is read when present, and files without it parse as before", () => {
  const withStir = parseCompletionCsv(
    `﻿${HEAD};STIR\r\n1;17;55,5;4;"Управление здравоохранения Андижанской области";"Поликлиника";200237023\r\n2;18;0;4;"x";"y";`,
    "HRM_tuldirilish_2026-10-15.csv",
  ).snapshot;
  assert.equal(withStir.orgs[0].stir, "200237023");
  assert.equal(withStir.orgs[0].completion, 0.555);
  assert.equal(withStir.orgs[1].stir, undefined);
  const old = parseCompletionCsv(`${HEAD}\n1;17;10;4;"Управление здравоохранения Андижанской области";"Поликлиника"`).snapshot;
  assert.equal(old.orgs[0].stir, undefined);
  assert.equal(old.orgs[0].region, "Андижон вилояти");
});

const snap = (orgs: { region: string; completion: number; stir?: string; name?: string }[]): CompletionSnapshot => ({
  date: "2026-10-15",
  uploadedAt: "",
  overall: { orgCount: orgs.length, avg: 0, zeroCount: 0, below50: 0 },
  regions: [],
  orgs: orgs.map((o, i) => ({ id: String(i), name: o.name ?? `org ${i}`, ...o })),
});

test("the three non-regional buckets fold into «Республика муассасалари»; the registry region wins", () => {
  assert.equal(topRegion("Марказий аппарат"), REPUBLIC);
  assert.equal(topRegion("Санитар-эпидемиология қўмитаси"), REPUBLIC);
  assert.equal(topRegion("Республика марказлари"), REPUBLIC);
  assert.equal(topRegion("Андижон вилояти"), "Андижон вилояти");

  const r = regroup(
    snap([
      { region: "Марказий аппарат", completion: 1 },
      { region: "Санитар-эпидемиология қўмитаси", completion: 0 },
      { region: "Андижон вилояти", completion: 0.5 },
      // a republican centre's branch the CSV files under its centre, the registry under the region? the registry wins
      { region: "Республика марказлари", completion: 0.2, stir: "111" },
    ]),
    (s) => (s === "111" ? "Бухоро вилояти" : undefined),
  );
  const by = Object.fromEntries(r.regions.map((x) => [x.name, x]));
  assert.deepEqual(Object.keys(by).sort(), [REPUBLIC, "Андижон вилояти", "Бухоро вилояти"].sort());
  assert.equal(by[REPUBLIC].orgCount, 2);
  assert.equal(by[REPUBLIC].avg, 0.5);
  assert.equal(by[REPUBLIC].zeroCount, 1);

  const day = regroupDay({
    date: "x",
    uploadedAt: "",
    url: "",
    overall: { orgCount: 4, avg: 0, zeroCount: 0, below50: 0 },
    regions: [
      { name: "Марказий аппарат", orgCount: 1, avg: 0.9, zeroCount: 0, below50: 0 },
      { name: "Республика марказлари", orgCount: 3, avg: 0.5, zeroCount: 1, below50: 2 },
      { name: "Андижон вилояти", orgCount: 5, avg: 0.4, zeroCount: 2, below50: 3 },
    ],
  });
  const rep = day.regions.find((x) => x.name === REPUBLIC)!;
  assert.equal(rep.orgCount, 4);
  assert.ok(Math.abs(rep.avg - 0.6) < 1e-9);
  assert.equal(rep.below50, 2);
});

test("tree: organisations land at their STIR's place in the registry, once; the rest stay unplaced", () => {
  const rows = registry.flatMap((r) => r.groups.flatMap((g) => g.orgs.map((o) => ({ r, g, o }))));
  const unique = new Map<string, (typeof rows)[number]>();
  for (const x of rows) if (x.o.stir && !unique.has(x.o.stir)) unique.set(x.o.stir, x);
  const picks = [...unique.values()].filter((_, i) => i % 5 === 0);
  const s = regroup(
    snap([
      ...picks.map((x, i) => ({ region: "Андижон вилояти", completion: (i % 3) / 2, stir: x.o.stir! })),
      { region: "Самарқанд вилояти", completion: 0.3, stir: "999999999" }, // not in the registry
      { region: "Республика марказлари", completion: 0.7 }, // no STIR at all
    ]),
    (st) => unique.get(st)?.r.name,
  );
  const t = completionTree(s.orgs, registry);
  const all = t.flatMap((r) => r.groups.flatMap((g) => g.orgs));
  assert.equal(all.length, picks.length + 2);
  // every placed org sits in the region and group the registry gives its STIR
  for (const r of t)
    for (const g of r.groups.filter((x) => !x.unplaced))
      for (const o of g.orgs) {
        const at = unique.get(o.stir!)!;
        assert.equal(r.name, at.r.name);
        assert.equal(g.name, at.g.name);
      }
  const un = t.flatMap((r) => r.groups.filter((g) => g.unplaced).map((g) => [r.name, g.name, g.count]));
  assert.deepEqual(un.sort(), [[REPUBLIC, "Республика марказлари", 1], ["Самарқанд вилояти", "", 1]].sort());
  // SES rows keep their blocks and roles
  const sesGroup = t.flatMap((r) => r.groups).find((g) => g.name === ses.group);
  if (sesGroup) assert.ok(sesGroup.blocks && sesGroup.blocks.every((b) => b.orgs.every((o) => o.role)));
  // node figures add up
  for (const r of t) assert.equal(r.count, r.groups.reduce((n, g) => n + g.count, 0));
});

test("tree without a registry: region → republican bucket → organisations", () => {
  const s = regroup(snap([{ region: "Марказий аппарат", completion: 1 }, { region: "Андижон вилояти", completion: 0 }]));
  const t = completionTree(s.orgs);
  assert.deepEqual(
    t.map((r) => [r.name, r.groups.map((g) => g.name)]),
    [[REPUBLIC, ["Марказий аппарат"]], ["Андижон вилояти", [""]]],
  );
  assert.ok(t.every((r) => r.groups.every((g) => !g.unplaced)));
});
