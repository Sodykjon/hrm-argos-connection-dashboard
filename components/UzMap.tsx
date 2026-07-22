"use client";

import { useEffect, useRef, useState } from "react";
import { echarts, type EChartsType, FONT_SANS, FONT_MONO } from "@/lib/echarts";
import type { RegionStat } from "@/lib/types";
import { toPct, fmtInt, fmtPct, rampColor } from "@/lib/format";

interface UzMapProps {
  regions: RegionStat[]; // geographic regions only
  activeRegion: string | null;
  onHover?: (name: string | null) => void;
  onSelect?: (name: string) => void;
}

const RAMP = ["#ff5a63", "#f7b23b", "#9ee34f", "#2fd07a"];

// Tiny enclave city-regions that are hard to click on the choropleth — shown as
// clickable labeled markers layered on top. [lng, lat] of the city center.
const ENCLAVE_MARKERS: Record<string, [number, number]> = {
  "Тошкент шаҳри": [69.28, 41.31],
};
const MAP_LAYOUT = { center: ["52%", "52%"] as [string, string], size: "118%" };

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

      // fires for both the map series and the scatter markers (p.name = region)
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

    const mapData = regions.map((r) => ({
      name: r.name,
      value: toPct(r.percent),
      ulangan: r.ulangan,
      ulanmagan: r.ulanmagan,
      total: r.total,
      percent: r.percent,
    }));

    const enclaveData = regions
      .filter((r) => ENCLAVE_MARKERS[r.name])
      .map((r) => {
        const [lng, lat] = ENCLAVE_MARKERS[r.name];
        return {
          name: r.name,
          value: [lng, lat, toPct(r.percent)],
          percent: r.percent,
          ulangan: r.ulangan,
          ulanmagan: r.ulanmagan,
          total: r.total,
          itemStyle: { color: rampColor(r.percent) },
        };
      });

    const tooltipFormatter = (p: {
      name: string;
      data?: { percent: number; ulangan: number; total: number; ulanmagan: number };
    }) => {
      const d = p.data;
      if (!d || d.percent === undefined) return p.name;
      return `<b>${p.name}</b><br/>Уланиш: <b>${fmtPct(d.percent)}</b><br/>Уланган: ${fmtInt(
        d.ulangan,
      )} / ${fmtInt(d.total)}<br/>Уланмаган: ${fmtInt(d.ulanmagan)}`;
    };

    chart.setOption(
      {
        tooltip: {
          trigger: "item",
          backgroundColor: "#0b3663",
          borderWidth: 0,
          padding: [10, 12],
          textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
          formatter: tooltipFormatter,
        },
        visualMap: {
          seriesIndex: 0,
          min: 0,
          max: 100,
          left: "left",
          bottom: 8,
          itemWidth: 10,
          itemHeight: 90,
          calculable: true,
          text: ["100%", "0%"],
          inRange: { color: RAMP },
          textStyle: { color: "#8ba0bd", fontFamily: FONT_MONO, fontSize: 10 },
        },
        // invisible geo, aligned to the map series, as the coordinate system for markers
        geo: {
          map: "uzbekistan",
          roam: false,
          silent: true,
          layoutCenter: MAP_LAYOUT.center,
          layoutSize: MAP_LAYOUT.size,
          itemStyle: { areaColor: "transparent", borderColor: "transparent" },
          emphasis: { disabled: true },
        },
        series: [
          {
            type: "map",
            map: "uzbekistan",
            roam: false,
            selectedMode: false,
            layoutCenter: MAP_LAYOUT.center,
            layoutSize: MAP_LAYOUT.size,
            itemStyle: {
              borderColor: "rgba(140,175,225,0.16)",
              borderWidth: 1,
              areaColor: "#152c4e",
            },
            emphasis: {
              label: {
                show: true,
                color: "#eaf1fb",
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: 11,
              },
              itemStyle: {
                borderColor: "#3fb6ff",
                borderWidth: 1.5,
                shadowBlur: 16,
                shadowColor: "rgba(63,182,255,0.6)",
              },
            },
            label: { show: false },
            data: mapData,
          },
          {
            type: "scatter",
            coordinateSystem: "geo",
            geoIndex: 0,
            z: 12,
            symbolSize: 16,
            data: enclaveData,
            itemStyle: {
              borderColor: "#ffffff",
              borderWidth: 2,
              shadowBlur: 5,
              shadowColor: "rgba(11,27,43,0.35)",
            },
            // label hidden by default — shown only on hover (emphasis)
            label: { show: false },
            emphasis: {
              scale: 1.4,
              label: {
                show: true,
                position: "right",
                distance: 6,
                formatter: (p: { name: string }) => p.name.replace(" шаҳри", " ш."),
                color: "#eaf1fb",
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: 10.5,
                backgroundColor: "#0c1f3b",
                padding: [3, 6],
                borderRadius: 5,
                borderColor: "#3fb6ff",
                borderWidth: 1,
              },
            },
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
