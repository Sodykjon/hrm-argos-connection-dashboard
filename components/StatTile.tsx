import { AnimatedNumber } from "./motion/AnimatedNumber";
import { fmtPct } from "@/lib/format";

type Accent = "sov" | "ul" | "un" | "och";

const ACCENT_DOT: Record<Accent, string> = {
  sov: "bg-sov",
  ul: "bg-ul",
  un: "bg-un",
  och: "bg-och",
};
const ACCENT_TEXT: Record<Accent, string> = {
  sov: "text-sov glow-sov",
  ul: "text-ul glow-ul",
  un: "text-un glow-un",
  och: "text-ink",
};
const ACCENT_VIA: Record<Accent, string> = {
  sov: "via-sov",
  ul: "via-ul",
  un: "via-un",
  och: "via-och",
};

interface StatTileProps {
  label: string;
  value: number;
  accent: Accent;
  hint?: string;
  shareOfTotal?: number; // 0..1 -> shown as "%dan"
}

export function StatTile({ label, value, accent, hint, shareOfTotal }: StatTileProps) {
  return (
    <div className="card relative flex h-full flex-col justify-between overflow-hidden p-4 sm:p-5">
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent to-transparent opacity-70 ${ACCENT_VIA[accent]}`}
      />
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${ACCENT_DOT[accent]}`} />
        <span className="text-[0.8rem] font-medium text-ink-soft">{label}</span>
      </div>
      <div className="mt-3">
        <AnimatedNumber
          value={value}
          className={`tnum text-[2rem] font-semibold leading-none tracking-tight sm:text-[2.35rem] ${ACCENT_TEXT[accent]}`}
        />
      </div>
      <div className="mt-1.5 flex items-baseline gap-2 text-[0.72rem] text-ink-faint">
        {hint && <span>{hint}</span>}
        {shareOfTotal !== undefined && (
          <span className="tnum">{fmtPct(shareOfTotal, 1)} жамидан</span>
        )}
      </div>
    </div>
  );
}
