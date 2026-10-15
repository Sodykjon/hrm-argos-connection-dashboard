"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import type { CBlock, CGroup, CNode, COrg, CRegion } from "@/lib/completion-tree";
import { fmtInt, fmtPct, rampCss } from "@/lib/format";
import { regionLabel, regionSlug } from "@/lib/regions";
import { useLang, useS } from "@/lib/i18n/client";

type Sort = "low" | "high" | "zero";
type Filter = "all" | "zero" | "below50" | "full";

const SEP = "\u0000";
const COLS = 5;
const ORDER: Record<Sort, (a: CNode, b: CNode) => number> = {
  low: (a, b) => a.avg - b.avg || b.count - a.count,
  high: (a, b) => b.avg - a.avg || b.count - a.count,
  zero: (a, b) => b.zero - a.zero || a.avg - b.avg,
};
const ROLE_MARK: Record<string, string> = { bolim: "└", bevosita: "◆" };

function fold(x: string) {
  return x.toLowerCase().replace(/[ʻʼ‘’`']/g, "'");
}

function node(orgs: COrg[]): CNode {
  return {
    count: orgs.length,
    avg: orgs.length ? orgs.reduce((s, o) => s + o.pct, 0) / orgs.length : 0,
    zero: orgs.filter((o) => o.pct === 0).length,
    below50: orgs.filter((o) => o.pct < 0.5).length,
  };
}

/**
 * Completion per organisation in the registry's shape — region → district / system (→ SES block)
 * → organisation — like /argos-jonli. `single` renders one region's groups at the top level.
 */
export function CompletionTree({ regions, single }: { regions: CRegion[]; single?: boolean }) {
  const S = useS();
  const T = S.completion.tree;
  const lang = useLang();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("low");
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const needle = fold(q.trim());
  const active = needle !== "" || filter !== "all";

  const all = useMemo(() => regions.flatMap((r) => r.groups.flatMap((g) => g.orgs)), [regions]);
  const counts: Record<Filter, number> = useMemo(
    () => ({
      all: all.length,
      zero: all.filter((o) => o.pct === 0).length,
      below50: all.filter((o) => o.pct < 0.5).length,
      full: all.filter((o) => o.pct >= 1).length,
    }),
    [all],
  );

  const view = useMemo(() => {
    const keep = (o: COrg, where: string) =>
      (filter === "all" ||
        (filter === "zero" ? o.pct === 0 : filter === "below50" ? o.pct < 0.5 : o.pct >= 1)) &&
      (!needle || fold(o.name).includes(needle) || (o.stir ?? "").includes(needle) || fold(where).includes(needle));
    const by = ORDER[sort];
    const withShown = <X extends { orgs: COrg[] }>(x: X, where: string) => {
      const shown = active ? x.orgs.filter((o) => keep(o, where)) : x.orgs;
      return { ...x, ...(active ? node(shown) : {}), shown };
    };
    return regions
      .map((r) => {
        const groups = r.groups
          .map((g) => {
            const gg = withShown(g, g.name);
            const blocks = g.blocks
              ?.map((b) => withShown(b, g.name))
              .filter((b) => !active || b.shown.length > 0)
              .sort(by);
            return { ...gg, blocks };
          })
          .filter((g) => !active || g.shown.length > 0)
          .sort(by);
        return { ...r, ...(active ? node(groups.flatMap((g) => g.shown)) : {}), groups };
      })
      .filter((r) => !active || r.groups.length > 0)
      .sort(by);
  }, [regions, needle, filter, sort, active]);

  const isOpen = (k: string) => active || open.has(k);
  const toggle = (k: string) => {
    const next = new Set(open);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setOpen(next);
  };
  const keys = () =>
    regions.flatMap((r) => [
      r.name,
      ...r.groups.flatMap((g) => [r.name + SEP + g.name, ...(g.blocks ?? []).map((b) => r.name + SEP + g.name + SEP + b.name)]),
    ]);
  const nShown = view.reduce((s, r) => s + r.groups.reduce((t, g) => t + g.shown.length, 0), 0);

  const groupLabel = (g: CGroup) =>
    g.unplaced ? (
      <span className="text-warn">
        {g.name ? `${regionLabel(g.name, lang)} · ` : ""}
        {T.unplaced}
      </span>
    ) : (
      <span>{regionLabel(g.name, lang)}</span>
    );
  const blockLabel = (b: CBlock) => (b.name === "markaz" ? S.argosLive.tree.sesCentral : regionLabel(b.name, lang));

  const chips: { key: Filter; label: string; tone: string }[] = [
    { key: "all", label: T.all, tone: "" },
    { key: "zero", label: T.zero, tone: "text-un" },
    { key: "below50", label: T.below50, tone: "text-un" },
    { key: "full", label: T.full, tone: "text-ul" },
  ];

  const rowsOfGroup = (g: (typeof view)[number]["groups"][number], gk: string, depth: 0 | 1 | 2) => {
    const go = isOpen(gk);
    const label = groupLabel(g);
    const flat = g.name === "" && !g.blocks && !g.unplaced;
    if (flat)
      return (
        <tr key={gk}>
          <td colSpan={COLS} className="p-0">
            <OrgTable orgs={g.shown} depth={depth} />
          </td>
        </tr>
      );
    return (
      <Fragment key={gk}>
        <SummaryRow c={g} depth={depth} open={go} onToggle={active ? undefined : () => toggle(gk)} label={label} />
        {go && !g.blocks && (
          <tr>
            <td colSpan={COLS} className="p-0">
              <OrgTable orgs={g.shown} depth={(depth + 1) as 1 | 2 | 3} />
            </td>
          </tr>
        )}
        {go &&
          g.blocks?.map((b) => {
            const bk = gk + SEP + b.name;
            const bo = isOpen(bk);
            return (
              <Fragment key={bk}>
                <SummaryRow
                  c={b}
                  depth={(depth + 1) as 1 | 2}
                  open={bo}
                  onToggle={active ? undefined : () => toggle(bk)}
                  label={<span>{blockLabel(b)}</span>}
                />
                {bo && (
                  <tr>
                    <td colSpan={COLS} className="p-0">
                      <OrgTable orgs={b.shown} depth={(depth + 2) as 2 | 3} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
      </Fragment>
    );
  };

  return (
    <section className="card overflow-hidden">
      <div className="space-y-3 border-b border-line p-3 sm:p-4">
        <div>
          <h2 className="text-[0.95rem] font-semibold">{T.title}</h2>
          <p className="max-w-[760px] text-[0.75rem] text-ink-faint">{T.hint}</p>
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
              <button onClick={() => setQ("")} aria-label="×" className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-ink-faint hover:text-ink">
                ×
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label={S.argosLive.tree.sortLabel}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[0.8rem] font-medium outline-none focus:border-sov"
          >
            <option value="low">{T.sortLow}</option>
            <option value="high">{T.sortHigh}</option>
            <option value="zero">{T.sortZero}</option>
          </select>
          {!active && (
            <div className="flex gap-1">
              <button onClick={() => setOpen(new Set(keys()))} className="rounded-lg border border-line px-3 py-2 text-[0.78rem] font-medium text-ink-soft hover:bg-paper">
                {S.argosLive.tree.expandAll}
              </button>
              <button onClick={() => setOpen(new Set())} className="rounded-lg border border-line px-3 py-2 text-[0.78rem] font-medium text-ink-soft hover:bg-paper">
                {S.argosLive.tree.collapseAll}
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
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
                {fmtInt(counts[c.key])}
              </span>
            </button>
          ))}
          {active && <span className="tnum ml-1 text-[0.75rem] text-ink-faint">{S.argosLive.tree.matches(fmtInt(nShown))}</span>}
        </div>
      </div>

      <div className="scroll-quiet overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[0.82rem]">
          <thead>
            <tr className="border-b border-line text-[0.75rem] uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2.5 font-medium sm:px-4">{single ? T.colGroup : T.colRegion}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{T.colCount}</th>
              <th className="tnum w-[170px] px-3 py-2.5 text-right font-medium">{T.colAvg}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium">{T.colZero}</th>
              <th className="tnum px-3 py-2.5 text-right font-medium sm:pr-4">{T.colBelow50}</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr>
                <td colSpan={COLS} className="p-6 text-center text-[0.85rem] text-ink-faint">
                  {S.argosLive.tree.nothing}
                </td>
              </tr>
            )}
            {view.map((r) => {
              if (single) return <Fragment key={r.name}>{r.groups.map((g) => rowsOfGroup(g, r.name + SEP + g.name, 0))}</Fragment>;
              const ro = isOpen(r.name);
              return (
                <Fragment key={r.name}>
                  <SummaryRow
                    c={r}
                    depth={0}
                    open={ro}
                    onToggle={active ? undefined : () => toggle(r.name)}
                    label={<span className="font-semibold">{regionLabel(r.name, lang)}</span>}
                    href={`/toldirilish/${regionSlug(r.name)}`}
                    hrefLabel={S.argosLive.tree.openRegion}
                  />
                  {ro && r.groups.map((g) => rowsOfGroup(g, r.name + SEP + g.name, 1))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Cells({ c }: { c: CNode }) {
  const color = rampCss(c.avg);
  return (
    <>
      <td className="tnum px-3 py-2 text-right text-ink-soft">{fmtInt(c.count)}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-2">
          <span className="hidden h-1.5 w-[72px] overflow-hidden rounded-full bg-line-soft sm:block" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${c.avg * 100}%`, background: color }} />
          </span>
          <span className="tnum w-[52px] text-right font-semibold" style={{ color }}>
            {fmtPct(c.avg, 1)}
          </span>
        </div>
      </td>
      <td className={`tnum px-3 py-2 text-right ${c.zero > 0 ? "font-medium text-un" : "text-ink-faint"}`}>{fmtInt(c.zero)}</td>
      <td className={`tnum px-3 py-2 text-right sm:pr-4 ${c.below50 > 0 ? "text-un" : "text-ink-faint"}`}>{fmtInt(c.below50)}</td>
    </>
  );
}

