"use client";

import { useState, useTransition } from "react";
import { setThemePref } from "@/lib/theme/actions";
import type { ThemePref } from "@/lib/theme";
import { useS } from "@/lib/i18n/client";

const ICONS: Record<ThemePref, React.ReactNode> = {
  light: (
    <>
      <circle cx="10" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  dark: (
    <path
      d="M16 12.2A6.5 6.5 0 0 1 7.8 4a6.5 6.5 0 1 0 8.2 8.2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  system: (
    <>
      <rect x="2.75" y="3.75" width="14.5" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 16.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
};

const ORDER: ThemePref[] = ["light", "dark", "system"];

/** Light / dark / follow-the-OS. Applies instantly on the client, then persists. */
export function ThemeSwitch({ initial }: { initial: ThemePref }) {
  const S = useS();
  const [pref, setPref] = useState<ThemePref>(initial);
  const [, start] = useTransition();

  const choose = (p: ThemePref) => {
    setPref(p);
    const d = document.documentElement;
    d.setAttribute("data-theme-pref", p);
    const resolved =
      p === "system" ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : p;
    d.setAttribute("data-theme", resolved);
    start(() => setThemePref(p));
  };

  return (
    <div
      className="inline-flex items-center rounded-full border border-chrome-line bg-chrome-fill p-0.5"
      role="group"
      aria-label={S.theme.label}
    >
      {ORDER.map((p) => {
        const active = p === pref;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={active}
            aria-label={S.theme[p]}
            title={S.theme[p]}
            onClick={() => choose(p)}
            className={[
              "grid h-7 w-7 place-items-center rounded-full transition-colors",
              active
                ? "bg-chrome-active text-chrome-on-active"
                : "text-chrome-ink-soft hover:bg-chrome-hover hover:text-chrome-ink",
            ].join(" ")}
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
              {ICONS[p]}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
