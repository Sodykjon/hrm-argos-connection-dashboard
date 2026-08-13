"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

/**
 * Boot animation. The user's requirement: on the FIRST entry the SSV emblem
 * animation plays TO THE END before the page is shown; on later navigations
 * only a short flash. A Suspense `loading.tsx` can't do this — it unmounts
 * the moment data arrives — so a template remounts per navigation and the
 * overlay covers the (already rendered) page, then fades.
 *
 * FULL_MS = 3 250 ms — measured from the GIF's own frame delays (52 frames),
 * not guessed; a new <img> instance restarts the GIF from frame 0, so mount
 * time and animation start coincide. First-entry state lives in
 * sessionStorage: a new tab/session gets the full ceremony again, in-session
 * navigation gets the SHORT_MS flash.
 *
 * Reduced motion: the hold is skipped entirely — a mandatory 3-second wait is
 * exactly the kind of motion that setting exists to refuse.
 */
const FULL_MS = 3250;
const SHORT_MS = 700;
const FADE_MS = 350;
const SEEN_KEY = "gerb-boot-seen";

export default function Template({ children }: { children: React.ReactNode }) {
  // "hold" → "fade" → "done"
  const [phase, setPhase] = useState<"hold" | "fade" | "done">("hold");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("done");
      return;
    }
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // storage blocked → treat every load as first: the ceremony repeats,
      // which is the harmless direction.
    }
    const hold = seen ? SHORT_MS : FULL_MS;
    const t1 = setTimeout(() => setPhase("fade"), hold);
    const t2 = setTimeout(() => setPhase("done"), hold + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <>
      {children}
      {phase !== "done" && (
        <div
          aria-hidden={phase === "fade"}
          className="fixed inset-0 z-[100] grid place-items-center bg-paper transition-opacity duration-300"
          style={{ opacity: phase === "fade" ? 0 : 1 }}
        >
          <div className="flex flex-col items-center gap-4">
            <span className="block overflow-hidden rounded-full border border-line shadow-card">
              {/* Plain <img>: the loader must not wait for image optimization. */}
              <img
                src="/gerb-loading.gif"
                alt=""
                width={160}
                height={160}
                className="block h-[160px] w-[160px]"
              />
            </span>
            <span className="eyebrow blink">HRM ARGOS</span>
          </div>
        </div>
      )}
    </>
  );
}
