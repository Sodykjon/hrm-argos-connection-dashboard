import Link from "next/link";
import { getHistory, getLatestSnapshot, getLatestCompletion, getLatestKadrlar } from "@/lib/data";
import { OverviewHero } from "@/components/OverviewHero";
import { DeltaTile } from "@/components/DeltaTile";
import { StatTile } from "@/components/StatTile";
import { NationalBoard } from "@/components/NationalBoard";
import { AttentionStrip } from "@/components/AttentionStrip";
import { ConnectionRegionTable } from "@/components/ConnectionRegionTable";
import { ReadinessRing } from "@/components/ReadinessRing";
import { PensionOverviewCard } from "@/components/pension/PensionOverviewCard";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { fmtDate, fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const S = await getS();
  const { snapshot, source } = await getLatestSnapshot();
  const { snapshot: completion } = await getLatestCompletion();
  const { snapshot: pension } = await getLatestKadrlar();
  const { totals, regions } = snapshot;

  // Change since the previous live day. Live points only: an uploaded report
  // covers a different org list (3 886 vs the 3 878-row registry), so mixing
  // the two would report a scope change as progress.
  const live = source === "live" ? (await getHistory()).filter((h) => h.url === "live") : [];
  const prev = [...live].reverse().find((h) => h.date < snapshot.date) ?? null;
  const since = prev ? fmtDate(prev.date) : "";
  const d = prev
    ? {
        ulangan: totals.ulangan - prev.totals.ulangan,
        ulanmagan: totals.ulanmagan - prev.totals.ulanmagan,
        ochirilgan: totals.ochirilgan - prev.totals.ochirilgan,
        pts: (totals.percent - prev.totals.percent) * 100,
      }
    : null;
  const ptsText = d ? `${d.pts > 0 ? "+" : d.pts < 0 ? "−" : ""}${Math.abs(d.pts).toFixed(1).replace(".", ",")}` : "";
  const ptsUnit = S.trend.deltaPts("0").replace(/^\+0\s*/, "");

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
        {S.overview.mapTitle}
      </h1>

      {/* hero: commanding readiness figure */}
      <OverviewHero totals={totals} delta={d ? { ulangan: d.ulangan, since } : null} />

      {/* KPI row — change since the previous live day; the totals themselves
          are already in the hero, so the tiles no longer repeat them. Without
          a previous day (uploaded report, first live day) the totals return. */}
      {d ? (
        <RevealGroup className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <RevealItem className="h-full">
            <DeltaTile label={S.overview.deltaConnected} value={d.ulangan} good="up" hint={S.overview.deltaSince(since)} zeroText={S.overview.noChange} />
          </RevealItem>
          <RevealItem className="h-full">
            <DeltaTile label={S.overview.deltaUnconnected} value={d.ulanmagan} good="down" hint={S.overview.deltaSince(since)} zeroText={S.overview.noChange} />
          </RevealItem>
          <RevealItem className="h-full">
            <DeltaTile label={S.overview.deltaDeleted} value={d.ochirilgan} good="down" hint={S.overview.deltaSince(since)} zeroText={S.overview.noChange} />
          </RevealItem>
          <RevealItem className="h-full">
            <DeltaTile label={S.overview.deltaRate} value={d.pts} good="up" display={ptsText} hint={`${ptsUnit} · ${S.overview.deltaSince(since)}`} zeroText={S.overview.noChange} />
          </RevealItem>
        </RevealGroup>
      ) : (
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
      )}

      {/* map + ranking */}
      <Reveal>
        <NationalBoard regions={regions} />
      </Reveal>

      {/* where the unconnected are */}
      <Reveal>
        <AttentionStrip regions={regions} />
      </Reveal>

      {/* regional summary table, leadership-PDF format */}
      <Reveal>
        <ConnectionRegionTable
          regions={regions}
          totals={totals}
          exportName={`HRM_ulanish_hududlar_${snapshot.date}`}
        />
      </Reveal>

      {/* pension exposure — above completion: the more consequential figure */}
      <Reveal>
        <PensionOverviewCard stat={pension.overall} />
      </Reveal>

      {/* data-completion summary */}
      <Reveal>
        <Link
          href="/toldirilish"
          className="card card-link group flex items-center gap-4 p-5 sm:gap-5"
        >
          <div className="shrink-0">
            <ReadinessRing percent={completion.overall.avg} size={92} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[0.95rem] font-semibold">
              {S.completion.overviewCard}
            </span>
            <span className="mt-0.5 block text-[0.8rem] text-ink-soft">
              {S.completion.avg}:{" "}
              <span className="tnum font-semibold text-sov">
                {fmtPct(completion.overall.avg, 1)}
              </span>{" "}
              · <span className="tnum">{fmtInt(completion.overall.orgCount)}</span>{" "}
              {S.completion.orgsUnit} ·{" "}
              <span className="tnum font-semibold text-un">
                {fmtInt(completion.overall.zeroCount)}
              </span>{" "}
              — {S.completion.zero}
            </span>
          </div>
          <Arrow />
        </Link>
      </Reveal>

      {/* quick links */}
      <RevealGroup className="grid gap-3 sm:grid-cols-2">
        <RevealItem>
          <Link href="/ulanmaganlar" className="card card-link group flex items-center justify-between p-5">
            <span>
              <span className="block text-[0.95rem] font-semibold">{S.overview.seeUnconnected}</span>
              <span className="mt-0.5 block text-[0.78rem] text-ink-soft">
                <span className="tnum font-semibold text-un">{fmtInt(totals.ulanmagan)}</span>{" "}
                {S.overview.orgsUnit} · {S.overview.unconnectedHint}
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
                {S.overview.trendHint}
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
