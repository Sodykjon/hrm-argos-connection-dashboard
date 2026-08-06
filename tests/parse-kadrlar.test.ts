import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveArgosRegion, isNationalRow } from "../lib/parse-kadrlar.ts";
// Imported rather than hard-coded: these assertions are about the level rows
// existing and carrying the right numbers, not about their wording.
import { LEVEL_REPUBLICAN, LEVEL_DISTRICT } from "../lib/regions.ts";

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

test("resolves the two ARGOS level names", () => {
  assert.equal(resolveArgosRegion("Республика даражаси"), LEVEL_REPUBLICAN);
  assert.equal(resolveArgosRegion("Туман/шаҳар даражаси"), LEVEL_DISTRICT);
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

// --- CSV parsing ------------------------------------------------------------

import { parseKadrlarCsv } from "../lib/parse-kadrlar.ts";

const HEADER =
  "hudud;shtat;jami;jami_ayol;vakansiya;qabul;boshagan;u30;a3040;a4050;a5060;a60p;" +
  "pensiya;pensiya_ayol;yetadigan;yetadigan_ayol";

/** A row whose staffing identity holds: shtat = jami + vakansiya. */
function row(name: string, total: number, vacant = 0): string {
  const w = Math.round(total * 0.8);
  return [name, total + vacant, total, w, vacant, 0, 0,
          total, 0, 0, 0, 0, total, w, 0, 0].join(";");
}

const NL = String.fromCharCode(10);

test("parses a national-only CSV into an empty region list", () => {
  const { snapshot } = parseKadrlarCsv(
    [HEADER, row("МИЛЛИЙ", 1000)].join(NL), "HRM_kadrlar_2026-08-06.csv");
  assert.equal(snapshot.date, "2026-08-06");
  assert.equal(snapshot.overall.total, 1000);
  assert.equal(snapshot.overall.totalWomen, 800);
  assert.deepEqual(snapshot.regions, []);
});

test("reads staffing and vacancies", () => {
  const { snapshot } = parseKadrlarCsv(
    [HEADER, row("МИЛЛИЙ", 1000, 120)].join(NL), "x.csv");
  assert.equal(snapshot.overall.stavka, 1120);
  assert.equal(snapshot.overall.total, 1000);
  assert.equal(snapshot.overall.vacant, 120);
});

test("keeps the two ARGOS level rows as ordinary rows", () => {
  const { snapshot, warnings } = parseKadrlarCsv([
    HEADER,
    row("МИЛЛИЙ", 1000),
    row("Andijon viloyati", 300),
    row("Республика даражаси", 500),
    row("Туман/шаҳар даражаси", 200),
  ].join(NL), "HRM_kadrlar_2026-08-06.csv");
  assert.equal(snapshot.regions.length, 3);
  const names = snapshot.regions.map((r) => r.name);
  assert.ok(names.includes(LEVEL_REPUBLICAN));
  assert.ok(names.includes(LEVEL_DISTRICT));
  assert.equal(
    warnings.filter((w) => /Қаторлар йиғиндиси/.test(w)).length,
    0,
    "300 + 500 + 200 reconciles with 1000",
  );
});

test("warns with the amount when the rows do not reconcile", () => {
  const { warnings } = parseKadrlarCsv(
    [HEADER, row("МИЛЛИЙ", 1000), row("Andijon viloyati", 300)].join(NL), "x.csv");
  assert.ok(
    warnings.some((w) => /Қаторлар йиғиндиси/.test(w) && /700/.test(w)),
    "the shortfall must be named, not absorbed into an invented row",
  );
});

test("never synthesises a row by subtraction", () => {
  const { snapshot } = parseKadrlarCsv(
    [HEADER, row("МИЛЛИЙ", 1000), row("Andijon viloyati", 300)].join(NL), "x.csv");
  assert.equal(snapshot.regions.length, 1, "only rows that were actually in the file");
});

test("warns when shtat does not equal employees plus vacancies", () => {
  // 999 != 1000 + 120. The vacancy page rests on this identity holding.
  const bad = ["Andijon viloyati", 999, 1000, 800, 120, 0, 0,
               1000, 0, 0, 0, 0, 1000, 800, 0, 0].join(";");
  const { warnings } = parseKadrlarCsv(
    [HEADER, row("МИЛЛИЙ", 5000), bad].join(NL), "x.csv");
  assert.ok(warnings.some((w) => /штат/.test(w) && /Андижон/.test(w)));
});

test("rejects a CSV with no national row", () => {
  assert.throws(
    () => parseKadrlarCsv([HEADER, row("Andijon viloyati", 300)].join(NL), "x.csv"),
    /МИЛЛИЙ/,
  );
});

test("names the offending region when one cannot be resolved", () => {
  assert.throws(
    () => parseKadrlarCsv(
      [HEADER, row("МИЛЛИЙ", 900), row("Atlantis viloyati", 100)].join(NL), "x.csv"),
    /Atlantis viloyati/,
  );
});

test("warns but does not fail on a duplicated region row", () => {
  const { snapshot, warnings } = parseKadrlarCsv([
    HEADER, row("МИЛЛИЙ", 1000), row("Andijon viloyati", 300), row("Andijon viloyati", 300),
  ].join(NL), "x.csv");
  assert.ok(warnings.some((w) => /Такрорланган ҳудуд/.test(w) && /Андижон вилояти/.test(w)));
  assert.equal(
    snapshot.regions.filter((r) => r.name === "Андижон вилояти").length,
    1,
    "the duplicate is dropped, not summed",
  );
});

test("tolerates a BOM, CRLF line endings and thin-space grouped numbers", () => {
  const BOM = String.fromCharCode(0xfeff);
  const CRLF = String.fromCharCode(13, 10);
  const csv = BOM + [
    HEADER,
    "МИЛЛИЙ;780 000;689 485;549 622;90 515;0;0;92 780;233 081;188 588;135 681;39 355;79 686;59 019;15 306;12 176",
  ].join(CRLF);
  const { snapshot } = parseKadrlarCsv(csv, "HRM_kadrlar_2026-08-06.csv");
  assert.equal(snapshot.overall.total, 689485);
  assert.equal(snapshot.overall.stavka, 780000);
  assert.equal(snapshot.overall.vacant, 90515);
  assert.equal(snapshot.overall.reachingWomen, 12176);
});

// --- input guards -----------------------------------------------------------
// Every field is read positionally, so without these the parser trusts whatever
// the extraction script emitted.

test("throws naming the column when the header order is wrong", () => {
  const swapped = HEADER.replace("shtat;jami;", "jami;shtat;");
  assert.throws(
    () => parseKadrlarCsv([swapped, row("МИЛЛИЙ", 1000)].join(NL), "x.csv"),
    /2-устун "shtat"/,
    "a reordered header must fail loudly, not silently read the wrong columns",
  );
});

test("warns on a region row whose total is zero", () => {
  const { warnings } = parseKadrlarCsv([
    HEADER, row("МИЛЛИЙ", 1000), row("Andijon viloyati", 0), row("Buxoro viloyati", 1000),
  ].join(NL), "x.csv");
  assert.ok(
    warnings.some((w) => /Андижон вилояти/.test(w) && /0/.test(w)),
    "a zero-total region would otherwise render as the healthiest in the country",
  );
});

test("warns when geographic regions are missing, naming them", () => {
  const w = parseKadrlarCsv(
    [HEADER, row("МИЛЛИЙ", 1000), row("Andijon viloyati", 1000)].join(NL), "x.csv")
    .warnings.find((x) => /Йўқ:/.test(x));
  assert.ok(w);
  assert.match(w, /Бухоро вилояти/);
  assert.match(w, /Хоразм вилояти/);
});

test("does not warn about missing regions on a national-only upload", () => {
  const { warnings } = parseKadrlarCsv(
    [HEADER, row("МИЛЛИЙ", 1000)].join(NL), "x.csv");
  assert.equal(warnings.filter((w) => /Йўқ:/.test(w)).length, 0);
});

test("keeps the first national row and warns about a second", () => {
  const { snapshot, warnings } = parseKadrlarCsv(
    [HEADER, row("МИЛЛИЙ", 1000), row("МИЛЛИЙ", 5)].join(NL), "x.csv");
  assert.equal(snapshot.overall.total, 1000, "the first national row wins");
  assert.ok(warnings.some((w) => /иккинчи миллий/i.test(w)));
});

test("warns when a non-empty cell is not a number, and treats it as 0", () => {
  const bad = ["Andijon viloyati", 300, 300, 240, 0, 0, 0,
               "н/д", 0, 0, 0, 0, 300, 240, 0, 0].join(";");
  const { snapshot, warnings } = parseKadrlarCsv(
    [HEADER, row("МИЛЛИЙ", 1000), bad].join(NL), "x.csv");
  assert.equal(snapshot.regions.find((r) => r.name === "Андижон вилояти")?.u30, 0);
  assert.ok(warnings.some((w) => /u30/.test(w)));
});
