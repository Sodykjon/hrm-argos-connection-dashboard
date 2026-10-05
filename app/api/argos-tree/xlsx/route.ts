import * as XLSX from "xlsx";
import { getLive } from "@/lib/argos-live-data";
import { fmtTashkent } from "@/components/argos-live/time";
import { getS } from "@/lib/i18n/server";
import { isRepublic, regionLabel } from "@/lib/regions";
import { buildTree } from "@/lib/argos-live-view";
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
  const tree = buildTree(live.result);
  const t = live.result.totals;
  const T = L.tree;
  const sum = XLSX.utils.aoa_to_sheet([
    [L.title],
    [`${L.lastChecked}: ${fmtTashkent(live.manifest?.checkedAt ?? live.tree.at)}`],
    [],
    ["№", L.col.region, S.overview.col.total, S.status.ulangan, S.status.ulanmagan, S.status.ochirilganShort, "%"],
    ...tree.map((r, i) => [i + 1, regionLabel(r.name, lang), r.total, r.ulangan, r.ulanmagan, r.ochirilgan, pct(r.percent)]),
    ["", S.units.totalRow, t.total, t.ulangan, t.ulanmagan, t.ochirilgan, pct(t.percent)],
  ]);
  sum["!cols"] = [{ wch: 4 }, { wch: 38 }, { wch: 8 }, { wch: 10 }, { wch: 11 }, { wch: 11 }, { wch: 7 }];
  XLSX.utils.book_append_sheet(wb, sum, "Umumiy");

  // One sheet per region in the workbook's shape: a summary line per group, then its rows.
  for (const r of tree) {
    const rep = isRepublic(r.name);
    const aoa: (string | number)[][] = [
      [regionLabel(r.name, lang)],
      [],
      [
        "№",
        rep ? T.col.system : T.col.group,
        ...(rep ? [L.col.region] : []),
        L.col.name,
        L.col.stir,
        L.col.status,
        T.col.contract,
        `${T.col.pay}, %`,
        T.col.sub,
        T.changed,
        L.col.reason,
      ],
    ];
    for (const g of r.groups) {
      aoa.push([
        "",
        `${g.name} — ${S.overview.col.percent} ${pct(g.percent)}% · ${S.overview.col.total} ${g.total} · ${S.status.ulangan} ${g.ulangan} · ${S.status.ulanmagan} ${g.ulanmagan} · ${S.status.ochirilganShort} ${g.ochirilgan}`,
      ]);
      for (const o of g.orgs)
        aoa.push([
          o.n,
          g.name,
          ...(rep ? [o.hudud ?? ""] : []),
          o.name,
          o.stir ?? "",
          st(o.status),
          o.contract ?? "",
          o.pay ?? "",
          o.sub ?? "",
          o.ch > 0 ? `▲ ${T.up}` : o.ch < 0 ? `▼ ${T.down}` : "",
          [L.reasons[o.reason], o.note].filter(Boolean).join(" · "),
        ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 26 },
      ...(rep ? [{ wch: 22 }] : []),
      { wch: 60 },
      { wch: 11 },
      { wch: 16 },
      { wch: 16 },
      { wch: 8 },
      { wch: 24 },
      { wch: 22 },
      { wch: 40 },
    ];
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
