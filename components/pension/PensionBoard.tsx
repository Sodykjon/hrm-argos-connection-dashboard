"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { KadrlarStat } from "@/lib/types";
import { PensionMap } from "./PensionMap";
import { pensionMetrics, riskRamp, riskT, riskColor } from "@/lib/pension-metrics";
import { isGeographicRegion, regionSlug, regionLabel } from "@/lib/regions";
import { fmtInt, fmtPct } from "@/lib/format";
import { useS, useLang } from "@/lib/i18n/client";

export function PensionBoard({ regions }: { regions: KadrlarStat[] }) {
  const S = useS();
  const lang = useLang();
  const [active, setActive] = useState<string | null>(null);
  const router = useRouter();

  const geographic = useMemo(
    () => regions.filter((r) => isGeographicRegion(r.name)),
    [regions],
  );

  // Ranked worst-first, GEOGRAPHIC ONLY. The heading says «Ҳудудлар рейтинги»
  // and Республика муассасалари is not a region — on the first real pull its
  // branch ranked above Tashkent city's 48 768 people. A ranking that answers
  // "which region is worst" must not be topped by something that is not a
  // region. That row is still shown in full in the table below.
  const ranked = useMemo(
    () =>
      geographic
        .map((r) => ({ stat: r, m: pensionMetrics(r) }))
        .sort((a, b) => b.m.exposedShare - a.m.exposedShare),
    [geographic],
  );

  // The colour scale spans only the geographic spread, matching the map.
  const ramp = useMemo(
    () => riskRamp(geographic.map((r) => pensionMetrics(r).exposedShare)),
    [geographic],
  );

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-12">
        <div className="border-b border-line p-3 sm:p-4 lg:col-span-7 lg:border-b-0 lg:border-r">
          <div className="mb-1 flex items-baseline justify-between px-1">
            <h2 className="text-[0.95rem] font-semibold">{S.pension.mapTitle}</h2>
            <span className="hidden text-[0.72rem] text-ink-faint sm:block">
              {S.pension.mapHint}
            </span>
          </div>
          <PensionMap
            regions={geographic}
            activeRegion={active}
            onHover={setActive}
            onSelect={(name) => router.push(`/pensiya/${regionSlug(name)}`)}
          />
          {/* The scale is relative, so it states its own endpoints. Removing
              this line would let a 2pp spread read as a national crisis. */}
          <p className="mt-1 px-1 text-[0.7rem] text-ink-faint">
            {S.pension.mapKey(fmtPct(ramp.min, 1), fmtPct(ramp.max, 1))}
          </p>
        </div>

        <div className="p-3 sm:p-4 lg:col-span-5">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-[0.95rem] font-semibold">
              {S.pension.rankingTitle}
            </h2>
            <span className="eyebrow">{S.pension.rankingHint}</span>
          </div>
          <ol className="scroll-quiet flex max-h-[420px] flex-col gap-0.5 overflow-y-auto pr-1">
            {ranked.map(({ stat, m }, i) => {
              const isActive = active === stat.name;
              const color = riskColor(riskT(m.exposedShare, ramp));
              // Bars are scaled to the worst region, not to 100% -- at ~14%
              // every bar would otherwise be a stub.
              const width =
                ramp.max > 0 ? (m.exposedShare / ramp.max) * 100 : 0;
              return (
                <li key={stat.name}>
                  <Link
                    href={`/pensiya/${regionSlug(stat.name)}`}
                    onMouseEnter={() => setActive(stat.name)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(stat.name)}
                    onBlur={() => setActive(null)}
                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors ${
                      isActive ? "bg-paper" : "hover:bg-paper"
                    }`}
                  >
                    <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-md bg-line-soft text-[0.72rem] font-semibold text-ink-soft">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[0.83rem] font-medium">
                          {regionLabel(stat.name, lang)}
                        </span>
                        <span
                          className="tnum shrink-0 text-[0.83rem] font-semibold"
                          style={{ color }}
                        >
                          {fmtPct(m.exposedShare, 1)}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${width}%`, background: color }}
                          />
                        </span>
                        <span className="tnum shrink-0 text-[0.66rem] text-ink-faint">
                          {fmtInt(m.exposed)} {S.pension.peopleUnit}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
