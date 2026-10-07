"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import type { Counts, LiveStatus } from "@/lib/argos-live";
import type { TreeOrg, TreeRegion } from "@/lib/argos-live-view";
import { fmtInt, fmtPct, rampCss } from "@/lib/format";
import { isRepublic, regionLabel, regionSlug } from "@/lib/regions";
import { StatusPill } from "@/components/StatusPill";
import { useLang, useS } from "@/lib/i18n/client";

type Filter = "all" | LiveStatus | "changed";
type Sort = "excel" | "pct";

const SEP = "\u0000";
const COLS = 6;
const EMPTY: ReadonlySet<string> = new Set();

/**
 * The registry workbook as an expandable table: region (or the republican
 * sheet) → district / republican system → organisations, in workbook order.
 * `single` renders one region's groups as the top level (region page).
 */
export function LiveTree({
  regions,
  single,
  exportHref,
}: {
  regions: TreeRegion[];
  single?: boolean;
  exportHref?: string;
}) {
  const S = useS();
  const L = S.argosLive;
  const T = L.tree;
  const lang = useLang();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("excel");
  const [openR, setOpenR] = useState<Set<string>>(() => new Set());
  const [openG, setOpenG] = useState<Set<string>>(() => new Set());
  // While searching/filtering every matching row starts open; these hold the
  // rows the user folded since, tagged with the query they belong to so a new
  // query opens everything again.
  const [shut, setShut] = useState<{ sig: string; r: ReadonlySet<string>; g: ReadonlySet<string> }>(() => ({
    sig: "",
    r: EMPTY,
    g: EMPTY,
  }));

  const all = useMemo(() => regions.flatMap((r) => r.groups.flatMap((g) => g.orgs)), [regions]);
  const totals = useMemo(() => sumCounts(regions), [regions]);
  const nChanged = useMemo(() => all.filter((o) => o.ch !== 0).length, [all]);

  const needle = q.trim().toLowerCase();
  const active = needle !== "" || filter !== "all";

  const view = useMemo(() => {
    const keep = (o: TreeOrg, g: string) =>
      (filter === "all" || (filter === "changed" ? o.ch !== 0 : o.status === filter)) &&
      (!needle ||
        o.name.toLowerCase().includes(needle) ||
        (o.stir ?? "").includes(needle) ||
        g.toLowerCase().includes(needle) ||
        (o.hudud ?? "").toLowerCase().includes(needle));
    const order = <X extends Counts>(xs: X[]) =>
      sort === "pct" ? [...xs].sort((a, b) => a.percent - b.percent || b.total - a.total) : xs;
    return order(
      regions
        .map((r) => ({
          ...r,
          groups: order(
            r.groups
              .map((g) => ({ ...g, shown: active ? g.orgs.filter((o) => keep(o, g.name)) : g.orgs }))
              .filter((g) => !active || g.shown.length > 0),
          ),
        }))
        .filter((r) => !active || r.groups.length > 0),
    );
  }, [regions, needle, filter, sort, active]);

  const sig = needle + SEP + filter;
  const shutR = shut.sig === sig ? shut.r : EMPTY;
  const shutG = shut.sig === sig ? shut.g : EMPTY;
  const isOpenR = (k: string) => (active ? !shutR.has(k) : openR.has(k));
  const isOpenG = (k: string) => (active ? !shutG.has(k) : openG.has(k));

  const nShown = view.reduce((s, r) => s + r.groups.reduce((t, g) => t + g.shown.length, 0), 0);

  const toggleR = (k: string) =>
    active ? setShut({ sig, r: flip(shutR, k), g: shutG }) : setOpenR(flip(openR, k));
  const toggleG = (k: string) =>
    active ? setShut({ sig, r: shutR, g: flip(shutG, k) }) : setOpenG(flip(openG, k));
  const expandAll = () => {
    if (active) {
      setShut({ sig, r: EMPTY, g: EMPTY });
      return;
    }
    setOpenR(new Set(regions.map((r) => r.name)));
    setOpenG(new Set(regions.flatMap((r) => r.groups.map((g) => r.name + SEP + g.name))));
  };
  const collapseAll = () => {
    if (active) {
      setShut({
        sig,
        r: new Set(view.map((r) => r.name)),
        g: new Set(view.flatMap((r) => r.groups.map((g) => r.name + SEP + g.name))),
      });
      return;
    }
    setOpenR(new Set());
    setOpenG(new Set());
  };

  const chips: { key: Filter; label: string; n: number; tone: string }[] = [
    { key: "all", label: T.all, n: totals.total, tone: "" },
    { key: "ulanmagan", label: S.status.ulanmagan, n: totals.ulanmagan, tone: "text-un" },
    { key: "ochirilgan", label: S.status.ochirilganShort, n: totals.ochirilgan, tone: "text-ink-soft" },
    { key: "ulangan", label: S.status.ulangan, n: totals.ulangan, tone: "text-ul" },
    { key: "changed", label: T.changed, n: nChanged, tone: "text-sov" },
  ];

  const republicSheet = single && regions[0] && isRepublic(regions[0].name);
  const firstCol = single ? (republicSheet ? T.col.system : T.col.group) : L.col.region;

  return (
    <section className="card overflow-hidden">
      <div className="space-y-3 border-b border-line p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[0.95rem] font-semibold">
              {single ? (republicSheet ? T.titleSystems : T.titleDistricts) : T.title}
            </h2>
            <p className="max-w-[760px] text-[0.75rem] text-ink-faint">{single ? T.regionHint : T.hint}</p>
          </div>
          {exportHref && (
            <a
              href={exportHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sov px-4 py-2 text-[0.82rem] font-semibold text-on-sov transition-colors hover:bg-sov-deep"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 1.5v8m0 0 3-3m-3 3-3-3M2.5 12v1.5A1 1 0 0 0 3.5 14.5h9a1 1 0 0 0 1-1V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {L.export}
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
              placeholder={T.search}
              aria-label={T.search}
              className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-8 text-[0.82rem] outline-none focus:border-sov"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="×"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-ink-faint hover:text-ink"
              >
                ×
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[0.8rem] font-medium outline-none focus:border-sov"
          >
            <option value="excel">{T.sortExcel}</option>
            <option value="pct">{T.sortPct}</option>
          </select>
          <div className="flex gap-1">
            <button onClick={expandAll} className="rounded-lg border border-line px-3 py-2 text-[0.78rem] font-medium text-ink-soft hover:bg-paper">
              {T.expandAll}
            </button>
            <button onClick={collapseAll} className="rounded-lg border border-line px-3 py-2 text-[0.78rem] font-medium text-ink-soft hover:bg-paper">
              {T.collapseAll}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={L.col.status}>
          {chips.map((c) => (
            <button
              key={c.key}
              aria-pressed={filter === c.key}
              onClick={() => setFilter(c.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.78rem] font-medium transition-colors ${
                filter === c.key ? "bg-sov text-on-sov" : "border border-line text-ink-soft hover:bg-paper"
              }`}
            >
              {c.label}
              <span className={`tnum rounded-full px-1.5 text-[0.75rem] ${filter === c.key ? "bg-white/25" : `bg-paper ${c.tone}`}`}>
                {fmtInt(c.n)}
              </span>
            </button>
          ))}
          {active && <span className="tnum ml-1 text-[0.75rem] text-ink-faint">{T.matches(fmtInt(nShown))}</span>}
        </div>
      </div>

      <div className="scroll-quiet overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[0.82rem]">
          <thead>
            <tr className="border-b border-line text-[0.75rem] uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2.5 font-medium sm:px-4">{firstCol}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{S.overview.col.total}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{S.status.ulangan}</th>
              <th className="tnum w-[170px] px-3 py-2.5 text-right font-medium">{S.overview.col.percent}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{S.status.ulanmagan}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium sm:pr-4">{S.status.ochirilganShort}</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr>
                <td colSpan={COLS} className="p-6 text-center text-[0.85rem] text-ink-faint">
                  {T.nothing}
                </td>
              </tr>
            )}
            {view.map((r) => {
              const groups = r.groups.map((g) => {
                const key = r.name + SEP + g.name;
                const open = isOpenG(key);
                return (
                  <Fragment key={key}>
                    <SummaryRow
                      c={g}
                      depth={single ? 0 : 1}
                      open={open}
                      onToggle={() => toggleG(key)}
                      label={<span>{g.name}</span>}
                      matches={active ? g.shown.length : undefined}
                      matchLabel={T.matches}
                    />
                    {open && (
                      <tr>
                        <td colSpan={COLS} className="p-0">
                          <OrgTable orgs={g.shown} republic={isRepublic(r.name)} indent={!single} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              });
              if (single) return <Fragment key={r.name}>{groups}</Fragment>;
              const open = isOpenR(r.name);
              return (
                <Fragment key={r.name}>
                  <SummaryRow
                    c={r}
                    depth={0}
                    open={open}
                    onToggle={() => toggleR(r.name)}
                    label={
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold">{regionLabel(r.name, lang)}</span>
                        {isRepublic(r.name) && <span className="text-[0.75rem] font-normal text-ink-faint">{T.republicSub}</span>}
                      </span>
                    }
                    href={`/argos-jonli/${regionSlug(r.name)}`}
                    hrefLabel={T.openRegion}
                    matches={active ? r.groups.reduce((s, g) => s + g.shown.length, 0) : undefined}
                    matchLabel={T.matches}
                  />
                  {open && groups}
                </Fragment>
              );
            })}
            {!active && (
              <tr className="border-t border-line bg-paper/70 font-semibold">
                <td className="px-3 py-2.5 sm:px-4">{S.units.totalRow}</td>
                <CountCells c={totals} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function flip(set: ReadonlySet<string>, key: string) {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function sumCounts(regions: TreeRegion[]): Counts {
  const c: Counts = { total: 0, ulangan: 0, ulanmagan: 0, ochirilgan: 0, percent: 0 };
  for (const r of regions) {
    c.total += r.total;
    c.ulangan += r.ulangan;
    c.ulanmagan += r.ulanmagan;
    c.ochirilgan += r.ochirilgan;
  }
  c.percent = c.total ? c.ulangan / c.total : 0;
  return c;
}

function CountCells({ c }: { c: Counts }) {
  const color = rampCss(c.percent);
  return (
    <>
      <td className="tnum px-3 py-2 text-right text-ink-soft">{fmtInt(c.total)}</td>
      <td className="tnum px-3 py-2 text-right text-ul">{fmtInt(c.ulangan)}</td>
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
      <td className={`tnum px-3 py-2 text-right ${c.ulanmagan > 0 ? "font-medium text-un" : "text-ink-faint"}`}>
        {fmtInt(c.ulanmagan)}
      </td>
      <td className={`tnum px-3 py-2 text-right sm:pr-4 ${c.ochirilgan > 0 ? "text-ink-soft" : "text-ink-faint"}`}>
        {fmtInt(c.ochirilgan)}
      </td>
    </>
  );
}

function SummaryRow({
  c,
  depth,
  open,
  onToggle,
  label,
  href,
  hrefLabel,
  matches,
  matchLabel,
}: {
  c: Counts;
  depth: 0 | 1;
  open: boolean;
  onToggle?: () => void;
  label: ReactNode;
  href?: string;
  hrefLabel?: string;
  matches?: number;
  matchLabel: (n: string) => string;
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
          {matches !== undefined && (
            <span className="tnum shrink-0 rounded-full bg-sov-soft px-2 py-0.5 text-[0.75rem] text-sov">{matchLabel(fmtInt(matches))}</span>
          )}
          {href && (
            <Link
              href={href}
              onClick={(e) => e.stopPropagation()}
              title={hrefLabel}
              aria-label={hrefLabel}
              className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[0.75rem] font-medium text-ink-faint hover:bg-sov-soft hover:text-sov"
            >
              {hrefLabel} →
            </Link>
          )}
        </div>
      </td>
      <CountCells c={c} />
    </tr>
  );
}

const TINT: Record<LiveStatus, string> = {
  ulangan: "",
  ulanmagan: "bg-un-soft/45",
  ochirilgan: "bg-och-soft/60",
};

function OrgTable({ orgs, republic, indent }: { orgs: TreeOrg[]; republic: boolean; indent: boolean }) {
  const S = useS();
  const L = S.argosLive;
  const T = L.tree;
  const statusName = (s: LiveStatus) =>
    s === "ulangan" ? S.status.ulangan : s === "ulanmagan" ? S.status.ulanmagan : S.status.ochirilganShort;

  return (
    <div className={`border-b border-line bg-surface ${indent ? "pl-6 sm:pl-8" : ""}`}>
      <table className="w-full min-w-[1000px] table-fixed border-collapse text-left text-[0.78rem]">
        <colgroup>
          <col className="w-12" />
          <col />
          <col className="w-[132px]" />
          <col className="w-[150px]" />
          <col className="w-[138px]" />
          <col className="w-[64px]" />
          <col className="w-[190px]" />
          <col className="w-[150px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-line-soft text-[0.75rem] uppercase tracking-wide text-ink-faint">
            <th className="tnum w-10 px-3 py-1.5 text-right font-medium">{T.col.no}</th>
            <th className="px-3 py-1.5 font-medium">{T.col.org}</th>
            <th className="tnum px-3 py-1.5 font-medium">{L.col.stir}</th>
            <th className="px-3 py-1.5 font-medium">{L.col.status}</th>
            <th className="px-3 py-1.5 font-medium">{T.col.contract}</th>
            <th className="tnum px-3 py-1.5 text-right font-medium">{T.col.pay}</th>
            <th className="px-3 py-1.5 font-medium">{T.col.sub}</th>
            <th className="px-3 py-1.5 font-medium sm:pr-4">{T.col.argos}</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => (
            <tr key={o.n} className={`border-b border-line-soft align-top last:border-b-0 ${TINT[o.status]}`}>
              <td className="tnum px-3 py-1.5 text-right text-ink-faint">{o.n}</td>
              <td className="px-3 py-1.5">
                <div className="text-ink">{o.name}</div>
                {republic && o.hudud && <div className="text-[0.75rem] text-ink-faint">{o.hudud}</div>}
                {o.note && <div className="mt-0.5 text-[0.75rem] text-warn">{o.note}</div>}
              </td>
              <td className="tnum whitespace-nowrap px-3 py-1.5 text-ink-soft">
                {o.stir ?? "—"}
                {o.dup > 1 && (
                  <span
                    title={T.dup(fmtInt(o.dup))}
                    className="ml-1.5 rounded-full bg-warn/15 px-1.5 py-0.5 text-[0.75rem] font-medium text-warn"
                  >
                    <span aria-hidden>×{o.dup}</span>
                    <span className="sr-only">{T.dup(fmtInt(o.dup))}</span>
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5">
                <StatusPill status={o.status} />
                {o.ch !== 0 && (
                  <span
                    title={`${o.ch > 0 ? T.up : T.down} · ${T.was(statusName(o.was))}`}
                    className={`ml-1.5 text-[0.75rem] font-semibold ${o.ch > 0 ? "text-ul" : "text-un"}`}
                  >
                    <span aria-hidden>{o.ch > 0 ? "▲" : "▼"}</span>
                    <span className="sr-only">{`${o.ch > 0 ? T.up : T.down}, ${T.was(statusName(o.was))}`}</span>
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-ink-soft">{o.contract ?? <span className="text-ink-faint">—</span>}</td>
              <td className={`tnum px-3 py-1.5 text-right ${payTone(o.pay)}`}>{o.pay === null ? "—" : `${fmtNum(o.pay)}%`}</td>
              <td className="px-3 py-1.5 text-ink-soft">{o.sub ?? "—"}</td>
              <td className="px-3 py-1.5 text-[0.75rem] text-ink-faint sm:pr-4">
                {o.reason === "billing" ? "" : L.reasons[o.reason]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function payTone(p: number | null) {
  if (p === null) return "text-ink-faint";
  if (p >= 100) return "text-ul";
  if (p <= 0) return "text-un";
  return "text-ink-soft";
}

function fmtNum(p: number) {
  return Number.isInteger(p) ? String(p) : p.toFixed(1).replace(".", ",");
}

