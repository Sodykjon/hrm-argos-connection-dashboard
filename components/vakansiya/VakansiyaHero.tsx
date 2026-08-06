import type { KadrlarStat } from "@/lib/types";
import { vacancyMetrics } from "@/lib/vakansiya-metrics";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

/**
 * Opens with the count, like /pensiya and for the same reason: 26 048 unfilled
 * posts is a staffing problem someone has to solve, "3.6 %" is a statistic.
 *
 * The two cards beneath carry the count's denominator, so the headline is never
 * quoted without the establishment it is a share of.
 */
export async function VakansiyaHero({ stat }: { stat: KadrlarStat }) {
  const S = await getS();
  const m = vacancyMetrics(stat);

  return (
    <section className="border-live card rise overflow-hidden p-6 sm:p-8">
      <span className="eyebrow text-sov">{S.vakansiya.heroEyebrow}</span>

      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <AnimatedNumber
          value={m.vacant}
          className="text-grad-ul tnum text-[3.2rem] font-bold leading-[0.9] sm:text-[4.6rem]"
        />
        <span className="max-w-[52ch] text-[1.05rem] leading-snug text-ink-soft sm:text-[1.3rem]">
          {S.vakansiya.heroTail(fmtPct(m.rate, 1))}
        </span>
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Part label={S.vakansiya.stavka} hint={S.vakansiya.stavkaHint} value={m.stavka} />
        <Part
          label={S.vakansiya.filled}
          hint={S.vakansiya.filledHint}
          value={m.filled}
          share={m.stavka > 0 ? m.filled / m.stavka : undefined}
        />
      </div>
    </section>
  );
}

function Part({
  label,
  hint,
  value,
  share,
}: {
  label: string;
  hint: string;
  value: number;
  share?: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.82rem] font-medium text-ink-soft">{label}</span>
        {share !== undefined && (
          <span className="tnum shrink-0 text-[0.82rem] font-semibold text-ul">
            {fmtPct(share, 1)}
          </span>
        )}
      </div>
      <div className="tnum mt-1.5 text-[1.75rem] font-semibold leading-none">
        {fmtInt(value)}
      </div>
      <div className="mt-1 text-[0.72rem] text-ink-faint">{hint}</div>
    </div>
  );
}
