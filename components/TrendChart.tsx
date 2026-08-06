"use client";

import { useMemo, useState } from "react";
import { Chart } from "./Chart";
import type { ManifestEntry } from "@/lib/types";
import { fmtDate, fmtPct, fmtInt, toPct } from "@/lib/format";
import { FONT_MONO, FONT_SANS, type EChartsOption } from "@/lib/echarts";
import { regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

const TOTAL = "__total__";

/** Days between two ISO dates. */
function dayGap(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;
}

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
    const n = points.length;
    const first = points[0];
    const last = points[n - 1];
    const deltaPts = first && last ? (last.percent - first.percent) * 100 : 0;
    const grew = deltaPts > 0.5 && n > 1;

    // The visible curve, drawn to the user's hand sketch: where two reports
    // are separated by a long reportless gap (months, not days), the line
    // HOLDS the earlier value across the gap and sweeps up into the later
    // point with a rounded knee — not a five-month diagonal (asserts steady
    // growth nobody measured), not a right-angled step (rejected as ugly).
    // The shaping point sits inside an interval where EVERY rendering must
    // interpolate somehow; the measured values themselves are carried by the
    // dot series below, which is the only thing the tooltip speaks for.
    const curveData: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      const y = toPct(points[i].percent);
      if (i > 0 && dayGap(points[i - 1].date, points[i].date) > 60) {
        const prevY = toPct(points[i - 1].percent);
        curveData.push([i - 0.45, prevY + (y - prevY) * 0.04]);
      }
      curveData.push([i, y]);
    }

    const dotsData = points.map((p, i) => [i, toPct(p.percent)]);

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
        // Item trigger on the dot series only: the shaping curve must never
        // answer a hover with an interpolated value.
        trigger: "item",
        backgroundColor: "#0b3663",
        borderWidth: 0,
        textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
        formatter: (params: unknown) => {
          const { dataIndex } = params as { dataIndex: number };
          const p = points[dataIndex];
          if (!p) return "";
          return `${fmtDate(p.date)}<br/>${S.map.connection}: <b>${fmtPct(
            p.percent,
          )}</b><br/>${S.map.connected}: ${fmtInt(p.ulangan)} / ${fmtInt(p.total)}`;
        },
      },
      xAxis: {
        // A value axis with one unit per report — same even spacing the
        // category axis gave (the true-time axis stretched five reportless
        // months into an ugly run and was rejected), but it accepts the
        // fractional x the knee point needs.
        type: "value",
        min: -0.2,
        max: n - 1 + 0.2,
        interval: 1,
        splitLine: { show: false },
        axisLine: { lineStyle: { color: "#22334f" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#8ba0bd",
          fontFamily: FONT_MONO,
          fontSize: 11,
          formatter: (v: number) =>
            Number.isInteger(v) && points[v] ? fmtDate(points[v].date) : "",
        },
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
          // The drawn curve: silent, symbol-free, carries the area and the
          // reference lines. Monotone smoothing so the swoop never bulges
          // past a measured value.
          type: "line",
          silent: true,
          smooth: true,
          smoothMonotone: "x",
          symbol: "none",
          data: curveData,
          lineStyle: { color: "#2fd07a", width: 3, shadowBlur: 12, shadowColor: "rgba(47,208,122,0.55)" },
          areaStyle: { color: "rgba(47,208,122,0.14)" },
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
        {
          // The measured reports: dots, endpoint labels, and the only series
          // the tooltip answers for.
          type: "scatter",
          symbolSize: 9,
          data: dotsData,
          itemStyle: { color: "#2fd07a", borderColor: "#081222", borderWidth: 2 },
          label: {
            show: true,
            position: "top",
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: "bold",
            color: "#eaf1fb",
            formatter: (p: unknown) => {
              const { dataIndex, value } = p as {
                dataIndex: number;
                value: [number, number];
              };
              return dataIndex === 0 || dataIndex === n - 1
                ? fmtPct((value?.[1] ?? 0) / 100, 1)
                : "";
            },
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
