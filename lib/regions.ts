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
};

const REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_MAP).map(([name, slug]) => [slug, name]),
);

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
