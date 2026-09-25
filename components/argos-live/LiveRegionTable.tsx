"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Counts } from "@/lib/argos-live";
import { fmtInt, fmtPct, rampColor } from "@/lib/format";
import { regionLabel } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

export interface LiveRegionRow extends Counts {
  name: string;
  href?: string;
}

/** Worst-first region (or district) table; the ЖАМИ row renders the given totals. */
export function LiveRegionTable({
  title,
  hint,
  rows,
  totals,
  isDistrict,
  exportHref,
}: {
  title: string;
  hint?: string;
  rows: LiveRegionRow[];
  totals: Counts;
  isDistrict?: boolean;
  exportHref?: string;
}) {
  const S = useS();
  const lang = useLang();
  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.percent - b.percent || b.total - a.total),
    [rows],
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3 sm:p-4">
        <div>
          <h2 className="text-[0.95rem] font-semibold">{title}</h2>
          {hint && <p className="text-[0.75rem] text-ink-faint">{hint}</p>}
        </div>
        {exportHref && (
          <a
            href={exportHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sov px-4 py-2 text-[0.82rem] font-semibold text-white transition-colors hover:bg-sov-deep"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 1.5v8m0 0 3-3m-3 3-3-3M2.5 12v1.5A1 1 0 0 0 3.5 14.5h9a1 1 0 0 0 1-1V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {S.argosLive.export}
          </a>
        )}
      </div>
      <div className="scroll-quiet overflow-x-auto">
        <table className="w-full border-collapse text-left text-[0.82rem]">
          <thead>
            <tr className="border-b border-line text-[0.7rem] uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2.5 font-medium sm:px-4">
                {isDistrict ? S.argosLive.col.district : S.argosLive.col.region}
              </th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{S.overview.col.total}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{S.status.ulangan}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{S.overview.col.percent}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{S.status.ulanmagan}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium sm:pr-4">{S.status.ochirilganShort}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const label = isDistrict ? r.name : regionLabel(r.name, lang);
              return (
                <tr key={r.name} className="border-b border-line-soft hover:bg-paper">
                  <td className="px-3 py-2 font-medium sm:px-4">
                    {r.href ? (
                      <Link href={r.href} className="text-sov hover:text-sov-deep hover:underline">
                        {label}
                      </Link>
                    ) : (
                      label
                    )}
                  </td>
                  <td className="tnum px-3 py-2 text-right text-ink-soft">{fmtInt(r.total)}</td>
                  <td className="tnum px-3 py-2 text-right text-ul">{fmtInt(r.ulangan)}</td>
                  <td className="tnum px-3 py-2 text-right font-semibold" style={{ color: rampColor(r.percent) }}>
                    {fmtPct(r.percent, 1)}
                  </td>
                  <td className={`tnum px-3 py-2 text-right ${r.ulanmagan > 0 ? "font-medium text-un" : "text-ink-faint"}`}>
                    {fmtInt(r.ulanmagan)}
                  </td>
                  <td className="tnum px-3 py-2 text-right text-ink-soft sm:pr-4">{fmtInt(r.ochirilgan)}</td>
                </tr>
              );
            })}
            <tr className="border-t border-line bg-paper/70 font-semibold">
              <td className="px-3 py-2.5 sm:px-4">{S.units.totalRow}</td>
              <td className="tnum px-3 py-2.5 text-right">{fmtInt(totals.total)}</td>
              <td className="tnum px-3 py-2.5 text-right text-ul">{fmtInt(totals.ulangan)}</td>
              <td className="tnum px-3 py-2.5 text-right" style={{ color: rampColor(totals.percent) }}>
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
