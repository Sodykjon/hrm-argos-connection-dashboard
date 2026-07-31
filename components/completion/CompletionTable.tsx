"use client";

import { useMemo, useState } from "react";
import type { CompletionOrg } from "@/lib/types";
import { fmtPct, rampColor, toPct } from "@/lib/format";
import { regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

interface CompletionTableProps {
  rows: CompletionOrg[];
  regions?: string[]; // enables region filter + region column
  exportName: string;
}

const ALL = "__all__";

export function CompletionTable({ rows, regions, exportName }: CompletionTableProps) {
  const S = useS();
  const lang = useLang();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState(ALL);
  const [asc, setAsc] = useState(true); // worst-first by default

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((o) => {
      if (region !== ALL && o.region !== region) return false;
      if (!needle) return true;
      return (
        o.name.toLowerCase().includes(needle) ||
        o.id.includes(needle) ||
        o.region.toLowerCase().includes(needle)
      );
    });
    return [...out].sort((a, b) =>
      asc ? a.completion - b.completion : b.completion - a.completion,
    );
  }, [rows, q, region, asc]);

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    // Headers follow the chosen language; organisation names never do.
    const data = filtered.map((o, i) => ({
      [S.completion.col.n]: i + 1,
      [S.completion.col.name]: o.name,
      [S.completion.col.region]: regionLabel(o.region, lang),
      [S.completion.col.id]: o.id,
      orgType: o.orgType ?? "",
      [S.completion.col.rate]: toPct(o.completion),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 52 },
      { wch: 24 },
      { wch: 10 },
      { wch: 10 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, S.completion.sheet);
    XLSX.writeFile(wb, `${exportName}.xlsx`);
  }

  return (
    <div className="card overflow-hidden">
      {/* controls */}
      <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={S.completion.search}
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3.5 py-2 text-[0.85rem] outline-none focus:border-sov focus:bg-surface"
        />
        {regions && regions.length > 0 && (
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[0.82rem] font-medium outline-none focus:border-sov"
          >
            <option value={ALL}>{S.completion.allRegions}</option>
            {regions.map((r) => (
              // value stays the canonical name — only the label is translated
              <option key={r} value={r}>
                {regionLabel(r, lang)}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={exportXlsx}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sov px-4 py-2 text-[0.82rem] font-semibold text-white transition-colors hover:bg-sov-deep"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 1.5v8m0 0 3-3m-3 3-3-3M2.5 12v1.5A1 1 0 0 0 3.5 14.5h9a1 1 0 0 0 1-1V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {S.completion.export}
        </button>
      </div>

      {/* count */}
      <div className="flex items-center justify-between px-4 py-2 text-[0.75rem] text-ink-faint">
        <span className="tnum font-medium text-ink-soft">
          {S.completion.count(filtered.length)}
        </span>
      </div>

      {/* table */}
      <div className="scroll-quiet max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-left text-[0.82rem]">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-y border-line text-[0.7rem] uppercase tracking-wide text-ink-faint">
              <th className="w-10 px-3 py-2.5 font-medium">{S.completion.col.n}</th>
              <th className="px-3 py-2.5 font-medium">{S.completion.col.name}</th>
              {regions && (
                <th className="hidden px-3 py-2.5 font-medium md:table-cell">
                  {S.completion.col.region}
                </th>
              )}
              <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                {S.completion.col.id}
              </th>
              <th className="px-3 py-2.5 font-medium">
                <button
                  onClick={() => setAsc((v) => !v)}
                  className="inline-flex items-center gap-1 hover:text-ink"
                >
                  {S.completion.col.rate}
                  <span className="text-[0.9em]">{asc ? "↑" : "↓"}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => {
              const color = rampColor(o.completion);
              return (
                <tr
                  key={`${o.id}-${i}`}
                  className="border-b border-line-soft align-top hover:bg-paper"
                >
                  <td className="tnum px-3 py-2.5 text-ink-faint">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="max-w-[38ch] font-medium leading-snug sm:max-w-[54ch]">
                      {o.name}
                    </div>
                  </td>
                  {regions && (
                    <td className="hidden px-3 py-2.5 text-ink-soft md:table-cell">
                      {regionLabel(o.region, lang)}
                    </td>
                  )}
                  <td className="tnum hidden px-3 py-2.5 text-ink-soft sm:table-cell">
                    {o.id}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line-soft">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${o.completion * 100}%`, background: color }}
                        />
                      </span>
                      <span
                        className="tnum shrink-0 text-[0.82rem] font-semibold"
                        style={{ color }}
                      >
                        {fmtPct(o.completion, 1)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={regions ? 5 : 4} className="px-4 py-10 text-center text-ink-faint">
                  {S.completion.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
