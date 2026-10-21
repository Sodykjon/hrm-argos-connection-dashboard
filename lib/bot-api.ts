// JSON shapes for the Telegram bot (app/api/bot/*): per-organisation connection status, region
// totals and status changes between the last two ARGOS trees — counted exactly as /argos-jonli
// counts them (lib/argos-live-data.ts getLive) — and each organisation's data-completion figure from
// the latest «Тўлдирилиш даражаси» file, joined by STIR as /toldirilish places it
// (lib/completion-data.ts getCompletionView). Field names are Uzbek (Latin) for the bot's author.
//
// Pure module: no `@/` imports, so node --test can load it directly.

import { createHash } from "node:crypto";
import type { BaseOrg, Counts, LiveOrg, LiveResult, LiveStatus, Reason } from "./argos-live.ts";
import { regionSlug } from "./regions.ts";
import type { CompletionOverall, CompletionRegionStat } from "./types.ts";

export const STATUS_TEXT: Record<LiveStatus, string> = {
  ulangan: "Уланган",
  ulanmagan: "Уланмаган",
  ochirilgan: "Ўчирилган",
};

export const REASON_TEXT: Record<Reason, string> = {
  override: "Қўлда белгиланган",
  nostir: "СТИР йўқ — реестр ҳолати",
  missing: "ARGOS дарахтида йўқ",
  billing: "Дарахтда, биллинг фаол",
  newBilling0: "Янги уланган, биллинг ҳали ёқилмаган",
  billingOff: "Дарахтда, биллинг нофаол",
  awaitBilling: "Хатдаги ИНН, биллинг ҳали ёқилмаган — уланмаган",
};

export const STATUSES: readonly LiveStatus[] = ["ulangan", "ulanmagan", "ochirilgan"];

/**
 * A row's id: 12 hex of sha1(region|group|name). Stable while the registry keeps the row's region,
 * group and name; a renamed row gets a new id.
 */
export function orgId(o: Pick<BaseOrg, "region" | "district" | "name">): string {
  return createHash("sha1")
    .update(`${o.region}|${o.district ?? ""}|${o.name}`)
    .digest("hex")
    .slice(0, 12);
}

/**
 * The completion file as /toldirilish shows it: orgs re-filed under the registry's top-level groups
 * (lib/completion-tree.ts regroup), STIRs filled from the live tree where the CSV has none.
 */
export interface CompletionData {
  sana: string; // the report's date, ISO
  overall: CompletionOverall;
  regions: CompletionRegionStat[];
  orgs: readonly { name: string; stir?: string; region: string; completion: number }[];
}

export interface BotCompletion {
  foiz: number; // 0..100, one decimal
  sana: string;
}

export interface BotCompletionStat {
  tashkilotlar: number;
  ortacha: number; // mean of the orgs' completion, 0..100, one decimal
  nol: number; // orgs at 0%
  ellikdanKam: number; // orgs below 50%
  sana: string;
}

const pct = (x: number) => Math.round(x * 1000) / 10;

const stirIndex = new WeakMap<CompletionData, Map<string, number>>();

/** STIR → completion; a STIR the file holds twice takes its first row. */
function byStirOf(c: CompletionData): Map<string, number> {
  let m = stirIndex.get(c);
  if (!m) {
    m = new Map();
    for (const o of c.orgs) if (o.stir && !m.has(o.stir)) m.set(o.stir, o.completion);
    stirIndex.set(c, m);
  }
  return m;
}

/** A registry row's completion: null without a file, a STIR, or that STIR in the file. */
export function orgCompletion(stir: string | null, c?: CompletionData | null): BotCompletion | null {
  if (!c || !stir) return null;
  const v = byStirOf(c).get(stir);
  return v === undefined ? null : { foiz: pct(v), sana: c.sana };
}

type Stat = { orgCount: number; avg: number; zeroCount: number; below50: number };

function completionStat(s: Stat | undefined, sana: string): BotCompletionStat | null {
  if (!s || !s.orgCount) return null;
  return { tashkilotlar: s.orgCount, ortacha: pct(s.avg), nol: s.zeroCount, ellikdanKam: s.below50, sana };
}

