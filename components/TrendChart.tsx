"use client";

import { useMemo, useState } from "react";
import { Chart } from "./Chart";
import type { ManifestEntry } from "@/lib/types";
import { fmtDate, fmtPct, fmtInt, toPct } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { S } from "@/lib/strings";

const TOTAL = "__total__";

export function TrendChart({ history }: { history: ManifestEntry[] }) {
  const [scope, setScope] = useState(TOTAL);

  const regionNames = useMemo(
    () => (history[0]?.regions ?? []).map((r) => r.name),
    [history],
  );

  const points = useMemo(() => {
    return history.map((h) => {
      if (scope === TOTAL) {
        return {
          date: h.date,
          percent: h.totals.percent,
          ulangan: h.totals.ulangan,
          total: h.totals.total,
        };
      }
      const r = h.regions.find((x) => x.name === scope);
      return {
        date: h.date,
        percent: r?.percent ?? 0,
        ulangan: r?.ulangan ?? 0,
        total: r?.total ?? 0,
      };
    });
  }, [history, scope]);

  const option: EChartsOption = useMemo(() => {
    return {
      grid: { left: 44, right: 18, top: 20, bottom: 34 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#0b3663",
        borderWidth: 0,
        textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number }>;
          const p = points[arr[0].dataIndex];
          return `${fmtDate(p.date)}<br/>Уланиш: <b>${fmtPct(p.percent)}</b><br/>Уланган: ${fmtInt(
            p.ulangan,
          )} / ${fmtInt(p.total)}`;
        },
      },
      xAxis: {
        type: "category",
        data: points.map((p) => fmtDate(p.date)),
        axisLine: { lineStyle: { color: "#22334f" } },
        axisTick: { show: false },
        axisLabel: { color: "#8ba0bd", fontFamily: FONT_MONO, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: "#172a45" } },
        axisLabel: {
          color: "#8ba0bd",
          fontFamily: FONT_MONO,
          fontSize: 11,
          formatter: "{value}%",
        },
      },
      series: [
        {
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 9,
          data: points.map((p) => toPct(p.percent)),
          lineStyle: { color: "#2fd07a", width: 3, shadowBlur: 12, shadowColor: "rgba(47,208,122,0.55)" },
          itemStyle: { color: "#2fd07a", borderColor: "#081222", borderWidth: 2 },
          areaStyle: { color: "rgba(47,208,122,0.14)" },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: "#f7c14b", type: "dashed", width: 1.5 },
            label: {
              formatter: "Мақсад — 100%",
              position: "insideEndTop",
              color: "#f7c14b",
              fontFamily: FONT_MONO,
              fontSize: 10,
            },
            data: [{ yAxis: 100 }],
          },
        },
      ],
    };
  }, [points]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="eyebrow">{S.trend.rateLine}</span>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[0.8rem] font-medium text-ink outline-none focus:border-sov"
        >
          <option value={TOTAL}>Жами (Республика бўйича)</option>
          {regionNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <Chart option={option} className="h-[300px] w-full sm:h-[380px]" />
    </div>
  );
}
