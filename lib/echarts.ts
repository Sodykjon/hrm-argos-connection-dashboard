// Tree-shaken ECharts build — only the pieces the dashboard uses.
import * as echarts from "echarts/core";
import type { EChartsType } from "echarts/core";
import { BarChart, LineChart, PieChart, MapChart } from "echarts/charts";
import {
  TooltipComponent,
  VisualMapComponent,
  GridComponent,
  LegendComponent,
  GraphicComponent,
  MarkLineComponent,
} from "echarts/components";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  MapChart,
  TooltipComponent,
  VisualMapComponent,
  GridComponent,
  LegendComponent,
  GraphicComponent,
  MarkLineComponent,
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
