# Pulling the kadrlar CSV out of hrm.argos.uz

Source: the statistics constructor (`#/report/constructor`), not the
`all-employee-distribution-by-seniority` report the previous version used.

## Organisation counts (2026-08-06)

From `GET /api/Staff/Institution/GetSpInstitutionTreeV2`, walking
`Министерство здравоохранения (1052)`.

The counts below are ORGANISATIONS — the descendants of each branch node. The
branch node itself is a grouping node, not an organisation: `idsOf()` includes
it, so each branch is sent one more id than it has organisations. Verified that
this costs nothing: `institutionIds: [4]` (the district branch node) returns an
empty `items` array, so grouping nodes contribute no figures and nothing is
double-counted.

| Branch | Organisations | Ids sent |
|---|---|---|
| Территориальный уровень | 1 976 across 14 regions | 1 977 |
| Республиканский уровень | 357 | 358 |
| Районный/городской уровень | **1** | 2 |
| **Whole ministry** | **2 337** | 2 338 |

**The district/city branch holds a single organisation**, and it is
`Республиканская клиническая больница глазных болезней` (id 33195) — a
*republican* hospital sitting in the *district/city* branch, so the branch is a
misclassification rather than a real level. 154 posts, 154 filled, 0 vacancies,
31 staff at pension age.

**The script still emits both rows; `lib/parse-kadrlar.ts` merges them.** Keep it
that way. The CSV stays a faithful mirror of what ARGOS returned, and the one
correction the dashboard applies lives in a tested parser that announces itself
in the upload warnings, rather than in a browser snippet nobody diffs. Both
names resolve to the single canonical key `Республика муассасалари`; rows
sharing a canonical key are summed, so the hospital's 154 staff are added rather
than dropped. If ARGOS ever fixes the classification the branch stops appearing
and the merge becomes a no-op — nothing needs changing here.

Worth reporting to the ARGOS administrators regardless: the fix belongs upstream.

Per region, largest first — the spread is wide enough that a single batch size
cannot be assumed to suit all of them:

| Region | Organisations |
|---|---|
| Самаркандская | 488 |
| Ташкентская область | 293 |
| город Ташкент | 188 |
| Джизакская | 186 |
| Кашкадарьинская | 120 |
| Ферганская | 105 |
| Сурхандарьинская | 85 |
| Андижанская · Бухарская · Наваийская · Хорезмская | 78 each |
| Наманганская | 77 |
| Каракалпакстан | 67 |
| Сырдарьинская | 55 |

## Measured limits (2026-08-06)

| Batch | Organisations | Result |
|---|---|---|
| 1 institution (1052) | 1 | 200, 264 ms |
| Районный/городской уровень | 2 ids / 1 org | 200, 1.1 s |
| Республиканский уровень | 358 ids / 357 orgs | 200, 9.8 s, 327 items |
| **Самаркандская — the biggest region** | **488** | **200, 3.8–11.3 s, 224 items** |
| whole ministry | 2 338 | **500 Execution Timeout Expired** at 30 s |

**Batch = one branch.** The largest region fits in a single request, so the pull
is 16 requests — 14 regions plus the two other levels — and takes roughly a
minute. No sub-batching is needed. Keep a halve-and-retry on a 500 anyway: the
ceiling sits between 488 and 2 338 and could move as organisations are added.

### `metaData.rows` must be 1–200, and does not paginate

An early attempt sent `rows: 5000` and got a 400 in 67 ms — a *validation*
rejection, not a size problem:

```json
{"errors":{"MetaData.rows":["Row must be between 1 and 200"]}}
```

The same 400 appeared at 50 ids, which is what proved the batch size was
innocent. **Send `rows: 200`.**

`rows` does not limit the returned items. Verified on the 488-id request: `rows:1`,
`rows:10` and `rows:200` each returned all **224** items with an identical
`totalEmployee` sum of **60 148**. There is no pagination to handle.

### Cross-check against the old source

That 60 148 for Samarkand is byte-identical to the figure the previous extraction
produced from `all-employee-distribution-by-seniority`'s
«Управление здравоохранения Самаркандской области (МА+барча Хтлар)» rollup. Two
independent endpoints, two different grouping mechanisms, the same number — good
evidence that the source switch preserves the regional cut.

Note 488 ids return only 224 items: organisations with no staff record produce no
row. Sum the items; do not expect one row per id.

## The script

Paste into the browser console on a logged-in `hrm.argos.uz` page. Takes about
four minutes: sixteen branch requests of a few seconds each, then the national
request, which times out and has to bisect (see the note after the script).

