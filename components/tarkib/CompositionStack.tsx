import type { TarkibRegion } from "@/lib/tarkib";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

// Fixed order and colors: the four big blocks, then everything else greyed.
const SEGMENTS: Array<{ keys: string[]; labelKey: "vrach" | "orta" | "kichik" | "boshqa" | "rest"; color: string }> = [
  { keys: ["vrach"], labelKey: "vrach", color: "var(--color-sov)" },
  { keys: ["orta"], labelKey: "orta", color: "var(--color-ul)" },
  { keys: ["kichik"], labelKey: "kichik", color: "var(--color-goal)" },
  { keys: ["boshqa"], labelKey: "boshqa", color: "var(--color-warn)" },
  { keys: ["notibbiy", "provfarm"], labelKey: "rest", color: "var(--color-och)" },
];

export async function CompositionStack({ region }: { region: TarkibRegion }) {
  const S = await getS();
  const total = region.jismoniy || 1;
  const byKey = Object.fromEntries(region.cats.map((c) => [c.key, c.jismoniy]));
  const parts = SEGMENTS.map((seg) => ({
    ...seg,
    value: seg.keys.reduce((acc, k) => acc + (byKey[k] ?? 0), 0),
  }));

  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-line-soft">
        {parts.map((p) => (
          <div
            key={p.labelKey}
            style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
            className="[&:not(:last-child)]:border-r [&:not(:last-child)]:border-surface"
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.75rem] text-ink-soft">
        {parts.map((p) => (
          <span key={p.labelKey} className="inline-flex items-center gap-1.5">
            <i
              className="h-2 w-2 rounded-[2px]"
              style={{ background: p.color }}
              aria-hidden
            />
            {S.tarkib.cat[p.labelKey]}{" "}
            <b className="tnum font-semibold text-ink">
              {fmtInt(p.value)} ({fmtPct(p.value / total, 1)})
            </b>
          </span>
        ))}
      </div>
    </div>
  );
}
