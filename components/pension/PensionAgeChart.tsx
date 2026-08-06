"use client";

import { useMemo } from "react";
import { Chart } from "../Chart";
import type { KadrlarStat } from "@/lib/types";
import { ageBands, type AgeBandKey } from "@/lib/pension-metrics";
import { fmtInt, fmtPct } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { useS } from "@/lib/i18n/client";

const WOMEN = "#3fb6ff";
const MEN = "#7c8ea8";

export function PensionAgeChart({ stat }: { stat: KadrlarStat }) {
  const S = useS();

  const bands = useMemo(() => ageBands(stat), [stat]);

  const option: EChartsOption = useMemo(() => {
    const labels = bands.map((b) => S.pension.band[b.key as AgeBandKey]);
    const totalAll = bands.reduce((a, b) => a + b.total, 0);

    return {
      grid: { left: 92, right: 24, top: 34, bottom: 24 },
      legend: {
        top: 0,
        right: 0,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: "#8ba0bd", fontFamily: FONT_SANS, fontSize: 11 },
        data: [S.pension.seriesWomen, S.pension.seriesMen],
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#0b3663",
        borderWidth: 0,
        textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number }>;
          const b = bands[arr[0].dataIndex];
          const share = totalAll > 0 ? b.total / totalAll : 0;
          return [
            `<b>${S.pension.band[b.key as AgeBandKey]}</b>`,
            `${fmtInt(b.total)} (${fmtPct(share, 1)})`,
            `${S.pension.seriesWomen}: ${fmtInt(b.women)}`,
            `${S.pension.seriesMen}: ${fmtInt(b.men)}`,
          ].join("<br/>");
        },
      },
      xAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#172a45" } },
        axisLabel: {
          color: "#8ba0bd",
          fontFamily: FONT_MONO,
          fontSize: 11,
          // Head-counts run to six digits; thousands keep the axis readable.
          formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`),
        },
      },
      yAxis: {
        type: "category",
        data: labels,
        inverse: true, // youngest at the top, reading downward into old age
        axisLine: { lineStyle: { color: "#22334f" } },
        axisTick: { show: false },
        axisLabel: { color: "#8ba0bd", fontFamily: FONT_SANS, fontSize: 11 },
      },
      series: [
        {
          name: S.pension.seriesWomen,
          type: "bar",
          stack: "age",
          barMaxWidth: 26,
          itemStyle: { color: WOMEN, borderRadius: [3, 0, 0, 3] },
          data: bands.map((b) => b.women),
        },
        {
          name: S.pension.seriesMen,
          type: "bar",
          stack: "age",
          barMaxWidth: 26,
          itemStyle: { color: MEN, borderRadius: [0, 3, 3, 0] },
          data: bands.map((b) => b.men),
        },
      ],
    };
    // `S` is a dependency: without it the chart keeps the old language.
  }, [bands, S]);

  return <Chart option={option} className="h-[300px] w-full sm:h-[340px]" />;
}
