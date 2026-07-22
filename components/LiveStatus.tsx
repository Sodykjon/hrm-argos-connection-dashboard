"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { S } from "@/lib/strings";

/** Live monitoring indicator: pulsing dot + label + ticking clock, and a silent
 *  auto-refresh (router.refresh) every 30s that flashes a top sync sweep. */
export function LiveStatus() {
  const [clock, setClock] = useState("--:--:--");
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
    const iv = setInterval(() => {
      setSyncing(true);
      router.refresh();
      const off = setTimeout(() => setSyncing(false), 1300);
      return () => clearTimeout(off);
    }, 30000);
    return () => clearInterval(iv);
  }, [router]);

  return (
    <>
      {syncing && (
        <div className="syncing pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] bg-sov/25" />
      )}
      <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="live-dot absolute inline-flex h-2 w-2 rounded-full bg-ul" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-ul" />
        </span>
        {syncing && (
          <span className="hidden text-[0.7rem] font-medium tracking-wide text-sov sm:inline">
            {S.live.syncing}
          </span>
        )}
        <span className="tnum text-[0.8rem] font-semibold tabular-nums text-white/90">
          {clock}
        </span>
      </div>
    </>
  );
}
