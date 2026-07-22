"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { S } from "@/lib/strings";

const LINKS = [
  { href: "/", label: S.nav.overview, exact: true },
  { href: "/ulanmaganlar", label: S.nav.unconnected },
  { href: "/trend", label: S.nav.trend },
  { href: "/admin", label: S.nav.admin },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="scroll-quiet -mx-1 flex items-center gap-1 overflow-x-auto">
      {LINKS.map((l) => {
        const active = l.exact ? path === l.href : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={[
              "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.82rem] font-medium transition-colors",
              active
                ? "bg-white text-band"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
