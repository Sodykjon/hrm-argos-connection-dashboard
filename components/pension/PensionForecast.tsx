"use client";

import { useMemo } from "react";
import { Chart } from "../Chart";
import type { KadrlarStat } from "@/lib/types";
import { pensionForecast, type ForecastKey } from "@/lib/pension-metrics";
import { fmtInt, fmtPct, toPct } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { useS } from "@/lib/i18n/client";
import { useChartTheme } from "@/lib/chart-theme";

/**
 * Four horizons of the same share. The first two bars are measurements and are
 * drawn solid; the estimate bars are translucent with a dashed outline, and
 * their axis labels carry the asterisk — the distinction must survive a
 * screenshot, because a guess presented as a fact is the one failure this
 * dashboard cannot afford in front of the Minister.
 */
export function PensionForecast({ stat }: { stat: KadrlarStat }) {
  const S = useS();
  const ct = useChartTheme();

  const points = useMemo(() => pensionForecast(stat), [stat]);

  const option: EChartsOption = useMemo(() => {
    const LABEL: Record<ForecastKey, string> = {
      now: S.pension.forecastNow,
      eoy: S.pension.forecastEoy,
      y5: S.pension.forecastY5,
      y10: S.pension.forecastY10,
    };

    return {
      grid: { left: 40, right: 16, top: 30, bottom: 26 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        confine: true,
        backgroundColor: ct.tooltipBg,
        borderColor: ct.tooltipBorder,
        borderWidth: ct.dark ? 0 : 1,
        textStyle: { color: ct.dark ? "#fff" : ct.tooltipText, fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number }>;
          const p = points[arr[0].dataIndex];
          return `<b>${LABEL[p.key]}</b><br/>${fmtInt(p.count)} (${fmtPct(p.share, 1)})`;
        },
      },
      xAxis: {
        type: "category",
        data: points.map((p) => LABEL[p.key]),
        axisLine: { lineStyle: { color: ct.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: ct.axisLabel, fontFamily: FONT_SANS, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: ct.splitLine } },
        axisLabel: {
          color: ct.axisLabel,
          fontFamily: FONT_MONO,
          fontSize: 11,
          formatter: (v: number) => `${v}%`,
        },
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 52,
          label: {
            show: true,
            position: "top",
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: ct.ink,
            formatter: (p: unknown) =>
              fmtPct(((p as { value: number }).value ?? 0) / 100, 1),
          },
          data: points.map((p) => ({
            value: toPct(p.share),
            itemStyle: p.estimate
              ? {
                  // translucent warn; light = warn #a8773f at the same 30 %
                  color: ct.dark ? "rgba(247,178,59,0.30)" : "rgba(168,119,63,0.30)",
                  borderColor: ct.warn,
                  borderWidth: 1.5,
                  borderType: "dashed" as const,
                  borderRadius: [4, 4, 0, 0],
                }
              : { color: ct.warn, borderRadius: [4, 4, 0, 0] },
          })),
        },
      ],
    };
    // `S` is a dependency: without it the chart keeps the old language.
  }, [points, S, ct]);

  return <Chart option={option} className="h-[260px] w-full sm:h-[300px]" />;
}