function statOf(list: readonly { completion: number }[]): Stat {
  return {
    orgCount: list.length,
    avg: list.length ? list.reduce((a, o) => a + o.completion, 0) / list.length : 0,
    zeroCount: list.filter((o) => o.completion === 0).length,
    below50: list.filter((o) => o.completion < 0.5).length,
  };
}

export interface BotOrg {
  id: string;
  nomi: string;
  hudud: string;
  hududSlug: string;
  tuman: string | null;
  stir: string | null;
  boysunuvi: string | null; // registry «Boʻysunuvi», e.g. «Tuman tibbiyot birlashmasi»
  holat: LiveStatus;
  holatMatn: string;
  sabab: Reason;
  sababMatn: string;
  billing: 0 | 1 | null; // null = STIR not in the ARGOS tree
  toldirish: BotCompletion | null; // null = no STIR, or the STIR is not in the completion file
}

export function botOrg(o: LiveOrg, c?: CompletionData | null): BotOrg {
  return {
    id: orgId(o),
    nomi: o.name,
    hudud: o.region,
    hududSlug: regionSlug(o.region),
    tuman: o.district,
    stir: o.stir,
    boysunuvi: o.sub ?? null,
    holat: o.status,
    holatMatn: STATUS_TEXT[o.status],
    sabab: o.reason,
    sababMatn: REASON_TEXT[o.reason],
    billing: o.billing,
    toldirish: orgCompletion(o.stir, c),
  };
}

export interface BotCounts {
  jami: number;
  ulangan: number;
  ulanmagan: number;
  ochirilgan: number;
  foiz: number; // 0..100, one decimal
}

export function botCounts(c: Counts): BotCounts {
  return {
    jami: c.total,
    ulangan: c.ulangan,
    ulanmagan: c.ulanmagan,
    ochirilgan: c.ochirilgan,
    foiz: Math.round(c.percent * 1000) / 10,
  };
}

/** Republic + every region with its slug (the bot binds staff to a region by slug). */
export function summary(r: LiveResult, c?: CompletionData | null) {
  return {
    ...botCounts(r.totals),
    toldirish: c ? completionStat(c.overall, c.sana) : null,
    hududlar: r.regions.map((g) => ({
      nomi: g.name,
      slug: regionSlug(g.name),
      ...botCounts(g),
      toldirish: c ? completionStat(c.regions.find((x) => x.name === g.name), c.sana) : null,
    })),
  };
}

export function regionBySlug(r: LiveResult, slug: string) {
  return r.regions.find((g) => regionSlug(g.name) === slug);
}

/** STIR → the registry row it first sits at (where /toldirilish places the org). */
function rowOfStir(r: LiveResult): Map<string, LiveOrg> {
  const m = new Map<string, LiveOrg>();
  for (const o of r.orgs) if (o.stir && !m.has(o.stir)) m.set(o.stir, o);
  return m;
}

export function regionSummary(r: LiveResult, slug: string, c?: CompletionData | null) {
  const g = regionBySlug(r, slug);
  if (!g) return null;
  // A district's completion: the file's orgs whose STIR the registry places in that district.
  const byDistrict = new Map<string, { completion: number }[]>();
  if (c) {
    const rows = rowOfStir(r);
    for (const o of c.orgs) {
      const row = o.stir ? rows.get(o.stir) : undefined;
      if (!row || row.region !== g.name) continue;
      const k = row.district ?? "";
      byDistrict.set(k, [...(byDistrict.get(k) ?? []), o]);
    }
  }
  return {
    nomi: g.name,
    slug,
    ...botCounts(g),
    toldirish: c ? completionStat(c.regions.find((x) => x.name === g.name), c.sana) : null,
    tumanlar: g.districts.map((d) => ({
      nomi: d.name,
      ...botCounts(d),
      toldirish: c ? completionStat(statOf(byDistrict.get(d.name ?? "") ?? []), c.sana) : null,
    })),
  };
}

export function regionOrgs(
  r: LiveResult,
  slug: string,
  holat?: LiveStatus,
  c?: CompletionData | null,
): BotOrg[] | null {
  const g = regionBySlug(r, slug);
  if (!g) return null;
  return r.orgs.filter((o) => o.region === g.name && (!holat || o.status === holat)).map((o) => botOrg(o, c));
}

export interface BotCompletionOrg {
  nomi: string; // the name in the completion file (ARGOS's own spelling)
  stir: string | null;
  foiz: number;
  hudud: string;
  hududSlug: string;
  tuman: string | null; // null = the registry does not place the STIR
  reestrId: string | null; // the registry row's `id` (BotOrg.id), null when not placed
}

