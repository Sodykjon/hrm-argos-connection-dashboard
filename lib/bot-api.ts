// JSON shapes for the Telegram bot (app/api/bot/*): per-organisation connection status, region
// totals and status changes between the last two ARGOS trees — counted exactly as /argos-jonli
// counts them (lib/argos-live-data.ts getLive). Field names are Uzbek (Latin) for the bot's author.
//
// Pure module: no `@/` imports, so node --test can load it directly.

import { createHash } from "node:crypto";
import type { BaseOrg, Counts, LiveOrg, LiveResult, LiveStatus, Reason } from "./argos-live.ts";
import { regionSlug } from "./regions.ts";

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

export interface BotOrg {
  id: string;
  nomi: string;
  hudud: string;
  hududSlug: string;
  tuman: string | null;
  stir: string | null;
  holat: LiveStatus;
  holatMatn: string;
  sabab: Reason;
  sababMatn: string;
  billing: 0 | 1 | null; // null = STIR not in the ARGOS tree
}

export function botOrg(o: LiveOrg): BotOrg {
  return {
    id: orgId(o),
    nomi: o.name,
    hudud: o.region,
    hududSlug: regionSlug(o.region),
    tuman: o.district,
    stir: o.stir,
    holat: o.status,
    holatMatn: STATUS_TEXT[o.status],
    sabab: o.reason,
    sababMatn: REASON_TEXT[o.reason],
    billing: o.billing,
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
export function summary(r: LiveResult) {
  return {
    ...botCounts(r.totals),
    hududlar: r.regions.map((g) => ({ nomi: g.name, slug: regionSlug(g.name), ...botCounts(g) })),
  };
}

export function regionBySlug(r: LiveResult, slug: string) {
  return r.regions.find((g) => regionSlug(g.name) === slug);
}

export function regionSummary(r: LiveResult, slug: string) {
  const g = regionBySlug(r, slug);
  if (!g) return null;
  return {
    nomi: g.name,
    slug,
    ...botCounts(g),
    tumanlar: g.districts.map((d) => ({ nomi: d.name, ...botCounts(d) })),
  };
}

export function regionOrgs(r: LiveResult, slug: string, holat?: LiveStatus): BotOrg[] | null {
  const g = regionBySlug(r, slug);
  if (!g) return null;
  return r.orgs.filter((o) => o.region === g.name && (!holat || o.status === holat)).map(botOrg);
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
export function search(r: LiveResult, q: string, opts: { slug?: string; limit?: number } = {}) {
  const words = fold(q).split(" ").filter(Boolean);
  if (!words.length) return { jami: 0, natijalar: [] as BotOrg[] };
  const hits = r.orgs.filter((o) => {
    if (opts.slug && regionSlug(o.region) !== opts.slug) return false;
    const hay = ` ${fold(`${o.name} ${o.district ?? ""}`)} `;
    return words.every((w) => hay.includes(` ${w}`));
  });
  return { jami: hits.length, natijalar: hits.slice(0, opts.limit ?? 20).map(botOrg) };
}

export function byStir(r: LiveResult, stir: string): BotOrg[] {
  const s = stir.trim();
  return r.orgs.filter((o) => o.stir === s).map(botOrg);
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
      oldin: from,
      oldinMatn: STATUS_TEXT[from],
      holat: to,
      holatMatn: STATUS_TEXT[to],
    }));
}
