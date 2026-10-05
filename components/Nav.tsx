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
        { href: "/argos-jonli", label: S.nav.argosLive },
        // «Уланмаганлар» removed from the nav on the user's request 05.10.2026;
        // /ulanmaganlar still exists (linked from the home page's attention strip).
        { href: "/trend", label: S.nav.trend },
        { href: "/toldirilish", label: S.nav.completion, highlight: true },
      ],
    },
    // «Кадрлар таҳлили» (/pensiya, /vakansiya, /tarkib) hidden on the user's
    // request 25.09.2026 — «hozircha kerak emas». The pages still exist; to
    // bring the group back, restore this entry:
    // {
    //   label: S.nav.groupAnalytics,
    //   links: [
    //     { href: "/pensiya", label: S.nav.pension },
    //     { href: "/vakansiya", label: S.nav.vakansiya },
    //     { href: "/tarkib", label: S.nav.tarkib },
    //     // /admin lives in the header's utility row now — it is an operator
    //     // tool, and filing it under "Кадрлар таҳлили" put an upload form in an
    //     // analytics menu.
    //   ],
    // },
  ];

  return (
    <nav className="scroll-quiet -mx-1 flex items-center gap-2 overflow-x-auto px-1">
      {groups.map((g, gi) => (
        <div key={g.label} className="flex items-center gap-2">
          {gi > 0 && (
            <span className="h-5 w-px shrink-0 bg-chrome-line" aria-hidden />
          )}
          {/* The group caption («АРГОС жорий этилиши») was removed on the
              user's request 05.10.2026; the label stays as the group's name. */}
          <div className="flex items-center gap-2" aria-label={g.label} role="group">
            <div className="flex items-center gap-1">
              {g.links.map((l) => {
                const active = l.exact
                  ? path === l.href
                  : path.startsWith(l.href);
                const cls = l.highlight
                  ? active
                    ? "bg-goal text-band font-semibold shadow-[0_0_14px_color-mix(in_srgb,var(--color-goal)_var(--glow),transparent)]"
                    : "border border-goal/60 bg-goal-soft text-goal font-semibold hover:bg-goal/20"
                  : active
                    ? "bg-chrome-active text-chrome-on-active"
                    : "text-chrome-ink-soft hover:bg-chrome-hover hover:text-chrome-ink";
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
                        style={{ boxShadow: "0 0 6px color-mix(in srgb, var(--color-goal) var(--glow), transparent)" }}
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
