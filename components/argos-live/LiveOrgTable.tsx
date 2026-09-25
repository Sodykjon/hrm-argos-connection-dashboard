"use client";

import { useMemo, useState } from "react";
import type { LiveStatus, Reason } from "@/lib/argos-live";
import { fmtInt } from "@/lib/format";
import { regionLabel } from "@/lib/regions";
import { StatusPill } from "@/components/StatusPill";
import { useS, useLang } from "@/lib/i18n/client";

export interface LiveOrgRow {
  region: string;
  district: string | null;
  name: string;
  stir: string | null;
  status: LiveStatus;
  billing: 0 | 1 | null;
  reason: Reason;
}

const ALL = "__all__";
const PAGE = 300;

export function LiveOrgTable({
  rows,
  showRegion,
  filters = true,
}: {
  rows: LiveOrgRow[];
  showRegion?: boolean;
  filters?: boolean;
}) {
  const S = useS();
  const L = S.argosLive;
  const lang = useLang();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL);
  const [district, setDistrict] = useState(ALL);
  const [limit, setLimit] = useState(PAGE);

  const districts = useMemo(
    () => [...new Set(rows.map((r) => r.district).filter((d): d is string => !!d))],
    [rows],
  );
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === ALL || r.status === status) &&
        (district === ALL || r.district === district) &&
        (!n || r.name.toLowerCase().includes(n) || (r.stir ?? "").includes(n)),
    );
  }, [rows, q, status, district]);

  const billing = (b: 0 | 1 | null) =>
    b === null ? (
      <span className="text-ink-faint">{L.notInTree}</span>
    ) : b ? (
      <span className="text-ul">{L.billingOn}</span>
    ) : (
      <span className="text-un">{L.billingOff}</span>
    );

  return (
    <div>
      {filters && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:px-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={L.search}
            className="min-w-[220px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-[0.82rem] outline-none focus:border-sov"
          />
          {districts.length > 1 && (
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-[0.82rem] font-medium outline-none focus:border-sov"
            >
              <option value={ALL}>{L.col.district}</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[0.82rem] font-medium outline-none focus:border-sov"
          >
            <option value={ALL}>{L.allStatuses}</option>
            <option value="ulangan">{S.status.ulangan}</option>
            <option value="ulanmagan">{S.status.ulanmagan}</option>
            <option value="ochirilgan">{S.status.ochirilganShort}</option>
          </select>
          <span className="tnum text-[0.75rem] text-ink-faint">
            {L.shown(fmtInt(Math.min(limit, filtered.length)), fmtInt(filtered.length))}
          </span>
        </div>
      )}
      <div className="scroll-quiet overflow-x-auto">
        <table className="w-full border-collapse text-left text-[0.8rem]">
          <thead>
            <tr className="border-b border-line text-[0.68rem] uppercase tracking-wide text-ink-faint">
              {showRegion && <th className="px-3 py-2 font-medium sm:pl-4">{L.col.region}</th>}
              <th className={`px-3 py-2 font-medium ${showRegion ? "" : "sm:pl-4"}`}>{L.col.district}</th>
              <th className="px-3 py-2 font-medium">{L.col.name}</th>
              <th className="tnum px-3 py-2 font-medium">{L.col.stir}</th>
              <th className="px-3 py-2 font-medium">{L.col.status}</th>
              <th className="px-3 py-2 font-medium">{L.col.billing}</th>
              <th className="px-3 py-2 font-medium sm:pr-4">{L.col.reason}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, limit).map((r, i) => (
              <tr key={`${r.stir}-${r.name}-${i}`} className="border-b border-line-soft hover:bg-paper">
                {showRegion && <td className="px-3 py-1.5 text-ink-soft sm:pl-4">{regionLabel(r.region, lang)}</td>}
                <td className={`px-3 py-1.5 text-ink-soft ${showRegion ? "" : "sm:pl-4"}`}>{r.district ?? "—"}</td>
                <td className="px-3 py-1.5">{r.name}</td>
                <td className="tnum px-3 py-1.5 text-ink-soft">{r.stir ?? "—"}</td>
                <td className="px-3 py-1.5">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-3 py-1.5">{billing(r.billing)}</td>
                <td className="px-3 py-1.5 text-[0.75rem] text-ink-faint sm:pr-4">{L.reasons[r.reason]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > limit && (
        <div className="p-3 text-center">
          <button
            onClick={() => setLimit((l) => l + PAGE)}
            className="rounded-lg border border-line px-4 py-1.5 text-[0.8rem] font-medium text-sov hover:bg-paper"
          >
            + {fmtInt(Math.min(PAGE, filtered.length - limit))}
          </button>
        </div>
      )}
    </div>
  );
}
