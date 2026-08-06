"use client";

import { Chart } from "../Chart";
import { AnimatedNumber } from "../motion/AnimatedNumber";
import { fmtInt } from "@/lib/format";
import type { EChartsOption } from "@/lib/echarts";
import { useS } from "@/lib/i18n/client";

const WORKING = "#ff5a63"; // un — already at pension age
const REACHING = "#f7b23b"; // warn — reaches it this year
// och, the design system's "neutral/other" token. The first cut used the ring
// track colour #1b3157, which against the card background read as an empty
// track rather than as the workforce the two hot segments are part of.
const REST = "#7488a6";

/**
 * The hero's composition ring: pension-age and reaching-this-year as slices of
 * the whole workforce, with the exposure share in the centre. Silent on
 * purpose — a tooltip would clip against the hero card's overflow-hidden, so
 * the legend underneath carries the numbers instead.
 *
 * Categorical colours, deliberately NOT riskColor/rampColor: those are
 * comparative ramps for ranking regions against each other; these three
 * segments are parts of one whole.
 */
export function PensionDonut({
  working,
  reaching,
  rest,
  sharePct,
}: {
  working: number;
  reaching: number;
  rest: number;
  sharePct: number;
}) {
  const S = useS();

  const option: EChartsOption = {
    animationDuration: 1500,
    animationEasing: "cubicOut",
    series: [
      {
        type: "pie",
        radius: ["73%", "93%"],
        center: ["50%", "50%"],
        silent: true,
        startAngle: 90,
        label: { show: false },
        labelLine: { show: false },
        // Hairline separators, not ReadinessRing's glow: three adjacent
        // glowing rounded segments smear into each other.
        data: [
          {
            value: working,
            itemStyle: { color: WORKING, borderColor: "#0d1d36", borderWidth: 2, borderRadius: 3 },
          },
          {
            value: reaching,
            itemStyle: { color: REACHING, borderColor: "#0d1d36", borderWidth: 2, borderRadius: 3 },
          },
          {
            value: rest,
            itemStyle: { color: REST, borderColor: "#0d1d36", borderWidth: 2 },
          },
        ],
      },
    ],
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid place-items-center">
        <Chart
          option={option}
          style={{ width: 208, height: 208 }}
          ariaLabel={`${S.pension.col.share} ${sharePct.toFixed(1)}%`}
        />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <AnimatedNumber
              value={sharePct}
              kind="pct"
              className="tnum block text-[1.9rem] font-bold leading-none text-ink"
            />
            <span className="mt-1 block text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">
              {S.pension.col.share}
            </span>
          </div>
        </div>
      </div>
      <ul className="space-y-1 text-[0.72rem] text-ink-soft">
        <LegendRow color={WORKING} label={S.pension.working} value={working} />
        <LegendRow color={REACHING} label={S.pension.reaching} value={reaching} />
        <LegendRow color={REST} label={S.pension.donutRest} value={rest} />
      </ul>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">{label}</span>
      <span className="tnum shrink-0 font-semibold text-ink">{fmtInt(value)}</span>
    </li>
  );
}
