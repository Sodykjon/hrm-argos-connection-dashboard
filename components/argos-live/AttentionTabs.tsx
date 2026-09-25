"use client";

import { useState } from "react";
import type { StirGroup } from "@/lib/argos-live";
import { fmtInt } from "@/lib/format";
import { regionLabel } from "@/lib/regions";
import { StatusPill } from "@/components/StatusPill";
import { useS, useLang } from "@/lib/i18n/client";
import { LiveOrgTable, type LiveOrgRow } from "./LiveOrgTable";

type Tab = "newConn" | "billingOff" | "missing" | "stir" | "extra";

export function AttentionTabs({
  newConn,
  billingOff,
  missing,
  stirGroups,
  extra,
}: {
  newConn: LiveOrgRow[];
  billingOff: LiveOrgRow[];
  missing: LiveOrgRow[];
  stirGroups: StirGroup[];
  extra: { tin: string; billing: 0 | 1; label: string }[];
}) {
  const S = useS();
  const A = S.argosLive.attention;
  const lang = useLang();
  const [tab, setTab] = useState<Tab>("newConn");
  const [open, setOpen] = useState<string | null>(null);

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: "newConn", label: A.newConn, n: newConn.length },
    { key: "billingOff", label: A.billingOff, n: billingOff.length },
    { key: "missing", label: A.missing, n: missing.length },
    { key: "stir", label: A.stir, n: stirGroups.length },
    { key: "extra", label: A.extra, n: extra.length },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line p-3 sm:px-4">
        <h2 className="text-[0.95rem] font-semibold">{A.title}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.78rem] font-medium transition-colors ${
                tab === t.key ? "bg-sov text-white" : "border border-line text-ink-soft hover:bg-paper"
              }`}
            >
              {t.label}
              <span className={`tnum rounded-full px-1.5 text-[0.7rem] ${tab === t.key ? "bg-white/20" : "bg-paper"}`}>
                {fmtInt(t.n)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {tab === "newConn" && <List rows={newConn} none={A.none} />}
      {tab === "billingOff" && <List rows={billingOff} none={A.none} />}
      {tab === "missing" && <List rows={missing} none={A.none} />}

      {tab === "stir" && (
        <div>
          <p className="border-b border-line-soft px-3 py-2 text-[0.78rem] text-ink-soft sm:px-4">{A.stirHint}</p>
          <table className="w-full border-collapse text-left text-[0.8rem]">
            <thead>
              <tr className="border-b border-line text-[0.68rem] uppercase tracking-wide text-ink-faint">
                <th className="px-3 py-2 font-medium sm:pl-4">{S.argosLive.col.region}</th>
                <th className="px-3 py-2 font-medium">{S.argosLive.col.district}</th>
                <th className="tnum px-3 py-2 font-medium">{S.argosLive.col.stir}</th>
                <th className="px-3 py-2 font-medium">{S.argosLive.col.name}</th>
                <th className="tnum px-3 py-2 text-right font-medium sm:pr-4">{S.argosLive.col.rows}</th>
              </tr>
            </thead>
            <tbody>
              {stirGroups.map((g) => (
                <FragmentRow
                  key={g.stir}
                  g={g}
                  open={open === g.stir}
                  toggle={() => setOpen(open === g.stir ? null : g.stir)}
                  regionName={regionLabel(g.region, lang)}
                  mixedLabel={A.mixed}
                  notInTree={S.argosLive.notInTree}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "extra" &&
        (extra.length ? (
          <table className="w-full border-collapse text-left text-[0.8rem]">
            <thead>
              <tr className="border-b border-line text-[0.68rem] uppercase tracking-wide text-ink-faint">
                <th className="tnum px-3 py-2 font-medium sm:pl-4">{S.argosLive.col.stir}</th>
                <th className="px-3 py-2 font-medium">{S.argosLive.col.name}</th>
                <th className="px-3 py-2 font-medium sm:pr-4">{S.argosLive.col.billing}</th>
              </tr>
            </thead>
            <tbody>
              {extra.map((e) => (
                <tr key={e.tin} className="border-b border-line-soft hover:bg-paper">
                  <td className="tnum px-3 py-1.5 text-ink-soft sm:pl-4">{e.tin}</td>
                  <td className="px-3 py-1.5">{e.label || "—"}</td>
                  <td className={`px-3 py-1.5 sm:pr-4 ${e.billing ? "text-ul" : "text-un"}`}>
                    {e.billing ? S.argosLive.billingOn : S.argosLive.billingOff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-[0.82rem] text-ink-faint">{A.none}</p>
        ))}
    </div>
  );
}

function List({ rows, none }: { rows: LiveOrgRow[]; none: string }) {
  if (!rows.length) return <p className="p-4 text-[0.82rem] text-ink-faint">{none}</p>;
  return <LiveOrgTable rows={rows} showRegion />;
}

function FragmentRow({
  g,
  open,
  toggle,
  regionName,
  mixedLabel,
  notInTree,
}: {
  g: StirGroup;
  open: boolean;
  toggle: () => void;
  regionName: string;
  mixedLabel: string;
  notInTree: string;
}) {
  return (
    <>
      <tr className="cursor-pointer border-b border-line-soft hover:bg-paper" onClick={toggle}>
        <td className="px-3 py-1.5 text-ink-soft sm:pl-4">{regionName}</td>
        <td className="px-3 py-1.5 text-ink-soft">{g.district ?? "—"}</td>
        <td className="tnum px-3 py-1.5">{g.stir}</td>
        <td className="px-3 py-1.5">
          <span className="mr-1 text-ink-faint">{open ? "▾" : "▸"}</span>
          {g.names[0]}
          {g.mixed && <span className="ml-2 rounded-full bg-un-soft px-2 py-0.5 text-[0.7rem] text-un">{mixedLabel}</span>}
          {!g.inTree && <span className="ml-2 rounded-full bg-och-soft px-2 py-0.5 text-[0.7rem] text-ink-soft">{notInTree}</span>}
        </td>
        <td className="tnum px-3 py-1.5 text-right font-semibold sm:pr-4">{g.names.length}</td>
      </tr>
      {open &&
        g.names.map((n, i) => (
          <tr key={i} className="border-b border-line-soft bg-paper/60 text-[0.78rem]">
            <td colSpan={3} />
            <td className="px-3 py-1">{n}</td>
            <td className="px-3 py-1 text-right sm:pr-4">
              <StatusPill status={g.statuses[i]} />
            </td>
          </tr>
        ))}
    </>
  );
}