/**
 * The completion file's organisations, lowest first (ties in file order), optionally one region's
 * and only those strictly below `kam` per cent. `jami` counts before the limit; `toldirish` is the
 * whole region's (or republic's) figure, not the filtered list's.
 */
export function completionList(
  r: LiveResult,
  c: CompletionData,
  opts: { slug?: string; kam?: number; limit?: number } = {},
) {
  const rows = rowOfStir(r);
  const inRegion = c.orgs.filter((o) => !opts.slug || regionSlug(o.region) === opts.slug);
  const hits = inRegion
    .filter((o) => opts.kam === undefined || pct(o.completion) < opts.kam)
    .map((o, i) => ({ o, i }))
    .sort((a, b) => a.o.completion - b.o.completion || a.i - b.i)
    .map(({ o }): BotCompletionOrg => {
      const row = o.stir ? rows.get(o.stir) : undefined;
      return {
        nomi: o.name,
        stir: o.stir ?? null,
        foiz: pct(o.completion),
        hudud: o.region,
        hududSlug: regionSlug(o.region),
        tuman: row?.district ?? null,
        reestrId: row ? orgId(row) : null,
      };
    });
  return {
    toldirish: completionStat(statOf(inRegion), c.sana),
    jami: hits.length,
    tashkilotlar: hits.slice(0, opts.limit ?? hits.length),
  };
}

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y",
  к: "k", қ: "q", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ў: "o",
  ф: "f", х: "x", ҳ: "h", ц: "s", ч: "ch", ш: "sh", щ: "sh", ъ: "", ь: "", ы: "i", э: "e", ю: "yu",
  я: "ya",
};

/** Lower case, Cyrillic → Latin, apostrophes and punctuation dropped: «Oltinkoʻl» = «oltinkol» = «Олтинкўл». */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/[Ѐ-ӿ]/g, (ch) => CYR[ch] ?? ch)
    .replace(/[ʻʼ'’‘`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Rows whose name (or group) has a word starting with each word of the query, in registry order:
 * «42» finds «42-sonli» but not «142-sonli», «poliklinika» finds «poliklinikasi».
 */
export function search(
  r: LiveResult,
  q: string,
  opts: { slug?: string; limit?: number } = {},
  c?: CompletionData | null,
) {
  const words = fold(q).split(" ").filter(Boolean);
  if (!words.length) return { jami: 0, natijalar: [] as BotOrg[] };
  const hits = r.orgs.filter((o) => {
    if (opts.slug && regionSlug(o.region) !== opts.slug) return false;
    const hay = ` ${fold(`${o.name} ${o.district ?? ""}`)} `;
    return words.every((w) => hay.includes(` ${w}`));
  });
  return { jami: hits.length, natijalar: hits.slice(0, opts.limit ?? 20).map((o) => botOrg(o, c)) };
}

export function byStir(r: LiveResult, stir: string, c?: CompletionData | null): BotOrg[] {
  const s = stir.trim();
  return r.orgs.filter((o) => o.stir === s).map((o) => botOrg(o, c));
}

export interface BotChange extends Omit<BotOrg, "holatMatn" | "sabab" | "sababMatn" | "billing"> {
  oldin: LiveStatus;
  oldinMatn: string;
  holatMatn: string;
}

/**
 * Rows whose status differs between the previous and the current tree (changedSince's output, as
 * getLive() computes it on the registry the live page counts with), optionally one region's.
 */
export function changes(
  list: readonly { org: BaseOrg; from: LiveStatus; to: LiveStatus }[],
  slug?: string,
  c?: CompletionData | null,
): BotChange[] {
  return list
    .filter(({ org }) => !slug || regionSlug(org.region) === slug)
    .map(({ org: o, from, to }) => ({
      id: orgId(o),
      nomi: o.name,
      hudud: o.region,
      hududSlug: regionSlug(o.region),
      tuman: o.district,
      stir: o.stir,
      boysunuvi: o.sub ?? null,
      oldin: from,
      oldinMatn: STATUS_TEXT[from],
      holat: to,
      holatMatn: STATUS_TEXT[to],
      toldirish: orgCompletion(o.stir, c),
    }));
}
