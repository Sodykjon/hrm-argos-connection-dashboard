import { fmtInt } from "@/lib/format";

type Good = "up" | "down";

/**
 * A change tile: the figure is the CHANGE since the previous live day, not a
 * total the hero already shows. Colour says whether the change is good
 * (more connected / fewer unconnected), not merely its sign.
 */
export function DeltaTile({
  label,
  value,
  good,
  hint,
  display,
  zeroText,
}: {
  label: string;
  value: number;
  good: Good;
  hint: string;
  display?: string; // pre-formatted value (e.g. percentage points)
  zeroText: string;
}) {
  const zero = Math.abs(value) < 1e-9;
  const isGood = !zero && (good === "up" ? value > 0 : value < 0);
  const tone = zero ? "text-ink-faint" : isGood ? "text-ul glow-ul" : "text-un glow-un";
  const dot = zero ? "bg-line" : isGood ? "bg-ul" : "bg-un";
  const text = display ?? `${value > 0 ? "+" : value < 0 ? "−" : ""}${fmtInt(Math.abs(value))}`;
  return (
    <div className="card relative flex h-full flex-col justify-between overflow-hidden p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-[0.8rem] font-medium text-ink-soft">{label}</span>
      </div>
      <div className={`tnum mt-3 text-[2rem] font-semibold leading-none tracking-tight sm:text-[2.35rem] ${tone}`}>
        {zero ? "0" : text}
      </div>
      <div className="mt-1.5 text-[0.72rem] text-ink-faint">{zero ? `${zeroText} · ${hint}` : hint}</div>
    </div>
  );
}
