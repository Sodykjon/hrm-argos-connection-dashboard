"use client";

// One palette for every ECharts canvas (canvas cannot read CSS variables).
// DARK values are exactly the hex codes the charts were hand-tuned with, so the
// dark «operations room» look does not move. LIGHT values mirror the light
// tokens in app/globals.css — muted hues (user 05.10: «ranglar juda yorqin»),
// text ≥4.5:1 on white. Keep the two files in step.

import { useMemo } from "react";
import { useTheme } from "@/lib/theme/client";
import type { Theme } from "@/lib/theme";
import { mixOklab, rampColor, rampColorFor } from "@/lib/format";

export interface ChartTheme {
  dark: boolean;
  /** primary text on the card (titles, emphasised labels) */
  ink: string;
  /** secondary label text (category axis names, legends) */
  inkSoft: string;
  /** axis tick labels */
  axisLabel: string;
  /** annotations, de-emphasised series, reference lines */
  faint: string;
  axisLine: string;
  splitLine: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  /** the card surface — ring borders around points, gaps between segments */
  surface: string;
  sov: string;
  sovArea: string;
  ul: string;
  ulArea: string;
  un: string;
  warn: string;
  goal: string;
  violet: string;
  /** neutral series blue (age bands etc.) */
  blue2: string;
  och: string;
  /** glow colours; transparent in light (glow on white reads as blur) */
  sovGlow: string;
  ulGlow: string;
  /** multiply every shadowBlur by this (1 dark, 0 light) */
  glow: number;
  // maps
  mapArea: string; // region with no data
  mapBorder: string; // thin outline between regions
  mapRegionBorder: string; // highlighted / selected outline
  mapHoverBorder: string;
  mapHoverGlow: string;
  mapShadow: string;
  labelBg: string; // background box behind map labels
  labelText: string;
  /** 4-stop red→amber→yellow-green→green for visualMap / area fills */
  ramp4: string[];
  /** ramp colour for FILLS (map areas, bars) */
  rampFill: (pct: number) => string;
  /** ramp colour for TEXT and thin marks (≥4.5:1 on the card) */
  rampMark: (pct: number) => string;
}

const SLATE = [0x2f, 0x3d, 0x55];
const rgb = (s: string) => (/rgb\((\d+), ?(\d+), ?(\d+)\)/.exec(s) ?? []).slice(1).map(Number);

const DARK: Omit<ChartTheme, "rampFill" | "rampMark"> = {
  dark: true,
  ink: "#eaf1fb",
  inkSoft: "#c6d4e8",
  axisLabel: "#8ba0bd",
  faint: "#7086a4",
  axisLine: "#22334f",
  splitLine: "#172a45",
  tooltipBg: "#0b3663",
  tooltipBorder: "#1f5a96",
  tooltipText: "#eaf1fb",
  surface: "#081222",
  sov: "#3fb6ff",
  sovArea: "rgba(63,182,255,0.14)",
  ul: "#2fd07a",
  ulArea: "rgba(47,208,122,0.14)",
  un: "#ff5a63",
  warn: "#f7b23b",
  goal: "#f7c14b",
  violet: "#b78af7",
  blue2: "#2b6ca3",
  och: "#7488a6",
  sovGlow: "rgba(63,182,255,0.55)",
  ulGlow: "rgba(47,208,122,0.55)",
  glow: 1,
  mapArea: "#152c4e",
  mapBorder: "rgba(140,175,225,0.16)",
  mapRegionBorder: "#ffffff",
  mapHoverBorder: "#3fb6ff",
  mapHoverGlow: "rgba(63,182,255,0.6)",
  mapShadow: "rgba(11,27,43,0.35)",
  labelBg: "#0c1f3b",
  labelText: "#eaf1fb",
  ramp4: ["#ff5a63", "#f7b23b", "#9ee34f", "#2fd07a"],
};

const LIGHT: Omit<ChartTheme, "rampFill" | "rampMark"> = {
  dark: false,
  ink: "#0c1a30",
  inkSoft: "#3a4d6b",
  axisLabel: "#56688a",
  faint: "#56688a",
  axisLine: "#c3cedd",
  splitLine: "#e8edf4",
  tooltipBg: "#ffffff",
  tooltipBorder: "#d6dfeb",
  tooltipText: "#0c1a30",
  surface: "#ffffff",
  sov: "#3a6a9f",
  sovArea: "rgba(58,106,159,0.10)",
  ul: "#3d724d",
  ulArea: "rgba(61,114,77,0.10)",
  un: "#b04a4a",
  warn: "#a8773f",
  goal: "#7d5d2c",
  violet: "#7a64a8",
  blue2: "#6a88ad",
  och: "#8a97ab",
  sovGlow: "transparent",
  ulGlow: "transparent",
  glow: 0,
  mapArea: "#e8edf4",
  mapBorder: "#ffffff",
  mapRegionBorder: "#0c1a30",
  mapHoverBorder: "#3a6a9f",
  mapHoverGlow: "rgba(58,106,159,0.30)",
  mapShadow: "rgba(16,40,80,0.12)",
  labelBg: "#ffffff",
  labelText: "#0c1a30",
  // the dark stops pulled 35 % toward slate (same formula as rampFill below)
  ramp4: ["#b55762", "#ad8955", "#73a65f", "#389a70"],
};

export function chartTheme(theme: Theme): ChartTheme {
  const base = theme === "light" ? LIGHT : DARK;
  return {
    ...base,
    // Light fills: the ramp pulled 35 % toward slate — same hue order, less chroma.
    rampFill: (pct) => (theme === "light" ? mixOklab(SLATE, rgb(rampColor(pct)), 0.35) : rampColor(pct)),
    rampMark: (pct) => rampColorFor(pct, theme),
  };
}

/** The chart palette for the current theme; re-renders on a theme switch. */
export function useChartTheme(): ChartTheme {
  const theme = useTheme();
  return useMemo(() => chartTheme(theme), [theme]);
}
