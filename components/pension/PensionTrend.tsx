"use client";

import { useMemo, useState } from "react";
import { Chart } from "../Chart";
import type { PensionManifestEntry } from "@/lib/types";
import { pensionMetrics } from "@/lib/pension-metrics";
import { fmtDate, fmtPct, fmtInt, toPct } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

const TOTAL = "__total__";

export function PensionTrend({
  history,
}: {
  history: PensionManifestEntry[];
}) {
  const S = useS();
  const lang = useLang();
  const [scope, setScope] = useState(TOTAL);

  // Union across all snapshots: a region can appear once the regional pulls
  // start, so the selector must not be built from the latest snapshot alone.
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
      const stat =
        scope === TOTAL ? h.overall : h.regions.find((x) => x.name === scope);
      // A region absent from this snapshot is a gap, not a real 0%.
      if (!stat) return { date: h.date, share: null, exposed: 0, total: 0 };
      const m = pensionMetrics(stat);
      return {
        date: h.date,
        share: m.exposedShare as number | null,
        exposed: m.exposed,
        total: stat.total,
      };
    });
  }, [history, scope]);

  const option: EChartsOption = useMemo(() => {
    const values = points
      .map((p) => p.share)
      .filter((v): v is number => v != null);
    // Exposure sits near 14%, so a 0-100 axis would flatten every movement.
    // Pad the observed range instead, with a floor of zero.
    const lo = values.length ? Math.max(0, Math.min(...values) - 0.02) : 0;
    const hi = values.length ? Math.max(...values) + 0.02 : 0.2;

    return {
      grid: { left: 48, right: 18, top: 20, bottom: 34 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#0b3663",
        borderWidth: 0,
        textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number }>;
          const p = points[arr[0].dataIndex];
          const val = p.share == null ? "—" : fmtPct(p.share);
          return `${fmtDate(p.date)}<br/>${S.map.pensionShare}: <b>${val}</b><br/>${
            S.pension.peopleUnit
          }: ${fmtInt(p.exposed)} / ${fmtInt(p.total)}`;
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
        min: toPct(lo),
        max: toPct(hi),
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
          data: points.map((p) => (p.share == null ? null : toPct(p.share))),
          lineStyle: {
            color: "#ff8a4c",
            width: 3,
            shadowBlur: 12,
            shadowColor: "rgba(255,138,76,0.5)",
          },
          itemStyle: { color: "#ff8a4c", borderColor: "#081222", borderWidth: 2 },
          areaStyle: { color: "rgba(255,138,76,0.14)" },
        },
      ],
    };
  }, [points, S]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="eyebrow">{S.pension.trendLine}</span>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[0.8rem] font-medium text-ink outline-none focus:border-sov"
        >
          <option value={TOTAL}>{S.pension.totalOption}</option>
          {regionNames.map((n) => (
            // value stays the canonical name — only the label is translated
            <option key={n} value={n}>
              {regionLabel(n, lang)}
            </option>
          ))}
        </select>
      </div>
      <Chart option={option} className="h-[280px] w-full sm:h-[320px]" />
      {history.length < 2 && (
        <p className="mt-2 text-[0.78rem] text-ink-faint">
          {S.pension.trendSingle}
        </p>
      )}
    </div>
  );
}
