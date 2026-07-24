// One-off: build data/seed-completion.json from a downloaded completion CSV.
// Mirrors lib/parse-completion.ts exactly (kept in sync by hand).
//   node scripts/gen-completion-seed.mjs [csvPath]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CITY = "Тошкент шаҳри";
const REGION_BY_KEYWORD = [
  [/каракалпакстан/i, "Қорақалпоғистон Республикаси"],
  [/андижан/i, "Андижон вилояти"],
  [/бухар/i, "Бухоро вилояти"],
  [/джизак/i, "Жиззах вилояти"],
  [/кашкадар/i, "Қашқадарё вилояти"],
  [/наваи/i, "Навоий вилояти"],
  [/наманган/i, "Наманган вилояти"],
  [/самарканд/i, "Самарқанд вилояти"],
  [/сырдар/i, "Сирдарё вилояти"],
  [/сурхандар/i, "Сурхондарё вилояти"],
  [/ташкентск/i, "Тошкент вилояти"],
  [/ферган/i, "Фарғона вилояти"],
  [/хорезм/i, "Хоразм вилояти"],
];
function regionKeyword(text) {
  const t = text || "";
  if (/ташкент/i.test(t) && /город/i.test(t)) return CITY;
  for (const [re, name] of REGION_BY_KEYWORD) if (re.test(t)) return name;
  return null;
}
function completionRegion(group, id) {
  const g = (group || "").trim();
  if (id === "1052" || g === "Министерство здравоохранения Республики Узбекистан") return "Марказий аппарат";
  if (/каракалпакстан/i.test(g)) return "Қорақалпоғистон Республикаси";
  if (/управление здравоохранения/i.test(g)) {
    const r = regionKeyword(g);
    if (r) return r;
  }
  if (/санитарно-эпидемиолог/i.test(g)) return "Санитар-эпидемиология қўмитаси";
  return "Республика марказлари";
}
function splitCsvLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ";") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
function headerIndex(header) {
  const find = (re, fb) => { const i = header.findIndex((h) => re.test(h.trim().toLowerCase())); return i >= 0 ? i : fb; };
  return {
    id: find(/^id$|\bid\b/, 1),
    rate: find(/даражаси|тўлдирилиш|тулдирилиш|%/, 2),
    orgType: find(/orgtype/, 3),
    group: find(/гуру/, 4),
    name: find(/номи/, 5),
  };
}
const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = process.argv[2] || "C:/Users/Admin/Documents/HRM_argos_tuldirilish_BARCHA_1721_tashkilot_2026-07-24.csv";
const text = readFileSync(csvPath, "utf8").replace(/^﻿/, "");
const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
const idx = headerIndex(splitCsvLine(lines[0]));
const orgs = [];
for (let i = 1; i < lines.length; i++) {
  const f = splitCsvLine(lines[i]);
  if (f.length < 3) continue;
  const id = (f[idx.id] ?? "").trim();
  const rate = parseFloat((f[idx.rate] ?? "").trim().replace(",", "."));
  if (!id || Number.isNaN(rate)) continue;
  const name = (f[idx.name] ?? "").trim();
  const group = (f[idx.group] ?? "").trim();
  const orgType = (f[idx.orgType] ?? "").trim() || undefined;
  orgs.push({ region: completionRegion(group, id), name, id, orgType, completion: clamp01(rate / 100) });
}
const m = /(\d{4})-(\d{2})-(\d{2})/.exec(csvPath);
const date = m ? `${m[1]}-${m[2]}-${m[3]}` : new Date().toISOString().slice(0, 10);

const byRegion = new Map();
for (const o of orgs) { const l = byRegion.get(o.region); if (l) l.push(o); else byRegion.set(o.region, [o]); }
const regions = [...byRegion.entries()].map(([name, list]) => ({
  name, orgCount: list.length, avg: mean(list.map((o) => o.completion)),
  zeroCount: list.filter((o) => o.completion === 0).length,
  below50: list.filter((o) => o.completion < 0.5).length,
})).sort((a, b) => a.avg - b.avg);
const overall = {
  orgCount: orgs.length, avg: mean(orgs.map((o) => o.completion)),
  zeroCount: orgs.filter((o) => o.completion === 0).length,
  below50: orgs.filter((o) => o.completion < 0.5).length,
};
const snapshot = { date, uploadedAt: `${date}T00:00:00.000Z`, overall, regions, orgs };
const out = join(__dirname, "..", "data", "seed-completion.json");
writeFileSync(out, JSON.stringify(snapshot), "utf8");
console.log(`wrote ${out}`);
console.log(`orgs=${orgs.length} avg=${(overall.avg * 100).toFixed(2)}% zero=${overall.zeroCount} below50=${overall.below50} regions=${regions.length}`);
console.log(regions.map((r) => `  ${r.name}: ${(r.avg * 100).toFixed(1)}% (n=${r.orgCount})`).join("\n"));
