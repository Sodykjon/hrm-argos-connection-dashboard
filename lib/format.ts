import type { Status } from "./types";
import { S } from "./strings";

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

export const STATUS_META: Record<Status, StatusMeta> = {
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

/** "2026-07-02" -> "02.07.2026" */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** relative time in Uzbek Cyrillic: "5 сония олдин", "3 дақиқа олдин", ... */
export function fmtAgo(iso: string, nowMs: number): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const s = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (s < 45) return `${s} сония олдин`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} дақиқа олдин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} соат олдин`;
  const d = Math.floor(h / 24);
  return `${d} кун олдин`;
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
