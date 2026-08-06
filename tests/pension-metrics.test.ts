import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pensionMetrics,
  ageBands,
  riskRamp,
  riskT,
  riskColor,
  replacementWave,
} from "../lib/pension-metrics.ts";
import type { PensionStat } from "../lib/types.ts";

/** The verified national figures, 2026-08-05. */
const NATIONAL: PensionStat = {
  name: "",
  total: 689461, totalWomen: 549586,
  a3040: 233005, a3040Women: 192116,
  a4050: 188630, a4050Women: 158289,
  a5060: 135652, a5060Women: 106055,
  a60p: 39362, a60pWomen: 18690,
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

test("the under-30 band is the remainder and completes the breakdown", () => {
  const bands = ageBands(NATIONAL);
  assert.equal(bands.length, 5);
  assert.equal(bands[0].key, "u30");
  assert.equal(bands[0].total, 92812);
  assert.equal(bands[0].women, 74436);
  assert.equal(
    bands.reduce((a, b) => a + b.total, 0),
    NATIONAL.total,
    "five bands must account for every employee",
  );
});

test("men are never negative when a band's women exceed its total", () => {
  // Upstream drift can make a sub-count exceed its parent by a handful.
  const bands = ageBands({ ...NATIONAL, a60p: 100, a60pWomen: 140 });
  const b60 = bands.find((b) => b.key === "a60p");
  assert.equal(b60?.men, 0);
});

test("the under-30 band clamps at zero rather than going negative", () => {
  const bands = ageBands({ ...NATIONAL, total: 100 });
  assert.equal(bands[0].total, 0);
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

test("the replacement wave accumulates age bands and never double-counts", () => {
  const w = replacementWave(NATIONAL);
  assert.equal(w.length, 3);
  // Each step is the previous plus exactly one band — mutually exclusive, so a
  // person can appear once and only once.
  assert.equal(w[0].count, 39362, "now = 60+");
  assert.equal(w[1].count, 39362 + 135652, "+ the 50-60 band");
  assert.equal(w[2].count, 39362 + 135652 + 188630, "+ the 40-50 band");
  assert.ok(w[0].count < w[1].count && w[1].count < w[2].count, "strictly rising");
  // The pension counts cut across the bands, so they must not appear here.
  assert.notEqual(w[0].count, NATIONAL.pensionWorking);
  assert.ok(
    w[2].count <= NATIONAL.total,
    "the wave can never exceed the workforce it is drawn from",
  );
});

test("the replacement wave survives an empty population", () => {
  const w = replacementWave({ ...NATIONAL, total: 0, a60p: 0, a5060: 0, a4050: 0 });
  assert.deepEqual(w.map((s) => s.count), [0, 0, 0]);
  assert.deepEqual(w.map((s) => s.share), [0, 0, 0]);
});
