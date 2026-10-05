"use client";

import { useMemo } from "react";
import { Chart } from "../Chart";
import { fmtInt } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { useS } from "@/lib/i18n/client";
import { useChartTheme } from "@/lib/chart-theme";

export interface DistBand {
  label: string;
  count: number;
  frac: number; // representative fraction 0..1 for coloring
}

export function CompletionDistribution({ data }: { data: DistBand[] }) {
  const S = useS();
  const ct = useChartTheme();
  const option: EChartsOption = useMemo(
    () => ({
      grid: { left: 44, right: 16, top: 16, bottom: 28 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: ct.tooltipBg,
        borderColor: ct.tooltipBorder,
        borderWidth: ct.dark ? 0 : 1,
        textStyle: { color: ct.dark ? "#fff" : ct.tooltipText, fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number }>;
          const d = data[arr[0].dataIndex];
          return `${d.label}<br/><b>${fmtInt(d.count)}</b> ${S.units.orgs}`;
        },
      },
      xAxis: {
        type: "category",
        data: data.map((d) => d.label),
        axisLine: { lineStyle: { color: ct.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: ct.axisLabel, fontFamily: FONT_MONO, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: ct.splitLine } },
        axisLabel: { color: ct.axisLabel, fontFamily: FONT_MONO, fontSize: 11 },
      },
      series: [
        {
          type: "bar",
          barWidth: "58%",
          data: data.map((d) => ({
            value: d.count,
            itemStyle: { color: ct.rampFill(d.frac), borderRadius: [4, 4, 0, 0] },
          })),
          label: {
            show: true,
            position: "top",
            // value label above the bar (on the card, not on the fill)
            color: ct.dark ? "#a7bad6" : ct.inkSoft,
            fontFamily: FONT_MONO,
            fontSize: 11,
            formatter: (p: { value: number }) => fmtInt(p.value),
          },
        },
      ],
    }),
    // `S` is a dependency: the tooltip text must follow a language switch;
    // `ct` so the palette follows a theme switch.
    [data, S, ct],
  );

  return <Chart option={option} className="h-[300px] w-full sm:h-[340px]" />;
}
