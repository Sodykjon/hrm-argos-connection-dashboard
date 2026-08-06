import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveArgosRegion, isNationalRow } from "../lib/parse-pension.ts";
// Imported rather than hard-coded: these assertions are about the residual row
// existing and carrying the right numbers, not about its wording.
import { PENSION_RESIDUAL } from "../lib/regions.ts";

test("resolves every plain Latin ARGOS region name", () => {
  assert.equal(resolveArgosRegion("Andijon viloyati"), "Андижон вилояти");
  assert.equal(resolveArgosRegion("Toshkent shahri"), "Тошкент шаҳри");
  assert.equal(resolveArgosRegion("Toshkent viloyati"), "Тошкент вилояти");
  assert.equal(resolveArgosRegion("Xorazm viloyati"), "Хоразм вилояти");
});

test("resolves Farg'ona spelled with a Cyrillic 'о' (U+043E)", () => {
  // This is what ARGOS actually returns — verified by code point 2026-08-05.
  const upstream = "Farg‘оna viloyati";
  assert.equal(upstream.charCodeAt(5), 0x043e, "fixture must hold Cyrillic о");
  assert.equal(resolveArgosRegion(upstream), "Фарғона вилояти");
});

test("resolves every apostrophe variant", () => {
  for (const ap of ["‘", "’", "'", "ʻ", "ʼ", "`"]) {
    assert.equal(
      resolveArgosRegion(`Qoraqalpog${ap}iston Respublikasi`),
      "Қорақалпоғистон Республикаси",
      `apostrophe U+${ap.charCodeAt(0).toString(16)} should resolve`,
    );
  }
});

test("is idempotent on an already-canonical Cyrillic name", () => {
  assert.equal(resolveArgosRegion("Фарғона вилояти"), "Фарғона вилояти");
  assert.equal(resolveArgosRegion("Тошкент шаҳри"), "Тошкент шаҳри");
});

test("tolerates case and stray whitespace", () => {
  assert.equal(resolveArgosRegion("  buxoro   VILOYATI "), "Бухоро вилояти");
});

test("throws with the offending name for an unknown region", () => {
  assert.throws(
    () => resolveArgosRegion("Atlantis viloyati"),
    /Atlantis viloyati/,
    "the error must name the string so the upload error tells the user what broke",
  );
});

test("recognises the national row marker", () => {
  for (const s of ["МИЛЛИЙ", "milliy", " Жами ", "ИТОГО", "total", ""]) {
    assert.equal(isNationalRow(s), true, `${JSON.stringify(s)} is national`);
  }
  assert.equal(isNationalRow("Andijon viloyati"), false);
});

import { parsePensionCsv } from "../lib/parse-pension.ts";

const HEADER =
  "hudud;jami;jami_ayol;a3040;a3040_ayol;a4050;a4050_ayol;a5060;a5060_ayol;" +
  "a60p;a60p_ayol;pensiya;pensiya_ayol;yetadigan;yetadigan_ayol";

/** A row with `total` split evenly across the shape, so sums are easy to check. */
function row(name: string, total: number): string {
  const w = Math.round(total * 0.8);
  return [name, total, w, 0, 0, 0, 0, 0, 0, 0, 0, total, w, 0, 0].join(";");
}

test("parses a national-only CSV into an empty region list", () => {
  const csv = `${HEADER}\n${row("МИЛЛИЙ", 1000)}`;
  const { snapshot } = parsePensionCsv(csv, "HRM_pensiya_2026-08-05.csv");
  assert.equal(snapshot.date, "2026-08-05");
  assert.equal(snapshot.overall.total, 1000);
  assert.equal(snapshot.overall.totalWomen, 800);
  assert.deepEqual(snapshot.regions, []);
});

test("appends the residual row = national minus the sum of regions", () => {
  const csv = [
    HEADER,
    row("МИЛЛИЙ", 1000),
    row("Andijon viloyati", 300),
    row("Buxoro viloyati", 200),
  ].join("\n");
  const { snapshot } = parsePensionCsv(csv, "HRM_pensiya_2026-08-05.csv");

  assert.equal(snapshot.regions.length, 3, "2 regions + 1 residual");
  const residual = snapshot.regions.at(-1);
  assert.equal(residual?.name, PENSION_RESIDUAL);
  assert.equal(residual?.total, 500);
  assert.equal(residual?.totalWomen, 800 - 240 - 160);
  assert.equal(residual?.pensionWorking, 500);
});

