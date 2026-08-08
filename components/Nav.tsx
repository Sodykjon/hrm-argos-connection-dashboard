"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useS } from "@/lib/i18n/client";

interface NavLink {
  href: string;
  label: string;
  exact?: boolean;
  highlight?: boolean;
}

export function Nav() {
  const S = useS();
  const path = usePathname();
  // Built inside the component: at module scope the labels would freeze in
  // whichever language was loaded first.
  const groups: { label: string; links: NavLink[] }[] = [
    {
      label: S.nav.groupRollout,
      links: [
        { href: "/", label: S.nav.overview, exact: true },
        { href: "/ulanmaganlar", label: S.nav.unconnected },
        { href: "/trend", label: S.nav.trend },
        { href: "/toldirilish", label: S.nav.completion, highlight: true },
      ],
    },
    {
      label: S.nav.groupAnalytics,
      links: [
        { href: "/pensiya", label: S.nav.pension },
        { href: "/vakansiya", label: S.nav.vakansiya },
        { href: "/tarkib", label: S.nav.tarkib },
        // /admin lives in the header's utility row now — it is an operator
        // tool, and filing it under "Кадрлар таҳлили" put an upload form in an
        // analytics menu.
      ],
    },
  ];

  return (
    <nav className="scroll-quiet -mx-1 flex items-center gap-2 overflow-x-auto px-1">
      {groups.map((g, gi) => (
        <div key={g.label} className="flex items-center gap-2">
          {gi > 0 && (
            <span className="h-5 w-px shrink-0 bg-white/15" aria-hidden />
          )}
          {/* Caption inline-left of its pills: in the dedicated nav row the
              header pays for height, not width, so the two-line stack the
              caption-above layout needed is the wrong trade here. */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 whitespace-nowrap text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-white/40">
              {g.label}
            </span>
            <div className="flex items-center gap-1">
              {g.links.map((l) => {
                const active = l.exact
                  ? path === l.href
                  : path.startsWith(l.href);
                const cls = l.highlight
                  ? active
                    ? "bg-goal text-band font-semibold shadow-[0_0_14px_rgba(247,193,75,0.5)]"
                    : "border border-goal/60 bg-goal-soft text-goal font-semibold hover:bg-goal/20"
                  : active
                    ? "bg-white text-band"
                    : "text-white/70 hover:bg-white/10 hover:text-white";
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] font-medium transition-colors",
                      cls,
                    ].join(" ")}
                  >
                    {l.highlight && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-goal"
                        style={{ boxShadow: "0 0 6px var(--color-goal)" }}
                        aria-hidden
                      />
                    )}
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </nav>
  );
}
