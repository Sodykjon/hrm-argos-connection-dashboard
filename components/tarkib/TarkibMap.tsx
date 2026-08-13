"use client";

import { useEffect, useRef, useState } from "react";
import { echarts, type EChartsType, FONT_SANS, FONT_MONO } from "@/lib/echarts";
import type { TarkibRegion } from "@/lib/tarkib";
import { vrachTaminlShare } from "@/lib/tarkib";
import { toPct, fmtInt, fmtPct } from "@/lib/format";
import { regionLabel, regionLabelShort } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

export interface TarkibMapRow {
  name: string;
  region: TarkibRegion;
}

interface TarkibMapProps {
  rows: TarkibMapRow[]; // geographic regions only
  activeRegion: string | null;
  onHover?: (name: string | null) => void;
  onSelect?: (name: string) => void;
}

// Single-hue blue ramp (dim → bright = low → high coverage). The old
// red→green rainbow made a 54–91% RELATIVE spread read like a traffic-light
// verdict and tied hue to rank; magnitude belongs to lightness of ONE hue.
// Critical attention is carried by the explicit <70% flags in the ranking and
// table, not by repainting the map.
const RAMP = ["#14304e", "#1d5787", "#2b86c4", "#3fb6ff"];

/** Piecewise-linear sample of RAMP at t ∈ [0,1]. */
function sampleRamp(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const f = x - i;
  const hex = (c: string) => [1, 3, 5].map((p) => parseInt(c.slice(p, p + 2), 16));
  const [a, b] = [hex(RAMP[i]), hex(RAMP[i + 1])];
  const mix = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const ENCLAVE_MARKERS: Record<string, [number, number]> = {
  "Тошкент шаҳри": [69.28, 41.31],
};
const MAP_LAYOUT = { center: ["52%", "52%"] as [string, string], size: "118%" };

export interface CoverageRamp {
  min: number;
  max: number;
}

export function coverageRamp(shares: number[]): CoverageRamp {
  if (shares.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...shares), max: Math.max(...shares) };
}

/** Position within the ramp: 0 = worst (lowest coverage), 1 = best. */
export function coverageT(share: number, ramp: CoverageRamp): number {
  const span = ramp.max - ramp.min;
  if (span <= 0) return 0.5;
  const t = (share - ramp.min) / span;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Bars/values elsewhere sample the same blue ramp so a ranking row and its
 *  map region always wear the same tone. */
export function coverageColor(t: number): string {
  return sampleRamp(t);
}

/** Coverage below this share is flagged as critical in the ranking/table. */
export const COVERAGE_FLAG = 0.7;

export function TarkibMap({ rows, activeRegion, onHover, onSelect }: TarkibMapProps) {
  const S = useS();
  const lang = useLang();
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

    const enriched = rows.map((r) => ({ ...r, share: vrachTaminlShare(r.region) }));
    const ramp = coverageRamp(enriched.map((r) => r.share));

    const mapData = enriched.map((r) => ({
      name: r.name,
      value: toPct(r.share),
      share: r.share,
      vrach: r.region.vrach.jismoniy,
      vrachShtat: r.region.vrach.shtat,
      total: r.region.jismoniy,
    }));

    const enclaveData = enriched
      .filter((r) => ENCLAVE_MARKERS[r.name])
      .map((r) => {
        const [lng, lat] = ENCLAVE_MARKERS[r.name];
        return {
          name: r.name,
          value: [lng, lat, toPct(r.share)],
          share: r.share,
          vrach: r.region.vrach.jismoniy,
          vrachShtat: r.region.vrach.shtat,
          total: r.region.jismoniy,
          itemStyle: { color: coverageColor(coverageT(r.share, ramp)) },
        };
      });

    const tooltipFormatter = (p: {
      name: string;
      data?: { share: number; vrach: number; vrachShtat: number; total: number };
    }) => {
      const label = regionLabel(p.name, lang);
      const d = p.data;
      if (!d || d.share === undefined) return label;
      return `<b>${label}</b><br/>${S.tarkib.col.vrach}: <b>${fmtPct(
        d.share,
      )}</b><br/>${S.tarkib.cat.vrach}: ${fmtInt(d.vrach)} / ${fmtInt(
        d.vrachShtat,
      )}<br/>${S.map.people}: ${fmtInt(d.total)}`;
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
          // Relative scale over the observed spread; its endpoints are printed
          // beside the map so the compression cannot mislead.
          min: toPct(ramp.min),
          max: toPct(ramp.max),
          left: "left",
          bottom: 8,
          itemWidth: 10,
          itemHeight: 90,
          // No drag handles: they print raw numbers that duplicate the % text.
          calculable: false,
          text: [fmtPct(ramp.max, 1), fmtPct(ramp.min, 1)],
          inRange: { color: RAMP },
          textStyle: { color: "#8ba0bd", fontFamily: FONT_MONO, fontSize: 10 },
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
            label: { show: false },
            emphasis: {
              scale: 1.4,
              label: {
                show: true,
                position: "right",
                distance: 6,
                formatter: (p: { name: string }) => regionLabelShort(p.name, lang),
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
    // `lang` and `S` are dependencies: a language switch must redraw the
    // labels and the tooltip, not just the surrounding React tree.
  }, [rows, ready, lang, S]);

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
        aria-label={S.map.ariaTarkib}
      />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-[0.8rem] text-ink-faint">
          {S.map.loading}
        </div>
      )}
    </div>
  );
}
