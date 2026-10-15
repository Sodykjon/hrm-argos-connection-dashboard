"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { TAQ_STATUSES, type TaqCounts, type TaqDistrict, type TaqOrg, type TaqRegion, type TaqStatus } from "@/lib/taqsimlash";
import { fmtInt, fmtPct, rampCss } from "@/lib/format";
import { regionLabel } from "@/lib/regions";
import { useLang, useS } from "@/lib/i18n/client";

type Filter = "all" | TaqStatus;

const SEP = "\u0000";
const COLS = 7;

const PILL: Record<TaqStatus, string> = {
  otkazilgan: "bg-ul-soft text-ul",
  ttbda: "bg-un-soft text-un",
  stirYoq: "bg-goal-soft text-warn",
  daraxtdaYoq: "bg-och-soft text-ink-soft",
};
const DOT: Record<TaqStatus, string> = {
  otkazilgan: "bg-ul",
  ttbda: "bg-un",
  stirYoq: "bg-warn",
  daraxtdaYoq: "bg-och",
};

export function TaqPill({ status }: { status: TaqStatus }) {
  const T = useS().taqsimlash;
  return (
    <span
      title={T.statusHint[status]}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium ${PILL[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      {T.status[status]}
    </span>
  );
}

/** Region → district (TTB) → institutions, with search and a status filter. */
export function TaqsimTree({ regions, exportHref }: { regions: TaqRegion[]; exportHref?: string }) {
  const S = useS();
  const T = S.taqsimlash;
  const C = T.table;
  const lang = useLang();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openR, setOpenR] = useState<Set<string>>(() => new Set());
  const [openD, setOpenD] = useState<Set<string>>(() => new Set());

  const totals = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, otkazilgan: 0, ttbda: 0, stirYoq: 0, daraxtdaYoq: 0 };
    for (const r of regions) {
      c.all += r.total;
      for (const s of TAQ_STATUSES) c[s] += r[s];
    }
    return c;
  }, [regions]);

  const needle = fold(q.trim());
  const active = needle !== "" || filter !== "all";

  const view = useMemo(() => {
    const keep = (o: TaqOrg, d: string) =>
      (filter === "all" || o.status === filter) &&
      (!needle || fold(o.name).includes(needle) || (o.stir ?? "").includes(needle) || fold(d).includes(needle));
    return regions
      .map((r) => ({
        ...r,
        districts: r.districts
          .map((d) => ({ ...d, shown: active ? d.orgs.filter((o) => keep(o, d.name)) : d.orgs }))
          .filter((d) => !active || d.shown.length > 0),
      }))
      .filter((r) => !active || r.districts.length > 0);
  }, [regions, needle, filter, active]);

  const isOpenR = (k: string) => active || openR.has(k);
  const isOpenD = (k: string) => active || openD.has(k);
  const nShown = view.reduce((s, r) => s + r.districts.reduce((t, d) => t + d.shown.length, 0), 0);

  const chips: { key: Filter; label: string; tone: string }[] = [
    { key: "all", label: C.all, tone: "" },
    { key: "ttbda", label: T.status.ttbda, tone: "text-un" },
    { key: "otkazilgan", label: T.status.otkazilgan, tone: "text-ul" },
    { key: "stirYoq", label: T.status.stirYoq, tone: "text-warn" },
    { key: "daraxtdaYoq", label: T.status.daraxtdaYoq, tone: "text-ink-soft" },
  ];

  return (
    <section className="card overflow-hidden">
      <div className="space-y-3 border-b border-line p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[0.95rem] font-semibold">{C.title}</h2>
            <p className="max-w-[760px] text-[0.75rem] text-ink-faint">{C.hint}</p>
          </div>
          {exportHref && (
            <a
              href={exportHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sov px-4 py-2 text-[0.82rem] font-semibold text-on-sov transition-colors hover:bg-sov-deep"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 1.5v8m0 0 3-3m-3 3-3-3M2.5 12v1.5A1 1 0 0 0 3.5 14.5h9a1 1 0 0 0 1-1V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {C.export}
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.5" />
              <path d="m10.6 10.6 3.4 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={C.search}
              aria-label={C.search}
              className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-8 text-[0.82rem] outline-none focus:border-sov"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="×" className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-ink-faint hover:text-ink">
                ×
              </button>
            )}
          </div>
          {!active && (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setOpenR(new Set(regions.map((r) => r.name)));
                  setOpenD(new Set(regions.flatMap((r) => r.districts.map((d) => r.name + SEP + d.name))));
                }}
                className="rounded-lg border border-line px-3 py-2 text-[0.78rem] font-medium text-ink-soft hover:bg-paper"
              >
                {C.expandAll}
              </button>
              <button
                onClick={() => {
                  setOpenR(new Set());
                  setOpenD(new Set());
                }}
                className="rounded-lg border border-line px-3 py-2 text-[0.78rem] font-medium text-ink-soft hover:bg-paper"
              >
                {C.collapseAll}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={C.status}>
          {chips.map((c) => (
            <button
              key={c.key}
              aria-pressed={filter === c.key}
              title={c.key === "all" ? undefined : T.statusHint[c.key]}
              onClick={() => setFilter(c.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.78rem] font-medium transition-colors ${
                filter === c.key ? "bg-sov text-on-sov" : "border border-line text-ink-soft hover:bg-paper"
              }`}
            >
              {c.label}
              <span className={`tnum rounded-full px-1.5 text-[0.75rem] ${filter === c.key ? "bg-white/25" : `bg-paper ${c.tone}`}`}>
                {fmtInt(totals[c.key])}
              </span>
            </button>
          ))}
          {active && <span className="tnum ml-1 text-[0.75rem] text-ink-faint">{C.matches(fmtInt(nShown))}</span>}
        </div>
      </div>

      <div className="scroll-quiet overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-[0.82rem]">
          <thead>
            <tr className="border-b border-line text-[0.75rem] uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2.5 font-medium sm:px-4">{C.region}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{C.total}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{C.done}</th>
              <th className="tnum w-[170px] px-3 py-2.5 text-right font-medium">{C.percent}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{C.ttbda}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{C.stirYoq}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium sm:pr-4">{C.staff}</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr>
                <td colSpan={COLS} className="p-6 text-center text-[0.85rem] text-ink-faint">
                  {C.nothing}
                </td>
              </tr>
            )}
            {view.map((r) => {
              const ro = isOpenR(r.name);
              return (
                <Fragment key={r.name}>
                  <SummaryRow
                    c={r}
                    depth={0}
                    open={ro}
                    onToggle={active ? undefined : () => setOpenR(flip(openR, r.name))}
                    label={<span className="font-semibold">{regionLabel(r.name, lang)}</span>}
                  />
                  {ro &&
                    r.districts.map((d) => {
                      const key = r.name + SEP + d.name;
                      const dop = isOpenD(key);
                      return (
                        <Fragment key={key}>
                          <SummaryRow
                            c={d}
                            depth={1}
                            open={dop}
                            onToggle={active ? undefined : () => setOpenD(flip(openD, key))}
                            label={<DistrictLabel d={d} />}
                          />
                          {dop && (
                            <tr>
                              <td colSpan={COLS} className="p-0">
                                <OrgTable orgs={d.shown} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                </Fragment>
              );
            })}
            {!active && (
              <tr className="border-t border-line bg-paper/70 font-semibold">
                <td className="px-3 py-2.5 sm:px-4">{S.units.totalRow}</td>
                <CountCells c={sum(regions)} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DistrictLabel({ d }: { d: TaqDistrict }) {
  const C = useS().taqsimlash.table;
  const left = d.parents.reduce<number | null>((s, p) => (p.staff === null ? s : (s ?? 0) + p.staff), null);
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span>{d.name}</span>
      {left !== null && (
        <span
          title={d.parents.map((p) => `${p.name}${p.staff === null ? "" : `: ${fmtInt(p.staff)}`}`).join("\n")}
          className={`tnum text-[0.75rem] ${left > 0 ? "text-un" : "text-ink-faint"}`}
        >
          {C.parentStaff}: {fmtInt(left)}
        </span>
      )}
    </span>
  );
}

// Registry names mix ʻ ʼ ’ ‘ ` and ' — «Qoʻshkoʻpir» must find «Qo'shko'pir».
function fold(x: string) {
  return x.toLowerCase().replace(/[ʻʼ‘’`']/g, "'");
}

function flip(set: ReadonlySet<string>, key: string) {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function sum(regions: TaqRegion[]): TaqCounts {
  const c: TaqCounts = { total: 0, otkazilgan: 0, ttbda: 0, stirYoq: 0, daraxtdaYoq: 0, staff: 0, percent: 0 };
  for (const r of regions) {
    c.total += r.total;
    c.otkazilgan += r.otkazilgan;
    c.ttbda += r.ttbda;
    c.stirYoq += r.stirYoq;
    c.daraxtdaYoq += r.daraxtdaYoq;
    c.staff += r.staff;
  }
  c.percent = c.total ? c.otkazilgan / c.total : 0;
  return c;
}

function CountCells({ c }: { c: TaqCounts }) {
  const color = rampCss(c.percent);
  return (
    <>
      <td className="tnum px-3 py-2 text-right text-ink-soft">{fmtInt(c.total)}</td>
      <td className="tnum px-3 py-2 text-right text-ul">{fmtInt(c.otkazilgan)}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-2">
          <span className="hidden h-1.5 w-[72px] overflow-hidden rounded-full bg-line-soft sm:block" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${c.percent * 100}%`, background: color }} />
          </span>
          <span className="tnum w-[52px] text-right font-semibold" style={{ color }}>
            {fmtPct(c.percent, 1)}
          </span>
        </div>
      </td>
      <td className={`tnum px-3 py-2 text-right ${c.ttbda > 0 ? "font-medium text-un" : "text-ink-faint"}`}>{fmtInt(c.ttbda)}</td>
      <td className={`tnum px-3 py-2 text-right ${c.stirYoq > 0 ? "text-warn" : "text-ink-faint"}`}>{fmtInt(c.stirYoq)}</td>
      <td className="tnum px-3 py-2 text-right text-ink-soft sm:pr-4">{fmtInt(c.staff)}</td>
    </>
  );
}

function SummaryRow({
  c,
  depth,
  open,
  onToggle,
  label,
}: {
  c: TaqCounts;
  depth: 0 | 1;
  open: boolean;
  onToggle?: () => void;
  label: ReactNode;
}) {
  return (
    <tr
      className={`border-b border-line-soft ${onToggle ? "cursor-pointer" : ""} ${
        depth === 0 ? "hover:bg-paper" : "bg-paper/40 text-[0.8rem] hover:bg-paper"
      }`}
      onClick={onToggle}
    >
      <td className={`py-2 pr-3 ${depth === 0 ? "pl-3 sm:pl-4" : "pl-8 sm:pl-10"}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={open}
            disabled={!onToggle}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            className="grid h-6 w-6 shrink-0 place-items-center rounded text-ink-faint hover:bg-line-soft hover:text-ink disabled:opacity-40"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden className={`transition-transform ${open ? "rotate-90" : ""}`}>
              <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="min-w-0">{label}</div>
        </div>
      </td>
      <CountCells c={c} />
    </tr>
  );
}

function OrgTable({ orgs }: { orgs: TaqOrg[] }) {
  const C = useS().taqsimlash.table;
  return (
    <div className="border-b border-line bg-surface pl-6 sm:pl-8">
      <table className="w-full min-w-[700px] table-fixed border-collapse text-left text-[0.78rem]">
        <colgroup>
          <col className="w-12" />
          <col />
          <col className="w-[132px]" />
          <col className="w-[110px]" />
          <col className="w-[150px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-line-soft text-[0.75rem] uppercase tracking-wide text-ink-faint">
            <th className="tnum px-3 py-1.5 text-right font-medium">{C.no}</th>
            <th className="px-3 py-1.5 font-medium">{C.org}</th>
            <th className="tnum px-3 py-1.5 font-medium">{C.stir}</th>
            <th className="tnum px-3 py-1.5 text-right font-medium">{C.staff}</th>
            <th className="px-3 py-1.5 font-medium sm:pr-4">{C.status}</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o, i) => (
            <tr key={i} className="border-b border-line-soft align-top last:border-b-0">
              <td className="tnum px-3 py-1.5 text-right text-ink-faint">{i + 1}</td>
              <td className="px-3 py-1.5 text-ink">
                {o.name}
                {o.pilot && <span className="ml-1.5 rounded-full bg-sov-soft px-1.5 py-0.5 text-[0.7rem] text-sov">{C.pilot}</span>}
              </td>
              <td className="tnum whitespace-nowrap px-3 py-1.5 text-ink-soft">{o.stir ?? "—"}</td>
              <td className={`tnum px-3 py-1.5 text-right ${o.staff ? "font-medium text-ink" : "text-ink-faint"}`}>
                {o.staff === null ? "—" : fmtInt(o.staff)}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 sm:pr-4">
                <TaqPill status={o.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
