import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCompletionView } from "@/lib/completion-data";
import { topRegion } from "@/lib/completion-tree";
import { regionFromSlug, regionLabel, regionSlug } from "@/lib/regions";
import { ReadinessRing } from "@/components/ReadinessRing";
import { StatTile } from "@/components/StatTile";
import { CompletionTree } from "@/components/completion/CompletionTree";
import { fmtDate } from "@/lib/format";
import { getLang, getS } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function CompletionRegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const S = await getS();
  const lang = await getLang();
  const { region: slug } = await params;
  const view = await getCompletionView();
  const { snapshot } = view;

  const known = snapshot.regions.map((r) => r.name);
  const name = regionFromSlug(slug, known);
  if (!name) notFound();
  // The old republican buckets (central apparatus, SES committee, republican centres) now live
  // under «Республика муассасалари».
  if (topRegion(name) !== name) redirect(`/toldirilish/${regionSlug(topRegion(name))}`);

  const stat = snapshot.regions.find((r) => r.name === name);
  if (!stat) notFound();

  const rankOrder = [...snapshot.regions].sort((a, b) => b.avg - a.avg);
  const rank = rankOrder.findIndex((r) => r.name === name) + 1;

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      <div>
        <Link
          href="/toldirilish"
          className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-sov hover:text-sov-deep"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {S.completion.navTitle}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[1.4rem] font-bold tracking-tight sm:text-[1.7rem]">
            {regionLabel(name, lang)}
          </h1>
          <p className="text-[0.78rem] text-ink-faint">
            {S.region.rankOf(rank, snapshot.regions.length)} ·{" "}
            <span className="tnum">{fmtDate(snapshot.date)}</span> {S.completion.asOf}
          </p>
        </div>
      </div>

      {/* breakdown */}
      <section className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <div className="card flex flex-col items-center p-5 text-center">
          <span className="eyebrow">{S.completion.avg}</span>
          <div className="my-1">
            <ReadinessRing percent={stat.avg} />
          </div>
          <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-goal-soft px-2.5 py-0.5 text-[0.75rem] font-semibold text-goal">
            <span className="h-1.5 w-1.5 rounded-full bg-goal" />
            {S.goal.target100}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile label={S.completion.orgs} value={stat.orgCount} accent="sov" hint={S.completion.orgsHint} />
          <StatTile label={S.completion.zero} value={stat.zeroCount} accent="un" hint={S.completion.zeroHint} />
          <StatTile label={S.completion.below50} value={stat.below50} accent="un" hint={S.completion.below50Hint} />
        </div>
      </section>

      {/* org list */}
      <section className="space-y-3">
        {view.placed === 0 && (
          <p className="rounded-lg border border-warn/40 bg-goal-soft px-4 py-2 text-[0.8rem] text-warn">
            {S.completion.tree.noStir}
          </p>
        )}
        <CompletionTree regions={view.tree.filter((r) => r.name === name)} single />
      </section>
    </div>
  );
}
