// Region display order, slugs for [region] routes, and the geographic /
// non-geographic distinction ("Республика муассасалари" is a central category,
// not a place on the map).

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
