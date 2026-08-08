"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SPEC,
  SV,
  specTaminl,
  specGap,
  specKoef,
  specPensShare,
  specR5Share,
  type SpecCat,
  type SpecVals,
} from "@/lib/spec";
import { fmtInt, fmtPct, rampColor } from "@/lib/format";
import { regionLabel, regionSlug } from "@/lib/regions";
import { useS, useLang } from "@/lib/i18n/client";

type GroupKey = "all" | SpecCat["grp"];

// Absolute anchors for coloring one specialty's coverage: 50% and below is
// unambiguously red, 100%+ green. A relative ramp would repaint the same value
// a different color for every specialty, which reads as noise when switching.
function covColor(share: number): string {
  const t = Math.max(0, Math.min(1, (share - 0.5) / 0.5));
  return rampColor(t);
}

function normQ(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ʻʼ'`’‘]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type DistRow = [number, number, number, number, number, number | null, number | null];
// [distIdx, shtat, band, jismoniy, bosh, pens, yaqin]

interface SpecDistFile {
  date: string;
  region: string;
  dists: string[];
  cats: Record<string, DistRow[]>;
}

// One fetch per region per session; the files are static assets (~30–50KB).
const distCache = new Map<string, Promise<SpecDistFile>>();

function loadDist(regionName: string): Promise<SpecDistFile> {
  const slug = regionSlug(regionName);
  let p = distCache.get(slug);
  if (!p) {
    p = fetch(`/spec-dist/${slug}.json`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<SpecDistFile>;
    });
    p.catch(() => distCache.delete(slug));
    distCache.set(slug, p);
  }
  return p;
}

