import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveArgosRegion, isNationalRow } from "../lib/parse-pension.ts";

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
  assert.equal(residual?.name, "Марказий аппарат ва республика марказлари");
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
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Андижон вилояти/);
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
