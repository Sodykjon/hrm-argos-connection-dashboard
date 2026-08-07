import type { TarkibDistrict } from "@/lib/tarkib";
import { taminlShare, vakShare } from "@/lib/tarkib";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

/**
 * District rows within one region, worst doctor coverage first. Static server
 * markup: at 12–23 rows there is nothing to search or paginate, and district
 * names are workbook data (Uzbek Cyrillic) in both languages.
 */
export async function DistrictTable({ districts }: { districts: TarkibDistrict[] }) {
  const S = await getS();
  const rows = [...districts].sort((a, b) => a.vrachTaminl - b.vrachTaminl);
  return (
    <div className="scroll-quiet overflow-x-auto">
      <table className="w-full border-collapse text-left text-[0.78rem]">
        <thead>
          <tr className="border-y border-line text-[0.66rem] uppercase tracking-wide text-ink-faint">
            <th className="px-2 py-2 font-medium">{S.tarkib.distCol.name}</th>
            <th className="tnum px-2 py-2 text-right font-medium">{S.tarkib.distCol.shtat}</th>
            <th className="tnum hidden px-2 py-2 text-right font-medium md:table-cell">
              {S.tarkib.distCol.vak}
            </th>
            <th className="tnum px-2 py-2 text-right font-medium">
              {S.tarkib.distCol.jismoniy}
            </th>
            <th className="tnum hidden px-2 py-2 text-right font-medium sm:table-cell">
              {S.tarkib.distCol.taminl}
            </th>
            <th className="tnum px-2 py-2 text-right font-medium">{S.tarkib.distCol.vrach}</th>
            <th className="tnum hidden px-2 py-2 text-right font-medium md:table-cell">
              {S.tarkib.distCol.pens}
            </th>
            <th className="tnum hidden px-2 py-2 text-right font-medium lg:table-cell">
              {S.tarkib.distCol.r5}
            </th>
            <th className="tnum hidden px-2 py-2 text-right font-medium lg:table-cell">
              {S.tarkib.distCol.sof}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const vt = d.vrachTaminl;
            return (
              <tr key={d.name} className="border-b border-line-soft hover:bg-paper">
                <td className="px-2 py-2 font-medium leading-snug">{d.name}</td>
                <td className="tnum px-2 py-2 text-right text-ink-soft">
                  {fmtInt(d.shtat)}
                </td>
                <td className="tnum hidden px-2 py-2 text-right text-ink-soft md:table-cell">
                  {fmtPct(vakShare(d), 1)}
                </td>
                <td className="tnum px-2 py-2 text-right text-ink-soft">
                  {fmtInt(d.jismoniy)}
                </td>
                <td className="tnum hidden px-2 py-2 text-right text-ink-soft sm:table-cell">
                  {fmtPct(taminlShare(d), 1)}
                </td>
                <td
                  className={`tnum px-2 py-2 text-right font-semibold ${
                    vt < 60 ? "text-un" : vt < 85 ? "text-warn" : "text-ul"
                  }`}
                >
                  {vt.toFixed(1).replace(".", ",")}%
                </td>
                <td className="tnum hidden px-2 py-2 text-right text-ink-soft md:table-cell">
                  {fmtInt(d.pens)}
                </td>
                <td className="tnum hidden px-2 py-2 text-right text-ink-soft lg:table-cell">
                  {d.r5.toFixed(1).replace(".", ",")}%
                </td>
                <td
                  className={`tnum hidden px-2 py-2 text-right lg:table-cell ${
                    d.sof < 0 ? "text-un" : "text-ink-soft"
                  }`}
                >
                  {d.sof < 0 ? `−${fmtInt(-d.sof)}` : `+${fmtInt(d.sof)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
