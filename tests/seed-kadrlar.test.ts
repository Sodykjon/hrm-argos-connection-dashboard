import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { KadrlarStat } from "../lib/types.ts";

// lib/data.ts imports this seed with `as unknown as KadrlarSnapshot`, so the
// compiler never looks at it. It drifted out of shape once during the source
// switch and nothing caught it; this is what catches it next time.
//
// `satisfies Record<keyof KadrlarStat, true>` rather than a `keyof[]` array on
// purpose: an array annotated `Array<keyof T>` still compiles when a key is
// MISSING, so it would only have caught the seed losing a field — not the type
// gaining one, which is the direction that actually breaks.
const REQUIRED = {
  name: true, stavka: true, total: true, totalWomen: true, vacant: true,
  accepted: true, dismissed: true,
  u30: true, a3040: true, a4050: true, a5060: true, a60p: true,
  pensionWorking: true, pensionWorkingWomen: true,
  reaching: true, reachingWomen: true,
} satisfies Record<keyof KadrlarStat, true>;

const seed = JSON.parse(
  readFileSync(new URL("../data/seed-kadrlar.json", import.meta.url), "utf8"),
);

test("the seed carries exactly the fields KadrlarStat declares", () => {
  assert.deepEqual(Object.keys(seed.overall).sort(), Object.keys(REQUIRED).sort());
});

test("every seed count is a non-negative integer", () => {
  for (const k of Object.keys(REQUIRED)) {
    if (k === "name") continue;
    const v = seed.overall[k];
    assert.equal(typeof v, "number", `${k} must be a number`);
    assert.ok(Number.isInteger(v) && v >= 0, `${k} must be a non-negative integer, got ${v}`);
  }
});

test("the seed's staffing identity holds", () => {
  // It renders on /pensiya and / whenever storage is empty, so it is subject to
  // the same check the parser applies to an uploaded row.
  const o = seed.overall;
  assert.equal(o.stavka, o.total + o.vacant);
});

test("the seed has no regions — the regional cut arrives with the first pull", () => {
  assert.deepEqual(seed.regions, []);
  assert.match(seed.date, /^\d{4}-\d{2}-\d{2}$/);
});
