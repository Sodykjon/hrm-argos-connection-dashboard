"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

/**
 * Full-cycle boot animation. The user's requirement is explicit: the SSV
 * emblem animation must play TO THE END before the page is shown — so this
 * cannot be a Suspense `loading.tsx`, which unmounts the moment data
 * arrives. A template remounts on every route navigation, and the overlay
 * covers the (already rendered) page for exactly one GIF cycle, then fades.
 *
 * ANIM_MS = 3 250 ms — measured from the GIF's own frame delays (52 frames),
 * not guessed; a new <img> instance restarts the GIF from frame 0, so mount
 * time and animation start coincide.
 *
 * Reduced motion: the hold is skipped entirely — a mandatory 3-second wait is
 * exactly the kind of motion that setting exists to refuse.
 */
const ANIM_MS = 3250;
const FADE_MS = 350;

export default function Template({ children }: { children: React.ReactNode }) {
  // "hold" → "fade" → "done"
  const [phase, setPhase] = useState<"hold" | "fade" | "done">("hold");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("done");
      return;
    }
    const t1 = setTimeout(() => setPhase("fade"), ANIM_MS);
    const t2 = setTimeout(() => setPhase("done"), ANIM_MS + FADE_MS);
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
