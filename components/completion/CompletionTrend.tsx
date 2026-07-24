"use client";

import { useMemo, useState } from "react";
import { Chart } from "../Chart";
import type { CompletionManifestEntry } from "@/lib/types";
import { fmtDate, fmtPct, fmtInt, toPct } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { S } from "@/lib/strings";

const TOTAL = "__total__";

export function CompletionTrend({
  history,
}: {
  history: CompletionManifestEntry[];
}) {
  const [scope, setScope] = useState(TOTAL);

  // Union of region names across ALL snapshots (a region can appear/disappear
  // between days), first-seen order preserved.
  const regionNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const h of history) {
      for (const r of h.regions ?? []) {
        if (!seen.has(r.name)) {
          seen.add(r.name);
          names.push(r.name);
        }
      }
    }
    return names;
  }, [history]);

  const points = useMemo(() => {
    return history.map((h) => {
      if (scope === TOTAL) {
        return {
          date: h.date,
          avg: h.overall.avg as number | null,
          orgCount: h.overall.orgCount,
        };
      }
      const r = h.regions.find((x) => x.name === scope);
      // A region absent from this snapshot is a gap, not a real 0%.
      return { date: h.date, avg: r ? r.avg : null, orgCount: r?.orgCount ?? 0 };
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
          const val = p.avg == null ? "—" : fmtPct(p.avg);
          return `${fmtDate(p.date)}<br/>Тўлдирилиш: <b>${val}</b><br/>Ташкилотлар: ${fmtInt(
            p.orgCount,
          )}`;
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
          data: points.map((p) => (p.avg == null ? null : toPct(p.avg))),
          lineStyle: {
            color: "#3fb6ff",
            width: 3,
            shadowBlur: 12,
            shadowColor: "rgba(63,182,255,0.55)",
          },
          itemStyle: { color: "#3fb6ff", borderColor: "#081222", borderWidth: 2 },
          areaStyle: { color: "rgba(63,182,255,0.14)" },
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
        <span className="eyebrow">{S.completion.trendLine}</span>
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
      <Chart option={option} className="h-[300px] w-full sm:h-[340px]" />
    </div>
  );
}
