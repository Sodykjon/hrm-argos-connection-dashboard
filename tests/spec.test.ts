// Contract for the per-specialty dataset (data/mutaxassislik-*.json): the
// regeneration script must keep region order, reconcile group totals against
// the tarkib dataset, and never resurrect the broken «Жами лавозимлар» row.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SV,
  specTaminl,
  specGap,
  type SpecData,
} from "../lib/spec-metrics.ts";
import type { TarkibData } from "../lib/tarkib-metrics.ts";
import { GEO_REGIONS } from "../lib/regions.ts";

const SPEC = JSON.parse(
  readFileSync(
    new URL("../data/mutaxassislik-2026-08-03.json", import.meta.url),
    "utf8",
  ),
) as SpecData;
const TARKIB = JSON.parse(
  readFileSync(new URL("../data/tarkib-2026-08-03.json", import.meta.url), "utf8"),
) as TarkibData;

test("region order matches GEO_REGIONS exactly", () => {
  assert.deepEqual(SPEC.regionOrder, GEO_REGIONS);
});

test("no «Жами лавозимлар», slugs unique, every cat has 14 region rows", () => {
  assert.ok(!SPEC.cats.some((c) => /jami lavozimlar/i.test(c.src)));
  const slugs = new Set(SPEC.cats.map((c) => c.slug));
  assert.equal(slugs.size, SPEC.cats.length);
  for (const c of SPEC.cats) assert.equal(c.r.length, 14, c.src);
});

test("kardiolog family is present and searchable by the Latin source name", () => {
  const kard = SPEC.cats.filter((c) => c.src.toLowerCase().includes("kardiolog"));
  assert.ok(kard.length >= 3, "expected several kardiolog rows");
  const main = SPEC.cats.find((c) => c.src === "Vrach kardiolog");
  assert.ok(main, "Vrach kardiolog missing");
  assert.ok(main!.nat[SV.shtat] > 500);
});

test("national values equal the sum of region values", () => {
  for (const c of SPEC.cats) {
    for (const i of [SV.shtat, SV.band, SV.jismoniy, SV.bosh] as const) {
      const sum = c.r.reduce((a, v) => a + (v[i] ?? 0), 0);
      assert.ok(
        Math.abs((c.nat[i] ?? 0) - sum) < 0.6,
        `${c.src}: field ${i} drift ${c.nat[i]} vs ${sum}`,
      );
    }
  }
});

test("«Врачлар жами» reconciles with the tarkib dataset's doctor row", () => {
  const vj = SPEC.cats.find((c) => c.src === "Vrachlar jami")!;
  assert.ok(vj.agg);
  assert.equal(vj.nat[SV.jismoniy], TARKIB.national.vrach.jismoniy);
  assert.ok(Math.abs(vj.nat[SV.shtat] - TARKIB.national.vrach.shtat) < 0.5);
  assert.equal(vj.nat[SV.pens], TARKIB.national.vrach.pens);
});

test("derivations behave on broken rows (null pens stays null, shares safe)", () => {
  const broken = SPEC.cats.flatMap((c) => c.r).find((v) => v[SV.pens] === null);
  assert.ok(broken, "expected at least one nulled row in the dataset");
  assert.equal(broken![SV.pens], null);
  // shtat-side derivations must still work there
  assert.ok(Number.isFinite(specTaminl(broken!)));
  assert.ok(Number.isFinite(specGap(broken!)));
});
