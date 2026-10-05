"use client";

import { useEffect, useRef, useState } from "react";
import { echarts, type EChartsType, FONT_SANS, FONT_MONO, canvasFont } from "@/lib/echarts";
import type { CompletionRegionStat } from "@/lib/types";
import { toPct, fmtInt, fmtPct } from "@/lib/format";
import { regionLabel, regionLabelShort } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";
import { useChartTheme } from "@/lib/chart-theme";

interface CompletionMapProps {
  regions: CompletionRegionStat[]; // geographic regions only
  activeRegion: string | null;
  onHover?: (name: string | null) => void;
  onSelect?: (name: string) => void;
}

const ENCLAVE_MARKERS: Record<string, [number, number]> = {
  "Тошкент шаҳри": [69.28, 41.31],
};
const MAP_LAYOUT = { center: ["52%", "52%"] as [string, string], size: "118%" };

export function CompletionMap({
  regions,
  activeRegion,
  onHover,
  onSelect,
}: CompletionMapProps) {
  const S = useS();
  const lang = useLang();
  const ct = useChartTheme();
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [ready, setReady] = useState(false);

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
      chart.on("mouseout", () => onHover?.(null));
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

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;

    const mapData = regions.map((r) => ({
      name: r.name,
      value: toPct(r.avg),
      avg: r.avg,
      orgCount: r.orgCount,
      zeroCount: r.zeroCount,
    }));

    const enclaveData = regions
      .filter((r) => ENCLAVE_MARKERS[r.name])
      .map((r) => {
        const [lng, lat] = ENCLAVE_MARKERS[r.name];
        return {
          name: r.name,
          value: [lng, lat, toPct(r.avg)],
          avg: r.avg,
          orgCount: r.orgCount,
          zeroCount: r.zeroCount,
          itemStyle: { color: ct.rampFill(r.avg) },
        };
      });

    const tooltipFormatter = (p: {
      name: string;
      data?: { avg: number; orgCount: number; zeroCount: number };
    }) => {
      // p.name is the canonical region key (matches the GeoJSON) — translate
      // it for display only.
      const label = regionLabel(p.name, lang);
      const d = p.data;
      if (!d || d.avg === undefined) return label;
      return `<b>${label}</b><br/>${S.map.completion}: <b>${fmtPct(
        d.avg,
      )}</b><br/>${S.map.orgs}: ${fmtInt(d.orgCount)}<br/>0%: ${fmtInt(
        d.zeroCount,
      )}`;
    };

    chart.setOption(
      {
        tooltip: {
          trigger: "item",
          backgroundColor: ct.tooltipBg,
          // light: the white tooltip needs an edge on the white card
          borderColor: ct.tooltipBorder,
          borderWidth: ct.dark ? 0 : 1,
          padding: [10, 12],
          // dark keeps its original pure white (ct.tooltipText is #eaf1fb)
          textStyle: { color: ct.dark ? "#fff" : ct.tooltipText, fontFamily: canvasFont(FONT_SANS), fontSize: 12 },
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
          inRange: { color: ct.ramp4 },
          textStyle: { color: ct.axisLabel, fontFamily: canvasFont(FONT_MONO), fontSize: 10 },
        },
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
              borderColor: ct.mapBorder,
              borderWidth: 1,
              areaColor: ct.mapArea,
            },
            emphasis: {
              label: {
                show: true,
                color: ct.ink,
                fontFamily: canvasFont(FONT_SANS),
                fontWeight: 600,
                fontSize: 11,
              },
              itemStyle: {
                borderColor: ct.mapHoverBorder,
                borderWidth: 1.5,
                shadowBlur: 16 * ct.glow,
                shadowColor: ct.mapHoverGlow,
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
              // white ring in both themes (light region borders are white too)
              borderColor: ct.dark ? "#ffffff" : ct.surface,
              borderWidth: 2,
              shadowBlur: 5 * ct.glow,
              shadowColor: ct.mapShadow,
            },
            label: { show: false },
            emphasis: {
              scale: 1.4,
              label: {
                show: true,
                position: "right",
                distance: 6,
                formatter: (p: { name: string }) => regionLabelShort(p.name, lang),
                color: ct.labelText,
                fontFamily: canvasFont(FONT_SANS),
                fontWeight: 600,
                fontSize: 10.5,
                backgroundColor: ct.labelBg,
                padding: [3, 6],
                borderRadius: 5,
                borderColor: ct.mapHoverBorder,
                borderWidth: 1,
              },
            },
          },
        ],
      },
      { notMerge: true },
    );
    // `lang` is a dependency: switching language must redraw the labels and
    // tooltip, not just the surrounding React tree. `ct` likewise for a theme switch.
  }, [regions, ready, lang, S, ct]);

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
      <div
        ref={elRef}
        className="h-[320px] w-full sm:h-[420px]"
        role="img"
        aria-label={S.map.ariaCompletion}
      />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-[0.8rem] text-ink-faint">
          {S.completion.mapTitle}…
        </div>
      )}
    </div>
  );
}
