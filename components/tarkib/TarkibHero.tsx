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
  const hidden = Math.max(0, vrachHidden(region));
  const v = region.vrach;

  // The one decomposition that matters on this page: of every штат position,
  // how much is really held by a physical doctor, how much is papered over by
  // ўриндошлик (hidden vacancy), and how much is officially empty. The old
  // full-width red→green gradient bar encoded nothing — this is the same
  // pixels spent on the page's central critical finding.
  const total = Math.max(1, v.shtat);
  const segs = [
    { key: "jismoniy", value: v.jismoniy, cls: "bg-sov", label: S.tarkib.heroJismoniy, txt: "text-sov" },
    { key: "hidden", value: hidden, cls: "bg-warn", label: S.tarkib.heroHidden, txt: "text-warn" },
    { key: "bosh", value: v.bosh, cls: "bg-un", label: S.tarkib.heroBosh, txt: "text-un" },
  ];

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

      {/* Штат decomposition: segments sum to 100% of positions; 2px gaps keep
          the three parts countable, labels below carry name + value + share. */}
      <div className="mt-3 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full">
        {segs.map((s) => (
          <div
            key={s.key}
            className={`${s.cls} h-full first:rounded-l-full last:rounded-r-full`}
            style={{ width: `${(s.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.78rem] text-ink-soft">
        {segs.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <i className={`${s.cls} h-2 w-2 shrink-0 rounded-[2px]`} aria-hidden />
            {s.label}{" "}
            <span className={`tnum font-semibold ${s.txt}`}>{fmtInt(s.value)}</span>
            <span className="tnum text-[0.7rem] text-ink-faint">
              {fmtPct(s.value / total, 1)}
            </span>
          </span>
        ))}
      </div>
      <p className="mt-2 text-[0.74rem] leading-snug text-ink-faint">
        {S.tarkib.heroDecompNote}
      </p>
    </section>
  );
}
