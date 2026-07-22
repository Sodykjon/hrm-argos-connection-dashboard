"use client";

import { Chart } from "./Chart";
import { rampColor, toPct, fmtPct } from "@/lib/format";
import { FONT_MONO, type EChartsOption } from "@/lib/echarts";

export function ReadinessRing({
  percent,
  size = 186,
}: {
  percent: number;
  size?: number;
}) {
  const pct = toPct(percent);
  const color = rampColor(percent);

  const option: EChartsOption = {
    title: {
      text: fmtPct(percent, 1),
      left: "center",
      top: "38%",
      textStyle: {
        fontFamily: FONT_MONO,
        fontSize: 34,
        fontWeight: 600,
        color: "#eaf1fb",
      },
    },
    series: [
      {
        type: "pie",
        radius: ["74%", "92%"],
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
              borderRadius: 10,
              shadowBlur: 18,
              shadowColor: color,
            },
          },
          { value: 100 - pct, itemStyle: { color: "#1b3157" } },
        ],
      },
    ],
  };

  return (
    <Chart
      option={option}
      style={{ width: size, height: size }}
      ariaLabel={`Уланиш даражаси ${fmtPct(percent, 1)}`}
    />
  );
}
