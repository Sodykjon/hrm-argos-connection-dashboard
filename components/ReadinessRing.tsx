"use client";

import { Chart } from "./Chart";
import { rampColorFor, toPct, fmtPct } from "@/lib/format";
import { cssVar, useTheme } from "@/lib/theme/client";
import { FONT_MONO, canvasFont, type EChartsOption } from "@/lib/echarts";
import { useS } from "@/lib/i18n/client";

export function ReadinessRing({
  percent,
  size = 186,
  showLabel = true,
}: {
  percent: number;
  size?: number;
  showLabel?: boolean;
}) {
  const S = useS();
  const theme = useTheme();
  const pct = toPct(percent);
  const color = rampColorFor(percent, theme);
  const dark = theme === "dark";

  const option: EChartsOption = {
    animationDuration: 1500,
    animationEasing: "cubicOut",
    ...(showLabel
      ? {
          title: {
            text: fmtPct(percent, 1),
            left: "center",
            top: "center",
            textStyle: {
              fontFamily: canvasFont(FONT_MONO),
              // Scale with the ring: 34px fits the 186px ring; the 92px card ring needs ~17px.
              fontSize: Math.round(size * 0.18),
              fontWeight: 600,
              color: cssVar("--color-ink", dark ? "#eaf1fb" : "#0c1a30"),
            },
          },
        }
      : {}),
    series: [
      {
        type: "pie",
        radius: ["73%", "93%"],
        center: ["50%", "50%"],
        silent: true,
        startAngle: 90,
        label: { show: false },
        labelLine: { show: false },
        data: [
          {
            value: pct,
            itemStyle: {
              color,
              borderRadius: 12,
              shadowBlur: dark ? 22 : 0,
              shadowColor: color,
            },
          },
          { value: 100 - pct, itemStyle: { color: cssVar("--ring-track", dark ? "#1b3157" : "#e3e9f2") } },
        ],
      },
    ],
  };

  return (
    <Chart
      option={option}
      style={{ width: size, height: size }}
      ariaLabel={`${S.kpi.rate} ${fmtPct(percent, 1)}`}
    />
  );
}
