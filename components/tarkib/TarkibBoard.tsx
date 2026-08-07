"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TarkibRegion } from "@/lib/tarkib";
import { vrachTaminlShare } from "@/lib/tarkib";
import {
  TarkibMap,
  coverageRamp,
  coverageT,
  coverageColor,
} from "./TarkibMap";
import { regionSlug, regionLabel } from "@/lib/regions";
import { fmtInt, fmtPct } from "@/lib/format";
import { useS, useLang } from "@/lib/i18n/client";

export function TarkibBoard({
  regions,
}: {
  regions: Array<{ name: string; region: TarkibRegion }>;
}) {
  const S = useS();
  const lang = useLang();
  const [active, setActive] = useState<string | null>(null);
  const router = useRouter();

  // Ranked worst-first: coverage is good-at-high, so the ranking ascends.
  const ranked = useMemo(
    () =>
      regions
        .map((r) => ({ ...r, share: vrachTaminlShare(r.region) }))
        .sort((a, b) => a.share - b.share),
    [regions],
  );

  const ramp = useMemo(
    () => coverageRamp(ranked.map((r) => r.share)),
    [ranked],
  );

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-12">
        <div className="border-b border-line p-3 sm:p-4 lg:col-span-7 lg:border-b-0 lg:border-r">
          <div className="mb-1 flex items-baseline justify-between px-1">
            <h2 className="text-[0.95rem] font-semibold">{S.tarkib.mapTitle}</h2>
            <span className="hidden text-[0.72rem] text-ink-faint sm:block">
              {S.tarkib.mapHint}
            </span>
          </div>
          <TarkibMap
            rows={regions}
            activeRegion={active}
            onHover={setActive}
            onSelect={(name) => router.push(`/tarkib/${regionSlug(name)}`)}
          />
          {/* The scale is relative, so it states its own endpoints. */}
          <p className="mt-1 px-1 text-[0.7rem] text-ink-faint">
            {S.tarkib.mapKey(fmtPct(ramp.min, 1), fmtPct(ramp.max, 1))}
          </p>
        </div>

        <div className="p-3 sm:p-4 lg:col-span-5">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-[0.95rem] font-semibold">
              {S.tarkib.rankingTitle}
            </h2>
            <span className="eyebrow">{S.tarkib.rankingHint}</span>
          </div>
          <ol className="scroll-quiet flex max-h-[420px] flex-col gap-0.5 overflow-y-auto pr-1">
            {ranked.map((r, i) => {
              const isActive = active === r.name;
              const color = coverageColor(coverageT(r.share, ramp));
              // Scaled to the best region: at ~54–91% an absolute scale would
              // start every bar past the middle and flatten the ranking.
              const width = ramp.max > 0 ? (r.share / ramp.max) * 100 : 0;
              return (
                <li key={r.name}>
                  <Link
                    href={`/tarkib/${regionSlug(r.name)}`}
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
                          {regionLabel(r.name, lang)}
                        </span>
                        <span
                          className="tnum shrink-0 text-[0.83rem] font-semibold"
                          style={{ color }}
                        >
                          {fmtPct(r.share, 1)}
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
                          {fmtInt(r.region.vrach.jismoniy)} {S.tarkib.vrachUnit}
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
