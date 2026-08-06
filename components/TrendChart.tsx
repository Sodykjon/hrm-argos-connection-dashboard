"use client";

import { useMemo, useState } from "react";
import { Chart } from "./Chart";
import type { ManifestEntry } from "@/lib/types";
import { fmtDate, fmtPct, fmtInt, toPct } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

const TOTAL = "__total__";

export function TrendChart({ history }: { history: ManifestEntry[] }) {
  const S = useS();
  const lang = useLang();
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
    const first = points[0];
    const last = points[points.length - 1];
    const deltaPts = first && last ? (last.percent - first.percent) * 100 : 0;
    const grew = deltaPts > 0.5 && points.length > 1;

    return {
      grid: { left: 44, right: 18, top: 46, bottom: 34 },
      // The climb badge lives on the chart itself: the growth since the first
      // report is the page's whole message, and it should not depend on the
      // reader noticing a tile elsewhere. Values are real; the axis below is
      // clearly labelled, so the tightened range amplifies without inventing.
      ...(grew
        ? {
            graphic: [
              {
                type: "text",
                left: 64,
                top: 14,
                silent: true,
                style: {
                  text: `↑ ${S.trend.deltaPts(
                    deltaPts.toFixed(1).replace(".", ","),
                  )}`,
                  fill: "#2fd07a",
                  fontFamily: FONT_MONO,
                  fontSize: 22,
                  fontWeight: "bold",
                  shadowBlur: 14,
                  shadowColor: "rgba(47,208,122,0.5)",
                },
              },
              {
                type: "text",
                left: 66,
                top: 40,
                silent: true,
                style: {
                  text: S.trend.sinceFirst,
                  fill: "#7086a4",
                  fontFamily: FONT_SANS,
                  fontSize: 11,
                },
              },
            ],
          }
        : {}),
      tooltip: {
        trigger: "axis",
        backgroundColor: "#0b3663",
        borderWidth: 0,
        textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number }>;
          const p = points[arr[0].dataIndex];
          return `${fmtDate(p.date)}<br/>${S.map.connection}: <b>${fmtPct(
            p.percent,
          )}</b><br/>${S.map.connected}: ${fmtInt(p.ulangan)} / ${fmtInt(p.total)}`;
        },
      },
      xAxis: {
        // Category axis: only the report dates, evenly spaced. The time axis
        // was tried and rejected — five reportless months stretched into a
        // long empty run that dominated the chart. One slot per report keeps
        // the flat January step narrow and gives the climb the width.
        type: "category",
        data: points.map((p) => fmtDate(p.date)),
        axisLine: { lineStyle: { color: "#22334f" } },
        axisTick: { show: false },
        axisLabel: { color: "#8ba0bd", fontFamily: FONT_MONO, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        // Floored to the nearest 5 below the observed minimum instead of 0:
        // on a 0–100 axis a 66.9 → 83.4 climb occupies a sixth of the chart
        // and reads as flat. The axis labels stay on every gridline, so the
        // tightened range is visible, not hidden.
        min: ({ min }: { min: number }) =>
          Math.max(0, Math.floor((min - 3) / 5) * 5),
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
          // Smooth spline — the step version's right angles read as ugly on
          // sight. smoothMonotone keeps the curve from overshooting past the
          // measured values, so no bulge ever rises above a real point.
          smooth: true,
          smoothMonotone: "x",
          symbol: "circle",
          symbolSize: 9,
          data: points.map((p) => toPct(p.percent)),
          lineStyle: { color: "#2fd07a", width: 3, shadowBlur: 12, shadowColor: "rgba(47,208,122,0.55)" },
          itemStyle: { color: "#2fd07a", borderColor: "#081222", borderWidth: 2 },
          areaStyle: { color: "rgba(47,208,122,0.14)" },
          // Endpoint values on the chart itself: the story is the distance
          // between the first report and today, and it should not depend on
          // the reader hovering the right two dots.
          label: {
            show: true,
            position: "top",
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: "bold",
            color: "#eaf1fb",
            formatter: (p: unknown) => {
              const { dataIndex, value } = p as { dataIndex: number; value: number };
              return dataIndex === 0 || dataIndex === points.length - 1
                ? fmtPct((value ?? 0) / 100, 1)
                : "";
            },
          },
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              {
                yAxis: 100,
                lineStyle: { color: "#f7c14b", type: "dashed", width: 1.5 },
                label: {
                  formatter: S.goal.target100,
                  position: "insideEndTop",
                  color: "#f7c14b",
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                },
              },
              // The first report's level as a dashed floor: the vertical gap
              // between this line and the last point IS the progress.
              ...(grew
                ? [
                    {
                      yAxis: toPct(first.percent),
                      lineStyle: { color: "#7086a4", type: "dashed" as const, width: 1 },
                      label: {
                        formatter: `${fmtDate(first.date)} · ${fmtPct(first.percent, 1)}`,
                        position: "insideStartBottom" as const,
                        color: "#7086a4",
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      ],
    };
  }, [points, S]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="eyebrow">{S.trend.rateLine}</span>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[0.8rem] font-medium text-ink outline-none focus:border-sov"
        >
          <option value={TOTAL}>{S.trend.totalOption}</option>
          {regionNames.map((n) => (
            <option key={n} value={n}>
              {regionLabel(n, lang)}
            </option>
          ))}
        </select>
      </div>
      <Chart option={option} className="h-[300px] w-full sm:h-[380px]" />
    </div>
  );
}
