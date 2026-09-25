import * as XLSX from "xlsx";
import { getLive } from "@/lib/argos-live-data";
import { fmtTashkent } from "@/components/argos-live/time";
import { getS } from "@/lib/i18n/server";
import { regionLabel } from "@/lib/regions";
import { getLang } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same shape as the hand-maintained workbook: «Umumiy» + one sheet per region.
export async function GET() {
  const live = await getLive();
  if (!live) return new Response("no data", { status: 404 });
  const S = await getS();
  const L = S.argosLive;
  const lang = await getLang();
  const st = (s: "ulangan" | "ulanmagan" | "ochirilgan") =>
    s === "ulangan" ? S.status.ulangan : s === "ulanmagan" ? S.status.ulanmagan : S.status.ochirilgan;
  const pct = (x: number) => Math.round(x * 1000) / 10;

  const wb = XLSX.utils.book_new();
  const regs = [...live.result.regions].sort((a, b) => a.percent - b.percent);
  const t = live.result.totals;
  const sum = XLSX.utils.aoa_to_sheet([
    [L.title],
    [`${L.lastChecked}: ${fmtTashkent(live.manifest?.checkedAt ?? live.tree.at)}`],
    [],
    ["№", L.col.region, S.overview.col.total, S.status.ulangan, S.status.ulanmagan, S.status.ochirilganShort, "%"],
    ...regs.map((r, i) => [i + 1, regionLabel(r.name, lang), r.total, r.ulangan, r.ulanmagan, r.ochirilgan, pct(r.percent)]),
    ["", S.units.totalRow, t.total, t.ulangan, t.ulanmagan, t.ochirilgan, pct(t.percent)],
  ]);
  sum["!cols"] = [{ wch: 4 }, { wch: 38 }, { wch: 8 }, { wch: 10 }, { wch: 11 }, { wch: 11 }, { wch: 7 }];
  XLSX.utils.book_append_sheet(wb, sum, "Umumiy");

  for (const r of live.result.regions) {
    const orgs = live.result.orgs.filter((o) => o.region === r.name);
    const ws = XLSX.utils.aoa_to_sheet([
      ["№", L.col.district, L.col.name, L.col.stir, L.col.status, L.col.billing, L.col.reason],
      ...orgs.map((o, i) => [
        i + 1,
        o.district ?? "",
        o.name,
        o.stir ?? "",
        st(o.status),
        o.billing === null ? L.notInTree : o.billing ? L.billingOn : L.billingOff,
        L.reasons[o.reason],
      ]),
    ]);
    ws["!cols"] = [{ wch: 5 }, { wch: 24 }, { wch: 60 }, { wch: 11 }, { wch: 18 }, { wch: 12 }, { wch: 34 }];
    ws["!autofilter"] = { ref: `A1:G${orgs.length + 1}` };
    const name = regionLabel(r.name, lang).replace(/[\\/?*[\]:]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const stamp = fmtTashkent(live.manifest?.checkedAt ?? live.tree.at).replace(/[.,: ]+/g, "-");
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="HRM_ARGOS_jonli_${stamp}.xlsx"`,
    },
  });
}
