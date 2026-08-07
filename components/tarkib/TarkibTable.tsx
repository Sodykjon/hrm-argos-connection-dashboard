"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TarkibRegion } from "@/lib/tarkib";
import {
  taminlShare,
  vakShare,
  vrachTaminlShare,
  risk5Share,
} from "@/lib/tarkib";
import { coverageRamp, coverageT, coverageColor } from "./TarkibMap";
import { fmtInt, fmtPct, toPct } from "@/lib/format";
import { regionSlug, regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

export function TarkibTable({
  regions,
  national,
  exportName,
}: {
  regions: Array<{ name: string; region: TarkibRegion }>;
  national: TarkibRegion;
  exportName: string;
}) {
  const S = useS();
  const lang = useLang();
  const [asc, setAsc] = useState(true); // worst coverage first

  const enriched = useMemo(
    () =>
      regions.map((r) => ({
        ...r,
        vrach: vrachTaminlShare(r.region),
        r5: risk5Share(r.region),
      })),
    [regions],
  );

  const sorted = useMemo(
    () =>
      [...enriched].sort((a, b) => (asc ? a.vrach - b.vrach : b.vrach - a.vrach)),
    [enriched, asc],
  );

  const ramp = useMemo(
    () => coverageRamp(enriched.map((r) => r.vrach)),
    [enriched],
  );

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const row = (name: string, r: TarkibRegion) => ({
      [S.tarkib.col.region]: name,
      [S.tarkib.col.shtat]: r.shtat,
      [S.tarkib.col.bosh]: r.bosh,
      [S.tarkib.col.vak]: toPct(vakShare(r)),
      [S.tarkib.col.jismoniy]: r.jismoniy,
      [S.tarkib.col.taminl]: toPct(taminlShare(r)),
      [S.tarkib.col.vrach]: toPct(vrachTaminlShare(r)),
      [S.tarkib.col.r5]: toPct(risk5Share(r)),
      [S.tarkib.col.sof]: r.qabul - r.boshagan,
    });
    const data = sorted.map(({ name, region }) =>
      row(regionLabel(name, lang), region),
    );
    data.push(row(S.tarkib.totalRow, national));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 34 }, { wch: 12 }, { wch: 10 }, { wch: 9 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, S.tarkib.sheet);
    XLSX.writeFile(wb, `${exportName}.xlsx`);
  }

  const natSof = national.qabul - national.boshagan;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line p-3 sm:p-4">
        <h2 className="text-[0.95rem] font-semibold">{S.tarkib.tableTitle}</h2>
        <button
          onClick={exportXlsx}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sov px-4 py-2 text-[0.82rem] font-semibold text-white transition-colors hover:bg-sov-deep"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 1.5v8m0 0 3-3m-3 3-3-3M2.5 12v1.5A1 1 0 0 0 3.5 14.5h9a1 1 0 0 0 1-1V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {S.tarkib.export}
        </button>
      </div>

      <div className="scroll-quiet overflow-auto">
        <table className="w-full border-collapse text-left text-[0.82rem]">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-y border-line text-[0.7rem] uppercase tracking-wide text-ink-faint">
              <th className="w-10 px-3 py-2.5 font-medium">{S.tarkib.col.n}</th>
              <th className="px-3 py-2.5 font-medium">{S.tarkib.col.region}</th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                {S.tarkib.col.shtat}
              </th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium lg:table-cell">
                {S.tarkib.col.vak}
              </th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium sm:table-cell">
                {S.tarkib.col.jismoniy}
              </th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium md:table-cell">
                {S.tarkib.col.taminl}
              </th>
              <th className="px-3 py-2.5 font-medium">
                <button
                  onClick={() => setAsc((v) => !v)}
                  className="inline-flex items-center gap-1 hover:text-ink"
                >
                  {S.tarkib.col.vrach}
                  <span className="text-[0.9em]">{asc ? "↑" : "↓"}</span>
                </button>
              </th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium md:table-cell">
                {S.tarkib.col.r5}
              </th>
              <th className="tnum hidden px-3 py-2.5 text-right font-medium lg:table-cell">
                {S.tarkib.col.sof}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const color = coverageColor(coverageT(r.vrach, ramp));
              const width =
                ramp.max > 0 ? Math.min(100, (r.vrach / ramp.max) * 100) : 0;
              const sof = r.region.qabul - r.region.boshagan;
              return (
                <tr
                  key={r.name}
                  className="border-b border-line-soft align-top hover:bg-paper"
                >
                  <td className="tnum px-3 py-2.5 text-ink-faint">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/tarkib/${regionSlug(r.name)}`}
                      className="font-medium leading-snug text-sov hover:text-sov-deep"
                    >
                      {regionLabel(r.name, lang)}
                    </Link>
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink-soft sm:table-cell">
                    {fmtInt(r.region.shtat)}
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink-soft lg:table-cell">
                    {fmtPct(vakShare(r.region), 1)}
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink-soft sm:table-cell">
                    {fmtInt(r.region.jismoniy)}
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink-soft md:table-cell">
                    {fmtPct(taminlShare(r.region), 1)}
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
                        {fmtPct(r.vrach, 1)}
                      </span>
                    </div>
                  </td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink-soft md:table-cell">
                    {fmtPct(r.r5, 1)}
                  </td>
                  <td
                    className={`tnum hidden px-3 py-2.5 text-right lg:table-cell ${
                      sof < 0 ? "text-un" : "text-ink-soft"
                    }`}
                  >
                    {sof < 0 ? `−${fmtInt(-sof)}` : `+${fmtInt(sof)}`}
                  </td>
                </tr>
              );
            })}

            <tr className="border-t border-line bg-paper font-semibold">
              <td className="px-3 py-2.5" />
              <td className="px-3 py-2.5">{S.tarkib.totalRow}</td>
              <td className="tnum hidden px-3 py-2.5 text-right sm:table-cell">
                {fmtInt(national.shtat)}
              </td>
              <td className="tnum hidden px-3 py-2.5 text-right lg:table-cell">
                {fmtPct(vakShare(national), 1)}
              </td>
              <td className="tnum hidden px-3 py-2.5 text-right sm:table-cell">
                {fmtInt(national.jismoniy)}
              </td>
              <td className="tnum hidden px-3 py-2.5 text-right md:table-cell">
                {fmtPct(taminlShare(national), 1)}
              </td>
              <td className="tnum px-3 py-2.5">
                {fmtPct(vrachTaminlShare(national), 1)}
              </td>
              <td className="tnum hidden px-3 py-2.5 text-right md:table-cell">
                {fmtPct(risk5Share(national), 1)}
              </td>
              <td className="tnum hidden px-3 py-2.5 text-right lg:table-cell">
                {natSof < 0 ? `−${fmtInt(-natSof)}` : `+${fmtInt(natSof)}`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
