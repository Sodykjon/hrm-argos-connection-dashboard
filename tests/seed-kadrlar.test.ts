import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { KadrlarStat } from "../lib/types.ts";

// lib/data.ts imports this seed with `as unknown as KadrlarSnapshot`, so the
// compiler never looks at it. It drifted out of shape once already during the
// source switch and nothing caught it; this is what catches it next time.
const seed = JSON.parse(readFileSync("data/seed-kadrlar.json", "utf8"));

const REQUIRED: Array<keyof KadrlarStat> = [
  "name", "stavka", "total", "totalWomen", "vacant", "accepted", "dismissed",
  "u30", "a3040", "a4050", "a5060", "a60p",
  "pensionWorking", "pensionWorkingWomen", "reaching", "reachingWomen",
];

test("the seed carries exactly the fields KadrlarStat declares", () => {
  const got = Object.keys(seed.overall).sort();
  assert.deepEqual(got, [...REQUIRED].sort());
});

test("every seed count is a non-negative integer", () => {
  for (const k of REQUIRED) {
    if (k === "name") continue;
    const v = seed.overall[k];
    assert.equal(typeof v, "number", `${k} must be a number`);
    assert.ok(Number.isInteger(v) && v >= 0, `${k} must be a non-negative integer, got ${v}`);
  }
});

test("the seed has no regions — the regional cut arrives with the first pull", () => {
  assert.deepEqual(seed.regions, []);
  assert.match(seed.date, /^\d{4}-\d{2}-\d{2}$/);
});
