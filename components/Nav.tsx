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
        { href: "/admin", label: S.nav.admin },
      ],
    },
  ];

  return (
    <nav className="scroll-quiet -mx-1 flex items-center gap-3 overflow-x-auto">
      {groups.map((g, gi) => (
        <div key={g.label} className="flex items-center gap-3">
          {gi > 0 && (
            <span className="h-7 w-px shrink-0 bg-white/15" aria-hidden />
          )}
          <div className="flex flex-col gap-0.5">
            <span className="whitespace-nowrap px-3.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-white/40">
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
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors",
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
