"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompletionRegionStat } from "@/lib/types";
import { CompletionMap } from "./CompletionMap";
import { isGeographicRegion, regionSlug } from "@/lib/regions";
import { rampColor, fmtInt, fmtPct } from "@/lib/format";
import { S } from "@/lib/strings";

export function CompletionBoard({ regions }: { regions: CompletionRegionStat[] }) {
  const [active, setActive] = useState<string | null>(null);
  const router = useRouter();

  const geographic = useMemo(
    () => regions.filter((r) => isGeographicRegion(r.name)),
    [regions],
  );
  const ranked = useMemo(
    () => [...regions].sort((a, b) => a.avg - b.avg),
    [regions],
  );

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-12">
        {/* map */}
        <div className="border-b border-line p-3 sm:p-4 lg:col-span-7 lg:border-b-0 lg:border-r">
          <div className="mb-1 flex items-baseline justify-between px-1">
            <h2 className="text-[0.95rem] font-semibold">{S.completion.mapTitle}</h2>
            <span className="hidden text-[0.72rem] text-ink-faint sm:block">
              {S.completion.mapHint}
            </span>
          </div>
          <CompletionMap
            regions={geographic}
            activeRegion={active}
            onHover={setActive}
            onSelect={(name) => router.push(`/toldirilish/${regionSlug(name)}`)}
          />
        </div>

        {/* ranking */}
        <div className="p-3 sm:p-4 lg:col-span-5">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-[0.95rem] font-semibold">
              {S.completion.rankingTitle}
            </h2>
            <span className="eyebrow">{S.completion.rankingHint}</span>
          </div>
          <ol className="scroll-quiet flex max-h-[420px] flex-col gap-0.5 overflow-y-auto pr-1">
            {ranked.map((r, i) => {
              const isActive = active === r.name;
              const color = rampColor(r.avg);
              return (
                <li key={r.name}>
                  <Link
                    href={`/toldirilish/${regionSlug(r.name)}`}
                    onMouseEnter={() => setActive(r.name)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(r.name)}
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
                          {r.name}
                        </span>
                        <span
                          className="tnum shrink-0 text-[0.83rem] font-semibold"
                          style={{ color }}
                        >
                          {fmtPct(r.avg, 1)}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${r.avg * 100}%`, background: color }}
                          />
                        </span>
                        <span className="tnum shrink-0 text-[0.66rem] text-ink-faint">
                          {fmtInt(r.orgCount)} {S.completion.orgsUnit}
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
