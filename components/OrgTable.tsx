"use client";

import { useMemo, useState } from "react";
import type { Org, Registry, Status } from "@/lib/types";
import { statusMeta } from "@/lib/format";
import { regionLabel } from "@/lib/regions";
import { StatusPill } from "./StatusPill";
import { useS, useLang } from "@/lib/i18n/client";

interface OrgTableProps {
  rows: Org[];
  registry: Registry;
  regions?: string[]; // enables region filter + region column
  statuses?: Status[]; // enables status filter
  showStatus?: boolean;
  exportName: string;
}

const ALL = "__all__";

export function OrgTable({
  rows,
  registry,
  regions,
  statuses,
  showStatus,
  exportName,
}: OrgTableProps) {
  const S = useS();
  const lang = useLang();
  const META = statusMeta(lang);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((o) => {
      if (region !== ALL && o.region !== region) return false;
      if (status !== ALL && o.status !== status) return false;
      if (!needle) return true;
      const reg = registry[o.stir];
      return (
        o.name.toLowerCase().includes(needle) ||
        o.stir.includes(needle) ||
        (reg?.rahbar ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, region, status, registry]);

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const data = filtered.map((o, i) => {
      const r = registry[o.stir] ?? {};
      // Headers follow the chosen language; organisation names never do.
      return {
        [S.unconnected.col.n]: i + 1,
        [S.unconnected.col.name]: o.name,
        [S.unconnected.col.region]: regionLabel(o.region, lang),
        [S.unconnected.col.stir]: o.stir,
        [S.unconnected.col.rahbar]: r.rahbar ?? "",
        [S.unconnected.col.tel]: r.tel ?? "",
        [S.unconnected.col.email]: r.email ?? "",
        [S.unconnected.col.manzil]: r.manzil ?? "",
        [S.unconnected.col.status]: META[o.status].label,
        [S.unconnected.col.contract]: o.contract ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 5 }, { wch: 44 }, { wch: 22 }, { wch: 12 }, { wch: 26 },
      { wch: 16 }, { wch: 22 }, { wch: 40 }, { wch: 16 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, S.unconnected.sheet);
    XLSX.writeFile(wb, `${exportName}.xlsx`);
  }

  return (
    <div className="card overflow-hidden">
      {/* controls */}
      <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={S.unconnected.search}
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3.5 py-2 text-[0.85rem] outline-none focus:border-sov focus:bg-surface"
        />
        {regions && regions.length > 0 && (
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[0.82rem] font-medium outline-none focus:border-sov"
          >
            <option value={ALL}>{S.unconnected.allRegions}</option>
            {regions.map((r) => (
              // value stays the canonical name — only the label is translated
              <option key={r} value={r}>{regionLabel(r, lang)}</option>
            ))}
          </select>
        )}
        {statuses && statuses.length > 1 && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[0.82rem] font-medium outline-none focus:border-sov"
          >
            <option value={ALL}>{S.unconnected.allStatuses}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{META[s].label}</option>
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
          {S.unconnected.export}
        </button>
      </div>

      {/* count */}
      <div className="flex items-center justify-between px-4 py-2 text-[0.75rem] text-ink-faint">
        <span className="tnum font-medium text-ink-soft">
          {S.unconnected.count(filtered.length)}
        </span>
      </div>

      {/* table */}
      <div className="scroll-quiet max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-left text-[0.82rem]">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-y border-line text-[0.7rem] uppercase tracking-wide text-ink-faint">
              <th className="w-10 px-3 py-2.5 font-medium">{S.unconnected.col.n}</th>
              <th className="px-3 py-2.5 font-medium">{S.unconnected.col.name}</th>
              {regions && (
                <th className="hidden px-3 py-2.5 font-medium md:table-cell">
                  {S.unconnected.col.region}
                </th>
              )}
              <th className="px-3 py-2.5 font-medium">{S.unconnected.col.stir}</th>
              <th className="hidden px-3 py-2.5 font-medium lg:table-cell">
                {S.unconnected.col.rahbar}
              </th>
              <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                {S.unconnected.col.tel}
              </th>
              {showStatus && (
                <th className="px-3 py-2.5 font-medium">{S.unconnected.col.status}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => {
              const r = registry[o.stir];
              return (
                <tr
                  key={`${o.stir}-${i}`}
                  className="border-b border-line-soft align-top hover:bg-paper"
                >
                  <td className="tnum px-3 py-2.5 text-ink-faint">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="max-w-[34ch] font-medium leading-snug sm:max-w-[48ch]">
                      {o.name}
                    </div>
                    {r?.manzil && (
                      <div className="mt-0.5 max-w-[48ch] truncate text-[0.72rem] text-ink-faint">
                        {r.manzil}
                      </div>
                    )}
                  </td>
                  {regions && (
                    <td className="hidden px-3 py-2.5 text-ink-soft md:table-cell">
                      {regionLabel(o.region, lang)}
                    </td>
                  )}
                  <td className="tnum px-3 py-2.5 text-ink-soft">{o.stir}</td>
                  <td className="hidden px-3 py-2.5 text-ink-soft lg:table-cell">
                    {r?.rahbar || (
                      <span className="text-ink-faint/70">{S.unconnected.noContact}</span>
                    )}
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-ink-soft sm:table-cell">
                    {r?.tel || (
                      <span className="text-ink-faint/70">{S.unconnected.noContact}</span>
                    )}
                  </td>
                  {showStatus && (
                    <td className="px-3 py-2.5">
                      <StatusPill status={o.status} />
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-faint">
                  {S.unconnected.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
