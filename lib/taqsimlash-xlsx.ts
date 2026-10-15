// «TTB → poliklinika» workbook: a region/district summary and a flat list of every target
// institution with its head count — the list regions get as their assignment (Latin, like the
// registry workbook).

import ExcelJS from "exceljs";
import { latinRegion } from "./argos-xlsx";
import type { TaqCounts, TaqResult, TaqStatus } from "./taqsimlash";

const STATUS: Record<TaqStatus, string> = {
  otkazilgan: "Xodimlar oʻtkazilgan",
  ttbda: "Xodimlar hali TTBda",
  stirYoq: "Oʻz STIRi yoʻq",
  daraxtdaYoq: "ARGOS daraxtida yoʻq",
};
const FILL: Record<TaqStatus, string> = {
  otkazilgan: "FFE3F4E8",
  ttbda: "FFFBE3E1",
  stirYoq: "FFFFF1D6",
  daraxtdaYoq: "FFEDEFF3",
};

const thin = { style: "thin" as const, color: { argb: "FFC9D2DE" } };
const BOX: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin };
const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function stamp(iso: string) {
  const d = new Date(new Date(iso).getTime() + 5 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    text: `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
    file: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`,
  };
}

function head(ws: ExcelJS.Worksheet, title: string, sub: string, cols: { h: string; w: number }[]) {
  ws.mergeCells(1, 1, 1, cols.length);
  ws.getCell(1, 1).value = title;
  ws.getCell(1, 1).font = { bold: true, size: 13 };
  ws.mergeCells(2, 1, 2, cols.length);
  ws.getCell(2, 1).value = sub;
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: "FF5B6B82" } };
  const h = ws.getRow(4);
  cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.w;
    const cell = h.getCell(i + 1);
    cell.value = c.h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = fill("FF1F3A5F");
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = BOX;
  });
  h.height = 30;
  ws.views = [{ state: "frozen", ySplit: 4 }];
}

function counts(c: TaqCounts) {
  return [c.total, c.otkazilgan, Math.round(c.percent * 1000) / 10, c.ttbda, c.stirYoq, c.daraxtdaYoq, c.staff];
}

export async function taqWorkbook(r: TaqResult, at: string, who?: string): Promise<{ buf: Buffer; filename: string }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "hrm-argos-dashboard";
  wb.created = new Date(at);
  const s = stamp(at);
  const sub = `Holat: ${s.text} (ARGOS, xodimlar soni)${who ? ` · Masʼul: ${who}` : ""}. Bajarildi = muassasa tugunida ARGOSda kamida 1 xodim.`;

  const sum = wb.addWorksheet("Umumiy");
  head(sum, "TTB → poliklinika: xodimlarni oʻz muassasasiga taqsimlash", sub, [
    { h: "Hudud", w: 28 },
    { h: "Tuman / shahar", w: 28 },
    { h: "Jami", w: 9 },
    { h: "Oʻtkazilgan", w: 12 },
    { h: "%", w: 8 },
    { h: "TTBda", w: 9 },
    { h: "STIR yoʻq", w: 10 },
    { h: "ARGOSda yoʻq", w: 11 },
    { h: "Oʻtkazilgan xodimlar", w: 13 },
    { h: "TTBda qolgan xodimlar", w: 13 },
  ]);
  const put = (vals: (string | number | null)[], bold: boolean, bg?: string) => {
    const row = sum.addRow(vals);
    row.eachCell({ includeEmpty: true }, (c, i) => {
      c.border = BOX;
      if (bold) c.font = { bold: true };
      if (bg) c.fill = fill(bg);
      if (i === 5) c.numFmt = "0.0";
    });
  };
  for (const reg of r.regions) {
    put([latinRegion(reg.name).full, null, ...counts(reg), null], true, "FFEAF0F7");
    for (const d of reg.districts) {
      const left = d.parents.reduce<number | null>((x, p) => (p.staff === null ? x : (x ?? 0) + p.staff), null);
      put([null, d.name, ...counts(d), left], false);
    }
  }
  put(["JAMI", null, ...counts(r.totals), null], true, "FFDCE4EE");
  sum.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 10 } };

  const list = wb.addWorksheet("Muassasalar");
  head(list, "Muassasalar roʻyxati", sub, [
    { h: "№", w: 6 },
    { h: "Hudud", w: 24 },
    { h: "Tuman / shahar", w: 24 },
    { h: "Muassasa", w: 54 },
    { h: "STIR", w: 13 },
    { h: "Xodimlar (ARGOS)", w: 11 },
    { h: "Holat", w: 22 },
    { h: "Izoh", w: 10 },
  ]);
  let n = 0;
  for (const reg of r.regions)
    for (const d of reg.districts)
      for (const o of d.orgs) {
        const row = list.addRow([++n, latinRegion(reg.name).full, d.name, o.name, o.stir, o.staff, STATUS[o.status], o.pilot ? "pilot" : null]);
        row.eachCell({ includeEmpty: true }, (c) => (c.border = BOX));
        row.getCell(7).fill = fill(FILL[o.status]);
      }
  list.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 8 } };

  const tag = who ? `_${who.replace(/[^\p{L}\p{N}]+/gu, "_")}` : "";
  return { buf: Buffer.from(await wb.xlsx.writeBuffer()), filename: `TTB_poliklinika${tag}_${s.file}.xlsx` };
}
