import Link from "next/link";
import type { RegionStat } from "@/lib/types";
import { regionSlug } from "@/lib/regions";
import { rampColor, fmtInt, fmtPct } from "@/lib/format";
import { S } from "@/lib/strings";

export function AttentionStrip({ regions }: { regions: RegionStat[] }) {
  const lowest = [...regions].sort((a, b) => a.percent - b.percent).slice(0, 3);

  return (
    <section>
      <div className="mb-2.5 flex items-baseline gap-3">
        <span className="h-2 w-2 rounded-full bg-un" />
        <h2 className="text-[0.95rem] font-semibold">{S.overview.attention}</h2>
        <span className="text-[0.75rem] text-ink-faint">
          {S.overview.attentionHint}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {lowest.map((r, i) => {
          const color = rampColor(r.percent);
          return (
            <Link
              key={r.name}
              href={`/hududlar/${regionSlug(r.name)}`}
              className="card group flex items-center gap-4 p-4 transition-shadow hover:shadow-[0_4px_18px_rgba(11,27,43,0.08)]"
            >
              <span
                className="tnum grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[1.05rem] font-semibold text-white"
                style={{ background: color }}
              >
                {fmtPct(r.percent, 0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9rem] font-semibold">
                  {r.name}
                </span>
                <span className="mt-0.5 block text-[0.76rem] text-ink-soft">
                  {S.status.ulanmagan}:{" "}
                  <span className="tnum font-semibold text-un">
                    {fmtInt(r.ulanmagan)}
                  </span>{" "}
                  {S.units.of} {fmtInt(r.total)}
                </span>
              </span>
              <svg
                className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
                width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden
              >
                <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