```js
const tok = localStorage.accessToken;

const NODES = [
  { key: "general" },
  { key: "totalStavka", parentKey: "general" }, { key: "totalEmployee", parentKey: "general" },
  { key: "totalVakant", parentKey: "general" }, { key: "totalWomen", parentKey: "general" },
  { key: "totalAcceptEmployee", parentKey: "general" }, { key: "totalDismissedEmployee", parentKey: "general" },
  { key: "age" }, { key: "ageTo30", parentKey: "age" }, { key: "ageFrom30To40", parentKey: "age" },
  { key: "ageFrom40To50", parentKey: "age" }, { key: "ageFrom50To60", parentKey: "age" },
  { key: "ageFrom60", parentKey: "age" },
  { key: "pensionAge" }, { key: "totalPensionAge", parentKey: "pensionAge" },
  { key: "totalPensionAgeWoman", parentKey: "pensionAge" },
  { key: "currentYearPensionAge" }, { key: "totalCurrentYearPensionAge", parentKey: "currentYearPensionAge" },
  { key: "totalCurrentYearPensionAgeWoman", parentKey: "currentYearPensionAge" },
];
const F = {
  stavka: "totalStavka", total: "totalEmployee", totalWomen: "totalWomen",
  vacant: "totalVakant", accepted: "totalAcceptEmployee", dismissed: "totalDismissedEmployee",
  u30: "ageTo30", a3040: "ageFrom30To40", a4050: "ageFrom40To50",
  a5060: "ageFrom50To60", a60p: "ageFrom60",
  pensionWorking: "totalPensionAge", pensionWorkingWomen: "totalPensionAgeWoman",
  reaching: "totalCurrentYearPensionAge", reachingWomen: "totalCurrentYearPensionAgeWoman",
};
const ORDER = ["stavka","total","totalWomen","vacant","accepted","dismissed",
               "u30","a3040","a4050","a5060","a60p",
               "pensionWorking","pensionWorkingWomen","reaching","reachingWomen"];

// The tree's Территориальный уровень gives the 14 regions directly; these
// patterns only map ARGOS's oblast wording onto the dashboard's canonical keys.
// They are NOT used to decide which organisation belongs where -- the hierarchy
// does that, which is the whole gain over the previous extraction.
const REGION = [
  [/Каракалпакстан/i, "Қорақалпоғистон Республикаси"],
  [/Андижан/i, "Андижон вилояти"], [/Бухар/i, "Бухоро вилояти"],
  [/Джизак/i, "Жиззах вилояти"], [/Кашкадар/i, "Қашқадарё вилояти"],
  [/Нава[ий]+/i, "Навоий вилояти"], [/Наманган/i, "Наманган вилояти"],
  [/Самарканд/i, "Самарқанд вилояти"], [/Сырдар/i, "Сирдарё вилояти"],
  [/Сурхандар/i, "Сурхондарё вилояти"], [/Ташкентск/i, "Тошкент вилояти"],
  [/Ферган/i, "Фарғона вилояти"], [/Хорезм/i, "Хоразм вилояти"],
  [/город.{0,4}Ташкент|Ташкент.{0,4}город/i, "Тошкент шаҳри"],
];

const idsOf = (n) => { const o = []; (function w(x){ if (x.data) o.push(Number(x.data)); (x.children||[]).forEach(w); })(n); return o; };

// rows must be 1..200. On a 500 the batch halves and retries: the national
// request needs this, and the per-branch ceiling can move as orgs are added.
async function fetchIds(ids, depth = 0) {
  const r = await fetch("/api/report/constructor/GetReport", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + tok },
    body: JSON.stringify({ metaData: { first: 1, rows: 200 }, institutionIds: ids, selectTreeNodes: NODES }),
  });
  if (r.status !== 200) {
    if (ids.length <= 4 || depth > 6) throw new Error(`batch ${ids.length} -> ${r.status}`);
    const h = Math.ceil(ids.length / 2);
    console.warn(`  split ${ids.length} (${r.status})`);
    return (await fetchIds(ids.slice(0, h), depth + 1)).concat(await fetchIds(ids.slice(h), depth + 1));
  }
  return ((await r.json()).general?.items) || [];
}
async function totalsFor(ids, label) {
  const acc = Object.fromEntries(ORDER.map(k => [k, 0]));
  for (const it of await fetchIds(ids)) for (const k of ORDER) acc[k] += Number(it[F[k]] || 0);
  console.log(`${label}: ${acc.total} ходим, ${acc.vacant} вакансия`);
  return acc;
}

const tree = await (await fetch("/api/Staff/Institution/GetSpInstitutionTreeV2",
  { headers: { authorization: "Bearer " + tok } })).json();
const moh = tree[0].children[0];
const branch = (re) => moh.children.find(c => re.test(c.label || ""));
const terr = branch(/Территориальн/i);
if (!terr || terr.children.length !== 14) throw new Error(`expected 14 regions, got ${terr?.children?.length}`);

const rows = [];
for (const node of terr.children) {
  const hit = REGION.find(([re]) => re.test(node.label || ""));
  if (!hit) throw new Error(`unmapped region: ${node.label}`);
  rows.push([hit[1], await totalsFor(idsOf(node), hit[1])]);
}
rows.push(["Республика даражаси", await totalsFor(idsOf(branch(/Республиканск/i)), "Республика даражаси")]);
rows.push(["Туман/шаҳар даражаси", await totalsFor(idsOf(branch(/Районн/i)), "Туман/шаҳар даражаси")]);
const national = await totalsFor(idsOf(moh), "МИЛЛИЙ");

const line = (n, a) => [n, ...ORDER.map(k => a[k])].join(";");
const csv = [
  "hudud;shtat;jami;jami_ayol;vakansiya;qabul;boshagan;u30;a3040;a4050;a5060;a60p;pensiya;pensiya_ayol;yetadigan;yetadigan_ayol",
  line("МИЛЛИЙ", national), ...rows.map(([n, a]) => line(n, a)),
].join("\n");
console.log(`gap: ${national.total - rows.reduce((s, [, a]) => s + a.total, 0)}`);
copy(csv);
csv;
```

