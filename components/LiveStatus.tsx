"use client";

import { useEffect, useState } from "react";

/** Live monitoring indicator: a pulsing dot + ticking clock. Purely client-side.
 *  The dashboard data changes only when a new report is uploaded (about once a
 *  day), so there is deliberately NO periodic server refresh here — an auto
 *  refresh would re-render the page on the server every few seconds and burn
 *  Vercel Blob operations for no benefit. Fresh data appears on navigation or a
 *  manual reload. */
export function LiveStatus() {
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const p = (n: number) => n.toString().padStart(2, "0");
    const tick = () => {
      const d = new Date();
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
      <span className="relative flex h-2 w-2">
        <span className="live-dot absolute inline-flex h-2 w-2 rounded-full bg-ul" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ul" />
      </span>
      <span className="tnum text-[0.8rem] font-semibold tabular-nums text-white/90">
        {clock}
      </span>
    </div>
  );
}
