import type { RegionStat } from "@/lib/types";
import { rampColor, fmtPct } from "@/lib/format";

/** Continuously scrolling ticker of per-region connection status — reads like a
 *  live data stream. Pure CSS marquee (pauses on hover, static on reduced-motion). */
export function LiveFeed({ regions }: { regions: RegionStat[] }) {
  const items = [...regions].sort((a, b) => b.percent - a.percent);
  const loop = [...items, ...items]; // duplicated for a seamless -50% loop

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-line bg-surface/40 py-2"
      style={{
        WebkitMaskImage:
          "linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent)",
        maskImage:
          "linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent)",
      }}
    >
      <div className="marquee-track flex w-max items-center gap-7 px-4">
        {loop.map((r, i) => {
          const up = r.percent >= 0.75;
          const c = rampColor(r.percent);
          return (
            <span
              key={i}
              className="flex items-center gap-2 text-[0.8rem]"
              aria-hidden={i >= items.length}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: c, boxShadow: `0 0 8px ${c}` }}
              />
              <span className="text-ink-soft">{r.name}</span>
              <span className="tnum font-semibold" style={{ color: c }}>
                {fmtPct(r.percent, 1)}
              </span>
              <span
                className="text-[0.68rem]"
                style={{ color: up ? "var(--color-ul)" : "var(--color-un)" }}
              >
                {up ? "▲" : "▼"}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
