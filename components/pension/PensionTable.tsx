"use client";

import { useMemo, useState } from "react";
import type { KadrlarStat } from "@/lib/types";
import { pensionMetrics, riskRamp, riskT, riskColor } from "@/lib/pension-metrics";
import { fmtInt, fmtPct, toPct } from "@/lib/format";
import { isGeographicRegion, regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

export function PensionTable({
  rows,
  exportName,
}: {
  rows: KadrlarStat[];
  exportName: string;
}) {
  const S = useS();
  const lang = useLang();
  const [q, setQ] = useState("");
  const [desc, setDesc] = useState(true); // worst-first by default

  const enriched = useMemo(
    () => rows.map((stat) => ({ stat, m: pensionMetrics(stat) })),
    [rows],
  );

  // Scaled to the geographic spread, matching the map and the ranking. Include
  // the level rows and a two-organisation branch sets ramp.max, compressing
  // every viloyat's bar and colour toward the bottom of the scale.
  const ramp = useMemo(
    () =>
      riskRamp(
        enriched
          .filter(({ stat }) => isGeographicRegion(stat.name))
          .map((r) => r.m.exposedShare),
      ),
    [enriched],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = enriched.filter(({ stat }) => {
      if (!needle) return true;
      return (
        stat.name.toLowerCase().includes(needle) ||
        regionLabel(stat.name, lang).toLowerCase().includes(needle)
      );
    });
    return [...out].sort((a, b) =>
      desc
        ? b.m.exposedShare - a.m.exposedShare
        : a.m.exposedShare - b.m.exposedShare,
    );
  }, [enriched, q, desc, lang]);

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    // Headers follow the chosen language; region names go through
    // regionLabel for display only — the canonical key is never exported.
    const data = filtered.map(({ stat, m }, i) => ({
      [S.pension.col.n]: i + 1,
      [S.pension.col.region]: regionLabel(stat.name, lang),
      [S.pension.col.total]: stat.total,
      [S.pension.col.women]: stat.totalWomen,
      [S.pension.col.working]: stat.pensionWorking,
      [S.pension.col.reaching]: stat.reaching,
      [S.pension.col.share]: toPct(m.exposedShare),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 5 }, { wch: 34 }, { wch: 14 },
      { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, S.pension.sheet);
    XLSX.writeFile(wb, `${exportName}.xlsx`);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={S.pension.search}
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3.5 py-2 text-[0.85rem] outline-none focus:border-sov focus:bg-surface"
        />
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

      <div className="flex items-center justify-between px-4 py-2 text-[0.75rem] text-ink-faint">
        <span className="tnum font-medium text-ink-soft">
          {S.pension.count(filtered.length)}
        </span>
      </div>

      <div className="scroll-quiet max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-left text-[0.82rem]">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-y border-line text-[0.7rem] uppercase tracking-wide text-ink-faint">
              <th className="w-10 px-3 py-2.5 font-medium">{S.pension.col.n}</th>
              <th className="px-3 py-2.5 font-medium">{S.pension.col.region}</th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                {S.pension.col.total}
              </th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium md:table-cell">
                {S.pension.col.women}
              </th>
              <th className="tnum px-3 py-2.5 text-right font-medium">
                {S.pension.col.working}
              </th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                {S.pension.col.reaching}
              </th>
              <th className="px-3 py-2.5 font-medium">
                <button
                  onClick={() => setDesc((v) => !v)}
                  className="inline-flex items-center gap-1 hover:text-ink"
                >
                  {S.pension.col.share}
                  <span className="text-[0.9em]">{desc ? "↓" : "↑"}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ stat, m }, i) => {
              const color = riskColor(riskT(m.exposedShare, ramp));
              const width = ramp.max > 0 ? (m.exposedShare / ramp.max) * 100 : 0;
              return (
                <tr
                  key={stat.name}
                  className="border-b border-line-soft align-top hover:bg-paper"
                >
                  <td className="tnum px-3 py-2.5 text-ink-faint">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="max-w-[38ch] font-medium leading-snug">
                      {regionLabel(stat.name, lang)}
                    </div>
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink-soft sm:table-cell">
                    {fmtInt(stat.total)}
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink-soft md:table-cell">
                    {fmtInt(stat.totalWomen)}
                  </td>
                  <td className="tnum px-3 py-2.5 text-right font-medium">
                    {fmtInt(stat.pensionWorking)}
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink-soft sm:table-cell">
                    {fmtInt(stat.reaching)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line-soft">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${width}%`, background: color }}
                        />
                      </span>
                      <span
                        className="tnum shrink-0 text-[0.82rem] font-semibold"
                        style={{ color }}
                      >
                        {fmtPct(m.exposedShare, 1)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-faint">
                  {S.pension.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
