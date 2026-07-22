"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { fmtInt } from "@/lib/format";

function fmt(v: number, kind: "int" | "pct"): string {
  if (kind === "pct") return `${v.toFixed(1).replace(".", ",")}%`;
  return fmtInt(v);
}

/** Counts to `value` on mount, and re-animates whenever `value` changes (so
 *  the 30s auto-refresh visibly ticks). Formats internally (no function props
 *  cross the server→client boundary). Respects reduced motion. */
export function AnimatedNumber({
  value,
  className,
  kind = "int",
  duration = 1.2,
}: {
  value: number;
  className?: string;
  kind?: "int" | "pct";
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => setDisplay(v),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce, duration]);

  return (
    <span className={className} suppressHydrationWarning>
      {fmt(display, kind)}
    </span>
  );
}
