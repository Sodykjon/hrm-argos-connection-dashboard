import type { TarkibGap } from "@/lib/tarkib";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

/**
 * Specialty deficits, worst-first, with a bar scaled to the largest gap.
 * Specialty names come from the source workbooks (Uzbek Cyrillic) and are
 * shown as-is in both languages — they are data labels, not UI copy.
 */
export async function GapsTable({ gaps }: { gaps: TarkibGap[] }) {
  const S = await getS();
  const max = Math.max(...gaps.map((g) => g.gap), 1);
  return (
    <table className="w-full border-collapse text-left text-[0.8rem]">
      <thead>
        <tr className="border-y border-line text-[0.68rem] uppercase tracking-wide text-ink-faint">
          <th className="px-2 py-2 font-medium">{S.tarkib.gapCol.name}</th>
          <th className="tnum hidden px-2 py-2 text-right font-medium sm:table-cell">
            {S.tarkib.gapCol.shtat}
          </th>
          <th className="tnum hidden px-2 py-2 text-right font-medium sm:table-cell">
            {S.tarkib.gapCol.jismoniy}
          </th>
          <th className="px-2 py-2 font-medium">{S.tarkib.gapCol.gap}</th>
          <th className="tnum hidden px-2 py-2 text-right font-medium md:table-cell">
            {S.tarkib.gapCol.pens}
          </th>
        </tr>
      </thead>
      <tbody>
        {gaps.map((g) => (
          <tr key={g.name} className="border-b border-line-soft">
            <td className="max-w-[26ch] px-2 py-2 leading-snug">{g.name}</td>
            <td className="tnum hidden px-2 py-2 text-right text-ink-soft sm:table-cell">
              {fmtInt(g.shtat)}
            </td>
            <td className="tnum hidden px-2 py-2 text-right text-ink-soft sm:table-cell">
              {fmtInt(g.jismoniy)}
            </td>
            <td className="px-2 py-2">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-14 overflow-hidden rounded-full bg-line-soft">
                  <span
                    className="block h-full rounded-full bg-un"
                    style={{ width: `${(g.gap / max) * 100}%` }}
                  />
                </span>
                <span className="tnum shrink-0 font-semibold text-un">
                  −{fmtInt(g.gap)}
                </span>
                <span className="tnum shrink-0 text-[0.72rem] text-ink-faint">
                  {fmtPct(g.shtat > 0 ? g.gap / g.shtat : 0, 1)}
                </span>
              </div>
            </td>
            <td className="tnum hidden px-2 py-2 text-right text-ink-soft md:table-cell">
              {g.pens > 0 ? fmtInt(g.pens) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
