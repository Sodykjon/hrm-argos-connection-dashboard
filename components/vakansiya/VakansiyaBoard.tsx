"use client";

import { useMemo, useState } from "react";
import type { KadrlarStat } from "@/lib/types";
import { VakansiyaMap } from "./VakansiyaMap";
import { riskRamp, riskT, riskColor } from "@/lib/pension-metrics";
import { vacancyMetrics } from "@/lib/vakansiya-metrics";
import { isGeographicRegion, regionLabel } from "@/lib/regions";
import { fmtInt, fmtPct } from "@/lib/format";
import { useS, useLang } from "@/lib/i18n/client";

export function VakansiyaBoard({ regions }: { regions: KadrlarStat[] }) {
  const S = useS();
  const lang = useLang();
  const [active, setActive] = useState<string | null>(null);

  const geographic = useMemo(
    () => regions.filter((r) => isGeographicRegion(r.name)),
    [regions],
  );

  // Ranked worst-first, GEOGRAPHIC ONLY — the same rule /pensiya had to be
  // corrected into. ARGOS's level branches are not regions, and a
  // one-hospital branch topping «Ҳудудлар рейтинги» answers the question
  // wrongly. The level rows still appear in full in the table below.
  const ranked = useMemo(
    () =>
      geographic
        .map((r) => ({ stat: r, m: vacancyMetrics(r) }))
        .sort((a, b) => b.m.rate - a.m.rate),
    [geographic],
  );

  // The colour scale spans only the geographic spread, matching the map.
  const ramp = useMemo(
    () => riskRamp(geographic.map((r) => vacancyMetrics(r).rate)),
    [geographic],
  );

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-12">
        <div className="border-b border-line p-3 sm:p-4 lg:col-span-7 lg:border-b-0 lg:border-r">
          <div className="mb-1 flex items-baseline justify-between px-1">
            <h2 className="text-[0.95rem] font-semibold">{S.vakansiya.mapTitle}</h2>
            <span className="hidden text-[0.72rem] text-ink-faint sm:block">
              {S.vakansiya.mapHint}
            </span>
          </div>
          <VakansiyaMap
            regions={geographic}
            activeRegion={active}
            onHover={setActive}
            />
          {/* The scale is relative, so it states its own endpoints. Removing
              this line would let a 2pp spread read as a national crisis. */}
          <p className="mt-1 px-1 text-[0.7rem] text-ink-faint">
            {S.vakansiya.mapKey(fmtPct(ramp.min, 1), fmtPct(ramp.max, 1))}
          </p>
        </div>

        <div className="p-3 sm:p-4 lg:col-span-5">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-[0.95rem] font-semibold">
              {S.vakansiya.rankingTitle}
            </h2>
            <span className="eyebrow">{S.vakansiya.rankingHint}</span>
          </div>
          <ol className="scroll-quiet flex max-h-[420px] flex-col gap-0.5 overflow-y-auto pr-1">
            {ranked.map(({ stat, m }, i) => {
              const isActive = active === stat.name;
              const color = riskColor(riskT(m.rate, ramp));
              // Bars are scaled to the worst region, not to 100% -- at ~14%
              // every bar would otherwise be a stub.
              const width =
                ramp.max > 0 ? (m.rate / ramp.max) * 100 : 0;
              return (
                <li key={stat.name}>
                  {/* Not a link: vacancies are one number per region, so there
                      is no per-region page to go to. Hover still syncs the map. */}
                  <div
                    onMouseEnter={() => setActive(stat.name)}
                    onMouseLeave={() => setActive(null)}
                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors ${
                      isActive ? "bg-paper" : ""
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
                          {fmtPct(m.rate, 1)}
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
                          {fmtInt(m.vacant)}
                        </span>
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
