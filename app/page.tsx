import Link from "next/link";
import { getLatestSnapshot } from "@/lib/data";
import { ReadinessRing } from "@/components/ReadinessRing";
import { NationalBar } from "@/components/NationalBar";
import { StatTile } from "@/components/StatTile";
import { NationalBoard } from "@/components/NationalBoard";
import { AttentionStrip } from "@/components/AttentionStrip";
import { GoalBanner } from "@/components/GoalBanner";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { S } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const { snapshot } = await getLatestSnapshot();
  const { totals, regions, date, uploadedAt } = snapshot;

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
      {/* context line */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
          {S.overview.mapTitle}
        </h1>
        <p className="text-[0.78rem] text-ink-faint">
          <span className="tnum font-medium text-ink-soft">{fmtDate(date)}</span>{" "}
          {S.overview.asOf} · {S.overview.updated}:{" "}
          <span className="tnum">{fmtDateTime(uploadedAt)}</span>
        </p>
      </div>

      {/* goal */}
      <GoalBanner totals={totals} />

      {/* hero: readiness + KPI */}
      <section className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <div className="card flex flex-col items-center p-5 text-center">
          <span className="eyebrow">{S.overview.heroEyebrow}</span>
          <div className="my-1">
            <ReadinessRing percent={totals.percent} />
          </div>
          <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-goal-soft px-2.5 py-0.5 text-[0.7rem] font-semibold text-goal">
            <span className="h-1.5 w-1.5 rounded-full bg-goal" />
            {S.goal.target100}
          </span>
          <p className="text-[0.8rem] text-ink-soft">
            <span className="tnum font-semibold text-ink">
              {new Intl.NumberFormat("ru-RU").format(totals.ulangan)}
            </span>{" "}
            {S.units.of}{" "}
            <span className="tnum">
              {new Intl.NumberFormat("ru-RU").format(totals.total)}
            </span>{" "}
            {S.overview.orgsUnit} уланган
          </p>
          <div className="mt-5 w-full border-t border-line pt-4">
            <NationalBar totals={totals} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
          <StatTile
            label={S.kpi.total}
            value={totals.total}
            accent="sov"
            hint={S.kpi.totalHint}
          />
          <StatTile
            label={S.kpi.ulangan}
            value={totals.ulangan}
            accent="ul"
            shareOfTotal={totals.ulangan / totals.total}
          />
          <StatTile
            label={S.kpi.ulanmagan}
            value={totals.ulanmagan}
            accent="un"
            shareOfTotal={totals.ulanmagan / totals.total}
          />
          <StatTile
            label={S.kpi.ochirilgan}
            value={totals.ochirilgan}
            accent="och"
            shareOfTotal={totals.ochirilgan / totals.total}
          />
        </div>
      </section>

      {/* map + ranking */}
      <NationalBoard regions={regions} />

      {/* lowest 3 */}
      <AttentionStrip regions={regions} />

      {/* quick links */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/ulanmaganlar"
          className="card group flex items-center justify-between p-5 transition-shadow hover:shadow-[0_4px_18px_rgba(11,27,43,0.08)]"
        >
          <span>
            <span className="block text-[0.95rem] font-semibold">
              {S.overview.seeUnconnected}
            </span>
            <span className="mt-0.5 block text-[0.78rem] text-ink-soft">
              <span className="tnum font-semibold text-un">
                {new Intl.NumberFormat("ru-RU").format(totals.ulanmagan)}
              </span>{" "}
              {S.overview.orgsUnit} · раҳбар ва телефон билан
            </span>
          </span>
          <Arrow />
        </Link>
        <Link
          href="/trend"
          className="card group flex items-center justify-between p-5 transition-shadow hover:shadow-[0_4px_18px_rgba(11,27,43,0.08)]"
        >
          <span>
            <span className="block text-[0.95rem] font-semibold">
              {S.overview.seeTrend}
            </span>
            <span className="mt-0.5 block text-[0.78rem] text-ink-soft">
              Уланиш даражасининг вақт бўйича ўзгариши
            </span>
          </span>
          <Arrow />
        </Link>
      </section>
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
