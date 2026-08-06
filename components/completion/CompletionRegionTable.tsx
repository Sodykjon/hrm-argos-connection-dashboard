"use client";

import { useMemo } from "react";
import type { CompletionOverall, CompletionRegionStat } from "@/lib/types";
import { fmtInt, fmtPct, toPct, rampColor } from "@/lib/format";
import { regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

/**
 * Regional completion summary in the leadership-PDF format: worst-first, the
 * zero-progress count called out per row, ЖАМИ at the bottom rendered from the
 * stored overall — not re-summed client-side. The 0% column matters more than
 * the average here: an average hides that a third of organisations have not
 * started at all, which is the PDF's own headline finding.
 */
export function CompletionRegionTable({
  regions,
  overall,
  exportName,
}: {
  regions: CompletionRegionStat[];
  overall: CompletionOverall;
  exportName: string;
}) {
  const S = useS();
  const lang = useLang();

  const rows = useMemo(
    () => [...regions].sort((a, b) => a.avg - b.avg),
    [regions],
  );

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const line = (name: string, orgCount: number, avg: number, zero: number) => ({
      [S.overview.col.region]: name,
      [S.completion.col.inReport]: orgCount,
      [S.completion.col.rate]: toPct(avg),
      [S.completion.col.zero]: zero,
    });
    const data = [
      ...rows.map((r) => line(regionLabel(r.name, lang), r.orgCount, r.avg, r.zeroCount)),
      line(S.units.totalRow, overall.orgCount, overall.avg, overall.zeroCount),
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 36 }, { wch: 12 }, { wch: 14 }, { wch: 9 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, S.completion.regionTableSheet);
    XLSX.writeFile(wb, `${exportName}.xlsx`);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3 sm:p-4">
        <div>
          <h2 className="text-[0.95rem] font-semibold">
            {S.completion.regionTableTitle}
          </h2>
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
              <th className="tnum px-3 py-2.5 text-right font-medium">
                {S.completion.col.inReport}
              </th>
              <th className="tnum px-3 py-2.5 text-right font-medium">
                {S.completion.col.rate}
              </th>
              <th className="tnum px-3 py-2.5 text-right font-medium sm:pr-4">
                {S.completion.col.zero}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-line-soft hover:bg-paper">
                <td className="px-3 py-2 font-medium sm:px-4">
                  {regionLabel(r.name, lang)}
                </td>
                <td className="tnum px-3 py-2 text-right text-ink-soft">
                  {fmtInt(r.orgCount)}
                </td>
                <td
                  className="tnum px-3 py-2 text-right font-semibold"
                  style={{ color: rampColor(r.avg) }}
                >
                  {fmtPct(r.avg, 1)}
                </td>
                <td className={`tnum px-3 py-2 text-right sm:pr-4 ${r.zeroCount > 0 ? "font-medium text-un" : "text-ink-faint"}`}>
                  {fmtInt(r.zeroCount)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-line bg-paper/70 font-semibold">
              <td className="px-3 py-2.5 sm:px-4">{S.units.totalRow}</td>
              <td className="tnum px-3 py-2.5 text-right">{fmtInt(overall.orgCount)}</td>
              <td
                className="tnum px-3 py-2.5 text-right"
                style={{ color: rampColor(overall.avg) }}
              >
                {fmtPct(overall.avg, 1)}
              </td>
              <td className="tnum px-3 py-2.5 text-right text-un sm:pr-4">
                {fmtInt(overall.zeroCount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
