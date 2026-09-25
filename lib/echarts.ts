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
export function canvasFont(stack: string): string {
  if (typeof window === "undefined") return stack.replace(/var\([^)]*\),\s*/g, "");
  const cs = getComputedStyle(document.body);
  return stack.replace(/var\((--[^)]+)\)/g, (_, v: string) => cs.getPropertyValue(v).trim() || "sans-serif");
}
