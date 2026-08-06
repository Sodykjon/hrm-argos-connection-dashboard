import Link from "next/link";
import Image from "next/image";
import { getS } from "@/lib/i18n/server";
import { Nav } from "./Nav";
import { AdminLink } from "./AdminLink";
import { LangSwitch } from "./LangSwitch";
import { LiveStatus } from "./LiveStatus";
import { LogoutButton } from "./LogoutButton";

/**
 * Two rows: identity + utilities above, navigation below. The single-row
 * version packed the logo, the language switch, a clock, a seven-pill
 * two-group nav and logout into one wrapping cluster — on anything narrower
 * than a desktop it collapsed into a tall pile. Splitting gives the nav the
 * full 1240px line and turns the top row into a stable utility bar.
 */
export async function SiteHeader() {
  const S = await getS();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-b from-band to-band-2 text-white shadow-band">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white p-[3px] shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
            <Image
              src="/moh-logo.jpg"
              alt={S.ministry}
              width={44}
              height={44}
              className="h-full w-full rounded-full object-contain"
              priority
            />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[0.62rem] font-medium uppercase tracking-[0.12em] text-white/55">
              {S.ministry}
            </span>
            <span className="flex items-center gap-2">
              <span className="truncate text-[1rem] font-bold tracking-tight">
                {S.system}
              </span>
              <span className="hidden rounded-full border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-[0.6rem] tracking-wide text-white/70 sm:inline">
                {S.argosDomain}
              </span>
            </span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Decorative clock — hidden below md, where it only costs width. */}
          <span className="hidden md:block">
            <LiveStatus />
          </span>
          <LangSwitch />
          <AdminLink />
          {process.env.SITE_PASSWORD ? <LogoutButton /> : null}
        </div>
      </div>
      {/* The border spans the full viewport; the nav stays in the container. */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1240px] px-4 py-1.5 sm:px-6">
          <Nav />
        </div>
      </div>
    </header>
  );
}
