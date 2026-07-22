import { getHistory } from "@/lib/data";
import { TrendChart } from "@/components/TrendChart";
import { StatTile } from "@/components/StatTile";
import { fmtPct } from "@/lib/format";
import { S } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function TrendPage() {
  const history = await getHistory();
  const latest = history[history.length - 1];
  const first = history[0];
  const delta = latest.totals.percent - first.totals.percent;

  return (
    <div className="mx-auto max-w-[1240px] space-y-4 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">
            {S.trend.title}
          </h1>
          <p className="mt-1 text-[0.82rem] text-ink-soft">{S.trend.subtitle}</p>
        </div>
        <p className="tnum text-[0.78rem] text-ink-faint">
          {S.trend.snapshots(history.length)}
        </p>
      </header>

      {history.length < 2 && (
        <div className="card flex items-start gap-3 border-l-4 border-l-warn p-4 text-[0.83rem] text-ink-soft">
          <svg className="mt-0.5 shrink-0 text-warn" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 6.5v4M10 13.5h.01M10 2.5 1.8 16.5h16.4L10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{S.trend.single}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={S.kpi.rate}
          value={latest.totals.ulangan}
          accent="ul"
          hint={fmtPct(latest.totals.percent, 1)}
        />
        <StatTile label={S.status.ulanmagan} value={latest.totals.ulanmagan} accent="un" />
        <div className="card flex flex-col justify-between p-4 sm:p-5">
          <span className="text-[0.8rem] font-medium text-ink-soft">
            Ўзгариш (биринчи ҳисоботдан)
          </span>
          <span
            className={`tnum mt-3 text-[2rem] font-semibold leading-none sm:text-[2.35rem] ${
              delta >= 0 ? "text-ul" : "text-un"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {fmtPct(delta, 1)}
          </span>
          <span className="mt-1.5 text-[0.72rem] text-ink-faint">
            {S.trend.snapshots(history.length)}
          </span>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <TrendChart history={history} />
      </div>
    </div>
  );
}
