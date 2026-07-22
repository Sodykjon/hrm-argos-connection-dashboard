import Link from "next/link";
import { getLatestSnapshot } from "@/lib/data";
import { OverviewHero } from "@/components/OverviewHero";
import { LiveFeed } from "@/components/LiveFeed";
import { StatTile } from "@/components/StatTile";
import { NationalBoard } from "@/components/NationalBoard";
import { AttentionStrip } from "@/components/AttentionStrip";
import { LiveSync } from "@/components/LiveSync";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { fmtInt } from "@/lib/format";
import { S } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const { snapshot } = await getLatestSnapshot();
  const { totals, regions } = snapshot;

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      {/* title + live status */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
          {S.overview.mapTitle}
        </h1>
        <LiveSync />
      </div>

      {/* live streaming ticker */}
      <LiveFeed regions={regions} />

      {/* hero: commanding readiness figure */}
      <OverviewHero totals={totals} />

      {/* KPI row */}
      <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <RevealItem className="h-full">
          <StatTile label={S.kpi.total} value={totals.total} accent="sov" hint={S.kpi.totalHint} />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile label={S.kpi.ulangan} value={totals.ulangan} accent="ul" shareOfTotal={totals.ulangan / totals.total} />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile label={S.kpi.ulanmagan} value={totals.ulanmagan} accent="un" shareOfTotal={totals.ulanmagan / totals.total} />
        </RevealItem>
        <RevealItem className="h-full">
          <StatTile label={S.kpi.ochirilgan} value={totals.ochirilgan} accent="och" shareOfTotal={totals.ochirilgan / totals.total} />
        </RevealItem>
      </RevealGroup>

      {/* map + ranking */}
      <Reveal>
        <NationalBoard regions={regions} />
      </Reveal>

      {/* lowest 3 */}
      <Reveal>
        <AttentionStrip regions={regions} />
      </Reveal>

      {/* quick links */}
      <RevealGroup className="grid gap-3 sm:grid-cols-2">
        <RevealItem>
          <Link href="/ulanmaganlar" className="card card-link group flex items-center justify-between p-5">
            <span>
              <span className="block text-[0.95rem] font-semibold">{S.overview.seeUnconnected}</span>
              <span className="mt-0.5 block text-[0.78rem] text-ink-soft">
                <span className="tnum font-semibold text-un">{fmtInt(totals.ulanmagan)}</span>{" "}
                {S.overview.orgsUnit} · раҳбар ва телефон билан
              </span>
            </span>
            <Arrow />
          </Link>
        </RevealItem>
        <RevealItem>
          <Link href="/trend" className="card card-link group flex items-center justify-between p-5">
            <span>
              <span className="block text-[0.95rem] font-semibold">{S.overview.seeTrend}</span>
              <span className="mt-0.5 block text-[0.78rem] text-ink-soft">
                Уланиш даражасининг вақт бўйича ўзгариши
              </span>
            </span>
            <Arrow />
          </Link>
        </RevealItem>
      </RevealGroup>
    </div>
  );
}

function Arrow() {
  return (
    <svg
      className="shrink-0 text-sov transition-transform group-hover:translate-x-0.5"
      width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden
    >
      <path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