test("omits the residual row when the regions already account for everything", () => {
  const csv = [HEADER, row("МИЛЛИЙ", 500), row("Andijon viloyati", 500)].join("\n");
  const { snapshot } = parsePensionCsv(csv, "HRM_pensiya_2026-08-05.csv");
  assert.equal(snapshot.regions.length, 1);
  assert.equal(snapshot.regions[0].name, "Андижон вилояти");
});

test("rejects a CSV whose regions exceed the national total", () => {
  const csv = [HEADER, row("МИЛЛИЙ", 100), row("Andijon viloyati", 300)].join("\n");
  assert.throws(
    () => parsePensionCsv(csv, "HRM_pensiya_2026-08-05.csv"),
    /Ҳудудлар йиғиндиси/,
    "a negative residual means the national and regional pulls disagree",
  );
});

test("rejects a CSV with no national row", () => {
  const csv = [HEADER, row("Andijon viloyati", 300)].join("\n");
  assert.throws(() => parsePensionCsv(csv, "x.csv"), /МИЛЛИЙ/);
});

test("names the offending region when one cannot be resolved", () => {
  const csv = [HEADER, row("МИЛЛИЙ", 900), row("Atlantis viloyati", 100)].join("\n");
  assert.throws(() => parsePensionCsv(csv, "x.csv"), /Atlantis viloyati/);
});

test("warns but does not fail on a duplicated region row", () => {
  const csv = [
    HEADER,
    row("МИЛЛИЙ", 1000),
    row("Andijon viloyati", 300),
    row("Andijon viloyati", 300),
  ].join("\n");
  const { snapshot, warnings } = parsePensionCsv(csv, "x.csv");
  // Assert on content, not count: a partial upload legitimately also warns
  // about the 13 regions it is missing.
  assert.ok(
    warnings.some((w) => /Такрорланган ҳудуд/.test(w) && /Андижон вилояти/.test(w)),
  );
  assert.equal(
    snapshot.regions.filter((r) => r.name === "Андижон вилояти").length,
    1,
    "the duplicate is dropped, not summed",
  );
});

test("tolerates a BOM, CRLF line endings and thin-space grouped numbers", () => {
  const csv =
    "﻿" + [HEADER, "МИЛЛИЙ;689 461;549 586;0;0;0;0;0;0;0;0;79 672;59 000;15 309;12 177"].join("\r\n");
  const { snapshot } = parsePensionCsv(csv, "HRM_pensiya_2026-08-05.csv");
  assert.equal(snapshot.overall.total, 689461);
  assert.equal(snapshot.overall.pensionWorking, 79672);
  assert.equal(snapshot.overall.reachingWomen, 12177);
});

/** Same shape as row(), but overrides a single column by its CSV header name
 *  (as it appears in HEADER) -- for isolating one non-`total` field's
 *  behaviour from the rest of the shape. */
function rowWith(
  name: string,
  total: number,
  field: string,
  value: number,
): string {
  const cells = row(name, total).split(";");
  cells[HEADER.split(";").indexOf(field)] = String(value);
  return cells.join(";");
}

