import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pensionMetrics,
  ageBands,
  riskRamp,
  riskT,
  riskColor,
} from "../lib/pension-metrics.ts";
import type { KadrlarStat } from "../lib/types.ts";

/** The verified national figures, 2026-08-05. */
const NATIONAL: KadrlarStat = {
  name: "",
  stavka: 780000, vacant: 90515, accepted: 4210, dismissed: 3980,
  total: 689461, totalWomen: 549586,
  u30: 92812,
  a3040: 233005, a4050: 188630, a5060: 135652, a60p: 39362,
  pensionWorking: 79672, pensionWorkingWomen: 59000,
  reaching: 15309, reachingWomen: 12177,
};

test("exposure is pension-age-working plus reaching-this-year", () => {
  const m = pensionMetrics(NATIONAL);
  assert.equal(m.exposed, 94981);
  assert.ok(Math.abs(m.exposedShare - 0.13776) < 0.0001);
  assert.ok(Math.abs(m.workingShare - 0.11556) < 0.0001);
  assert.ok(Math.abs(m.reachingShare - 0.02221) < 0.0001);
});

test('the national figure needs the "nearly" qualifier', () => {
  const m = pensionMetrics(NATIONAL);
  assert.equal(m.oneIn, 7);
  assert.equal(
    m.nearly,
    true,
    "13.78% is below one-in-seven (14.29%), so a bare 'one in 7' overstates",
  );
});

test("a share above 1/N drops the qualifier", () => {
  // 15% -> rounds to one-in-7 (14.29%), which understates. Safe, no qualifier.
  const m = pensionMetrics({ ...NATIONAL, total: 1000, pensionWorking: 150, reaching: 0 });
  assert.equal(m.oneIn, 7);
  assert.equal(m.nearly, false);
});

test("an empty population does not divide by zero", () => {
  const m = pensionMetrics({ ...NATIONAL, total: 0, pensionWorking: 0, reaching: 0 });
  assert.equal(m.exposed, 0);
  assert.equal(m.exposedShare, 0);
  assert.equal(m.oneIn, 0);
  assert.equal(m.nearly, false);
});

test("age bands are read straight from the source, not derived", () => {
  const b = ageBands(NATIONAL);
  assert.equal(b.length, 5);
  assert.deepEqual(b.map((x) => x.key), ["u30", "a3040", "a4050", "a5060", "a60p"]);
  assert.equal(
    b.reduce((a, x) => a + x.total, 0),
    NATIONAL.total,
    "five bands still account for every employee",
  );
});

test("u30 comes from the column, not from subtracting the other four", () => {
  // Deliberately inconsistent: the subtraction would give 92 812, the column
  // says 1 234. A derived implementation returns the former and fails here.
  const b = ageBands({ ...NATIONAL, u30: 1234 });
  assert.equal(b[0].key, "u30");
  assert.equal(b[0].total, 1234);
});

test("age bands clamp a negative to zero", () => {
  // Upstream drift can still deliver a negative; it must not reach a chart.
  const b = ageBands({ ...NATIONAL, a60p: -5 });
  assert.equal(b.find((x) => x.key === "a60p")?.total, 0);
});

test("age bands carry no gender — the constructor does not supply it", () => {
  for (const band of ageBands(NATIONAL)) {
    assert.deepEqual(Object.keys(band).sort(), ["key", "total"]);
  }
});

test("the risk ramp spans the observed spread, worst mapped to 1", () => {
  const ramp = riskRamp([0.1, 0.12, 0.15]);
  assert.equal(ramp.min, 0.1);
  assert.equal(ramp.max, 0.15);
  assert.equal(riskT(0.15, ramp), 1, "highest share = worst");
  assert.equal(riskT(0.1, ramp), 0, "lowest share = best");
  assert.ok(Math.abs(riskT(0.125, ramp) - 0.5) < 1e-9);
});

test("a flat spread does not divide by zero", () => {
  const ramp = riskRamp([0.12, 0.12, 0.12]);
  assert.equal(riskT(0.12, ramp), 0.5);
});

test("an empty region list yields a usable ramp", () => {
  const ramp = riskRamp([]);
  assert.equal(riskT(0.5, ramp), 0.5);
});

test("worst is red and best is green, the opposite of rampColor", () => {
  assert.equal(riskColor(1), "rgb(228, 72, 61)", "worst = red");
  assert.equal(riskColor(0), "rgb(16, 160, 109)", "best = green");
});

test("at exactly one-in-N the qualifier drops — equality falls on the safe side", () => {
  // 100/700 is exactly 1/7. The comparison is strict `<`, so "ҳар 7 нафардан
  // бири" is precisely true here and must NOT be softened to "деярли".
  const m = pensionMetrics({
    ...NATIONAL,
    total: 700,
    pensionWorking: 100,
    reaching: 0,
  });
  assert.equal(m.oneIn, 7);
  assert.equal(m.nearly, false);
});
