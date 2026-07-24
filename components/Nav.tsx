"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { S } from "@/lib/strings";

const LINKS: {
  href: string;
  label: string;
  exact?: boolean;
  highlight?: boolean;
}[] = [
  { href: "/", label: S.nav.overview, exact: true },
  { href: "/ulanmaganlar", label: S.nav.unconnected },
  { href: "/trend", label: S.nav.trend },
  { href: "/toldirilish", label: S.nav.completion, highlight: true },
  { href: "/admin", label: S.nav.admin },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="scroll-quiet -mx-1 flex items-center gap-1 overflow-x-auto">
      {LINKS.map((l) => {
        const active = l.exact ? path === l.href : path.startsWith(l.href);
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
    </nav>
  );
}
