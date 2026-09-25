// Tashkent wall-clock time (UTC+5, no DST) — identical on the Vercel server
// (UTC) and in the browser, so server and client render the same string.
export function fmtTashkent(iso: string, withDate = true): string {
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return iso;
  const d = new Date(ms + 5 * 3600 * 1000);
  const p = (n: number) => n.toString().padStart(2, "0");
  const hm = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  return withDate ? `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}, ${hm}` : hm;
}

export const STALE_MS = 30 * 60 * 1000;

export function isStale(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > STALE_MS;
}
