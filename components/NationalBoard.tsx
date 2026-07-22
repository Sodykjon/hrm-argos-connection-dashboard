"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RegionStat } from "@/lib/types";
import type { DistrictData, DistrictStat } from "@/lib/districts";
import { UzMap } from "./UzMap";
import { DistrictMap } from "./DistrictMap";
import { isRepublic, regionSlug } from "@/lib/regions";
import { rampColor, fmtInt, fmtPct } from "@/lib/format";
import { S } from "@/lib/strings";

const TASHKENT_CITY = "Тошкент шаҳри";

interface RankRow {
  key: string;
  name: string;
  percent: number;
  ulangan: number;
  total: number;
  href?: string;
}

function Ranking({
  title,
  hint,
  rows,
  active,
  setActive,
}: {
  title: string;
  hint: string;
  rows: RankRow[];
  active: string | null;
  setActive: (k: string | null) => void;
}) {
  return (
    <div className="p-3 sm:p-4">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-[0.95rem] font-semibold">{title}</h2>
        <span className="eyebrow">{hint}</span>
      </div>
      <ol className="scroll-quiet flex max-h-[430px] flex-col gap-0.5 overflow-y-auto pr-1">
        {rows.map((r, i) => {
          const color = rampColor(r.percent);
          const isActive = active === r.key;
          const inner = (
            <>
              <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-md bg-line-soft text-[0.72rem] font-semibold text-ink-soft">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[0.83rem] font-medium">{r.name}</span>
                  <span className="tnum shrink-0 text-[0.83rem] font-semibold" style={{ color }}>
                    {fmtPct(r.percent, 1)}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                    <span className="block h-full rounded-full" style={{ width: `${r.percent * 100}%`, background: color }} />
                  </span>
                  <span className="tnum shrink-0 text-[0.66rem] text-ink-faint">
                    {fmtInt(r.ulangan)}/{fmtInt(r.total)}
                  </span>
                </span>
              </span>
            </>
          );
          const cls = `flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors ${isActive ? "bg-paper" : "hover:bg-paper"}`;
          return (
            <li key={r.key}>
              {r.href ? (
                <Link href={r.href} className={cls} onMouseEnter={() => setActive(r.key)} onMouseLeave={() => setActive(null)}>
                  {inner}
                </Link>
              ) : (
                <div className={cls} onMouseEnter={() => setActive(r.key)} onMouseLeave={() => setActive(null)}>
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function NationalBoard({
  regions,
  districtData,
}: {
  regions: RegionStat[];
  districtData: DistrictData;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [drill, setDrill] = useState<string | null>(null);
  const router = useRouter();

  const geographic = useMemo(() => regions.filter((r) => !isRepublic(r.name)), [regions]);
  const ranked = useMemo(() => [...regions].sort((a, b) => a.percent - b.percent), [regions]);

  function handleSelect(viloyat: string) {
    if (viloyat === TASHKENT_CITY) {
      if (districtData.tashkent.length) return setDrill(TASHKENT_CITY);
    } else if (districtData.byViloyat[viloyat]?.length) {
      return setDrill(viloyat);
    }
    router.push(`/hududlar/${regionSlug(viloyat)}`);
  }

  // ---- district view (map viloyats) ----
  if (drill && drill !== TASHKENT_CITY) {
    const districts = districtData.byViloyat[drill] ?? [];
    const rows: RankRow[] = districts.map((d) => ({
      key: d.key, name: d.label, percent: d.percent, ulangan: d.ulangan, total: d.total,
    }));
    return (
      <div className="card overflow-hidden">
        <DrillHeader viloyat={drill} onBack={() => { setDrill(null); setActive(null); }} />
        <div className="grid gap-0 lg:grid-cols-12">
          <div className="border-b border-line p-3 sm:p-4 lg:col-span-7 lg:border-b-0 lg:border-r">
            <DistrictMap viloyat={drill} districts={districts} activeKey={active} onHover={setActive} />
          </div>
          <div className="lg:col-span-5">
            <Ranking title="Туманлар рейтинги" hint="пастдан юқорига" rows={rows} active={active} setActive={setActive} />
          </div>
        </div>
      </div>
    );
  }

  // ---- Tashkent city: list only ----
  if (drill === TASHKENT_CITY) {
    const rows: RankRow[] = districtData.tashkent.map((d) => ({
      key: d.key, name: d.label, percent: d.percent, ulangan: d.ulangan, total: d.total,
    }));
    return (
      <div className="card overflow-hidden">
        <DrillHeader viloyat={TASHKENT_CITY} onBack={() => { setDrill(null); setActive(null); }} />
        <div className="px-4 pb-1 pt-3 text-[0.75rem] text-ink-faint">
          Пойтахт туманлари бўйича уланиш даражаси (харита эмас, рўйхат)
        </div>
        <div className="mx-auto max-w-2xl">
          <Ranking title="Тошкент шаҳри туманлари" hint="пастдан юқорига" rows={rows} active={active} setActive={setActive} />
        </div>
      </div>
    );
  }

  // ---- country view ----
  const rows: RankRow[] = ranked.map((r) => ({
    key: r.name, name: r.name, percent: r.percent, ulangan: r.ulangan, total: r.total,
    href: `/hududlar/${regionSlug(r.name)}`,
  }));
  return (
    <div className="card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-12">
        <div className="border-b border-line p-3 sm:p-4 lg:col-span-7 lg:border-b-0 lg:border-r">
          <div className="mb-1 flex items-baseline justify-between px-1">
            <h2 className="text-[0.95rem] font-semibold">{S.overview.mapTitle}</h2>
            <span className="hidden text-[0.72rem] text-ink-faint sm:block">
              Ҳудуд устига босиб, туманларини кўринг
            </span>
          </div>
          <UzMap regions={geographic} activeRegion={active} onHover={setActive} onSelect={handleSelect} />
        </div>
        <div className="lg:col-span-5">
          <Ranking title={S.overview.rankingTitle} hint={S.overview.rankingHint} rows={rows} active={active} setActive={setActive} />
        </div>
      </div>
    </div>
  );
}

function DrillHeader({ viloyat, onBack }: { viloyat: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[0.8rem] font-medium text-ink-soft transition-colors hover:border-sov/50 hover:text-ink"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Барча ҳудудлар
      </button>
      <h2 className="truncate text-[0.98rem] font-semibold">{viloyat}</h2>
      <span className="ml-auto shrink-0">
        <Link href={`/hududlar/${regionSlug(viloyat)}`} className="text-[0.78rem] font-medium text-sov hover:text-sov-deep">
          Батафсил →
        </Link>
      </span>
    </div>
  );
}
