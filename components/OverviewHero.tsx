import type { Totals } from "@/lib/types";
import { ReadinessRing } from "./ReadinessRing";
import { NationalBar } from "./NationalBar";
import { AnimatedNumber } from "./motion/AnimatedNumber";
import { toPct, fmtInt, fmtPct } from "@/lib/format";
import { getLang, getS } from "@/lib/i18n/server";

export async function OverviewHero({ totals }: { totals: Totals }) {
  const S = await getS();
  const lang = await getLang();
  const gap = 1 - totals.percent;
  return (
    <section className="border-live card rise overflow-hidden p-6 sm:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        {/* figure */}
        <div className="min-w-0 flex-1">
          <span className="eyebrow text-sov">{S.overview.heroEyebrow}</span>
          <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2">
            <AnimatedNumber
              value={toPct(totals.percent)}
              kind="pct"
              className="text-grad-ul tnum text-[4rem] font-bold leading-[0.85] sm:text-[5.5rem]"
            />
            <div className="mb-2 space-y-1.5">
              <span className="flex w-fit items-center gap-1.5 rounded-full border border-goal/30 bg-goal-soft px-2.5 py-1 text-[0.72rem] font-semibold text-goal">
                <span className="h-1.5 w-1.5 rounded-full bg-goal" />
                {S.goal.target100}
              </span>
              <div className="text-[0.72rem] text-ink-faint">
                {S.goal.gapLabel}{" "}
                <span className="tnum font-semibold text-goal">{fmtPct(gap, 1)}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[1.15rem] text-ink-soft sm:text-[1.4rem]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="live-dot absolute inline-flex h-2.5 w-2.5 rounded-full bg-ul" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ul" />
            </span>
            {/* Uzbek says "of 3 886, 3 241 connected"; Russian puts the
                connected figure first — same numbers, idiomatic order. */}
            {lang === "ru" ? (
              <>
                <AnimatedNumber value={totals.ulangan} className="tnum font-bold text-ul glow-ul" />
                <span>{S.units.of}</span>
                <span className="tnum font-semibold text-ink">{fmtInt(totals.total)}</span>
              </>
            ) : (
              <>
                <span className="tnum font-semibold text-ink">{fmtInt(totals.total)}</span>
                <span>{S.units.of}</span>
                <AnimatedNumber value={totals.ulangan} className="tnum font-bold text-ul glow-ul" />
              </>
            )}
            <span>{S.overview.orgsConnected}</span>
          </p>

          <div className="mt-6 max-w-xl">
            <NationalBar totals={totals} />
          </div>
        </div>

        {/* ring gauge */}
        <div className="shrink-0 self-center">
          <ReadinessRing percent={totals.percent} size={216} showLabel={false} />
        </div>
      </div>
    </section>
  );
}
