import type { Status } from "./types";
import { getStrings, type Lang } from "./i18n/index.ts";

const NBSP = " "; // narrow no-break space — thousands separator

/** 3886 -> "3 886" (deterministic on server & client) */
export function fmtInt(n: number): string {
  const s = Math.round(n).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 0.6688 -> "66,9%"  (Uzbek decimal comma) */
export function fmtPct(value: number, digits = 1): string {
  const pct = (value * 100).toFixed(digits).replace(".", ",");
  return `${pct}%`;
}

/** 0.6688 -> 66.9 (number, for chart values) */
export function toPct(value: number, digits = 1): number {
  return Number((value * 100).toFixed(digits));
}

export interface StatusMeta {
  key: Status;
  label: string;
  color: string; // css var
  text: string; // tailwind text color class
  bg: string; // tailwind bg class
  softBg: string; // tailwind soft bg class
  dot: string; // tailwind bg class for dot
}

/** Status colours are fixed; only the labels follow the language. */
export function statusMeta(lang: Lang): Record<Status, StatusMeta> {
  const S = getStrings(lang);
  return {
    ulangan: {
      key: "ulangan",
      label: S.status.ulangan,
      color: "var(--color-ul)",
      text: "text-ul",
      bg: "bg-ul",
      softBg: "bg-ul-soft",
      dot: "bg-ul",
    },
    ulanmagan: {
      key: "ulanmagan",
      label: S.status.ulanmagan,
      color: "var(--color-un)",
      text: "text-un",
      bg: "bg-un",
      softBg: "bg-un-soft",
      dot: "bg-un",
    },
    ochirilgan: {
      key: "ochirilgan",
      label: S.status.ochirilganShort,
      color: "var(--color-och)",
      text: "text-och",
      bg: "bg-och",
      softBg: "bg-och-soft",
      dot: "bg-och",
    },
  };
}

/**
 * rampColor over a narrowed domain [lo, 1]: values at or below `lo` are red.
 * Used where every region sits in the top band (90–100%) and a 0–100 ramp
 * paints them all the same green.
 */
export function rampColorIn(pct: number, lo: number): string {
  return rampColor(lo >= 1 ? pct : (pct - lo) / (1 - lo));
}

/** color ramp for the map / ranking: red (low) -> amber -> green (high) */
export function rampColor(pct: number): string {
  // pct in [0,1]
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [0xe4, 0x48, 0x3d]], // red
    [0.5, [0xf0, 0xa0, 0x20]], // amber
    [0.75, [0x8d, 0xc6, 0x3f]], // yellow-green
    [1.0, [0x10, 0xa0, 0x6d]], // green
  ];
  const p = Math.max(0, Math.min(1, pct));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (p >= a && p <= b) {
      const t = (p - a) / (b - a);
      const c = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return "rgb(16,160,109)";
}

/**
 * rampColor for TEXT and marks in either theme: the ramp lifted toward
 * --ramp-ink by --ramp-mix (white 16 % on dark; slate #2f3d55 52 % on light, which also mutes it), so every
 * point of the ramp reads at least 4.5:1 on a card — measured, not guessed.
 * CSS only; canvas charts use rampColorFor().
 */
export function rampCss(pct: number): string {
  return `color-mix(in oklab, var(--ramp-ink) var(--ramp-mix), ${rampColor(pct)})`;
}

/** rampCss over a narrowed domain [lo, 1] (see rampColorIn). */
export function rampCssIn(pct: number, lo: number): string {
  return rampCss(lo >= 1 ? pct : (pct - lo) / (1 - lo));
}

/** The same lift as rampCss, computed in OKLab for canvas (which cannot read var()). */
export function rampColorFor(pct: number, theme: "light" | "dark"): string {
  const m = /rgb\((\d+), ?(\d+), ?(\d+)\)/.exec(rampColor(pct));
  const c = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [16, 160, 109];
  return mixOklab(theme === "light" ? [0x2f, 0x3d, 0x55] : [255, 255, 255], c, theme === "light" ? 0.52 : 0.16);
}

/** Mix two sRGB colours (0–255 triples) in OKLab; `wa` is the weight of `a`. */
export function mixOklab(a: number[], b: number[], wa: number): string {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const toLab = (rgb: number[]) => {
    const [r, g, bl] = rgb.map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  };
  const A = toLab(a);
  const B = toLab(b);
  const [L, aa, bb] = A.map((x, i) => x * wa + B[i] * (1 - wa));
  const l = (L + 0.3963377774 * aa + 0.2158037573 * bb) ** 3;
  const m = (L - 0.1055613458 * aa - 0.0638541728 * bb) ** 3;
  const s = (L - 0.0894841775 * aa - 1.291485548 * bb) ** 3;
  const enc = (v: number) => {
    const c = Math.max(0, Math.min(1, v));
    return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
  };
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(enc);
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * Piecewise-linear sample of a hex-stop ramp at t ∈ [0,1]. Used by the
 * single-hue sequential ramps on the analytics pages (pensiya amber,
 * vakansiya coral, tarkib blue): one hue for magnitude, so lightness — not a
 * rainbow — carries the value.
 */
export function lerpRamp(stops: readonly string[], t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const hex = (c: string) => [1, 3, 5].map((p) => parseInt(c.slice(p, p + 2), 16));
  const [a, b] = [hex(stops[i]), hex(stops[i + 1])];
  const mix = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** "2026-07-02" -> "02.07.2026" */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/**
 * Relative time: "5 сония олдин" / "5 сек. назад".
 * Russian units are abbreviated on purpose — that sidesteps the 1 / 2-4 / 5+
 * plural forms without pulling in a plural library.
 */
export function fmtAgo(iso: string, nowMs: number, lang: Lang): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const s = Math.max(0, Math.floor((nowMs - then) / 1000));
  const ru = lang === "ru";
  if (s < 45) return ru ? `${s} сек. назад` : `${s} сония олдин`;
  const m = Math.floor(s / 60);
  if (m < 60) return ru ? `${m} мин. назад` : `${m} дақиқа олдин`;
  const h = Math.floor(m / 60);
  if (h < 24) return ru ? `${h} ч. назад` : `${h} соат олдин`;
  const d = Math.floor(h / 24);
  return ru ? `${d} дн. назад` : `${d} кун олдин`;
}

/** ISO timestamp -> "02.07.2026, 14:30" */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return fmtDate(iso);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
}
