// Region display order, slugs for [region] routes, and the geographic /
// non-geographic distinction ("Республика муассасалари" is a central category,
// not a place on the map).

import type { Lang } from "./i18n";

export const REPUBLIC = "Республика муассасалари";

/** Ministry HQ group in the completion data. A canonical key, never a label —
 *  comparing a data value against a translated string would break in Russian. */
export const CENTRAL = "Марказий аппарат";

/**
 * Σ(14 regions) < national, because a large set of organisations reports
 * straight to the ministry rather than to a viloyat health administration.
 * The difference is shown as this explicit row, never left as a silent gap.
 * Not geographic — never on the map.
 *
 * Named for what the row IS (the complement) rather than for its contents.
 * An earlier name enumerated them — "central apparatus and republican centres"
 * — and was wrong: verified against the live report on 2026-08-06, 24 936 of
 * the 66 117 (38 %) is the sanitary-epidemiological committee, which is
 * neither. Enumerating invites exactly that error; describing does not.
 */
export const PENSION_RESIDUAL = "Ҳудудий бошқармаларга кирмаган ташкилотлар";

// Cyrillic region name -> URL slug (latin, stable & readable)
const SLUG_MAP: Record<string, string> = {
  "Республика муассасалари": "respublika",
  "Қорақалпоғистон Республикаси": "qoraqalpogiston",
  "Андижон вилояти": "andijon",
  "Бухоро вилояти": "buxoro",
  "Жиззах вилояти": "jizzax",
  "Қашқадарё вилояти": "qashqadaryo",
  "Навоий вилояти": "navoiy",
  "Наманган вилояти": "namangan",
  "Самарқанд вилояти": "samarqand",
  "Сирдарё вилояти": "sirdaryo",
  "Сурхондарё вилояти": "surxondaryo",
  "Тошкент вилояти": "toshkent-viloyati",
  "Фарғона вилояти": "fargona",
  "Хоразм вилояти": "xorazm",
  "Тошкент шаҳри": "toshkent-shahri",
  // Non-geographic completion-only groups (org hierarchy, not on the map)
  "Марказий аппарат": "markaziy-apparat",
  "Санитар-эпидемиология қўмитаси": "sanepid-qomita",
  "Республика марказлари": "respublika-markazlari",
  "Ҳудудий бошқармаларга кирмаган ташкилотлар": "markaz-respublika",
};

const REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_MAP).map(([name, slug]) => [slug, name]),
);

// The 14 geographic viloyat/republic regions drawn on the choropleth map.
// (Used by the completion dashboard, whose non-geographic groups above must be
// excluded from the map explicitly rather than via isRepublic.)
export const GEO_REGIONS = [
  "Қорақалпоғистон Республикаси",
  "Андижон вилояти",
  "Бухоро вилояти",
  "Жиззах вилояти",
  "Қашқадарё вилояти",
  "Навоий вилояти",
  "Наманган вилояти",
  "Самарқанд вилояти",
  "Сирдарё вилояти",
  "Сурхондарё вилояти",
  "Тошкент вилояти",
  "Фарғона вилояти",
  "Хоразм вилояти",
  "Тошкент шаҳри",
];
const GEO_SET = new Set(GEO_REGIONS);
export function isGeographicRegion(name: string): boolean {
  return GEO_SET.has(name);
}

/** Fallback slug for an unknown region name (future-proofing new uploads). */
function fallbackSlug(name: string): string {
  return (
    "r-" +
    encodeURIComponent(name.trim().toLowerCase().replace(/\s+/g, "-")).replace(
      /%/g,
      "",
    )
  );
}

export function regionSlug(name: string): string {
  return SLUG_MAP[name] ?? fallbackSlug(name);
}

/** Resolve a slug back to a region name, matching against the known set. */
export function regionFromSlug(
  slug: string,
  known: string[],
): string | undefined {
  if (REVERSE[slug]) return REVERSE[slug];
  return known.find((n) => regionSlug(n) === slug);
}

export function isRepublic(name: string): boolean {
  return name === REPUBLIC;
}

/** Display-only Russian names. Keys stay the canonical Uzbek-Cyrillic names. */
const REGION_RU: Record<string, string> = {
  "Республика муассасалари": "Республиканские учреждения",
  "Қорақалпоғистон Республикаси": "Республика Каракалпакстан",
  "Андижон вилояти": "Андижанская область",
  "Бухоро вилояти": "Бухарская область",
  "Жиззах вилояти": "Джизакская область",
  "Қашқадарё вилояти": "Кашкадарьинская область",
  "Навоий вилояти": "Навоийская область",
  "Наманган вилояти": "Наманганская область",
  "Самарқанд вилояти": "Самаркандская область",
  "Сирдарё вилояти": "Сырдарьинская область",
  "Сурхондарё вилояти": "Сурхандарьинская область",
  "Тошкент вилояти": "Ташкентская область",
  "Фарғона вилояти": "Ферганская область",
  "Хоразм вилояти": "Хорезмская область",
  "Тошкент шаҳри": "город Ташкент",
  "Марказий аппарат": "Центральный аппарат",
  "Санитар-эпидемиология қўмитаси":
    "Комитет санитарно-эпидемиологического благополучия",
  "Республика марказлари": "Республиканские центры",
  "Ҳудудий бошқармаларга кирмаган ташкилотлар":
    "Организации вне областных управлений",
};

/**
 * How a region name is shown. Never use the result as a key, a slug input or a
 * map-feature match — those stay on the canonical Uzbek-Cyrillic name.
 */
export function regionLabel(name: string, lang: Lang): string {
  return lang === "ru" ? (REGION_RU[name] ?? name) : name;
}

/** Same, abbreviated — for cramped map labels. */
export function regionLabelShort(name: string, lang: Lang): string {
  const label = regionLabel(name, lang);
  return lang === "ru"
    ? label.replace(/^город /, "г. ")
    : label.replace(" шаҳри", " ш.");
}
