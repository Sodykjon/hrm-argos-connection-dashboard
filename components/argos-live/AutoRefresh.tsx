"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the tiny /api/argos-tree GET (one KV read) every 2 minutes while the
 * tab is visible and re-renders the server page only when a new push arrived.
 */
export function AutoRefresh({ checkedAt }: { checkedAt: string | null }) {
  const router = useRouter();
  const last = useRef(checkedAt);
  useEffect(() => {
    last.current = checkedAt;
  }, [checkedAt]);
  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/argos-tree", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { checkedAt: string | null };
        if (j.checkedAt && j.checkedAt !== last.current) {
          last.current = j.checkedAt;
          router.refresh();
        }
      } catch {
        /* offline — try again next tick */
      }
    };
    const id = setInterval(tick, 120_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);
  return null;
}
