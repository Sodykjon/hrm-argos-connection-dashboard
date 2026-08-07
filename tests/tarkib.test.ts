// The tarkib dataset is regenerated offline from the 14 regional workbooks;
// these tests are the contract that regeneration must keep: canonical region
// keys, and aggregates that reconcile exactly the way the PDF reports' did.
//
// The JSON is read with readFileSync rather than through lib/tarkib.ts because
// node --test resolves no "@/" alias (same approach as seed-kadrlar.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  vrachTaminlShare,
  vrachHidden,
  type TarkibData,
} from "../lib/tarkib-metrics.ts";
import { GEO_REGIONS } from "../lib/regions.ts";

const TARKIB = JSON.parse(
  readFileSync(new URL("../data/tarkib-2026-08-03.json", import.meta.url), "utf8"),
) as TarkibData;

test("region keys are exactly the 14 canonical geographic names", () => {
  const keys = Object.keys(TARKIB.regions).sort();
  assert.deepEqual(keys, [...GEO_REGIONS].sort());
});

test("national row equals the sum of the 14 regions", () => {
  const sum = (pick: (r: (typeof TARKIB.regions)[string]) => number) =>
    Object.values(TARKIB.regions).reduce((acc, r) => acc + pick(r), 0);
  assert.ok(Math.abs(TARKIB.national.shtat - sum((r) => r.shtat)) < 0.5);
  assert.equal(TARKIB.national.jismoniy, sum((r) => r.jismoniy));
  assert.equal(TARKIB.national.pens, sum((r) => r.pens));
  assert.equal(TARKIB.national.qabul, sum((r) => r.qabul));
  assert.equal(
    TARKIB.national.vrach.jismoniy,
    sum((r) => r.vrach.jismoniy),
  );
});

test("known headline figures from the verified 03.08.2026 snapshot", () => {
  assert.equal(TARKIB.national.jismoniy, 544674);
  assert.equal(TARKIB.national.pens, 55760);
  assert.equal(TARKIB.national.vrach.jismoniy, 75252);
  // National doctor coverage 74.0% — the figure the ministry reports lead with.
  assert.ok(Math.abs(vrachTaminlShare(TARKIB.national) - 0.74) < 0.005);
});

test("each region's district rows reconcile to the region", () => {
  for (const [name, r] of Object.entries(TARKIB.regions)) {
    const ds = r.districts.reduce((a, d) => a + d.shtat, 0);
    const dj = r.districts.reduce((a, d) => a + d.jismoniy, 0);
    const dp = r.districts.reduce((a, d) => a + d.pens, 0);
    assert.ok(Math.abs(ds - r.shtat) < 1, `${name}: district shtat drift`);
    assert.ok(Math.abs(dj - r.jismoniy) < 2, `${name}: district jismoniy drift`);
    assert.ok(Math.abs(dp - r.pens) < 2, `${name}: district pens drift`);
    assert.ok(r.districts.length >= 12, `${name}: suspiciously few districts`);
  }
});

test("each region's category rows reconcile to the region", () => {
  for (const [name, r] of Object.entries(TARKIB.regions)) {
    assert.equal(r.cats.length, 6, `${name}: expected 6 categories`);
    const cs = r.cats.reduce((a, c) => a + c.shtat, 0);
    const cj = r.cats.reduce((a, c) => a + c.jismoniy, 0);
    assert.ok(Math.abs(cs - r.shtat) < 1, `${name}: category shtat drift`);
    assert.ok(Math.abs(cj - r.jismoniy) < 2, `${name}: category jismoniy drift`);
  }
});

test("hidden doctor vacancy is non-negative and sane", () => {
  for (const [name, r] of Object.entries(TARKIB.regions)) {
    const hidden = vrachHidden(r);
    assert.ok(hidden >= 0, `${name}: negative hidden vacancy`);
    assert.ok(
      hidden <= r.vrach.shtat,
      `${name}: hidden vacancy exceeds the штат`,
    );
  }
});
