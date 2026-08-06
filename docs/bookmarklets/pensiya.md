# Pulling the pension CSV out of hrm.argos.uz

Run this in the browser console on <https://hrm.argos.uz/#/report/all-employee-distribution-by-seniority>
while logged in. It prints the CSV that `/admin` accepts.

Verified working 2026-08-06.

## What the plan assumed, and what is actually true

The plan expected a bookmarklet issuing **15 sequential requests** — one national
plus one per region via the report's region filter — taking 8–15 minutes.

That is wrong on both counts:

- **`regionId` is ignored when `belongCivilService: 2`.** Sending
  `regionId: "17"` (Andijon) returned the identical 2 284 rows and the identical
  national total as sending no region at all. The region dropdown does not
  filter this report for "all organisations".
- **One request is enough.** The response already contains the regional cut, as
  `type: 2` rollup rows named `… (МА+барча Хтлар)` — central apparatus plus all
  children — one per regional health administration.

So: **one request, ~40 s.** Not fifteen over a quarter of an hour.

## The contract

```
POST https://hrm.argos.uz/api/Report/Report/GetAllEmployeeDistributionBySeniority
Authorization: Bearer <localStorage.accessToken>
{"ids":[],"belongCivilService":2,"year":2026,"quarter":3}
```

**`belongCivilService` is the trap.** `1` = «ГГС организации» — 2 184 people, the
default the page loads with, and a perfectly plausible-looking report. `2` =
«Все организации» — 689 485. `0` returns an empty array.

Response is a flat array. `type: 0` is the grand total (row 0), `type: 1` are the
2 134 leaf organisations (they sum exactly to the grand total), `type: 2` are 149
rollups — which is where the regions live.

Fields consumed (note the upstream typo `Pansion`):

| CSV column | API field |
|---|---|
| `jami` / `jami_ayol` | `total` / `totalWomen` |
| `a3040` | `employeeAgeFrom30To40` (+`Women`) |
| `a4050` | `employeeAgeFrom40To50` (+`Women`) |
| `a5060` | `employeeAgeFrom50To60` (+`Women`) |
| `a60p` | `employeeAgeFrom60` (+`Women`) |
| `pensiya` | `employeeWorkingPensionAge` (+`Women`) |
| `yetadigan` | `currentYearPansionAge` (+`Women`) |

## Picking the 14 regional rows

`type: 2` contains **nested** rollups — city and district bodies as well as
regional ones. Matching loosely double-counts. The regexes below are anchored so
that «городское объединение» and «районный отдел» can never match, and the script
fails loudly if it does not find exactly 14.

Sanitary-epidemiological administrations are deliberately excluded: they are a
separate vertical, not part of a region's health workforce, and they land in the
residual row along with the central apparatus and the republican centres.

## The script

```js
const tok = localStorage.accessToken;
const res = await fetch("/api/Report/Report/GetAllEmployeeDistributionBySeniority", {
  method: "POST",
  headers: { "content-type": "application/json", authorization: "Bearer " + tok },
  body: JSON.stringify({ ids: [], belongCivilService: 2, year: 2026, quarter: 3 }),
});
const rows = await res.json();

const clean = (s) => (s || "").replace(/\s+/g, " ").replace(/\s*\(МА\+барча Хтлар\)\s*$/i, "").trim();

// Anchored on the administration phrase so a district/city body cannot match.
// The right-hand names are what lib/parse-pension.ts resolves; its homoglyph
// normalization accepts Farg'ona with either a Latin or a Cyrillic "o".
const MAP = [
  [/^Министерство здравоохранения Республики Каракалпакстан$/i, "Qoraqalpog‘iston Respublikasi"],
  [/^(Главное )?управление здравоохранения Андижанской области$/i, "Andijon viloyati"],
  [/^(Главное )?управление здравоохранения Бухарской области$/i, "Buxoro viloyati"],
  [/^(Главное )?управление здравоохранения Джизакской области$/i, "Jizzax viloyati"],
  [/^(Главное )?управление здравоохранения Кашкадарьинской области$/i, "Qashqadaryo viloyati"],
  [/^(Главное )?управление здравоохранения Нава[ий]+ской области$/i, "Navoiy viloyati"],
  [/^(Главное )?управление здравоохранения Наманганской области$/i, "Namangan viloyati"],
  [/^(Главное )?управление здравоохранения Самаркандской области$/i, "Samarqand viloyati"],
  [/^(Главное )?управление здравоохранения Сырдарьинской области$/i, "Sirdaryo viloyati"],
  [/^(Главное )?управление здравоохранения Сурхандарьинской области$/i, "Surxondaryo viloyati"],
  [/^(Главное )?управление здравоохранения Ташкентской области$/i, "Toshkent viloyati"],
  [/^(Главное )?управление здравоохранения Ферганской области$/i, "Farg‘ona viloyati"],
  [/^(Главное )?управление здравоохранения Хорезмской области$/i, "Xorazm viloyati"],
  [/^(Главное )?управление здравоохранения города Ташкента$/i, "Toshkent shahri"],
];

const F = (o) => [
  o.total, o.totalWomen,
  o.employeeAgeFrom30To40, o.employeeAgeFrom30To40Women,
  o.employeeAgeFrom40To50, o.employeeAgeFrom40To50Women,
  o.employeeAgeFrom50To60, o.employeeAgeFrom50To60Women,
  o.employeeAgeFrom60, o.employeeAgeFrom60Women,
  o.employeeWorkingPensionAge, o.employeeWorkingPensionAgeWomen,
  o.currentYearPansionAge, o.currentYearPansionAgeWomen,
].map((v) => (v == null ? 0 : v)).join(";");

const t2 = rows.filter((r) => r.type === 2);
const seen = new Set();
const out = [];
for (const [re, latin] of MAP) {
  const hit = t2.filter((r) => re.test(clean(r.institutionName)));
  if (hit.length !== 1) throw new Error(`${latin}: expected 1 rollup, found ${hit.length}`);
  if (seen.has(latin)) throw new Error(`${latin} matched twice`);
  seen.add(latin);
  out.push(latin + ";" + F(hit[0]));
}
if (out.length !== 14) throw new Error(`expected 14 regions, built ${out.length}`);

const csv = [
  "hudud;jami;jami_ayol;a3040;a3040_ayol;a4050;a4050_ayol;a5060;a5060_ayol;a60p;a60p_ayol;pensiya;pensiya_ayol;yetadigan;yetadigan_ayol",
  "МИЛЛИЙ;" + F(rows[0]),
  ...out,
].join("\n");

console.log("national:", rows[0].total, "| regions sum:", out.reduce((a, l) => a + +l.split(";")[1], 0));
copy(csv); // also in the clipboard
csv;
```

Save the output as `HRM_pensiya_YYYY-MM-DD.csv` — the parser takes the report
date from the filename — and upload it in the third section of `/admin`.

## Sanity check before uploading

The national `jami` should be near 689 000. **If it reads ≈2 184 the filter is
still «ГГС организации» and the whole file is wrong.** Two pulls a day apart
differed by 24 people, so small drift is the report being live, not a bug.

The parser will refuse a file whose header columns are reordered, and will warn
about a zero-total region, a missing region, a duplicate row and a second
national row. Zero warnings on a 16-line file means the pull is clean.