const PAD = ["pl-3 sm:pl-4", "pl-8 sm:pl-10", "pl-14 sm:pl-16"];

function SummaryRow({
  c,
  depth,
  open,
  onToggle,
  label,
  href,
  hrefLabel,
}: {
  c: CNode;
  depth: 0 | 1 | 2;
  open: boolean;
  onToggle?: () => void;
  label: ReactNode;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <tr
      className={`border-b border-line-soft ${onToggle ? "cursor-pointer" : ""} ${
        depth === 0 ? "hover:bg-paper" : depth === 1 ? "bg-paper/40 text-[0.8rem] hover:bg-paper" : "bg-paper/70 text-[0.78rem] hover:bg-paper"
      }`}
      onClick={onToggle}
    >
      <td className={`py-2 pr-3 ${PAD[depth]}`}>
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
          {href && (
            <Link
              href={href}
              onClick={(e) => e.stopPropagation()}
              className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[0.75rem] font-medium text-ink-faint hover:bg-sov-soft hover:text-sov"
            >
              {hrefLabel} →
            </Link>
          )}
        </div>
      </td>
      <Cells c={c} />
    </tr>
  );
}

const ORG_PAD = ["", "pl-6 sm:pl-8", "pl-12 sm:pl-14", "pl-16 sm:pl-20"];

