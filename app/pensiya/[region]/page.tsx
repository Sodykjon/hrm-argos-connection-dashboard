import Link from "next/link";
import { notFound } from "next/navigation";
import { getLatestPension } from "@/lib/data";
import { regionFromSlug, regionLabel } from "@/lib/regions";
import { pensionMetrics } from "@/lib/pension-metrics";
import { PensionHero } from "@/components/pension/PensionHero";
import { PensionAgeChart } from "@/components/pension/PensionAgeChart";
import { StatTile } from "@/components/StatTile";
import { fmtDate } from "@/lib/format";
import { getLang, getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PensionRegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const S = await getS();
  const lang = await getLang();
  const { region: slug } = await params;
  const { snapshot } = await getLatestPension();

  const known = snapshot.regions.map((r) => r.name);
  const name = regionFromSlug(slug, known);
  if (!name) notFound();

  const stat = snapshot.regions.find((r) => r.name === name);
  if (!stat) notFound();

  // Ranked worst-first, matching the board: rank 1 is the most exposed.
  const rankOrder = [...snapshot.regions].sort(
    (a, b) => pensionMetrics(b).exposedShare - pensionMetrics(a).exposedShare,
  );
  const rank = rankOrder.findIndex((r) => r.name === name) + 1;

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <div>
        <Link
          href="/pensiya"
          className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-sov hover:text-sov-deep"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {S.pension.navTitle}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[1.4rem] font-bold tracking-tight sm:text-[1.7rem]">
            {regionLabel(name, lang)}
          </h1>
          <p className="text-[0.78rem] text-ink-faint">
            {S.region.rankOf(rank, snapshot.regions.length)} ·{" "}
            <span className="tnum">{fmtDate(snapshot.date)}</span> {S.pension.asOf}
          </p>
        </div>
      </div>

      <PensionHero stat={stat} />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={S.pension.total} value={stat.total} accent="sov" hint={S.pension.totalHint} />
        <StatTile
          label={S.pension.working}
          value={stat.pensionWorking}
          accent="un"
          shareOfTotal={stat.total > 0 ? stat.pensionWorking / stat.total : undefined}
        />
        <StatTile
          label={S.pension.reaching}
          value={stat.reaching}
          accent="och"
          shareOfTotal={stat.total > 0 ? stat.reaching / stat.total : undefined}
        />
        <StatTile
          label={S.pension.women}
          value={stat.pensionWorkingWomen}
          accent="sov"
          hint={S.pension.womenHint}
        />
      </section>

      <section className="card p-4 sm:p-5">
        <div className="mb-2">
          <h2 className="text-[0.95rem] font-semibold">{S.pension.ageTitle}</h2>
          <p className="text-[0.78rem] text-ink-soft">{S.pension.ageHint}</p>
        </div>
        <PensionAgeChart stat={stat} />
      </section>
    </div>
  );
}
