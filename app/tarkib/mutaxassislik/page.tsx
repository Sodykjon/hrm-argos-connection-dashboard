import Link from "next/link";
import { SPEC } from "@/lib/spec";
import { SpecExplorer } from "@/components/tarkib/SpecExplorer";
import { fmtDate } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function SpecPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const S = await getS();
  const { m } = await searchParams;

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <div>
        <Link
          href="/tarkib"
          className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-sov hover:text-sov-deep"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {S.tarkib.navTitle}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
              {S.tarkib.spec.title}
            </h1>
            <p className="mt-1 text-[0.82rem] text-ink-soft">
              {S.tarkib.spec.subtitle}
            </p>
          </div>
          <p className="text-[0.78rem] text-ink-faint">
            <span className="tnum">{fmtDate(SPEC.date)}</span> {S.tarkib.asOf}
          </p>
        </div>
      </div>

      <SpecExplorer initialSlug={m} />

      <p className="px-1 text-[0.72rem] leading-relaxed text-ink-faint">
        {S.tarkib.terms}
      </p>
      <p className="px-1 text-[0.72rem] leading-relaxed text-ink-faint">
        {S.tarkib.sourceNote(fmtDate(SPEC.date))}
      </p>
    </div>
  );
}
