"use client";

import { useMemo } from "react";
import { Chart } from "../Chart";
import type { KadrlarStat } from "@/lib/types";
import { ageBands, type AgeBandKey } from "@/lib/pension-metrics";
import { fmtInt, fmtPct } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { useS } from "@/lib/i18n/client";

// Single series, but the page's whole subject — the pension wave — must be
// visible IN the chart, not only in the prose: 50–60 wears amber (reaches
// pension within the decade), 60+ wears coral (already past it). Younger
// bands stay a quiet blue so the risk zone owns the attention.
const ZONE: Record<AgeBandKey, string> = {
  u30: "#2b6ca3",
  a3040: "#2b6ca3",
  a4050: "#2b6ca3",
  a5060: "#f7b23b",
  a60p: "#ff5a63",
};

export function PensionAgeChart({ stat }: { stat: KadrlarStat }) {
  const S = useS();

  const bands = useMemo(() => ageBands(stat), [stat]);

  const option: EChartsOption = useMemo(() => {
    const labels = bands.map((b) => S.pension.band[b.key as AgeBandKey]);
    const totalAll = bands.reduce((a, b) => a + b.total, 0);

    return {
      // Right margin holds the outside value+share labels — 24px clipped the
      // longest bar's label mid-digit.
      grid: { left: 92, right: 96, top: 34, bottom: 24 },
      legend: { show: false },
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
          return `<b>${S.pension.band[b.key as AgeBandKey]}</b><br/>${fmtInt(
            b.total,
          )} (${fmtPct(share, 1)})`;
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
          type: "bar",
          barMaxWidth: 26,
          // Direct labels: count + share at the bar end, so nobody reads the
          // axis to learn the one number each bar exists to say.
          label: {
            show: true,
            position: "right",
            distance: 6,
            color: "#c6d4e8",
            fontFamily: FONT_MONO,
            fontSize: 10.5,
            formatter: (p: { dataIndex: number }) => {
              const b = bands[p.dataIndex];
              const share = totalAll > 0 ? b.total / totalAll : 0;
              return `${fmtInt(b.total)}  ${fmtPct(share, 1)}`;
            },
          },
          data: bands.map((b) => ({
            value: b.total,
            itemStyle: {
              color: ZONE[b.key as AgeBandKey],
              borderRadius: [0, 3, 3, 0],
            },
          })),
        },
      ],
    };
    // `S` is a dependency: without it the chart keeps the old language.
  }, [bands, S]);

  const totalAll = bands.reduce((a, b) => a + b.total, 0);
  const wave = bands
    .filter((b) => b.key === "a5060" || b.key === "a60p")
    .reduce((a, b) => a + b.total, 0);

  return (
    <div>
      <Chart option={option} className="h-[300px] w-full sm:h-[340px]" />
      <p className="mt-1 flex items-center gap-1.5 px-1 text-[0.72rem] text-ink-faint">
        <i className="h-2 w-2 shrink-0 rounded-[2px] bg-warn" aria-hidden />
        <i className="h-2 w-2 shrink-0 rounded-[2px] bg-un" aria-hidden />
        {S.pension.waveZoneNote(
          fmtInt(wave),
          fmtPct(totalAll > 0 ? wave / totalAll : 0, 1),
        )}
      </p>
    </div>
  );
}
