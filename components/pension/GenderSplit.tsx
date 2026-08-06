import type { KadrlarStat } from "@/lib/types";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

const MEN = "#3fb6ff"; // sov blue
const WOMEN = "#ff7eb6"; // pink

/**
 * Overall gender composition, NOT per age band — checked 07.08.2026 against
 * every ARGOS surface (constructor catalogue, GetWomenInfo, GetStaffComposition,
 * Stat/GetEmployeeAgeByRegion): age bands carry no gender split anywhere, so a
 * men/women age pyramid cannot be drawn from real data. What IS real is
 * totalWomen per region, and men as its complement.
 */
export async function GenderSplit({ stat }: { stat: KadrlarStat }) {
  const S = await getS();
  const total = Math.max(0, stat.total);
  const women = Math.min(total, Math.max(0, stat.totalWomen));
  const men = total - women;
  if (total <= 0) return null;

  const wShare = women / total;
  const mShare = men / total;

  return (
    <div className="mt-4 border-t border-line-soft pt-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[0.78rem] font-medium text-ink-soft">
          {S.pension.genderTitle}
        </span>
        <span className="text-[0.68rem] text-ink-faint">{S.pension.genderNote}</span>
      </div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`${S.pension.col.women} ${fmtPct(wShare, 1)}, ${S.pension.men} ${fmtPct(mShare, 1)}`}
      >
        <span style={{ width: `${wShare * 100}%`, background: WOMEN }} />
        <span style={{ width: `${mShare * 100}%`, background: MEN }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.75rem]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: WOMEN }} aria-hidden />
          <span className="text-ink-soft">{S.pension.col.women}</span>
          <span className="tnum font-semibold text-ink">{fmtInt(women)}</span>
          <span className="tnum text-ink-faint">({fmtPct(wShare, 1)})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: MEN }} aria-hidden />
          <span className="text-ink-soft">{S.pension.men}</span>
          <span className="tnum font-semibold text-ink">{fmtInt(men)}</span>
          <span className="tnum text-ink-faint">({fmtPct(mShare, 1)})</span>
        </span>
      </div>
    </div>
  );
}
