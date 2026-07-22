import Link from "next/link";
import { S } from "@/lib/strings";
import { Nav } from "./Nav";

function Emblem() {
  return (
    <span
      aria-hidden
      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-sov shadow-[0_2px_10px_rgba(14,124,102,0.5)]"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M7 1.6h4v4.4h4.4v4H11V14H7V10H2.6V6H7V1.6Z"
          fill="#fff"
        />
      </svg>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-band text-white backdrop-blur supports-[backdrop-filter]:bg-band/95">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Emblem />
          <span className="leading-tight">
            <span className="block text-[0.62rem] font-medium uppercase tracking-[0.12em] text-white/55">
              {S.ministry}
            </span>
            <span className="block text-[0.98rem] font-bold tracking-tight">
              {S.system}
            </span>
          </span>
        </Link>
        <Nav />
      </div>
    </header>
  );
}
