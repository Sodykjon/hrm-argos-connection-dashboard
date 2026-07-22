"use client";

import { Chart } from "./Chart";
import { rampColor, toPct, fmtPct } from "@/lib/format";
import { FONT_MONO, type EChartsOption } from "@/lib/echarts";

export function ReadinessRing({
  percent,
  size = 168,
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
        fontSize: 30,
        fontWeight: 600,
        color: "#0b1b2b",
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
          { value: pct, itemStyle: { color, borderRadius: 8 } },
          { value: 100 - pct, itemStyle: { color: "#eef2f6" } },
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
