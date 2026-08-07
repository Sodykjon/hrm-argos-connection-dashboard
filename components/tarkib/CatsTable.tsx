import type { TarkibRegion } from "@/lib/tarkib";
import { taminlShare, vakShare, koef } from "@/lib/tarkib";
import { fmtInt, fmtPct } from "@/lib/format";
import { getS } from "@/lib/i18n/server";

type CatLabelKey = "vrach" | "orta" | "kichik" | "boshqa" | "notibbiy" | "provfarm";

/** The §1-style category breakdown: six rows plus the reconciled total. */
export async function CatsTable({ region }: { region: TarkibRegion }) {
  const S = await getS();
  return (
    <div className="scroll-quiet overflow-x-auto">
      <table className="w-full border-collapse text-left text-[0.8rem]">
        <thead>
          <tr className="border-y border-line text-[0.68rem] uppercase tracking-wide text-ink-faint">
            <th className="px-2 py-2 font-medium">{S.tarkib.catCol.cat}</th>
            <th className="tnum px-2 py-2 text-right font-medium">{S.tarkib.catCol.shtat}</th>
            <th className="tnum hidden px-2 py-2 text-right font-medium sm:table-cell">
              {S.tarkib.catCol.bosh}
            </th>
            <th className="tnum hidden px-2 py-2 text-right font-medium md:table-cell">
              {S.tarkib.catCol.vak}
            </th>
            <th className="tnum px-2 py-2 text-right font-medium">{S.tarkib.catCol.jismoniy}</th>
            <th className="tnum px-2 py-2 text-right font-medium">{S.tarkib.catCol.taminl}</th>
            <th className="tnum hidden px-2 py-2 text-right font-medium md:table-cell">
              {S.tarkib.catCol.koef}
            </th>
            <th className="tnum hidden px-2 py-2 text-right font-medium lg:table-cell">
              {S.tarkib.catCol.dekret}
            </th>
          </tr>
        </thead>
        <tbody>
          {region.cats.map((c) => {
            const t = taminlShare(c);
            return (
              <tr key={c.key} className="border-b border-line-soft">
                <td className="px-2 py-2 font-medium leading-snug">
                  {S.tarkib.cat[c.key as CatLabelKey] ?? c.key}
                </td>
                <td className="tnum px-2 py-2 text-right text-ink-soft">{fmtInt(c.shtat)}</td>
                <td className="tnum hidden px-2 py-2 text-right text-ink-soft sm:table-cell">
                  {fmtInt(c.bosh)}
                </td>
                <td className="tnum hidden px-2 py-2 text-right text-ink-soft md:table-cell">
                  {fmtPct(vakShare(c), 1)}
                </td>
                <td className="tnum px-2 py-2 text-right">{fmtInt(c.jismoniy)}</td>
                <td
                  className={`tnum px-2 py-2 text-right font-semibold ${
                    t < 0.8 ? "text-un" : t < 0.95 ? "text-warn" : "text-ink"
                  }`}
                >
                  {fmtPct(t, 1)}
                </td>
                <td className="tnum hidden px-2 py-2 text-right text-ink-soft md:table-cell">
                  {koef(c).toFixed(2).replace(".", ",")}
                </td>
                <td className="tnum hidden px-2 py-2 text-right text-ink-soft lg:table-cell">
                  {fmtInt(c.dekret)}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-line bg-paper font-semibold">
            <td className="px-2 py-2">{S.tarkib.catCol.jami}</td>
            <td className="tnum px-2 py-2 text-right">{fmtInt(region.shtat)}</td>
            <td className="tnum hidden px-2 py-2 text-right sm:table-cell">
              {fmtInt(region.bosh)}
            </td>
            <td className="tnum hidden px-2 py-2 text-right md:table-cell">
              {fmtPct(vakShare(region), 1)}
            </td>
            <td className="tnum px-2 py-2 text-right">{fmtInt(region.jismoniy)}</td>
            <td className="tnum px-2 py-2 text-right">{fmtPct(taminlShare(region), 1)}</td>
            <td className="tnum hidden px-2 py-2 text-right md:table-cell">
              {koef(region).toFixed(2).replace(".", ",")}
            </td>
            <td className="tnum hidden px-2 py-2 text-right lg:table-cell">
              {fmtInt(region.dekret)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
