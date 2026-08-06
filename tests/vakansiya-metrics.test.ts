import { test } from "node:test";
import assert from "node:assert/strict";
import { vacancyMetrics } from "../lib/vakansiya-metrics.ts";
import type { KadrlarStat } from "../lib/types.ts";

/** The verified national figures, 2026-08-06. */
const NATIONAL: KadrlarStat = {
  name: "",
  stavka: 715137, total: 689089, totalWomen: 549311, vacant: 26048,
  accepted: 64467, dismissed: 8140,
  u30: 92763, a3040: 232933, a4050: 188472, a5060: 135589, a60p: 39332,
  pensionWorking: 79596, pensionWorkingWomen: 58956,
  reaching: 14113, reachingWomen: 11156,
};

test("the rate is vacancies over established positions, not over staff", () => {
  const m = vacancyMetrics(NATIONAL);
  // 26 048 / 715 137 = 3.64%. Dividing by filled posts instead gives 3.78% --
  // a different, wronger number that would still look plausible.
  assert.ok(Math.abs(m.rate - 0.03642) < 0.0001, `got ${m.rate}`);
  assert.equal(m.vacant, 26048);
  assert.equal(m.filled, 689089);
  assert.equal(m.stavka, 715137);
});

test("net turnover is hires minus departures", () => {
  const m = vacancyMetrics(NATIONAL);
  assert.equal(m.accepted, 64467);
  assert.equal(m.dismissed, 8140);
  assert.equal(m.net, 56327);
});

test("an establishment of zero does not divide by zero", () => {
  const m = vacancyMetrics({ ...NATIONAL, stavka: 0, vacant: 0, total: 0 });
  assert.equal(m.rate, 0);
});

test("a rate is never negative or above 1", () => {
  // Upstream drift could deliver vacant > stavka; the map must not receive a
  // share outside [0,1], which riskT would then clamp without saying so.
  assert.equal(vacancyMetrics({ ...NATIONAL, stavka: 100, vacant: 150 }).rate, 1);
  assert.equal(vacancyMetrics({ ...NATIONAL, stavka: 100, vacant: -5 }).rate, 0);
});