export function SpecExplorer({ initialSlug }: { initialSlug?: string }) {
  const S = useS();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [grp, setGrp] = useState<GroupKey>("all");
  const [slug, setSlug] = useState(
    () =>
      (initialSlug && SPEC.cats.find((c) => c.slug === initialSlug)?.slug) ||
      // Default to the biggest doctor deficit — the question the page answers.
      [...SPEC.cats]
        .filter((c) => !c.agg && c.grp === "vrach")
        .sort((a, b) => specGap(b.nat) - specGap(a.nat))[0].slug,
  );

  const groups: Array<{ key: GroupKey; label: string }> = [
    { key: "all", label: S.tarkib.spec.all },
    { key: "vrach", label: S.tarkib.cat.vrach },
    { key: "orta", label: S.tarkib.cat.orta },
    { key: "kichik", label: S.tarkib.cat.kichik },
    { key: "boshqa", label: S.tarkib.cat.boshqa },
    { key: "notibbiy", label: S.tarkib.cat.notibbiy },
    { key: "farm", label: S.tarkib.cat.provfarm },
  ];

  const list = useMemo(() => {
    const needle = normQ(q);
    return SPEC.cats
      .filter((c) => (grp === "all" ? true : c.grp === grp))
      .filter(
        (c) =>
          !needle ||
          normQ(c.name).includes(needle) ||
          normQ(c.src).includes(needle),
      )
      .map((c) => ({ cat: c, gap: specGap(c.nat), taminl: specTaminl(c.nat) }))
      .sort((a, b) => b.gap - a.gap);
  }, [q, grp]);

  const sel = SPEC.cats.find((c) => c.slug === slug) ?? SPEC.cats[0];

  function select(next: string) {
    setSlug(next);
    router.replace(`/tarkib/mutaxassislik?m=${next}`, { scroll: false });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* ------------------------------------------------ list + search */}
      <div className="card flex flex-col overflow-hidden lg:col-span-4">
        <div className="border-b border-line p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={S.tarkib.spec.search}
            className="w-full rounded-lg border border-line bg-paper px-3.5 py-2 text-[0.85rem] outline-none focus:border-sov focus:bg-surface"
          />
          <div className="scroll-quiet mt-2 flex gap-1 overflow-x-auto pb-0.5">
            {groups.map((g) => (
              <button
                key={g.key}
                onClick={() => setGrp(g.key)}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[0.7rem] font-medium transition-colors ${
                  grp === g.key
                    ? "bg-sov text-white"
                    : "bg-paper text-ink-soft hover:bg-line-soft"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 text-[0.72rem] text-ink-faint">
          <span className="tnum">{S.tarkib.spec.count(list.length)}</span>
          <span>{S.tarkib.spec.sortedByGap}</span>
        </div>
        <ol className="scroll-quiet flex max-h-[520px] flex-col overflow-y-auto lg:max-h-[640px]">
          {list.map(({ cat, gap, taminl }) => {
            const active = cat.slug === sel.slug;
            return (
              <li key={cat.slug}>
                <button
                  onClick={() => select(cat.slug)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                    active ? "bg-sov/15" : "hover:bg-paper"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[0.8rem] leading-snug ${
                        cat.agg ? "font-bold" : "font-medium"
                      }`}
                    >
                      {cat.name}
                    </span>
                    <span className="tnum text-[0.68rem] text-ink-faint">
                      {fmtInt(cat.nat[SV.jismoniy])} / {fmtInt(cat.nat[SV.shtat])}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className="tnum block text-[0.8rem] font-semibold"
                      style={{ color: covColor(taminl) }}
                    >
                      {fmtPct(taminl, 0)}
                    </span>
                    {gap > 0.5 && (
                      <span className="tnum block text-[0.66rem] text-un">
                        −{fmtInt(gap)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="px-4 py-8 text-center text-[0.8rem] text-ink-faint">
              {S.tarkib.spec.empty}
            </li>
          )}
        </ol>
      </div>

      {/* ------------------------------------------------ detail */}
      <div className="space-y-4 lg:col-span-8">
        <SpecDetail cat={sel} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ detail

function SpecDetail({ cat }: { cat: SpecCat }) {
  const S = useS();
  const lang = useLang();
  // Which region's district breakdown is open. Survives specialty switches on
  // purpose: comparing the same district across specialties is the workflow.
  const [expanded, setExpanded] = useState<string | null>(null);
  const v = cat.nat;
  const taminl = specTaminl(v);
  const gap = specGap(v);
  const pensV = v[SV.pens];
  const pensShare = specPensShare(v);
  const r5 = specR5Share(v);

  const rows = SPEC.regionOrder
    .map((name, i) => ({ name, v: cat.r[i] }))
    .filter((r) => r.v[SV.shtat] > 0 || r.v[SV.jismoniy] > 0)
    .sort((a, b) => specTaminl(a.v) - specTaminl(b.v));
  const hasBroken = rows.some((r) => r.v[SV.pens] === null && r.v[SV.jismoniy] > 0);

  return (
    <>
      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[1.05rem] font-bold leading-snug">{cat.name}</h2>
          <span className="eyebrow">
            {S.tarkib.cat[cat.grp === "farm" ? "provfarm" : cat.grp]}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label={S.tarkib.col.shtat} value={fmtInt(v[SV.shtat])} />
          <Kpi label={S.tarkib.col.jismoniy} value={fmtInt(v[SV.jismoniy])} />
          <Kpi
            label={S.tarkib.col.taminl}
            value={fmtPct(taminl, 1)}
            color={covColor(taminl)}
          />
          <Kpi
            label={S.tarkib.gapCol.gap}
            value={gap > 0 ? `−${fmtInt(gap)}` : `+${fmtInt(-gap)}`}
            color={gap > 0 ? "var(--color-un)" : "var(--color-ul)"}
            hint={S.tarkib.spec.gapHint}
          />
          <Kpi label={S.tarkib.catCol.bosh} value={fmtInt(v[SV.bosh])} />
          <Kpi
            label={S.tarkib.catCol.koef}
            value={specKoef(v).toFixed(2).replace(".", ",")}
            color={specKoef(v) >= 1.5 ? "var(--color-un)" : undefined}
            hint={S.tarkib.spec.koefHint}
          />
          <Kpi
            label={S.tarkib.gapCol.pens}
            value={
              pensV === null
                ? "—"
                : `${fmtInt(pensV)}${
                    pensShare !== null ? ` · ${fmtPct(pensShare, 0)}` : ""
                  }`
            }
          />
          <Kpi
            label={S.tarkib.spec.r5}
            value={r5 === null ? "—" : fmtPct(r5, 1)}
            color={
              r5 !== null && r5 >= 0.4 ? "var(--color-un)" : undefined
            }
          />
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-[0.95rem] font-semibold">
            {S.tarkib.spec.regionsTitle}
          </h3>
          <span className="eyebrow">{S.tarkib.spec.clickHint}</span>
        </div>
        <div className="flex flex-col gap-1">
          {rows.map((r) => {
            const t = specTaminl(r.v);
            const color = covColor(t);
            // Bars top out at 120% so over-staffed regions stay readable
            // without flattening everyone else.
            const width = Math.min(100, (t / 1.2) * 100);
            const open = expanded === r.name;
            return (
              <div key={r.name}>
                <button
                  onClick={() => setExpanded(open ? null : r.name)}
                  aria-expanded={open}
                  className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors ${
                    open ? "bg-paper" : "hover:bg-paper"
                  }`}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden
                    className={`shrink-0 text-ink-faint transition-transform ${
                      open ? "rotate-90" : ""
                    }`}
                  >
                    <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="w-[10.4rem] shrink-0 truncate text-[0.78rem]">
                    {regionLabel(r.name, lang)}
                  </span>
                  <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${width}%`, background: color }}
                    />
                    {/* 100% reference tick */}
                    <span
                      className="absolute inset-y-0 w-px bg-white/40"
                      style={{ left: `${(1 / 1.2) * 100}%` }}
                      aria-hidden
                    />
                  </span>
                  <span
                    className="tnum w-14 shrink-0 text-right text-[0.78rem] font-semibold"
                    style={{ color }}
                  >
                    {fmtPct(t, 0)}
                  </span>
                  <span className="tnum hidden w-24 shrink-0 text-right text-[0.7rem] text-ink-faint sm:block">
                    {fmtInt(r.v[SV.jismoniy])} / {fmtInt(r.v[SV.shtat])}
                  </span>
                </button>
                {open && <DistPanel regionName={r.name} catSlug={cat.slug} />}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[0.7rem] text-ink-faint">{S.tarkib.spec.barNote}</p>
      </section>

      <section className="card overflow-hidden">
        <h3 className="border-b border-line p-3 text-[0.95rem] font-semibold sm:px-4">
          {S.tarkib.spec.tableTitle}
        </h3>
        <div className="scroll-quiet overflow-x-auto">
          <table className="w-full border-collapse text-left text-[0.78rem]">
            <thead>
              <tr className="border-b border-line text-[0.66rem] uppercase tracking-wide text-ink-faint">
                <th className="px-3 py-2 font-medium">{S.tarkib.col.region}</th>
                <th className="tnum px-2 py-2 text-right font-medium">
                  {S.tarkib.col.shtat}
                </th>
                <th className="tnum px-2 py-2 text-right font-medium">
                  {S.tarkib.col.jismoniy}
                </th>
                <th className="tnum hidden px-2 py-2 text-right font-medium sm:table-cell">
                  {S.tarkib.catCol.bosh}
                </th>
                <th className="tnum px-2 py-2 text-right font-medium">
                  {S.tarkib.col.taminl}
                </th>
                <th className="tnum px-2 py-2 text-right font-medium">
                  {S.tarkib.gapCol.gap}
                </th>
                <th className="tnum hidden px-2 py-2 text-right font-medium md:table-cell">
                  {S.tarkib.catCol.koef}
                </th>
                <th className="tnum hidden px-2 py-2 text-right font-medium md:table-cell">
                  {S.tarkib.gapCol.pens}
                </th>
                <th className="tnum hidden px-2 py-2 text-right font-medium lg:table-cell">
                  {S.tarkib.spec.r5}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <SpecRow key={r.name} name={regionLabel(r.name, lang)} v={r.v} />
              ))}
              <tr className="border-t border-line bg-paper font-semibold">
                <td className="px-3 py-2">{S.tarkib.totalRow}</td>
                <td className="tnum px-2 py-2 text-right">{fmtInt(v[SV.shtat])}</td>
                <td className="tnum px-2 py-2 text-right">{fmtInt(v[SV.jismoniy])}</td>
                <td className="tnum hidden px-2 py-2 text-right sm:table-cell">
                  {fmtInt(v[SV.bosh])}
                </td>
                <td className="tnum px-2 py-2 text-right">{fmtPct(taminl, 1)}</td>
                <td className="tnum px-2 py-2 text-right">
                  {gap > 0 ? `−${fmtInt(gap)}` : `+${fmtInt(-gap)}`}
                </td>
                <td className="tnum hidden px-2 py-2 text-right md:table-cell">
                  {specKoef(v).toFixed(2).replace(".", ",")}
                </td>
                <td className="tnum hidden px-2 py-2 text-right md:table-cell">
                  {pensV === null ? "—" : fmtInt(pensV)}
                </td>
                <td className="tnum hidden px-2 py-2 text-right lg:table-cell">
                  {r5 === null ? "—" : fmtPct(r5, 1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {hasBroken && (
          <p className="border-t border-line px-4 py-2.5 text-[0.7rem] leading-relaxed text-ink-faint">
            {S.tarkib.spec.brokenNote}
          </p>
        )}
      </section>
    </>
  );

}

// ------------------------------------------------------- district drilldown

function DistPanel({
  regionName,
  catSlug,
}: {
  regionName: string;
  catSlug: string;
}) {
  const S = useS();
  const [data, setData] = useState<SpecDistFile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadDist(regionName).then(
      (d) => alive && setData(d),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [regionName]);

  if (failed) {
    return (
      <p className="px-7 py-2 text-[0.74rem] text-ink-faint">
        {S.tarkib.spec.distError}
      </p>
    );
  }
  if (!data) {
    return (
      <p className="px-7 py-2 text-[0.74rem] text-ink-faint">
        {S.tarkib.spec.distLoading}
      </p>
    );
  }

  const rows = (data.cats[catSlug] ?? [])
    .map((r) => ({
      name: data.dists[r[0]] ?? "?",
      shtat: r[1],
      jismoniy: r[3],
      bosh: r[4],
      pens: r[5],
      t: r[1] > 0 ? r[3] / r[1] : 0,
    }))
    .sort((a, b) => a.t - b.t);

  if (rows.length === 0) {
    return (
      <p className="px-7 py-2 text-[0.74rem] text-ink-faint">
        {S.tarkib.spec.distEmpty}
      </p>
    );
  }

  return (
    <div className="mb-1 ml-5 rounded-lg border border-line-soft bg-band/40 px-3 py-2">
      <div className="flex flex-col gap-[3px]">
        {rows.map((r) => {
          const color = covColor(r.t);
          const width = Math.min(100, (r.t / 1.2) * 100);
          return (
            <div key={r.name} className="flex items-center gap-2">
              <span className="w-[9.4rem] shrink-0 truncate text-[0.72rem] text-ink-soft">
                {r.name}
              </span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${width}%`, background: color }}
                />
                <span
                  className="absolute inset-y-0 w-px bg-white/40"
                  style={{ left: `${(1 / 1.2) * 100}%` }}
                  aria-hidden
                />
              </span>
              <span
                className="tnum w-12 shrink-0 text-right text-[0.72rem] font-semibold"
                style={{ color }}
              >
                {fmtPct(r.t, 0)}
              </span>
              <span className="tnum w-[4.6rem] shrink-0 text-right text-[0.68rem] text-ink-faint">
                {fmtInt(r.jismoniy)} / {fmtInt(r.shtat)}
              </span>
              <span className="tnum hidden w-14 shrink-0 text-right text-[0.68rem] text-ink-faint md:block">
                {r.pens === null ? "" : `${S.tarkib.spec.pensShort} ${fmtInt(r.pens)}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-2.5">
      <p className="text-[0.64rem] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="tnum mt-0.5 text-[1.05rem] font-bold" style={{ color }}>
        {value}
      </p>
      {hint && <p className="text-[0.62rem] text-ink-faint">{hint}</p>}
    </div>
  );
}

function SpecRow({ name, v }: { name: string; v: SpecVals }) {
  const t = specTaminl(v);
  const g = specGap(v);
  const pensV = v[SV.pens];
  const rr5 = specR5Share(v);
  return (
    <tr className="border-b border-line-soft hover:bg-paper">
      <td className="px-3 py-2 font-medium leading-snug">{name}</td>
      <td className="tnum px-2 py-2 text-right text-ink-soft">
        {fmtInt(v[SV.shtat])}
      </td>
      <td className="tnum px-2 py-2 text-right">{fmtInt(v[SV.jismoniy])}</td>
      <td className="tnum hidden px-2 py-2 text-right text-ink-soft sm:table-cell">
        {fmtInt(v[SV.bosh])}
      </td>
      <td
        className="tnum px-2 py-2 text-right font-semibold"
        style={{ color: covColor(t) }}
      >
        {fmtPct(t, 0)}
      </td>
      <td
        className={`tnum px-2 py-2 text-right ${g > 0.5 ? "text-un" : "text-ink-soft"}`}
      >
        {g > 0 ? `−${fmtInt(g)}` : `+${fmtInt(-g)}`}
      </td>
      <td className="tnum hidden px-2 py-2 text-right text-ink-soft md:table-cell">
        {specKoef(v).toFixed(2).replace(".", ",")}
      </td>
      <td className="tnum hidden px-2 py-2 text-right text-ink-soft md:table-cell">
        {pensV === null ? "—" : fmtInt(pensV)}
      </td>
      <td className="tnum hidden px-2 py-2 text-right text-ink-soft lg:table-cell">
        {rr5 === null ? "—" : fmtPct(rr5, 0)}
      </td>
    </tr>
  );
}
