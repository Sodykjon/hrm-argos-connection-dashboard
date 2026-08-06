// Region display order, slugs for [region] routes, and the geographic /
// non-geographic distinction ("Республика муассасалари" is a central category,
// not a place on the map).

import type { Lang } from "./i18n";

export const REPUBLIC = "Республика муассасалари";

/** Ministry HQ group in the completion data. A canonical key, never a label —
 *  comparing a data value against a translated string would break in Russian. */
export const CENTRAL = "Марказий аппарат";

/**
 * ARGOS's two non-geographic branches, as GetSpInstitutionTreeV2 spells them.
 * These are INPUT names only — both resolve to REPUBLIC above, which is the one
 * canonical key the dashboard stores and displays.
 *
 * Why both: «Районный/городской уровень» is not a level. Walked on 06.08.2026 it
 * held exactly one organisation — «Республиканская клиническая больница глазных
 * болезней» (id 33195), 154 staff — a REPUBLICAN hospital filed under the
 * district/city branch. Keeping it as its own row put a single misclassified
 * hospital beside Samarkand in a table of regions, and at 22.7 % it ranked first
 * until the ranking was restricted to geographic rows. Folding it into the
 * republican bucket puts it where its own name says it belongs.
 *
 * If ARGOS ever fixes the classification the branch simply stops appearing and
 * the merge becomes a no-op — nothing here needs changing.
 */
export const ARGOS_LEVEL_REPUBLICAN = "Республика даражаси";
export const ARGOS_LEVEL_DISTRICT = "Туман/шаҳар даражаси";

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
