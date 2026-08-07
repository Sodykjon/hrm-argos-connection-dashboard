import type { TarkibRegion } from "@/lib/tarkib";
import { vrachTaminlShare, vrachHidden } from "@/lib/tarkib";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

/**
 * The doctor-coverage strip. StatTile can only animate an integer, and the one
 * number this page leads with is a percentage — so it gets its own card, with
 * the split between official and hidden vacancy spelled out next to it.
 */
export async function TarkibHero({ region }: { region: TarkibRegion }) {
  const S = await getS();
  const share = vrachTaminlShare(region);
  const hidden = vrachHidden(region);
  const v = region.vrach;

  // Same visual grammar as the ranking bars: red at low coverage, green high.
  const pct = Math.min(100, share * 100);

  return (
    <section className="card relative overflow-hidden p-4 sm:p-5">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sov to-transparent"
        aria-hidden
      />
      <p className="eyebrow">{S.tarkib.heroEyebrow}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="tnum text-[2.2rem] font-bold leading-none tracking-tight sm:text-[2.6rem]">
          {fmtPct(share, 1)}
        </span>
        <span className="text-[0.85rem] text-ink-soft">
          {S.tarkib.heroTail(fmtInt(v.jismoniy), fmtInt(v.shtat))}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line-soft">
        <div
          className="h-full rounded-full bg-gradient-to-r from-un via-warn to-ul"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-[0.78rem] text-ink-soft">
        <span className="tnum font-semibold text-un">{fmtInt(v.bosh)}</span>{" "}
        {S.tarkib.heroBosh} ·{" "}
        <span className="tnum font-semibold text-warn">{fmtInt(hidden)}</span>{" "}
        {S.tarkib.heroHidden}
      </p>
    </section>
  );
}
