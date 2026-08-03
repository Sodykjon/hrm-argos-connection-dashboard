// Language plumbing. The viewer's choice rides in a cookie; the canonical data
// (region names, organisation names, slugs, KV payloads) is never translated.

import { UZ } from "./uz";
import { RU } from "./ru";

export type Lang = "uz" | "ru";

/** Shape every dictionary must satisfy. */
export type Strings = typeof UZ;

/** Cookie holding the viewer's language choice. */
export const LANG_COOKIE = "hrm_lang";

export const DEFAULT_LANG: Lang = "uz";

const DICT: Record<Lang, Strings> = { uz: UZ, ru: RU };

export function getStrings(lang: Lang): Strings {
  return DICT[lang] ?? DICT[DEFAULT_LANG];
}

/** Narrow an arbitrary cookie value to a supported language. */
export function toLang(value: string | undefined): Lang {
  return value === "ru" ? "ru" : DEFAULT_LANG;
}

/** <html lang> value. */
export function htmlLang(lang: Lang): string {
  return lang === "ru" ? "ru" : "uz-Cyrl";
}
