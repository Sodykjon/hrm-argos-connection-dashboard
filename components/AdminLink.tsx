"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useS } from "@/lib/i18n/client";

/**
 * The /admin entry, moved out of the nav's analytics group into the header's
 * utility row — it is an operator tool, not analytics. Client component only
 * for the active state; not gated behind SITE_PASSWORD (the nav pill it
 * replaces wasn't, and the page enforces its own password).
 */
export function AdminLink() {
  const S = useS();
  const active = usePathname().startsWith("/admin");

  return (
    <Link
      href="/admin"
      aria-current={active ? "page" : undefined}
      title={S.nav.admin}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] font-medium transition-colors",
        active
          ? "border-white bg-white text-band"
          : "border-white/20 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white",
      ].join(" ")}
    >
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M10 13V4m0 0 3.5 3.5M10 4 6.5 7.5M4 12.5V15a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 15v-2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden lg:inline">{S.nav.admin}</span>
    </Link>
  );
}
