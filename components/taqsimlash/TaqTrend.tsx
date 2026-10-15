"use client";

import { useMemo } from "react";
import { Chart } from "../Chart";
import type { TaqDay } from "@/lib/taqsimlash";
import { fmtDate, fmtInt, fmtPct, toPct } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { useS } from "@/lib/i18n/client";
import { useChartTheme } from "@/lib/chart-theme";

/** Share of target institutions whose staff are on their own node, one point per day. */
export function TaqTrend({ history, hududlar }: { history: TaqDay[]; hududlar?: string[] }) {
  const S = useS();
  const T = S.taqsimlash;
  const ct = useChartTheme();

  const points = useMemo(
    () =>
      history.map((h) => {
        if (!hududlar) return { date: h.date, done: h.otkazilgan, total: h.total };
        let done = 0;
        let total = 0;
        for (const r of h.regions)
          if (hududlar.includes(r.name)) {
            done += r.otkazilgan;
            total += r.total;
          }
        return { date: h.date, done, total };
      }),
    [history, hududlar],
  );

  const option: EChartsOption = useMemo(
    () => ({
      grid: { left: 44, right: 18, top: 20, bottom: 34 },
      tooltip: {
        trigger: "axis",
        backgroundColor: ct.tooltipBg,
        borderColor: ct.tooltipBorder,
        borderWidth: ct.dark ? 0 : 1,
        textStyle: { color: ct.dark ? "#fff" : ct.tooltipText, fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const p = points[(params as Array<{ dataIndex: number }>)[0].dataIndex];
          return `${fmtDate(p.date)}<br/>${T.rate}: <b>${fmtPct(p.total ? p.done / p.total : 0)}</b><br/>${T.kpi.otkazilgan}: ${fmtInt(p.done)} / ${fmtInt(p.total)}`;
        },
      },
      xAxis: {
        type: "category",
        data: points.map((p) => fmtDate(p.date)),
        axisLine: { lineStyle: { color: ct.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: ct.axisLabel, fontFamily: FONT_MONO, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: ct.splitLine } },
        axisLabel: { color: ct.axisLabel, fontFamily: FONT_MONO, fontSize: 11, formatter: "{value}%" },
      },
      series: [
        {
          type: "line",
          symbol: "circle",
          symbolSize: 9,
          data: points.map((p) => (p.total ? toPct(p.done / p.total) : null)),
          lineStyle: { color: ct.sov, width: 3, shadowBlur: 12 * ct.glow, shadowColor: ct.sovGlow },
          itemStyle: { color: ct.sov, borderColor: ct.surface, borderWidth: 2 },
          areaStyle: { color: ct.sovArea },
        },
      ],
    }),
    [points, T, ct],
  );

  return (
    <section className="card p-4 sm:p-5">
      <h2 className="text-[0.95rem] font-semibold">{T.trend.title}</h2>
      <p className="mb-3 text-[0.75rem] text-ink-faint">{T.trend.hint}</p>
      {points.length < 2 ? (
        <p className="py-6 text-center text-[0.82rem] text-ink-faint">{T.trend.one}</p>
      ) : (
        <Chart option={option} className="h-[260px] w-full sm:h-[300px]" />
      )}
    </section>
  );
}
