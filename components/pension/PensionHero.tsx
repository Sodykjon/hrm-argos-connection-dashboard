import type { KadrlarStat } from "@/lib/types";
import { pensionMetrics } from "@/lib/pension-metrics";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { PensionDonut } from "./PensionDonut";
import { fmtInt, fmtPct, toPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

/**
 * Opens with the replacement-demand count rather than a percentage: 94 981 is
 * the number that implies an action (how many people must be ready to be
 * replaced), where "13.8%" is just a statistic. The donut on the right puts
 * that count back into the whole it is a share of.
 *
 * The "one in N" phrasing is generated, not written — see pensionMetrics().
 * A bare "one in 7" would overstate, so the copy carries "деярли" whenever the
 * rounded claim exceeds the real share.
 */
export async function PensionHero({ stat }: { stat: KadrlarStat }) {
  const S = await getS();
  const m = pensionMetrics(stat);

  return (
    <section className="border-live card rise overflow-hidden p-6 sm:p-8">
      {/* row-reverse: the donut sits LEFT on desktop while the phone keeps the
          headline first — swapping DOM order would push the number below the
          fold on mobile. */}
      <div className="flex flex-col gap-8 lg:flex-row-reverse lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <span className="eyebrow text-sov">{S.pension.heroEyebrow}</span>

          <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <AnimatedNumber
              value={m.exposed}
              className="text-grad-ul tnum text-[3.2rem] font-bold leading-[0.9] sm:text-[4.6rem]"
            />
            <span className="max-w-[52ch] text-[1.05rem] leading-snug text-ink-soft sm:text-[1.3rem]">
              {m.oneIn > 0
                ? S.pension.heroTail(m.oneIn, m.nearly)
                : S.pension.heroTailPlain}
            </span>
          </p>

          {/* the two components of the headline, kept adjacent to it so the
              number is never quoted without its parts */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Component
              label={S.pension.working}
              hint={S.pension.workingHint}
              value={stat.pensionWorking}
              share={m.workingShare}
            />
            <Component
              label={S.pension.reaching}
              hint={S.pension.reachingHint}
              value={stat.reaching}
              share={m.reachingShare}
            />
          </div>
        </div>

        {stat.total > 0 && (
          <div className="shrink-0 self-center">
            <PensionDonut
              working={Math.max(0, stat.pensionWorking)}
              reaching={Math.max(0, stat.reaching)}
              rest={Math.max(0, stat.total - m.exposed)}
              sharePct={toPct(m.exposedShare)}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function Component({
  label,
  hint,
  value,
  share,
}: {
  label: string;
  hint: string;
  value: number;
  share: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.82rem] font-medium text-ink-soft">{label}</span>
        <span className="tnum shrink-0 text-[0.82rem] font-semibold text-un">
          {fmtPct(share, 1)}
        </span>
      </div>
      <div className="tnum mt-1.5 text-[1.75rem] font-semibold leading-none">
        {fmtInt(value)}
      </div>
      <div className="mt-1 text-[0.72rem] text-ink-faint">{hint}</div>
    </div>
  );
}
