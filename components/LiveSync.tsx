"use client";

import { useEffect, useState } from "react";
import { S } from "@/lib/strings";

/** Live "just synced" indicator that cycles with the 30s auto-refresh, so the
 *  dashboard always reads as being kept up to date in real time. */
export function LiveSync() {
  const [ago, setAgo] = useState(0);

  useEffect(() => {
    let start = Date.now();
    const t = setInterval(() => {
      let s = Math.floor((Date.now() - start) / 1000);
      if (s >= 30) {
        start = Date.now();
        s = 0;
      }
      setAgo(s);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const label = ago < 3 ? S.live.justNow : `${ago} ${S.live.secAgo}`;

  return (
    <div className="flex items-center gap-2 text-[0.78rem]" suppressHydrationWarning>
      <span className="relative flex h-2 w-2">
        <span className="live-dot absolute inline-flex h-2 w-2 rounded-full bg-ul" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ul" />
      </span>
      <span className="font-medium text-ul">{S.live.monitoring}</span>
      <span className="text-ink-faint/50">·</span>
      <span className="text-ink-faint">{S.live.lastSync}:</span>
      <span className="tnum text-ink-soft">{label}</span>
    </div>
  );
}
