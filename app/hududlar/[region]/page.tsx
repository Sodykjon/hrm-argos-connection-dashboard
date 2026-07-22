import Link from "next/link";
import { notFound } from "next/navigation";
import { getLatestSnapshot, getRegistry } from "@/lib/data";
import { regionFromSlug } from "@/lib/regions";
import { ReadinessRing } from "@/components/ReadinessRing";
import { NationalBar } from "@/components/NationalBar";
import { StatTile } from "@/components/StatTile";
import { OrgTable } from "@/components/OrgTable";
import type { Status } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { S } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function RegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region: slug } = await params;
  const { snapshot } = await getLatestSnapshot();
  const registry = await getRegistry();

  const known = snapshot.regions.map((r) => r.name);
  const name = regionFromSlug(slug, known);
  if (!name) notFound();

  const stat = snapshot.regions.find((r) => r.name === name);
  if (!stat) notFound();

  const orgs = snapshot.orgs.filter((o) => o.region === name);
  const rankOrder = [...snapshot.regions].sort((a, b) => b.percent - a.percent);
  const rank = rankOrder.findIndex((r) => r.name === name) + 1;

  const statuses = (["ulangan", "ulanmagan", "ochirilgan"] as Status[]).filter(
    (s) => orgs.some((o) => o.status === s),
  );

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-sov hover:text-sov-deep"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {S.region.back}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[1.4rem] font-bold tracking-tight sm:text-[1.7rem]">
            {name}
          </h1>
          <p className="text-[0.78rem] text-ink-faint">
            {S.region.rankOf(rank, snapshot.regions.length)} ·{" "}
            <span className="tnum">{fmtDate(snapshot.date)}</span> {S.overview.asOf}
          </p>
        </div>
      </div>

      {/* breakdown */}
      <section className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <div className="card flex flex-col items-center p-5 text-center">
          <span className="eyebrow">{S.kpi.rate}</span>
          <div className="my-1">
            <ReadinessRing percent={stat.percent} />
          </div>
          <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-goal-soft px-2.5 py-0.5 text-[0.7rem] font-semibold text-goal">
            <span className="h-1.5 w-1.5 rounded-full bg-goal" />
            {S.goal.target100}
          </span>
          <div className="mt-4 w-full border-t border-line pt-4">
            <NationalBar totals={stat} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatTile label={S.kpi.total} value={stat.total} accent="sov" hint={S.kpi.totalHint} />
          <StatTile label={S.kpi.ulangan} value={stat.ulangan} accent="ul" shareOfTotal={stat.ulangan / stat.total} />
          <StatTile label={S.kpi.ulanmagan} value={stat.ulanmagan} accent="un" shareOfTotal={stat.ulanmagan / stat.total} />
          <StatTile label={S.kpi.ochirilgan} value={stat.ochirilgan} accent="och" shareOfTotal={stat.ochirilgan / stat.total} />
        </div>
      </section>

      {/* org list */}
      <section className="space-y-3">
        <h2 className="text-[0.95rem] font-semibold">{S.region.orgList}</h2>
        <OrgTable
          rows={orgs}
          registry={registry}
          statuses={statuses}
          showStatus
          exportName={`HRM_ARGOS_${slug}_${snapshot.date}`}
        />
      </section>
    </div>
  );
}
