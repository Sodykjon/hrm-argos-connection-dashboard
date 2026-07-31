// Region display order, slugs for [region] routes, and the geographic /
// non-geographic distinction ("Республика муассасалари" is a central category,
// not a place on the map).

import type { Lang } from "./i18n";

export const REPUBLIC = "Республика муассасалари";

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
