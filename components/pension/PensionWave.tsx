import type { PensionStat } from "@/lib/types";
import { replacementWave, type WaveKey } from "@/lib/pension-metrics";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

/**
 * Replaces the time-series trend, which needed months of uploads before it said
 * anything and showed a single dot until then. This answers the same question —
 * what is coming — from the data already in hand.
 *
 * A server component with CSS bars rather than an ECharts client component: it
 * has three rows, so a chart library buys nothing, and it renders without
 * JavaScript. That matters here, because the animated sections of this
 * dashboard do not paint in every environment.
 *
 * Every figure is a direct sum of report columns. Nothing is modelled.
 */
export async function PensionWave({ stat }: { stat: PensionStat }) {
  const S = await getS();
  const steps = replacementWave(stat);
  const max = steps[steps.length - 1]?.count || 1;

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-[0.95rem] font-semibold">{S.pension.waveTitle}</h2>
        <p className="text-[0.78rem] text-ink-soft">{S.pension.waveHint}</p>
      </div>

      <ol className="space-y-3">
        {steps.map((s, i) => {
          // Bars are scaled to the widest step, not to the workforce: at 5.7%
          // the first row would otherwise be an invisible sliver.
          const width = (s.count / max) * 100;
          return (
            <li key={s.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.83rem] font-medium">
                  {S.pension.wave[s.key as WaveKey]}
                </span>
                <span className="shrink-0 text-right">
                  <span className="tnum text-[1.05rem] font-semibold text-un">
                    {fmtInt(s.count)}
                  </span>
                  <span className="tnum ml-2 text-[0.78rem] text-ink-faint">
                    {fmtPct(s.share, 1)}
                  </span>
                </span>
              </div>
              <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-line-soft">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${width}%`,
                    // Deepening tone as the horizon lengthens; the same three
                    // steps read as one accumulating wave rather than three
                    // unrelated bars.
                    background: `color-mix(in srgb, var(--color-un) ${45 + i * 27}%, var(--color-sov))`,
                  }}
                />
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 border-t border-line-soft pt-3 text-[0.7rem] leading-relaxed text-ink-faint">
        {S.pension.waveNote}
      </p>
    </div>
  );
}
