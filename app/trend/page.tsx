import { getHistory } from "@/lib/data";
import { TrendChart } from "@/components/TrendChart";
import { StatTile } from "@/components/StatTile";
import { fmtDate, fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";
import type { ManifestEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

type Source = "seed" | "corrected" | "upload" | "workbook" | "live";
const sourceOf = (e: ManifestEntry): Source =>
  e.url === "seed" || e.url === "corrected" || e.url === "live" || e.url === "workbook" ? e.url : "upload";

/** Percentage-point change with its sign: «+29,3», «−0,4», «0,0». */
function fmtPts(d: number): string {
  const v = (Math.abs(d) * 100).toFixed(1).replace(".", ",");
  return d > 0.0005 ? `+${v}` : d < -0.0005 ? `−${v}` : v;
}

export default async function TrendPage() {
  const S = await getS();
  const T = S.trend;
  const history = await getHistory();
  const latest = history[history.length - 1];
  const first = history[0];
  const delta = latest.totals.percent - first.totals.percent;
  // Newest first; each row's change is against the measurement before it.
  const rows = history
    .map((e, i) => ({ e, d: i ? e.totals.percent - history[i - 1].totals.percent : null }))
    .reverse();

  return (
    <div className="mx-auto max-w-[1240px] space-y-4 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[1.3rem] font-bold tracking-tight sm:text-[1.5rem]">{T.title}</h1>
          <p className="mt-1 text-[0.82rem] text-ink-soft">{T.subtitle}</p>
        </div>
        <p className="tnum text-[0.78rem] text-ink-faint">
          {T.snapshots(history.length)} · {T.latest(fmtDate(latest.date))}
        </p>
      </header>

      {history.length < 2 && (
        <div className="card flex items-start gap-3 border-l-4 border-l-warn p-4 text-[0.83rem] text-ink-soft">
          <svg className="mt-0.5 shrink-0 text-warn" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 6.5v4M10 13.5h.01M10 2.5 1.8 16.5h16.4L10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{T.single}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {/* The rate leads, and its label and figure now name the same metric
            (the tile used to say «rate» over the connected COUNT). */}
        <div className="card flex flex-col justify-between p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ul" aria-hidden />
            <span className="text-[0.8rem] font-medium text-ink-soft">{S.kpi.rate}</span>
          </div>
          <span className="tnum glow-ul mt-3 text-[2.35rem] font-semibold leading-none tracking-tight text-ul sm:text-[2.7rem]">
            {fmtPct(latest.totals.percent, 1)}
          </span>
          <span className="tnum mt-1.5 text-[0.75rem] text-ink-faint">
            {T.ofOrgs(fmtInt(latest.totals.ulangan), fmtInt(latest.totals.total))}
          </span>
        </div>
        <StatTile
          label={S.status.ulanmagan}
          value={latest.totals.ulanmagan}
          accent="un"
          shareOfTotal={latest.totals.total ? latest.totals.ulanmagan / latest.totals.total : 0}
        />
        {/* Percentage POINTS, not percent: «+29,3 ф.б.», with the span it covers. */}
        <div className="card flex flex-col justify-between p-4 sm:p-5">
          <span className="text-[0.8rem] font-medium text-ink-soft">{T.change}</span>
          <span className={`tnum mt-3 leading-none ${delta >= 0 ? "text-ul" : "text-un"}`}>
            <span className="text-[2rem] font-semibold sm:text-[2.35rem]">{fmtPts(delta)}</span>
            <span className="ml-1.5 text-[0.9rem] font-medium">{T.ptsShort}</span>
          </span>
          <span className="tnum mt-1.5 text-[0.75rem] text-ink-faint">
            {T.range(fmtDate(first.date), fmtDate(latest.date))}
          </span>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <TrendChart history={history} />
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-line p-3 sm:px-4">
          <h2 className="text-[0.95rem] font-semibold">{T.tableTitle}</h2>
          <p className="text-[0.75rem] text-ink-faint">{T.tableHint}</p>
        </div>
        <div className="scroll-quiet overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[0.82rem]">
            <thead>
              <tr className="border-b border-line text-[0.75rem] uppercase tracking-wide text-ink-faint">
                <th className="px-3 py-2.5 font-medium sm:pl-4">{T.col.date}</th>
                <th className="tnum px-3 py-2.5 text-right font-medium">{S.overview.col.percent}</th>
                <th className="tnum px-3 py-2.5 text-right font-medium">{T.col.delta}</th>
                <th className="tnum px-3 py-2.5 text-right font-medium">{S.status.ulangan}</th>
                <th className="tnum px-3 py-2.5 text-right font-medium">{S.status.ulanmagan}</th>
                <th className="tnum px-3 py-2.5 text-right font-medium">{S.status.ochirilganShort}</th>
                <th className="tnum px-3 py-2.5 text-right font-medium">{S.overview.col.total}</th>
                <th className="px-3 py-2.5 font-medium sm:pr-4">{T.col.source}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ e, d }) => (
                <tr key={`${e.date}-${e.url}`} className="border-b border-line-soft hover:bg-paper">
                  <td className="tnum px-3 py-2 font-medium sm:pl-4">{fmtDate(e.date)}</td>
                  <td className="tnum px-3 py-2 text-right font-semibold">{fmtPct(e.totals.percent, 1)}</td>
                  <td
                    className={`tnum px-3 py-2 text-right ${
                      d === null || Math.abs(d) < 0.0005 ? "text-ink-faint" : d > 0 ? "text-ul" : "text-un"
                    }`}
                  >
                    {d === null ? "—" : `${fmtPts(d)} ${T.ptsShort}`}
                  </td>
                  <td className="tnum px-3 py-2 text-right text-ink-soft">{fmtInt(e.totals.ulangan)}</td>
                  <td className="tnum px-3 py-2 text-right text-ink-soft">{fmtInt(e.totals.ulanmagan)}</td>
                  <td className="tnum px-3 py-2 text-right text-ink-soft">{fmtInt(e.totals.ochirilgan)}</td>
                  <td className="tnum px-3 py-2 text-right text-ink-soft">{fmtInt(e.totals.total)}</td>
                  <td className="px-3 py-2 text-[0.75rem] text-ink-faint sm:pr-4">{T.source[sourceOf(e)]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
