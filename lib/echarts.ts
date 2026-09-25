// Tree-shaken ECharts build — only the pieces the dashboard uses.
import * as echarts from "echarts/core";
import type { EChartsType } from "echarts/core";
import { BarChart, LineChart, PieChart, MapChart, ScatterChart } from "echarts/charts";
import {
  TooltipComponent,
  VisualMapComponent,
  GridComponent,
  LegendComponent,
  GraphicComponent,
  MarkLineComponent,
  TitleComponent,
  GeoComponent,
} from "echarts/components";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  MapChart,
  ScatterChart,
  TooltipComponent,
  VisualMapComponent,
  GridComponent,
  LegendComponent,
  GraphicComponent,
  MarkLineComponent,
  TitleComponent,
  GeoComponent,
  LabelLayout,
  CanvasRenderer,
]);

export { echarts };
export type { EChartsType };
export type EChartsOption = Parameters<EChartsType["setOption"]>[0];

// shared visual constants
export const FONT_SANS =
  'var(--font-golos), ui-sans-serif, system-ui, sans-serif';
export const FONT_MONO =
  'var(--font-plex-mono), ui-monospace, monospace';

/**
 * Canvas cannot resolve CSS custom properties: a font stack that starts with
 * `var(--…)` makes the whole `ctx.font` string invalid and ECharts silently
 * falls back to 10px sans-serif. Resolve the variables in the browser.
 */
/** Deep-copy an option, resolving every `fontFamily` for canvas (see canvasFont). */
export function resolveFonts<T>(option: T): T {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>))
        out[k] = k === "fontFamily" && typeof x === "string" ? canvasFont(x) : walk(x);
      return out;
    }
    return v;
  };
  return walk(option) as T;
}

export function canvasFont(stack: string): string {
  if (typeof window === "undefined") return stack.replace(/var\([^)]*\),\s*/g, "");
  const cs = getComputedStyle(document.body);
  return stack.replace(/var\((--[^)]+)\)/g, (_, v: string) => cs.getPropertyValue(v).trim() || "sans-serif");
}
