import Link from "next/link";
import type { RegionStat } from "@/lib/types";
import { regionSlug, regionLabel } from "@/lib/regions";
import { rampColor, fmtInt, fmtPct } from "@/lib/format";
import { getLang, getS } from "@/lib/i18n/server";

/**
 * «Where are the unconnected?» — the three regions holding the MOST
 * unconnected organisations, not the three lowest percentages: a small group
 * of 79 republican centres at 72% matters less than 162 orgs in one region.
 * The headline states the concentration outright.
 */
export async function AttentionStrip({ regions }: { regions: RegionStat[] }) {
  const S = await getS();
  const lang = await getLang();
  const totalUn = regions.reduce((s, r) => s + r.ulanmagan, 0);
  const top = [...regions]
    .filter((r) => r.ulanmagan > 0)
    .sort((a, b) => b.ulanmagan - a.ulanmagan || a.percent - b.percent)
    .slice(0, 3);
  if (!top.length || !totalUn) return null;
  const share = (r: RegionStat) => r.ulanmagan / totalUn;

  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="h-2 w-2 rounded-full bg-un" />
        <h2 className="text-[0.95rem] font-semibold">{S.overview.attention}</h2>
        <span className="text-[0.75rem] text-ink-faint">{S.overview.attentionHintCount}</span>
        {share(top[0]) >= 0.3 && (
          <span className="text-[0.8rem] font-semibold text-un">
            {S.overview.attentionShare(fmtPct(share(top[0]), 0), regionLabel(top[0].name, lang))}
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {top.map((r) => (
          <Link
            key={r.name}
            href={`/hududlar/${regionSlug(r.name)}`}
            className="card card-link group flex items-center gap-4 p-4"
          >
            <span className="tnum grid h-11 min-w-11 shrink-0 place-items-center rounded-xl bg-un px-2 text-[1.05rem] font-semibold text-white">
              {fmtInt(r.ulanmagan)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[0.9rem] font-semibold">{regionLabel(r.name, lang)}</span>
                <span className="tnum shrink-0 text-[0.8rem] font-semibold" style={{ color: rampColor(r.percent) }} title={S.kpi.rate}>
                  {fmtPct(r.percent, 1)}
                </span>
              </span>
              <span className="tnum mt-0.5 block text-[0.76rem] font-semibold text-un">
                {S.overview.shareOfUnconnected(fmtPct(share(r), 0))}
              </span>
              {/* share bar: this region's slice of all unconnected orgs */}
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-line-soft">
                <span className="block h-full rounded-full bg-un" style={{ width: `${share(r) * 100}%` }} />
              </span>
            </span>
            <svg
              className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
              width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden
            >
              <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
