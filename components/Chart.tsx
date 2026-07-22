"use client";

import { useEffect, useRef } from "react";
import { echarts, type EChartsOption, type EChartsType } from "@/lib/echarts";

interface ChartProps {
  option: EChartsOption;
  className?: string;
  style?: React.CSSProperties;
  onReady?: (chart: EChartsType) => void;
  ariaLabel?: string;
}

/** Minimal, dependency-free React wrapper around an ECharts instance. */
export function Chart({ option, className, style, onReady, ariaLabel }: ChartProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current, undefined, {
      renderer: "canvas",
    });
    chartRef.current = chart;
    onReady?.(chart);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
    // Instance lifecycle only — option changes handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return (
    <div
      ref={elRef}
      className={className}
      style={style}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
