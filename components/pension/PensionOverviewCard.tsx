import Link from "next/link";
import type { KadrlarStat } from "@/lib/types";
import { pensionMetrics } from "@/lib/pension-metrics";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

/** Mirrors the completion card's shape, one rung higher on the page. */
export async function PensionOverviewCard({ stat }: { stat: KadrlarStat }) {
  const S = await getS();
  const m = pensionMetrics(stat);

  return (
    <Link
      href="/pensiya"
      className="card card-link group flex items-center gap-4 p-5 sm:gap-5"
    >
      <span
        className="grid h-[92px] w-[92px] shrink-0 place-content-center justify-items-center gap-1 rounded-2xl border border-un/30 bg-un-soft px-1"
        aria-hidden
      >
        <span className="tnum text-[1.5rem] font-bold leading-none text-un">
          {fmtPct(m.exposedShare, 1)}
        </span>
        {/* The completion card never shows a bare percentage either. An
            unlabelled figure this size reads as whatever the heading implies. */}
        <span className="text-center text-[0.58rem] leading-tight text-un/70">
          {S.pension.col.share}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-semibold">
          {S.pension.overviewCard}
        </span>
        <span className="mt-0.5 block text-[0.8rem] text-ink-soft">
          <span className="tnum font-semibold text-un">{fmtInt(m.exposed)}</span>{" "}
          {S.pension.peopleUnit} ·{" "}
          <span className="tnum">{fmtInt(stat.pensionWorking)}</span>{" "}
          {S.pension.col.working} ·{" "}
          <span className="tnum">{fmtInt(stat.reaching)}</span>{" "}
          {S.pension.col.reaching}
        </span>
      </div>
      <Arrow />
    </Link>
  );
}

function Arrow() {
  return (
    <svg
      className="shrink-0 text-sov transition-transform group-hover:translate-x-0.5"
      width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden
    >
      <path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
