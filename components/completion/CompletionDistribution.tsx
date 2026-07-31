"use client";

import { useMemo } from "react";
import { Chart } from "../Chart";
import { rampColor, fmtInt } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { useS } from "@/lib/i18n/client";

export interface DistBand {
  label: string;
  count: number;
  frac: number; // representative fraction 0..1 for coloring
}

export function CompletionDistribution({ data }: { data: DistBand[] }) {
  const S = useS();
  const option: EChartsOption = useMemo(
    () => ({
      grid: { left: 44, right: 16, top: 16, bottom: 28 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#0b3663",
        borderWidth: 0,
        textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number }>;
          const d = data[arr[0].dataIndex];
          return `${d.label}<br/><b>${fmtInt(d.count)}</b> ${S.units.orgs}`;
        },
      },
      xAxis: {
        type: "category",
        data: data.map((d) => d.label),
        axisLine: { lineStyle: { color: "#22334f" } },
        axisTick: { show: false },
        axisLabel: { color: "#8ba0bd", fontFamily: FONT_MONO, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#172a45" } },
        axisLabel: { color: "#8ba0bd", fontFamily: FONT_MONO, fontSize: 11 },
      },
      series: [
        {
          type: "bar",
          barWidth: "58%",
          data: data.map((d) => ({
            value: d.count,
            itemStyle: { color: rampColor(d.frac), borderRadius: [4, 4, 0, 0] },
          })),
          label: {
            show: true,
            position: "top",
            color: "#a7bad6",
            fontFamily: FONT_MONO,
            fontSize: 11,
            formatter: (p: { value: number }) => fmtInt(p.value),
          },
        },
      ],
    }),
    [data],
  );

  return <Chart option={option} className="h-[300px] w-full sm:h-[340px]" />;
}
