import type { KadrlarStat } from "@/lib/types";
import { fmtInt, fmtPct } from "@/lib/format";
import { regionLabel } from "@/lib/regions";
import { getS, getLang } from "@/lib/i18n/server";

/**
 * Absolute distribution of vacant posts. The % ranking beside the map answers
 * "who is worst per stavka?", which flatters small regions; the burden itself
 * lives elsewhere — one city can hold a quarter of every vacant post in the
 * country while sitting mid-table on rate. Plain divs, no chart runtime: a
 * sorted bar list with count + share is the whole message.
 */
export async function VakansiyaAbsBars({ regions }: { regions: KadrlarStat[] }) {
  const S = await getS();
  const lang = await getLang();

  const rows = regions
    .map((r) => ({ name: r.name, vacant: Math.max(0, r.vacant) }))
    .sort((a, b) => b.vacant - a.vacant);
  const total = rows.reduce((a, r) => a + r.vacant, 0);
  const max = Math.max(...rows.map((r) => r.vacant), 1);
  if (total <= 0) return null;

  const top = rows[0];

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-[0.95rem] font-semibold">{S.vakansiya.absTitle}</h2>
        <span className="eyebrow">{S.vakansiya.absHint}</span>
      </div>
      <ol className="flex flex-col gap-1.5">
        {rows.map((r) => {
          const share = r.vacant / total;
          return (
            <li key={r.name} className="flex items-center gap-3 px-1">
              <span className="w-[13rem] shrink-0 truncate text-[0.8rem] font-medium sm:w-[15rem]">
                {regionLabel(r.name, lang)}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
                <span
                  className="block h-full rounded-full bg-un"
                  style={{ width: `${(r.vacant / max) * 100}%`, opacity: 0.45 + share * 2 }}
                />
              </span>
              <span className="tnum w-14 shrink-0 text-right text-[0.8rem] font-semibold">
                {fmtInt(r.vacant)}
              </span>
              <span className="tnum w-12 shrink-0 text-right text-[0.72rem] text-ink-faint">
                {fmtPct(share, 1)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 px-1 text-[0.74rem] leading-snug text-ink-faint">
        {S.vakansiya.absShareNote(
          regionLabel(top.name, lang),
          fmtPct(top.vacant / total, 1),
        )}
      </p>
    </section>
  );
}
