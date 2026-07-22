"use client";

import { useEffect, useRef, useState } from "react";
import { echarts, type EChartsType, FONT_SANS, FONT_MONO } from "@/lib/echarts";
import type { RegionStat } from "@/lib/types";
import { toPct, fmtInt, fmtPct } from "@/lib/format";

interface UzMapProps {
  regions: RegionStat[]; // geographic regions only
  activeRegion: string | null;
  onHover?: (name: string | null) => void;
  onSelect?: (name: string) => void;
}

const RAMP = ["#e4483d", "#f0a020", "#8dc63f", "#10a06d"];

export function UzMap({ regions, activeRegion, onHover, onSelect }: UzMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [ready, setReady] = useState(false);

  // one-time: load geojson, register map, init chart, wire events
  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      const res = await fetch("/uzbekistan.geo.json", { cache: "force-cache" });
      const geo = await res.json();
      if (disposed || !elRef.current) return;

      echarts.registerMap("uzbekistan", geo);
      const chart = echarts.init(elRef.current, undefined, { renderer: "canvas" });
      chartRef.current = chart;

      chart.on("mouseover", (p: { name?: string }) => {
        if (p.name) onHover?.(p.name);
      });
      chart.on("mouseout", () => {
        onHover?.(null);
      });
      chart.on("click", (p: { name?: string }) => {
        if (p.name) onSelect?.(p.name);
      });

      ro = new ResizeObserver(() => chart.resize());
      ro.observe(elRef.current);
      setReady(true);
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // data / option
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;
    const data = regions.map((r) => ({
      name: r.name,
      value: toPct(r.percent),
      ulangan: r.ulangan,
      ulanmagan: r.ulanmagan,
      total: r.total,
      percent: r.percent,
    }));

    chart.setOption(
      {
        tooltip: {
          trigger: "item",
          backgroundColor: "#0a2430",
          borderWidth: 0,
          padding: [10, 12],
          textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
          formatter: (p: {
            name: string;
            data?: { percent: number; ulangan: number; total: number; ulanmagan: number };
          }) => {
            const d = p.data;
            if (!d) return p.name;
            return `<b>${p.name}</b><br/>Уланиш: <b>${fmtPct(d.percent)}</b><br/>Уланган: ${fmtInt(
              d.ulangan,
            )} / ${fmtInt(d.total)}<br/>Уланмаган: ${fmtInt(d.ulanmagan)}`;
          },
        },
        visualMap: {
          min: 0,
          max: 100,
          left: "left",
          bottom: 8,
          itemWidth: 10,
          itemHeight: 90,
          calculable: true,
          text: ["100%", "0%"],
          inRange: { color: RAMP },
          textStyle: { color: "#6b7c8f", fontFamily: FONT_MONO, fontSize: 10 },
        },
        series: [
          {
            type: "map",
            map: "uzbekistan",
            roam: false,
            selectedMode: false,
            layoutCenter: ["52%", "52%"],
            layoutSize: "118%",
            itemStyle: {
              borderColor: "#ffffff",
              borderWidth: 1,
              areaColor: "#eef2f6",
            },
            emphasis: {
              label: {
                show: true,
                color: "#0b1b2b",
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: 11,
              },
              itemStyle: { borderColor: "#0a2430", borderWidth: 1.5 },
            },
            label: { show: false },
            data,
          },
        ],
      },
      { notMerge: true },
    );
  }, [regions, ready]);

  // external hover linkage
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;
    chart.dispatchAction({ type: "downplay", seriesIndex: 0 });
    if (activeRegion) {
      chart.dispatchAction({ type: "highlight", seriesIndex: 0, name: activeRegion });
    }
  }, [activeRegion, ready]);

  return (
    <div className="relative">
      <div ref={elRef} className="h-[320px] w-full sm:h-[420px]" role="img" aria-label="Ўзбекистон ҳудудлари бўйича уланиш харитаси" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-[0.8rem] text-ink-faint">
          Харита юкланмоқда…
        </div>
      )}
    </div>
  );
}
