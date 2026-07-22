"use client";

import { useEffect, useRef, useState } from "react";
import { echarts, type EChartsType, FONT_SANS, FONT_MONO } from "@/lib/echarts";
import type { DistrictStat } from "@/lib/districts";
import { toPct, fmtInt, fmtPct } from "@/lib/format";
import { regionSlug } from "@/lib/regions";

const RAMP = ["#ff5a63", "#f7b23b", "#9ee34f", "#2fd07a"];

interface DistrictMapProps {
  viloyat: string;
  districts: DistrictStat[];
  activeKey: string | null;
  onHover?: (key: string | null) => void;
}

export function DistrictMap({ viloyat, districts, activeKey, onHover }: DistrictMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [ready, setReady] = useState(false);
  const geoRef = useRef<{ type: string; features: unknown[] } | null>(null);
  const mapName = `uz-dist-${regionSlug(viloyat)}`;

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      if (!geoRef.current) {
        const res = await fetch("/uz-districts.geo.json", { cache: "force-cache" });
        geoRef.current = await res.json();
      }
      if (disposed || !elRef.current) return;
      const chart = echarts.init(elRef.current, undefined, { renderer: "canvas" });
      chartRef.current = chart;
      chart.on("mouseover", (p: { name?: string }) => {
        if (p.name) onHover?.(p.name);
      });
      chart.on("mouseout", () => {
        onHover?.(null);
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
    const geo = geoRef.current;
    if (!chart || !ready || !geo) return;

    const feats = (geo.features as Array<{ properties: { name: string; label: string; viloyat: string } }>).filter(
      (f) => f.properties.viloyat === viloyat,
    );
    echarts.registerMap(mapName, { type: "FeatureCollection", features: feats } as never);

    const labelByName: Record<string, string> = {};
    feats.forEach((f) => (labelByName[f.properties.name] = f.properties.label || f.properties.name));
    const byKey = new Map(districts.map((d) => [d.key, d]));

    const data = feats.map((f) => {
      const d = byKey.get(f.properties.name);
      return {
        name: f.properties.name,
        value: d ? toPct(d.percent) : "-",
        d,
      };
    });

    chart.setOption(
      {
        animationDuration: 700,
        tooltip: {
          trigger: "item",
          backgroundColor: "#0b3663",
          borderWidth: 0,
          padding: [10, 12],
          textStyle: { color: "#fff", fontFamily: FONT_SANS, fontSize: 12 },
          formatter: (p: { name: string; data?: { d?: DistrictStat } }) => {
            const d = p.data?.d;
            const lbl = labelByName[p.name] || p.name;
            if (!d) return `<b>${lbl}</b><br/>маълумот йўқ`;
            return `<b>${lbl}</b><br/>Уланиш: <b>${fmtPct(d.percent)}</b><br/>Уланган: ${fmtInt(
              d.ulangan,
            )} / ${fmtInt(d.total)}`;
          },
        },
        visualMap: {
          seriesIndex: 0,
          min: 0,
          max: 100,
          left: "left",
          bottom: 6,
          itemWidth: 9,
          itemHeight: 80,
          calculable: true,
          text: ["100%", "0%"],
          inRange: { color: RAMP },
          textStyle: { color: "#8ba0bd", fontFamily: FONT_MONO, fontSize: 10 },
        },
        series: [
          {
            type: "map",
            map: mapName,
            roam: false,
            selectedMode: false,
            layoutCenter: ["52%", "52%"],
            layoutSize: "112%",
            nameProperty: "name",
            itemStyle: { borderColor: "rgba(140,175,225,0.18)", borderWidth: 1, areaColor: "#152c4e" },
            emphasis: {
              label: {
                show: true,
                color: "#eaf1fb",
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: 10,
                formatter: (p: { name: string }) => labelByName[p.name] || p.name,
              },
              itemStyle: { borderColor: "#3fb6ff", borderWidth: 1.5, shadowBlur: 14, shadowColor: "rgba(63,182,255,0.6)" },
            },
            label: { show: false },
            data,
          },
        ],
      },
      { notMerge: true },
    );
  }, [viloyat, districts, ready, mapName]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;
    chart.dispatchAction({ type: "downplay", seriesIndex: 0 });
    if (activeKey) chart.dispatchAction({ type: "highlight", seriesIndex: 0, name: activeKey });
  }, [activeKey, ready]);

  return (
    <div className="relative">
      <div ref={elRef} className="h-[320px] w-full sm:h-[430px]" role="img" aria-label={`${viloyat} туманлари харитаси`} />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-[0.8rem] text-ink-faint">
          Юкланмоқда…
        </div>
      )}
    </div>
  );
}
