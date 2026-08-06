"use client";

import { useMemo } from "react";
import { Chart } from "../Chart";
import type { KadrlarStat } from "@/lib/types";
import { vacancyMetrics } from "@/lib/vakansiya-metrics";
import { isGeographicRegion, regionLabelShort } from "@/lib/regions";
import { fmtInt } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { useS, useLang } from "@/lib/i18n/client";

const HIRED = "#2fd07a";
const LEFT = "#ff8a4c";

export function VakansiyaTurnover({ regions }: { regions: KadrlarStat[] }) {
  const S = useS();
  const lang = useLang();

  const rows = useMemo(
    () =>
      regions
        .filter((r) => isGeographicRegion(r.name))
        .map((r) => ({ name: r.name, m: vacancyMetrics(r) }))
        .sort((a, b) => b.m.accepted - a.m.accepted),
    [regions],
  );

  const option: EChartsOption = useMemo(() => {
    const labels = rows.map((r) => regionLabelShort(r.name, lang));
    return {
      grid: { left: 116, right: 24, top: 30, bottom: 24 },
      legend: {
        top: 0,
        right: 0,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: "#8ba0bd", fontFamily: FONT_SANS, fontSize: 11 },
        data: [S.vakansiya.accepted, S.vakansiya.dismissed],
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#0b3663",
        borderWidth: 0,
        textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number }>;
          const r = rows[arr[0].dataIndex];
          return [
            `<b>${regionLabelShort(r.name, lang)}</b>`,
            `${S.vakansiya.accepted}: ${fmtInt(r.m.accepted)}`,
            `${S.vakansiya.dismissed}: ${fmtInt(r.m.dismissed)}`,
            `${S.vakansiya.net}: ${r.m.net > 0 ? "+" : ""}${fmtInt(r.m.net)}`,
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
          formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`),
        },
      },
      yAxis: {
        type: "category",
        data: labels,
        inverse: true,
        axisLine: { lineStyle: { color: "#22334f" } },
        axisTick: { show: false },
        axisLabel: { color: "#8ba0bd", fontFamily: FONT_SANS, fontSize: 11 },
      },
      series: [
        {
          name: S.vakansiya.accepted,
          type: "bar",
          barMaxWidth: 11,
          itemStyle: { color: HIRED, borderRadius: [0, 3, 3, 0] },
          data: rows.map((r) => r.m.accepted),
        },
        {
          name: S.vakansiya.dismissed,
          type: "bar",
          barMaxWidth: 11,
          itemStyle: { color: LEFT, borderRadius: [0, 3, 3, 0] },
          data: rows.map((r) => r.m.dismissed),
        },
      ],
    };
    // `S` and `lang` are dependencies: a language switch must redraw the
    // labels and legend, not just the surrounding React tree.
  }, [rows, S, lang]);

  return (
    <div>
      <Chart option={option} className="h-[380px] w-full sm:h-[420px]" />
      {/* Samarkand reports 17 863 hires against 60 148 staff — 28 % of the
          national total in one region. It dominates the shared axis whatever we
          do, so the page says why rather than letting a reader conclude the
          region hired a quarter of the country's new staff. */}
      <p className="mt-3 border-t border-line-soft pt-3 text-[0.7rem] leading-relaxed text-ink-faint">
        {S.vakansiya.turnoverNote}
      </p>
    </div>
  );
}
