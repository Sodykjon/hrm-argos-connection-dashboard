"use client";

import { useMemo } from "react";
import type { RegionStat, Totals } from "@/lib/types";
import { fmtInt, fmtPct, toPct, rampColor } from "@/lib/format";
import { regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

/**
 * The regional connection summary in the format the leadership reference PDF
 * uses: worst-first, every status count on one line, and a ЖАМИ row at the
 * bottom so the table reconciles with the KPI tiles above it on the same
 * screen. The ЖАМИ row renders the stored national totals — never a client-side
 * re-sum, which could silently disagree with the tiles.
 */
export function ConnectionRegionTable({
  regions,
  totals,
  exportName,
}: {
  regions: RegionStat[];
  totals: Totals;
  exportName: string;
}) {
  const S = useS();
  const lang = useLang();

  const rows = useMemo(
    () => [...regions].sort((a, b) => a.percent - b.percent),
    [regions],
  );

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const line = (name: string, r: RegionStat | Totals) => ({
      [S.overview.col.region]: name,
      [S.overview.col.total]: r.total,
      [S.status.ulangan]: r.ulangan,
      [S.overview.col.percent]: toPct(r.percent),
      [S.status.ulanmagan]: r.ulanmagan,
      [S.status.ochirilganShort]: r.ochirilgan,
    });
    const data = [
      ...rows.map((r) => line(regionLabel(r.name, lang), r)),
      line(S.units.totalRow, totals),
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 34 }, { wch: 9 }, { wch: 10 }, { wch: 11 }, { wch: 11 }, { wch: 11 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, S.overview.regionTableSheet);
    XLSX.writeFile(wb, `${exportName}.xlsx`);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3 sm:p-4">
        <div>
          <h2 className="text-[0.95rem] font-semibold">{S.overview.regionTableTitle}</h2>
          <p className="text-[0.75rem] text-ink-faint">{S.overview.regionTableHint}</p>
        </div>
        <button
          onClick={exportXlsx}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sov px-4 py-2 text-[0.82rem] font-semibold text-white transition-colors hover:bg-sov-deep"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 1.5v8m0 0 3-3m-3 3-3-3M2.5 12v1.5A1 1 0 0 0 3.5 14.5h9a1 1 0 0 0 1-1V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {S.pension.export}
        </button>
      </div>

      <div className="scroll-quiet overflow-x-auto">
        <table className="w-full border-collapse text-left text-[0.82rem]">
          <thead>
            <tr className="border-b border-line text-[0.7rem] uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2.5 font-medium sm:px-4">{S.overview.col.region}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{S.overview.col.total}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{S.status.ulangan}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{S.overview.col.percent}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{S.status.ulanmagan}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium sm:pr-4">
                {S.status.ochirilganShort}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-line-soft hover:bg-paper">
                <td className="px-3 py-2 font-medium sm:px-4">
                  {regionLabel(r.name, lang)}
                </td>
                <td className="tnum px-3 py-2 text-right text-ink-soft">{fmtInt(r.total)}</td>
                <td className="tnum px-3 py-2 text-right text-ul">{fmtInt(r.ulangan)}</td>
                <td
                  className="tnum px-3 py-2 text-right font-semibold"
                  style={{ color: rampColor(r.percent) }}
                >
                  {fmtPct(r.percent, 1)}
                </td>
                <td className={`tnum px-3 py-2 text-right ${r.ulanmagan > 0 ? "font-medium text-un" : "text-ink-faint"}`}>
                  {fmtInt(r.ulanmagan)}
                </td>
                <td className="tnum px-3 py-2 text-right text-ink-soft sm:pr-4">
                  {fmtInt(r.ochirilgan)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-line bg-paper/70 font-semibold">
              <td className="px-3 py-2.5 sm:px-4">{S.units.totalRow}</td>
              <td className="tnum px-3 py-2.5 text-right">{fmtInt(totals.total)}</td>
              <td className="tnum px-3 py-2.5 text-right text-ul">{fmtInt(totals.ulangan)}</td>
              <td
                className="tnum px-3 py-2.5 text-right"
                style={{ color: rampColor(totals.percent) }}
              >
                {fmtPct(totals.percent, 1)}
              </td>
              <td className="tnum px-3 py-2.5 text-right text-un">{fmtInt(totals.ulanmagan)}</td>
              <td className="tnum px-3 py-2.5 text-right sm:pr-4">{fmtInt(totals.ochirilgan)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
