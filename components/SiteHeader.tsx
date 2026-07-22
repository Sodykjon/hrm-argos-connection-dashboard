import Link from "next/link";
import Image from "next/image";
import { S } from "@/lib/strings";
import { Nav } from "./Nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-b from-band to-band-2 text-white shadow-band">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
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
          <span className="leading-tight">
            <span className="block text-[0.62rem] font-medium uppercase tracking-[0.12em] text-white/55">
              {S.ministry}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[1rem] font-bold tracking-tight">
                {S.system}
              </span>
              <span className="hidden rounded-full border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-[0.6rem] tracking-wide text-white/70 sm:inline">
                {S.argosDomain}
              </span>
            </span>
          </span>
        </Link>
        <Nav />
      </div>
    </header>
  );
}