function OrgTable({ orgs, depth }: { orgs: COrg[]; depth: 0 | 1 | 2 | 3 }) {
  const S = useS();
  const T = S.completion.tree;
  return (
    <div className={`border-b border-line bg-surface ${ORG_PAD[depth]}`}>
      <table className="w-full min-w-[600px] table-fixed border-collapse text-left text-[0.78rem]">
        <colgroup>
          <col className="w-12" />
          <col />
          <col className="w-[132px]" />
          <col className="w-[180px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-line-soft text-[0.75rem] uppercase tracking-wide text-ink-faint">
            <th className="tnum px-3 py-1.5 text-right font-medium">№</th>
            <th className="px-3 py-1.5 font-medium">{T.colOrg}</th>
            <th className="tnum px-3 py-1.5 font-medium">{T.colStir}</th>
            <th className="tnum px-3 py-1.5 text-right font-medium sm:pr-4">{T.colPct}</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o, i) => {
            const color = rampCss(o.pct);
            return (
              <tr key={i} className={`border-b border-line-soft align-top last:border-b-0 ${o.pct === 0 ? "bg-un-soft/45" : ""}`}>
                <td className="tnum px-3 py-1.5 text-right text-ink-faint">{i + 1}</td>
                <td className="px-3 py-1.5">
                  <div
                    className={`flex gap-1.5 text-ink ${o.role === "bolim" ? "pl-4" : ""} ${o.role === "boshqarma" || o.role === "markaz" ? "font-semibold" : ""}`}
                    title={o.role ? S.argosLive.tree.sesRole[o.role] : undefined}
                  >
                    {o.role && ROLE_MARK[o.role] && (
                      <span aria-hidden className="shrink-0 text-ink-faint">
                        {ROLE_MARK[o.role]}
                      </span>
                    )}
                    <span>{o.name}</span>
                  </div>
                </td>
                <td className="tnum whitespace-nowrap px-3 py-1.5 text-ink-soft">{o.stir ?? "—"}</td>
                <td className="px-3 py-1.5 sm:pr-4">
                  <div className="flex items-center justify-end gap-2">
                    <span className="hidden h-1.5 w-[72px] overflow-hidden rounded-full bg-line-soft sm:block" aria-hidden>
                      <span className="block h-full rounded-full" style={{ width: `${o.pct * 100}%`, background: color }} />
                    </span>
                    <span className="tnum w-[52px] text-right font-semibold" style={{ color }}>
                      {fmtPct(o.pct, 1)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
