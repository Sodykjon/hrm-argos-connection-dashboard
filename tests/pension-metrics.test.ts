import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pensionMetrics,
  pensionForecast,
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

// --- pensionForecast ---------------------------------------------------------

/** The constructor pull of 2026-08-06 — the seed the page actually renders. */
const SEED: KadrlarStat = {
  name: "",
  stavka: 715137, total: 689089, totalWomen: 549311, vacant: 26048,
  accepted: 64467, dismissed: 8140,
  u30: 92763, a3040: 232933, a4050: 188472, a5060: 135589, a60p: 39332,
  pensionWorking: 79596, pensionWorkingWomen: 58956,
  reaching: 14113, reachingWomen: 11156,
};

test("forecast reproduces the seed figures exactly", () => {
  // womenPension5560 = 79 596 − 39 332 = 40 264
  // R = 135 589 − 40 264 − 14 113 = 81 212
  const [now, eoy, y5, y10] = pensionForecast(SEED);
  assert.equal(now.count, 79596);
  assert.equal(eoy.count, 93709);
  assert.equal(y5.count, 134315);
  assert.equal(y10.count, 174921);
  assert.ok(Math.abs(now.share - 0.1155) < 1e-4);
  assert.ok(Math.abs(eoy.share - 0.136) < 1e-4);
  assert.ok(Math.abs(y5.share - 0.1949) < 1e-4);
  assert.ok(Math.abs(y10.share - 0.2538) < 1e-4);
});

test("only the 5- and 10-year points are estimates", () => {
  // The chart draws estimate bars differently; a real point marked as an
  // estimate undermines the two figures that ARE measurements, and the
  // reverse presents a guess as a fact in front of the Minister.
  assert.deepEqual(
    pensionForecast(SEED).map((p) => p.estimate),
    [false, false, true, true],
  );
});

test("forecast counts never decrease across horizons", () => {
  const pts = pensionForecast(SEED);
  for (let i = 1; i < pts.length; i++) {
    assert.ok(pts[i].count >= pts[i - 1].count, `${pts[i].key} >= ${pts[i - 1].key}`);
  }
});

test("forecast survives a60p exceeding pensionWorking", () => {
  // Known drift case: womenPension5560 clamps to 0 and R = a5060 − reaching.
  // Monotonicity must hold rather than R going negative.
  const pts = pensionForecast({ ...SEED, pensionWorking: 30000, a60p: 39332 });
  assert.equal(pts[1].count, 30000 + SEED.reaching);
  assert.equal(pts[3].count, pts[1].count + (SEED.a5060 - SEED.reaching));
  for (let i = 1; i < pts.length; i++) {
    assert.ok(pts[i].count >= pts[i - 1].count);
  }
});

test("forecast with an empty population yields zero shares, no NaN", () => {
  const pts = pensionForecast({
    ...SEED, total: 0, pensionWorking: 0, reaching: 0, a5060: 0, a60p: 0,
  });
  for (const p of pts) {
    assert.equal(p.count, 0);
    assert.equal(p.share, 0);
  }
});

test("forecast clamps negative inputs before deriving anything", () => {
  const pts = pensionForecast({ ...SEED, a5060: -10, reaching: -5 });
  for (const p of pts) {
    assert.ok(Number.isFinite(p.share));
    assert.ok(p.count >= 0);
  }
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
