// Finds a STIR-less registry unit (a polyclinic or OShP that used to sit on its district
// association's STIR) in the live ARGOS tree under a STIR of its own.
//
// A port of scripts/compare-argos-tree.py: tree names are Russian, registry names Uzbek, so the
// match is structural — region, district (consonant skeleton: Торткуль ↔ To'rtko'l), institution
// type, number or place name — and only a single candidate on both sides counts.
// tests/argos-match.test.ts pins it to the Python script's result on the 09.10.2026 tree.
//
// Strength (user, 09.10.2026): «strong» = district + number, or the district's one KTMP / SES /
// association — applied on its own while billing is on; «weak» = district + place name only — a
// person confirms it (a place-name pairing went wrong in Jalaquduq).
//
// Pure module: no `@/` imports, so node --test can load it directly.

import { applyAssign, orgKey, type BaseOrg, type StirAssign, type TreeRow } from "./argos-live.ts";

export { orgKey };

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i",
  й: "y", к: "k", қ: "k", л: "l", м: "m", н: "n", о: "o", ў: "o", п: "p", р: "r", с: "s",
  т: "t", у: "u", ф: "f", х: "h", ҳ: "h", ц: "s", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i",
  ь: "", э: "e", ю: "yu", я: "ya",
};

function lat(s: string | null | undefined): string {
  let t = "";
  for (const ch of (s ?? "").toLowerCase()) t += CYR[ch] ?? ch;
  return t.replace(/[ʻʼ'’`‘]/g, "").replace(/x/g, "h").replace(/q/g, "k").replace(/ts/g, "s");
}

function skel(word: string): string {
  return lat(word)
    .replace(/[^a-z]/g, "")
    .replace(/dj/g, "j") // «Кызыл-джар» ↔ «Kizil-jar»
    .replace(/h/g, "k") // «Казак» ↔ «Kazax»
    .replace(/[aeiouy]/g, "")
    .replace(/(.)\1+/g, "$1");
}

const REGIONS: [string, string][] = [
  ["андижан", "Андижон вилояти"], ["бухар", "Бухоро вилояти"], ["джизак", "Жиззах вилояти"],
  ["кашкадар", "Қашқадарё вилояти"], ["навои", "Навоий вилояти"], ["наваий", "Навоий вилояти"],
  ["наманган", "Наманган вилояти"], ["самарканд", "Самарқанд вилояти"], ["сурхандар", "Сурхондарё вилояти"],
  ["сырдар", "Сирдарё вилояти"], ["ферган", "Фарғона вилояти"], ["хорезм", "Хоразм вилояти"],
  ["каракалпак", "Қорақалпоғистон Республикаси"],
  ["города ташкент", "Тошкент шаҳри"], ["ташкентское городск", "Тошкент шаҳри"],
  ["ташкентской област", "Тошкент вилояти"], ["ташкентское област", "Тошкент вилояти"],
];
const LATREG: [string, string][] = [
  ["andijon", "Андижон вилояти"], ["buhoro", "Бухоро вилояти"], ["jizzah", "Жиззах вилояти"],
  ["kashkadaryo", "Қашқадарё вилояти"], ["navoiy", "Навоий вилояти"], ["namangan", "Наманган вилояти"],
  ["samarkand", "Самарқанд вилояти"], ["surhondaryo", "Сурхондарё вилояти"], ["sirdaryo", "Сирдарё вилояти"],
  ["fargona", "Фарғона вилояти"], ["horazm", "Хоразм вилояти"], ["korakalpogiston", "Қорақалпоғистон Республикаси"],
  ["toshkent shahri", "Тошкент шаҳри"], ["toshkent viloyati", "Тошкент вилояти"],
];
const REPUBLIC = "Республика муассасалари";

function baseRegion(o: BaseOrg): string | null {
  if (o.region !== REPUBLIC) return o.region;
  const h = lat(o.hudud ?? "");
  for (const [k, reg] of LATREG)
    if (h.startsWith(k.split(" ")[0]) && (k.includes("shahri") === h.includes("shahri") || !k.includes("toshkent")))
      return reg;
  return null;
}

type Kind = "ses" | "oshp" | "ktmp" | "op" | "ttb" | "stom" | "other";

function kind(name: string): Kind {
  const n = lat(name);
  if (n.includes("sanitar")) return "ses";
  if (
    (n.includes("semeyn") && n.includes("punkt")) ||
    n.includes("punkt semeyn") ||
    n.includes("shifokorlik punkt") ||
    n.includes("kabinet semeyn") ||
    /oshp/.test(n) ||
    n.includes("vrachebn") ||
    (n.includes("semeyn") && n.includes("medisinsk") && n.includes("sentr"))
  )
    return "oshp";
  if (n.includes("mnogoprofil") || n.includes("kop tarmokli") || n.includes("kotarmokli") || n.includes("sentralnaya poliklin"))
    return "ktmp";
  if ((n.includes("semeyn") && n.includes("poliklin")) || n.includes("oilaviy poliklin") || n.includes("oilaviy poli") || /op/.test(n))
    return "op";
  if ((n.includes("medisinsk") && n.includes("obedinen")) || n.includes("tibbiyot birlashma")) return "ttb";
  if (n.includes("stomatolog")) return "stom";
  return "other";
}

const GENERIC = [
  "rayon", "gorod", "medisin", "obedin", "otdel", "zdravooh", "semeyn", "vracheb", "punkt", "poliklin",
  "sentr", "oblast", "upravlen", "sanitar", "epidem", "spokoy", "obshestv", "zdorov", "tuman", "shahar",
  "shahri", "oilaviy", "shifokor", "sonli", "kop", "tarmok", "markaz", "davlat", "muassasa", "filial",
  "bolim", "imeni", "nomidagi", "son", "op", "oshp", "glavn", "komitet", "uchastk", "bolnis", "kasalhona",
];
// «Амударьинское» → «Амударь», «Ходжалинское» → «Ходжал» (Uzbek has no «-in-»: Amudaryo, Xo'jayli)
const RU_END = /(инского|инское|инский|инская|инском|ского|ской|ский|ская|ское|ском|ских|ские|ого|ий|ая|ое)$/;

function ruStem(word: string): string {
  return /[а-я]/.test(word) && word.length > 6 ? word.replace(RU_END, "") : word;
}

function generic(word: string): boolean {
  const lw = lat(word);
  return lw.length < 3 || GENERIC.some((g) => lw.startsWith(g));
}

function numbers(name: string): Set<number> {
  return new Set([...name.matchAll(/(?<!\d)(\d{1,3})(?!\d)/g)].map((m) => Number(m[1])));
}

function places(name: string): Set<string> {
  const out = new Set<string>();
  for (const m of name.matchAll(/[«"“]([^»"”]+)[»"”]/g))
    for (const w of m[1].split(/\s+/)) if (w && skel(w).length >= 3) out.add(skel(w));
  return out;
}

const WORD = "[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳʻʼ'’]+";
const WORD_RE = new RegExp(WORD, "g");

function words(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

function tokens(name: string): Set<string> {
  const n = name.replace(/(?<=[\p{L}\p{N}_])-(?=[\p{L}\p{N}_])/gu, ""); // «Qizil-qum» → «Qizilqum»
  const out = new Set<string>();
  for (const w of words(n)) {
    if (generic(w)) continue;
    const s = skel(ruStem(w));
    if (s.length >= 2) out.add(s);
  }
  return out;
}

/** Any token in a and b where one skeleton is a prefix of the other (≥2 letters), ignoring district words. */
function share(a: Set<string>, b: Set<string>, skip: Set<string>): boolean {
  for (const x of a)
    for (const y of b) {
      if (skip.has(x.slice(0, 4)) || skip.has(y.slice(0, 4))) continue;
      const [s, l] = x.length <= y.length ? [x, y] : [y, x];
      if (s.length >= 2 && l.startsWith(s)) return true;
    }
  return false;
}

/** true = city-level, false = district-level, null = unknown; a district word wins («Shahrisabz tumani»). */
function city(name: string): boolean | null {
  const n = lat(name);
  if (/rayon|tuman/.test(n)) return false;
  return /gorod|shahar|shahri\b/.test(n) ? true : null;
}

/** Skeleton (4 letters) of the first non-generic word, else of the first word. */
function districtSkel(text: string | null | undefined): string {
  const ws = words(text ?? "");
  for (const w of ws) if (!generic(w)) return skel(ruStem(w)).slice(0, 4);
  return ws.length ? skel(ruStem(ws[0])).slice(0, 4) : "";
}

// ------------------------------------------------------------------- the tree side

interface TreeOrg {
  tin: string;
  billing: 0 | 1;
  label: string;
  chain: string[]; // ancestor org labels, nearest first
}

function treeOrgs(rows: readonly TreeRow[]): Map<string, TreeOrg> {
  const by = new Map<string, TreeRow>();
  for (const r of rows) by.set(String(r[0]), r);
  const out = new Map<string, TreeOrg>();
  for (const r of rows) {
    const chain: string[] = [];
    const seen = new Set<string>([String(r[0])]);
    let p = r[3];
    while (p && by.has(p) && !seen.has(p) && chain.length < 16) {
      seen.add(p);
      const up = by.get(p)!;
      chain.push(up[2] ?? "");
      p = up[3];
    }
    out.set(String(r[0]), { tin: String(r[0]), billing: r[1] ? 1 : 0, label: r[2] ?? "", chain });
  }
  return out;
}

function treeRegion(t: TreeOrg): string | null {
  const txt = [...t.chain, t.label].join(" ").toLowerCase();
  for (const [k, reg] of REGIONS) if (txt.includes(k)) return reg;
  return null;
}

function treeDistrict(t: TreeOrg): string {
  for (const p of t.chain) {
    const pl = p.toLowerCase();
    if (pl.includes("объединение") || pl.includes("отдел здравоохранения")) return districtSkel(p);
  }
  let m = t.label.match(new RegExp(`(${WORD})\\s+(района|районного|города|городского)`));
  if (m) return districtSkel(m[1]);
  m = t.label.match(new RegExp(`(района|города?)\\s+(${WORD})`));
  return m ? districtSkel(m[2]) : "";
}

// ------------------------------------------------------------------- matching

export type Strength = "strong" | "weak";

export interface OwnStirMatch {
  key: string; // orgKey of the registry row
  tin: string;
  label: string; // the ARGOS name
  billing: 0 | 1;
  strength: Strength;
  why: string[]; // type / district / number / place
}

function fit(t: TreeOrg, o: BaseOrg): string[] | null {
  const tr = treeRegion(t);
  if (!tr || tr !== baseRegion(o)) return null;
  if (kind(t.label) !== kind(o.name)) return null;
  const why = ["type"];
  const td = treeDistrict(t);
  const bd = o.region !== REPUBLIC ? districtSkel(o.district) : districtSkel(o.name);
  if (td && bd && td !== bd) return null;
  if (td && bd) why.push("district");
  const nt = numbers(t.label);
  const nb = numbers(o.name);
  if (nt.size && nb.size) {
    if ([...nt].some((x) => nb.has(x))) why.push("number");
    else return null;
  }
  const pt = new Set([...places(t.label), ...tokens(t.label)]);
  const pb = new Set([...places(o.name), ...tokens(o.name)]);
  if (share(pt, pb, new Set([td, bd]))) why.push("place");
  const ct = city(t.label);
  const cb = city(o.name);
  if (ct !== null && cb !== null && ct !== cb) return null;
  return why;
}

/**
 * Tree orgs that are, unambiguously, a STIR-less registry row under a STIR of its own.
 * `known`: every STIR the registry already uses (incl. ignored ones) — those are never offered.
 * `rejected`: per row key, STIRs a person turned down.
 */
export function findOwnStir(
  base: readonly BaseOrg[],
  rows: readonly TreeRow[],
  known: ReadonlySet<string>,
  rejected: Readonly<Record<string, readonly string[]>> = {},
): OwnStirMatch[] {
  const tree = treeOrgs(rows);
  const eligible = base.filter((o) => !o.stir);
  const byTin = new Map<string, { o: BaseOrg; why: string[] }[]>();
  for (const t of tree.values()) {
    if (known.has(t.tin)) continue;
    const k = kind(t.label);
    for (const o of eligible) {
      if (rejected[orgKey(o)]?.includes(t.tin)) continue;
      const why = fit(t, o);
      if (!why) continue;
      const structural =
        why.includes("district") && (why.includes("number") || why.includes("place") || k === "ses" || k === "ktmp" || k === "ttb");
      if (!structural) continue;
      const l = byTin.get(t.tin);
      if (l) l.push({ o, why });
      else byTin.set(t.tin, [{ o, why }]);
    }
  }
  // a row claimed by two tins, or a tin fitting two rows, is nobody's
  const claimed = new Map<BaseOrg, number>();
  for (const l of byTin.values()) if (l.length === 1) claimed.set(l[0].o, (claimed.get(l[0].o) ?? 0) + 1);
  const out: OwnStirMatch[] = [];
  for (const [tin, l] of byTin) {
    if (l.length !== 1 || claimed.get(l[0].o) !== 1) continue;
    const t = tree.get(tin)!;
    const k = kind(t.label);
    const { o, why } = l[0];
    out.push({
      key: orgKey(o),
      tin,
      label: t.label,
      billing: t.billing,
      strength: why.includes("number") || k === "ses" || k === "ktmp" || k === "ttb" ? "strong" : "weak",
      why,
    });
  }
  return out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.tin < b.tin ? -1 : 1));
}

// ------------------------------------------------------------------- applying

export interface OwnStirApplied {
  key: string;
  region: string;
  district: string | null;
  name: string;
  tin: string;
  label: string;
  mode: "auto" | "approved";
  at: string;
  billing: 0 | 1 | null; // in the current tree; null = gone from it
}

export interface OwnStirPending extends OwnStirMatch {
  region: string;
  district: string | null;
  name: string;
}

export interface OwnStirState {
  orgs: BaseOrg[]; // the registry with every stored or new automatic assignment applied
  assign: StirAssign; // stored + strong matches with billing on (to persist when it grew)
  grew: boolean;
  applied: OwnStirApplied[];
  pending: OwnStirPending[]; // weak matches, and strong ones while billing is off — a person decides
}

/**
 * The registry for one tree: stored assignments, plus every strong match with billing on taken
 * automatically (user, 09.10.2026). Weak matches, and strong ones whose billing is still off, wait.
 */
export function resolveOwnStir(
  base: readonly BaseOrg[],
  ignoreStir: readonly string[],
  rows: readonly TreeRow[],
  stored: StirAssign,
  at: string,
): OwnStirState {
  const used = applyAssign(base, stored);
  const known = new Set([...used.map((o) => o.stir).filter((s): s is string => !!s), ...ignoreStir]);
  const matches = findOwnStir(used, rows, known, stored.rejected);
  const items = { ...stored.items };
  let grew = false;
  for (const m of matches)
    if (m.strength === "strong" && m.billing === 1 && !items[m.key]) {
      items[m.key] = { tin: m.tin, mode: "auto", at, label: m.label };
      grew = true;
    }
  const assign: StirAssign = { items, rejected: stored.rejected };
  const byKey = new Map(base.map((o) => [orgKey(o), o]));
  const billing = new Map(rows.map((r) => [String(r[0]), r[1] ? 1 : 0] as const));
  const applied: OwnStirApplied[] = [];
  for (const [key, a] of Object.entries(items)) {
    const o = byKey.get(key);
    if (!o || o.stir) continue; // row gone from the registry, or the workbook gave it a STIR since
    applied.push({ key, region: o.region, district: o.district, name: o.name, tin: a.tin, label: a.label, mode: a.mode, at: a.at, billing: billing.get(a.tin) ?? null });
  }
  const pending: OwnStirPending[] = matches
    .filter((m) => !items[m.key])
    .map((m) => {
      const o = byKey.get(m.key)!;
      return { ...m, region: o.region, district: o.district, name: o.name };
    });
  return { orgs: applyAssign(base, assign), assign, grew, applied, pending };
}
