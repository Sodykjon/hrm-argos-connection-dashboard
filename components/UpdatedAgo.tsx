"use client";

import { useEffect, useState } from "react";
import { fmtAgo } from "@/lib/format";

/** Ticks the "updated X ago" relative time from a snapshot timestamp. */
export function UpdatedAgo({ iso, className }: { iso: string; className?: string }) {
  const [txt, setTxt] = useState("");
  useEffect(() => {
    const compute = () => setTxt(fmtAgo(iso, Date.now()));
    compute();
    const t = setInterval(compute, 1000);
    return () => clearInterval(t);
  }, [iso]);
  return <span className={className} suppressHydrationWarning>{txt}</span>;
}