Save the output as `HRM_kadrlar_YYYY-MM-DD.csv` — the parser takes the report
date from the filename — and upload it in the pension section of `/admin`.

### The national row is the slow part

`idsOf(moh)` is all 2 338 organisations, which always 500s, so the bisection
runs: 2 338 → 1 169 → 585 → 292… Each failure costs a 30-second timeout, so the
national row alone takes two to three minutes. Observed on 2026-08-06: 585 failed
and the ceiling therefore sits between 488 and 585.

It could be replaced by summing the sixteen branches, which would be instant. It
is kept as a separate request on purpose: summing would make the reconciliation
check true by construction and it would stop being a check. The 323-person gap it
found on the first real run is the kind of thing that is worth three minutes.

## Sanity checks before uploading

- 17 rows plus the header.
- The national `jami` should be near 689 000. If it reads ≈2 184 the wrong scope
  was pulled.
- The printed `gap` is what the parser will warn about. A few hundred out of
  689 000 is live drift across a four-minute pull; thousands is not.
- `unmapped region` means ARGOS renamed a branch — add the pattern, do not
  loosen an existing one.

## Field reference

`POST /api/report/constructor/GetReport`

```json
{ "metaData": { "first": 1, "rows": 10 },
  "institutionIds": [1052],
  "selectTreeNodes": [{ "key": "general" }, { "key": "totalVakant", "parentKey": "general" }] }
```

Response: `{ "general": { "items": [ { "institutionId": 1052, "totalStavka": 434, "totalEmployee": 320, "totalVakant": 114, "totalWomen": 78 } ] } }`

Leaves must be accompanied by their parent as its own entry (`{"key":"general"}`,
`{"key":"age"}`, `{"key":"pensionAge"}`, `{"key":"currentYearPensionAge"}`).

| Key | parentKey | Meaning |
|---|---|---|
| `totalStavka` | `general` | иш ўринлари |
| `totalEmployee` | `general` | амалдаги ходимлар |
| `totalVakant` | `general` | вакансиялар |
| `totalWomen` | `general` | хотин-қизлар |
| `totalAcceptEmployee` | `general` | ишга қабул қилинган |
| `totalDismissedEmployee` | `general` | ишдан бўшаган |
| `ageTo30` `ageFrom30To40` `ageFrom40To50` `ageFrom50To60` `ageFrom60` | `age` | age bands, **no gender split** |
| `totalPensionAge` `totalPensionAgeWoman` | `pensionAge` | at pension age, working |
| `totalCurrentYearPensionAge` `totalCurrentYearPensionAgeWoman` | `currentYearPensionAge` | reaches pension age in 2026 |

The constructor labels the last one «**2026** йилда…». The old report's column
header says «2024-йилда» regardless of the year requested — one of the reasons
for the switch.

## Why the tree, and not name matching

Every *report* endpoint returns `institutionId: 0` on every row — verified on
`GetAllEmployeeDistributionBySeniority` (2 284 rows) and `GetStaffComposition`
(592 rows). The tree and the constructor are the only places organisation
identity exists. The previous extraction had to group regions by running anchored
regexes over Russian organisation titles; this one reads ARGOS's own hierarchy.
