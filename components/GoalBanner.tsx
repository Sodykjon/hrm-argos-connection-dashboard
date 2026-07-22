import type { Totals } from "@/lib/types";
import { fmtInt, fmtPct } from "@/lib/format";
import { S } from "@/lib/strings";

export function GoalBanner({ totals }: { totals: Totals }) {
  const gap = 1 - totals.percent;
  return (
    <div className="card flex flex-col gap-4 border-l-4 border-l-goal bg-goal-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-goal/12 text-goal">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          </svg>
        </span>
        <div>
          <div className="eyebrow text-goal">{S.goal.target}</div>
          <div className="mt-0.5 text-[0.92rem] font-semibold leading-snug text-ink">
            Барча тиббиёт ташкилотларини{" "}
            <span className="font-mono text-goal">{S.argosDomain}</span> тизимига{" "}
            <span className="text-goal">100%</span> улаш
          </div>
        </div>
      </div>
      <div className="flex items-center gap-5 self-stretch sm:self-auto">
        <div className="text-left sm:text-right">
          <div className="tnum text-[1.5rem] font-bold leading-none text-goal">
            {fmtPct(gap, 1)}
          </div>
          <div className="mt-1 text-[0.7rem] text-ink-faint">{S.goal.remaining}</div>
        </div>
        <div className="h-9 w-px bg-line" />
        <div className="text-left sm:text-right">
          <div className="tnum text-[1.5rem] font-bold leading-none text-un">
            {fmtInt(totals.ulanmagan)}
          </div>
          <div className="mt-1 text-[0.7rem] text-ink-faint">
            уланмаган ташкилот
          </div>
        </div>
      </div>
    </div>
  );
}