test("clamps a single overshooting non-total field to 0 and warns, without throwing", () => {
  // `total` reconciles (300 + 200 = 500 <= 1000), so the hard refusal never
  // fires. But the regional pulls of "a3040" alone sum to 80 (Andijon's 80 +
  // Buxoro's 0), overshooting the national pull's a3040 of 50 -- exactly the
  // drift between 15 separate live requests that the residual guard must
  // tolerate instead of rejecting the whole upload.
  const csv = [
    HEADER,
    rowWith("МИЛЛИЙ", 1000, "a3040", 50),
    rowWith("Andijon viloyati", 300, "a3040", 80),
    row("Buxoro viloyati", 200),
  ].join("\n");
  const { snapshot, warnings } = parsePensionCsv(
    csv,
    "HRM_pensiya_2026-08-05.csv",
  );

  assert.equal(snapshot.regions.length, 3, "2 regions + 1 residual");
  const residual = snapshot.regions.at(-1);
  assert.equal(residual?.name, PENSION_RESIDUAL);
  assert.equal(
    residual?.a3040,
    0,
    "the overshooting field is clamped, not left negative",
  );
  assert.equal(
    residual?.total,
    500,
    "total reconciled, so the hard guard above never touches this row",
  );
  assert.equal(
    residual?.totalWomen,
    400,
    "a field that did not overshoot keeps its real subtracted value",
  );
  assert.equal(
    residual?.pensionWorking,
    500,
    "the clamp is surgical -- unrelated fields are unaffected",
  );

  // Content, not count: a partial upload also warns about missing regions.
  const clamp = warnings.find((w) => /қолдиқ қатори 0/.test(w));
  assert.ok(clamp, "the clamp must announce itself");
  assert.match(clamp, /a3040/, "the warning names the offending column");
  assert.match(clamp, /30/, "the warning names the overshoot amount");
});

// --- input guards -----------------------------------------------------------
// Every field is read positionally, so without these the parser trusts the
// bookmarklet completely. The first real 15-row upload is when that bites.

test("throws naming the column when the header order is wrong", () => {
  const swapped = HEADER.replace(
    "jami;jami_ayol",
    "jami_ayol;jami",
  );
  assert.throws(
    () => parsePensionCsv(`${swapped}\n${row("МИЛЛИЙ", 1000)}`, "x.csv"),
    /2-устун "jami"/,
    "a reordered header must fail loudly, not silently read the wrong columns",
  );
});

test("warns on a region row whose total is zero", () => {
  const csv = [
    HEADER,
    row("МИЛЛИЙ", 1000),
    row("Andijon viloyati", 0),
    row("Buxoro viloyati", 400),
  ].join("\n");
  const { warnings } = parsePensionCsv(csv, "x.csv");
  assert.ok(
    warnings.some((w) => /Андижон вилояти/.test(w) && /0/.test(w)),
    "a zero-total region would otherwise render as the healthiest in the country",
  );
});

test("warns when geographic regions are missing, naming them", () => {
  const csv = [HEADER, row("МИЛЛИЙ", 1000), row("Andijon viloyati", 300)].join("\n");
  const { warnings } = parsePensionCsv(csv, "x.csv");
  const w = warnings.find((x) => /Йўқ:/.test(x));
  assert.ok(w, "an omitted region is silently absorbed into the residual");
  assert.match(w, /Бухоро вилояти/);
  assert.match(w, /Хоразм вилояти/);
});

test("does not warn about missing regions on a national-only upload", () => {
  const { warnings } = parsePensionCsv(
    `${HEADER}\n${row("МИЛЛИЙ", 1000)}`,
    "x.csv",
  );
  assert.equal(warnings.filter((w) => /Йўқ:/.test(w)).length, 0);
});

test("keeps the first national row and warns about a second", () => {
  const csv = [HEADER, row("МИЛЛИЙ", 1000), row("МИЛЛИЙ", 5)].join("\n");
  const { snapshot, warnings } = parsePensionCsv(csv, "x.csv");
  assert.equal(snapshot.overall.total, 1000, "the first national row wins");
  assert.ok(warnings.some((w) => /иккинчи миллий/i.test(w)));
});

test("warns when a non-empty cell is not a number, and treats it as 0", () => {
  const bad = [
    "Andijon viloyati", 300, 240, "н/д", 0, 0, 0, 0, 0, 0, 0, 300, 240, 0, 0,
  ].join(";");
  const csv = [HEADER, row("МИЛЛИЙ", 1000), bad].join("\n");
  const { snapshot, warnings } = parsePensionCsv(csv, "x.csv");
  const andijon = snapshot.regions.find((r) => r.name === "Андижон вилояти");
  assert.equal(andijon?.a3040, 0);
  assert.ok(warnings.some((w) => /a3040/.test(w) && /н\/д/.test(w)));
});
