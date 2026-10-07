// The «ARGOS жонли» Excel export, laid out like the hand-maintained registry
// workbook (HRM_ARGOS_05.10.2026_BARCHA_HUDUDLAR_FINAL_v3.xlsx): «Umumiy»,
// one sheet per region (title, KPI boxes, district summary rows with the org
// rows grouped under them), «Roʻyxatdan chiqarilganlar» and «Takroriy STIR».
// The workbook is Uzbek Latin whatever the site language, as the original is.
// Server-only (exceljs).

import ExcelJS from "exceljs";
import JSZip from "jszip";
import type { ExcludedOrg, LiveOrg, LiveStatus, Reason, RemovedOrg } from "./argos-live";
import type { TreeOrg, TreeRegion } from "./argos-live-view";
import { isRepublic } from "./regions";

// Colours taken from the workbook.
const C = {
  navy: "FF1F3864",
  head: "FF305496",
  grid: "FFBFBFBF",
  grey: "FF808080",
  dim: "FF595959",
  note: "FF7F7F7F",
  sub: "FF404040",
  text: "FF262626",
  blueSoft: "FFD9E1F2",
  ulFill: "FFC6EFCE",
  ulInk: "FF006100",
  unFill: "FFFFC7CE",
  unInk: "FF9C0006",
  ochFill: "FFE7E6E6",
  ochInk: "FF595959",
  dupFill: "FFFCE4D6",
  dupInk: "FF833C0B",
  dupRow: "FFFFF4EC",
  low: "FFFBE4E6",
  mid: "FFFFF6DF",
  high: "FFEAF3EA",
  pctLow: "FFFFC7CE",
  pctMid: "FFFFEB9C",
} as const;

/** Sheet name and full Latin name for each canonical (Cyrillic) region. */
const LATIN: Record<string, { sheet: string; full: string }> = {
  "Республика муассасалари": { sheet: "Respublika markazlari", full: "Respublika markazlari va boʻlinmalari" },
  "Қорақалпоғистон Республикаси": { sheet: "Qoraqalpogʻiston", full: "Qoraqalpogʻiston Respublikasi" },
  "Андижон вилояти": { sheet: "Andijon", full: "Andijon viloyati" },
  "Бухоро вилояти": { sheet: "Buxoro", full: "Buxoro viloyati" },
  "Жиззах вилояти": { sheet: "Jizzax", full: "Jizzax viloyati" },
  "Қашқадарё вилояти": { sheet: "Qashqadaryo", full: "Qashqadaryo viloyati" },
  "Навоий вилояти": { sheet: "Navoiy", full: "Navoiy viloyati" },
  "Наманган вилояти": { sheet: "Namangan", full: "Namangan viloyati" },
  "Самарқанд вилояти": { sheet: "Samarqand", full: "Samarqand viloyati" },
  "Сурхондарё вилояти": { sheet: "Surxondaryo", full: "Surxondaryo viloyati" },
  "Сирдарё вилояти": { sheet: "Sirdaryo", full: "Sirdaryo viloyati" },
  "Тошкент вилояти": { sheet: "Toshkent viloyati", full: "Toshkent viloyati" },
  "Фарғона вилояти": { sheet: "Fargʻona", full: "Fargʻona viloyati" },
  "Хоразм вилояти": { sheet: "Xorazm", full: "Xorazm viloyati" },
  "Тошкент шаҳри": { sheet: "Toshkent shahri", full: "Toshkent shahri" },
};

export function latinRegion(name: string) {
  return LATIN[name] ?? { sheet: name.replace(/[\\/?*[\]:]/g, "").slice(0, 31), full: name };
}

const STATUS: Record<LiveStatus, string> = {
  ulangan: "Ulangan (faol)",
  ulanmagan: "Ulanmagan",
  ochirilgan: "Tizimdan oʻchirilgan",
};
const STATUS_LOWER: Record<LiveStatus, string> = {
  ulangan: "ulangan",
  ulanmagan: "ulanmagan",
  ochirilgan: "oʻchirilgan",
};
const STATUS_STYLE: Record<LiveStatus, { fill: string; ink: string }> = {
  ulangan: { fill: C.ulFill, ink: C.ulInk },
  ulanmagan: { fill: C.unFill, ink: C.unInk },
  ochirilgan: { fill: C.ochFill, ink: C.ochInk },
};
const REASON: Record<Reason, string> = {
  override: "Qoʻlda belgilangan",
  nostir: "STIR yoʻq — reestr holati",
  missing: "ARGOS daraxtida yoʻq",
  billing: "",
  newBilling0: "Yangi ulangan, billing hali yoqilmagan",
  billingOff: "Daraxtda bor, billing nofaol",
  notInTree: "Shu STIR ostida ARGOS daraxtida bu muassasa yoʻq",
};

const LEGEND =
  "Ranglar:  yashil — ulangan  ·  qizil — ulanmagan  ·  kulrang — tizimdan oʻchirilgan  ·  toʻq sariq STIR — bir nechta muassasada takrorlanadi (har bir muassasaning STIRi alohida boʻlishi kerak)";

const thin = { style: "thin" as const, color: { argb: C.grid } };
const BOX: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin };
const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function style(
  cell: ExcelJS.Cell,
  o: {
    bold?: boolean;
    size?: number;
    color?: string;
    bg?: string;
    h?: ExcelJS.Alignment["horizontal"];
    wrap?: boolean;
    border?: boolean;
    fmt?: string;
  },
) {
  cell.font = { name: "Calibri", size: o.size ?? 11, bold: o.bold, ...(o.color ? { color: { argb: o.color } } : {}) };
  if (o.bg) cell.fill = fill(o.bg);
  cell.alignment = { vertical: "middle", ...(o.h ? { horizontal: o.h } : {}), ...(o.wrap ? { wrapText: true } : {}) };
  if (o.border) cell.border = BOX;
  if (o.fmt) cell.numFmt = o.fmt;
}

const r1 = (x: number) => Math.round(x * 1000) / 10; // share → percent, 1 decimal

function stamp(iso: string) {
  const d = new Date(new Date(iso).getTime() + 5 * 3600 * 1000); // Tashkent, UTC+5
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    day: `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}`,
    date: `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`,
    time: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
    file: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}_${p(d.getUTCHours())}-${p(d.getUTCMinutes())}`,
  };
}

function subtitle(iso: string) {
  const s = stamp(iso);
  return `Ulanish holati: ${s.date}, ${s.time} (ARGOS jonli — hrm.argos.uz tashkilotlar daraxti, hrm-argos-dashboard)  ·  shartnoma va toʻlov: 17.09.2026, 1700 reestr`;
}

function pctBand(p: number) {
  return p < 0.5 ? C.low : p < 0.8 ? C.mid : C.high;
}

/** One region (or the republican sheet) exactly in the workbook's region-sheet layout. */
function regionSheet(wb: ExcelJS.Workbook, r: TreeRegion, iso: string) {
  const rep = isRepublic(r.name);
  const lat = latinRegion(r.name);
  const ws = wb.addWorksheet(lat.sheet, {
    properties: { outlineProperties: { summaryBelow: false, summaryRight: true } },
    views: [{ state: "frozen", ySplit: 9, xSplit: 0, topLeftCell: "A10" }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [
    { width: rep ? 19.4 : 6 },
    { width: rep ? 34 : 24 },
    { width: 82 },
    { width: 14 },
    { width: 20 },
    { width: 18 },
    { width: 11 },
    { width: 13, hidden: true },
    { width: rep ? 34 : 32 },
    { width: 24 },
    { width: 30 },
  ];

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = rep
    ? "Respublika markazlari va ularning hududiy boʻlinmalari — HRM ARGOS tizimiga ulanish holati"
    : `${lat.full} — HRM ARGOS tizimiga ulanish holati`;
  style(ws.getCell("A1"), { bold: true, size: 15, color: C.navy });
  ws.getRow(1).height = 21.75;
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = subtitle(iso);
  style(ws.getCell("A2"), { size: 10, color: C.grey });

  // Data rows run from row 10 down; KPI formulas cover the status column.
  const first = 11;
  const rows = r.groups.reduce((s, g) => s + 1 + g.orgs.length, 0);
  const last = 9 + rows;
  const E = `$E$${first}:$E$${Math.max(first, last)}`;
  const kpi: [string, string, string, string, ExcelJS.CellValue, string?][] = [
    ["A", "Jami muassasa", C.blueSoft, C.navy, { formula: `COUNTA(${E})`, result: r.total }],
    ["B", STATUS.ulangan, C.ulFill, C.ulInk, { formula: `COUNTIF(${E},"${STATUS.ulangan}")`, result: r.ulangan }],
    ["C", STATUS.ulanmagan, C.unFill, C.unInk, { formula: `COUNTIF(${E},"${STATUS.ulanmagan}")`, result: r.ulanmagan }],
    ["D", STATUS.ochirilgan, C.ochFill, C.ochInk, { formula: `COUNTIF(${E},"${STATUS.ochirilgan}")`, result: r.ochirilgan }],
    ["E", "Ulanish darajasi", C.blueSoft, C.navy, { formula: "IFERROR(B5/A5,0)", result: r.percent }, "0.0%"],
  ];
  for (const [col, label, bg, ink, value, fmt] of kpi) {
    const h = ws.getCell(`${col}4`);
    h.value = label;
    style(h, { bold: true, size: 9, color: C.dim, bg, h: "center", wrap: true, border: true });
    const v = ws.getCell(`${col}5`);
    v.value = value;
    style(v, { bold: true, size: 18, color: ink, bg, h: "center", border: true, fmt });
    // column A is the narrow «№» column: let the total shrink instead of showing ##
    if (col === "A") for (const c of [h, v]) c.alignment = { ...c.alignment, shrinkToFit: true };
  }
  ws.getRow(4).height = 25.5;
  ws.getRow(5).height = 27.75;
  ws.mergeCells("A6:G6");
  ws.getCell("A6").value = LEGEND;
  style(ws.getCell("A6"), { size: 10, color: C.dim });
  ws.mergeCells("A7:G7");
  ws.getCell("A7").value = rep
    ? "Roʻyxat tizimlar kesimida guruhlangan: har bir tizimda avval bosh muassasa, keyin uning hududlardagi boʻlinmalari («Hudud» ustuni).  Chapdagi «+» tugmasi bilan tizimni ochish mumkin."
    : "Roʻyxat tuman kesimida guruhlangan — chapdagi «+» / «−» tugmalari bilan tumanni ochib-yigʻish, faqat tumanlar yakunini koʻrish mumkin.";
  style(ws.getCell("A7"), { size: 9, color: C.grey });

  const s = stamp(iso);
  const head = [
    "№",
    rep ? "Hudud" : "Tuman / shahar",
    "Muassasa nomi",
    "STIR",
    `Holat ${s.day}`,
    "Shartnoma (17.09)",
    "Toʻlov, % (17.09)",
    "",
    "Boʻysunuvi",
    "17.09 dan oʻzgarish",
    `ARGOS izohi (${s.day})`,
  ];
  const hr = ws.getRow(9);
  head.forEach((t, i) => {
    if (i === 7) return;
    const c = hr.getCell(i + 1);
    c.value = t;
    style(c, { bold: true, color: "FFFFFFFF", bg: C.head, h: "center", wrap: true, border: true });
  });
  hr.height = 30;

  let at = 10;
  for (const g of r.groups) {
    const a = at + 1;
    const b = at + g.orgs.length;
    const rng = `$E$${a}:$E$${Math.max(a, b)}`;
    const row = ws.getRow(at);
    for (let c = 1; c <= 7; c++) {
      style(row.getCell(c), { border: true, bg: pctBand(g.percent) });
    }
    row.getCell(2).value = g.name;
    style(row.getCell(2), { bold: true, color: C.navy, border: true, bg: pctBand(g.percent) });
    row.getCell(3).value = {
      formula:
        `"Ulanish "&FIXED(H${at}*100,1)&"%"&"   ·   jami "&ROWS(${rng})&"   ·   ulangan "&COUNTIF(${rng},"${STATUS.ulangan}")` +
        `&"   ·   ulanmagan "&COUNTIF(${rng},"${STATUS.ulanmagan}")&"   ·   tizimdan oʻchirilgan "&COUNTIF(${rng},"${STATUS.ochirilgan}")`,
      result: `Ulanish ${r1(g.percent).toFixed(1)}%   ·   jami ${g.total}   ·   ulangan ${g.ulangan}   ·   ulanmagan ${g.ulanmagan}   ·   tizimdan oʻchirilgan ${g.ochirilgan}`,
    };
    style(row.getCell(3), { bold: true, color: C.text, border: true, bg: pctBand(g.percent) });
    row.getCell(8).value = {
      formula: `IFERROR(COUNTIF(${rng},"${STATUS.ulangan}")/ROWS(${rng}),0)`,
      result: g.percent,
    };
    row.getCell(8).numFmt = "0.0%";
    at++;
    for (const o of g.orgs) {
      orgRow(ws.getRow(at), o, rep ? (o.hudud ?? "") : g.name);
      at++;
    }
  }
  ws.autoFilter = { from: { row: 9, column: 1 }, to: { row: Math.max(9, at - 1), column: 11 } };
  ws.pageSetup.printTitlesRow = "9:9";
  return ws;
}

function orgRow(row: ExcelJS.Row, o: TreeOrg, where: string) {
  row.outlineLevel = 1;
  row.hidden = true; // grouped and folded, as in the workbook
  const v: ExcelJS.CellValue[] = [
    o.n,
    where,
    o.name,
    o.stir ?? "",
    STATUS[o.status],
    o.contract ?? "",
    o.pay ?? "",
    null,
    o.sub ?? "",
    o.ch > 0
      ? `▲ Ulandi  (edi: ${STATUS_LOWER[o.was]})`
      : o.ch < 0
        ? `▼ ${o.status === "ochirilgan" ? "Oʻchirildi" : "Ulanmagan"}  (edi: ${STATUS_LOWER[o.was]})`
        : "",
    [REASON[o.reason], o.note].filter(Boolean).join(" · "),
  ];
  v.forEach((x, i) => {
    if (i === 7) return;
    const c = row.getCell(i + 1);
    c.value = x;
    style(c, { border: true, h: i === 0 || i === 3 || i === 5 || i === 6 ? "center" : "left" });
  });
  const st = STATUS_STYLE[o.status];
  style(row.getCell(5), { bold: true, color: st.ink, bg: st.fill, h: "center", border: true });
  if (o.dup > 1) style(row.getCell(4), { bold: true, color: C.dupInk, bg: C.dupFill, h: "center", border: true });
  style(row.getCell(9), { size: 9, color: C.sub, border: true });
  if (o.ch !== 0) style(row.getCell(10), { size: 9, bold: true, color: o.ch > 0 ? C.ulInk : C.unInk, border: true });
  else style(row.getCell(10), { size: 9, border: true });
  style(row.getCell(11), { size: 9, color: C.note, border: true });
}

/** «Umumiy»: the republic in one box row, then every sheet ranked from the lowest share up. */
function summarySheet(wb: ExcelJS.Workbook, regions: TreeRegion[], iso: string) {
  const ws = wb.addWorksheet("Umumiy", {
    views: [{ state: "frozen", ySplit: 11, xSplit: 0, topLeftCell: "A12" }],
    pageSetup: { orientation: "portrait", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [{ width: 11.3 }, { width: 38 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 16 }, { width: 13 }];
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "HRM ARGOS tizimiga ulanish holati — umumiy koʻrsatkichlar";
  style(ws.getCell("A1"), { bold: true, size: 15, color: C.navy });
  ws.getRow(1).height = 21.75;
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = subtitle(iso);
  style(ws.getCell("A2"), { size: 10, color: C.grey });
  ws.mergeCells("A4:G4");
  ws.getCell("A4").value = "Respublika boʻyicha jami (har bir hudud alohida varaqda)";
  style(ws.getCell("A4"), { bold: true, size: 12, color: C.navy });

  const t = regions.reduce(
    (a, r) => ({ total: a.total + r.total, ulangan: a.ulangan + r.ulangan, ulanmagan: a.ulanmagan + r.ulanmagan, ochirilgan: a.ochirilgan + r.ochirilgan }),
    { total: 0, ulangan: 0, ulanmagan: 0, ochirilgan: 0 },
  );
  const tp = t.total ? t.ulangan / t.total : 0;
  const totalRow = 12 + regions.length;
  const kpi: [string, string, string, string, ExcelJS.CellValue, string?][] = [
    ["A", "Jami muassasa", C.blueSoft, C.navy, { formula: `C${totalRow}`, result: t.total }],
    ["B", STATUS.ulangan, C.ulFill, C.ulInk, { formula: `D${totalRow}`, result: t.ulangan }],
    ["C", STATUS.ulanmagan, C.unFill, C.unInk, { formula: `E${totalRow}`, result: t.ulanmagan }],
    ["D", STATUS.ochirilgan, C.ochFill, C.ochInk, { formula: `F${totalRow}`, result: t.ochirilgan }],
    ["E", "Ulanish darajasi", C.blueSoft, C.navy, { formula: `IFERROR(D${totalRow}/C${totalRow},0)`, result: tp }, "0.0%"],
  ];
  for (const [col, label, bg, ink, value, fmt] of kpi) {
    const h = ws.getCell(`${col}5`);
    h.value = label;
    style(h, { bold: true, size: 9, color: C.dim, bg, h: "center", wrap: true, border: true });
    const v = ws.getCell(`${col}6`);
    v.value = value;
    style(v, { bold: true, size: 18, color: ink, bg, h: "center", border: true, fmt });
  }
  ws.getRow(5).height = 25.5;
  ws.getRow(6).height = 27.75;

  ws.mergeCells("A9:G9");
  ws.getCell("A9").value = "Hududlar kesimida";
  style(ws.getCell("A9"), { bold: true, size: 12, color: C.navy });
  ws.mergeCells("A10:G10");
  ws.getCell("A10").value =
    "Har bir hudud boʻyicha batafsil roʻyxat pastdagi alohida varaqlarda.  Jadval ulanish darajasi boʻyicha saralangan (eng pastidan yuqoriga).";
  style(ws.getCell("A10"), { size: 10, color: C.grey });

  const hr = ws.getRow(11);
  ["№", "Hudud", "Jami", "Ulangan", "Ulanmagan", "Oʻchirilgan", "Ulanish, %"].forEach((x, i) => {
    hr.getCell(i + 1).value = x;
    style(hr.getCell(i + 1), { bold: true, color: "FFFFFFFF", bg: C.head, h: "center", wrap: true, border: true });
  });
  hr.height = 27.75;

  const ranked = regions
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.percent - b.r.percent || a.i - b.i)
    .map((x) => x.r);
  ranked.forEach((r, i) => {
    const row = ws.getRow(12 + i);
    const vals: ExcelJS.CellValue[] = [i + 1, latinRegion(r.name).full, r.total, r.ulangan, r.ulanmagan, r.ochirilgan, r1(r.percent)];
    vals.forEach((v, j) => {
      row.getCell(j + 1).value = v;
      style(row.getCell(j + 1), { border: true, h: j === 1 ? "left" : "center" });
    });
    const p = r.percent;
    style(row.getCell(7), {
      bold: true,
      border: true,
      h: "center",
      bg: p < 0.5 ? C.pctLow : p < 0.8 ? C.pctMid : C.ulFill,
      color: p < 0.5 ? C.unInk : p < 0.8 ? "FF9C5700" : C.ulInk,
      fmt: "0.0",
    });
  });
  const tr = ws.getRow(totalRow);
  const tv: ExcelJS.CellValue[] = [
    "",
    "RESPUBLIKA BOʻYICHA JAMI",
    { formula: `SUM(C12:C${totalRow - 1})`, result: t.total },
    { formula: `SUM(D12:D${totalRow - 1})`, result: t.ulangan },
    { formula: `SUM(E12:E${totalRow - 1})`, result: t.ulanmagan },
    { formula: `SUM(F12:F${totalRow - 1})`, result: t.ochirilgan },
    { formula: `IFERROR(ROUND(D${totalRow}/C${totalRow}*100,1),0)`, result: r1(tp) },
  ];
  tv.forEach((v, j) => {
    tr.getCell(j + 1).value = v;
    style(tr.getCell(j + 1), { bold: true, bg: C.blueSoft, border: true, h: j === 1 ? "left" : "center", fmt: j === 6 ? "0.0" : undefined });
  });

  const n = totalRow + 2;
  ws.getCell(`A${n}`).value = "Izoh";
  style(ws.getCell(`A${n}`), { bold: true });
  (
    [
      ["ulangan", "— muassasa HRM ARGOS tizimida faol ishlamoqda"],
      ["ulanmagan", "— muassasa tizimga ulanmagan — chora koʻrish talab etiladi"],
      ["ochirilgan", "— muassasa tizimdan oʻchirilgan"],
    ] as [LiveStatus, string][]
  ).forEach(([s, text], i) => {
    const row = n + 1 + i;
    const a = ws.getCell(`A${row}`);
    a.value = STATUS[s];
    style(a, { bold: true, bg: STATUS_STYLE[s].fill, color: STATUS_STYLE[s].ink, border: true });
    ws.mergeCells(`B${row}:G${row}`);
    ws.getCell(`B${row}`).value = text;
    style(ws.getCell(`B${row}`), { size: 10, color: C.dim });
  });
}

/** Rows taken off the registry or kept out of every count. */
function removedSheet(wb: ExcelJS.Workbook, removed: RemovedOrg[], excluded: ExcludedOrg[]) {
  const ws = wb.addWorksheet("Roʻyxatdan chiqarilganlar", {
    views: [{ state: "frozen", ySplit: 4, xSplit: 0, topLeftCell: "A5" }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [{ width: 5 }, { width: 22 }, { width: 26 }, { width: 60 }, { width: 12 }, { width: 40 }, { width: 11 }];
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Roʻyxatdan chiqarilgan muassasalar — ulanish hisobiga kirmaydi";
  style(ws.getCell("A1"), { bold: true, size: 14, color: C.navy });
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value =
    "Tugatilgan, tizimdan chiqqan yoki internet yoʻqligi sababli hisobdan chiqarilgan muassasalar — jami, ulangan va foiz hisobiga kirmaydi.";
  style(ws.getCell("A2"), { size: 9, color: C.dim });
  const hr = ws.getRow(4);
  ["№", "Hudud", "Tuman / shahar", "Muassasa nomi", "STIR", "Sabab", "Sana"].forEach((x, i) => {
    hr.getCell(i + 1).value = x;
    style(hr.getCell(i + 1), { bold: true, color: "FFFFFFFF", bg: C.head, h: "center", wrap: true, border: true });
  });
  hr.height = 27.75;
  const rows: [string, string | null, string, string | null, string, string | null][] = [
    ...removed.map((o) => [o.region, o.district, o.name, o.stir, o.reason ?? "", o.date] as [string, string | null, string, string | null, string, string | null]),
    ...excluded.map(
      (o) =>
        [o.region, o.district, o.name, o.stir, o.reason === "internet" ? "Internet yoʻq — hisobga kirmaydi" : o.reason, null] as [
          string,
          string | null,
          string,
          string | null,
          string,
          string | null,
        ],
    ),
  ];
  rows.forEach(([region, district, name, stir, reason, date], i) => {
    const row = ws.getRow(5 + i);
    [i + 1, latinRegion(region).full, district ?? "", name, stir ?? "", reason, date ?? ""].forEach((v, j) => {
      row.getCell(j + 1).value = v;
      style(row.getCell(j + 1), { border: true, h: j === 0 || j === 4 || j === 6 ? "center" : "left", size: j === 5 ? 9 : 11 });
    });
  });
}

/** STIRs written against several registry rows, grouped by the sheet of their first row. */
function duplicateSheet(wb: ExcelJS.Workbook, orgs: LiveOrg[], onlyRegion?: string) {
  const by = new Map<string, LiveOrg[]>();
  for (const o of orgs) {
    if (!o.stir) continue;
    const l = by.get(o.stir);
    if (l) l.push(o);
    else by.set(o.stir, [o]);
  }
  const groups = [...by].filter(([, l]) => l.length > 1 && (!onlyRegion || l.some((o) => o.region === onlyRegion)));
  const order = [...new Set(orgs.map((o) => o.region))];
  const bySheet = new Map<string, [string, LiveOrg[]][]>();
  for (const g of groups) {
    const key = onlyRegion ?? g[1][0].region;
    const l = bySheet.get(key);
    if (l) l.push(g);
    else bySheet.set(key, [g]);
  }

  const ws = wb.addWorksheet("Takroriy STIR", {
    properties: { outlineProperties: { summaryBelow: false, summaryRight: true } },
    views: [{ state: "frozen", ySplit: 4, xSplit: 0, topLeftCell: "A5" }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [{ width: 6 }, { width: 13 }, { width: 9 }, { width: 24 }, { width: 24 }, { width: 62 }, { width: 18 }, { width: 30 }];
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "Takrorlanuvchi STIR — bir STIR bir nechta muassasaga yozilgan";
  style(ws.getCell("A1"), { bold: true, size: 14, color: C.navy });
  const nRows = groups.reduce((s, [, l]) => s + l.length, 0);
  ws.mergeCells("A2:H2");
  ws.getCell("A2").value =
    `${groups.length} ta STIR ${nRows} ta muassasada takrorlanadi. Har bir muassasaning STIRi alohida boʻlishi kerak. ` +
    "Bir STIR ostidagi muassasalardan qaysi biri HRM ARGOS tashkilotlar daraxtida boʻlsa — oʻsha ulangan hisoblanadi, daraxtda yoʻqlari — ulanmagan.";
  style(ws.getCell("A2"), { size: 9, color: C.dim, wrap: true });
  ws.getRow(2).height = 27;
  const hr = ws.getRow(4);
  ["№", "STIR", "Takror soni", "Hudud", "Tuman / shahar", "Muassasa nomi", "Holat", "Boʻysunuvi"].forEach((x, i) => {
    hr.getCell(i + 1).value = x;
    style(hr.getCell(i + 1), { bold: true, size: 10, color: "FFFFFFFF", bg: C.head, h: "center", wrap: true, border: true });
  });

  let at = 5;
  let n = 0;
  for (const sheet of order.filter((s) => bySheet.has(s))) {
    const gs = bySheet.get(sheet)!;
    ws.mergeCells(`A${at}:H${at}`);
    const c = ws.getCell(`A${at}`);
    c.value = `${latinRegion(sheet).sheet} — ${gs.length} ta takroriy STIR, ${gs.reduce((s, [, l]) => s + l.length, 0)} ta muassasa`;
    style(c, { bold: true, color: "FFFFFFFF", bg: C.navy });
    at++;
    gs.forEach(([stir, l], gi) => {
      const bg = gi % 2 === 0 ? C.dupRow : undefined;
      l.forEach((o, k) => {
        const row = ws.getRow(at++);
        row.outlineLevel = 1;
        const rep = isRepublic(o.region);
        const vals: ExcelJS.CellValue[] = [
          k === 0 ? ++n : "",
          k === 0 ? stir : "",
          k === 0 ? l.length : "",
          latinRegion(o.region).sheet,
          rep ? (o.hudud ?? o.district ?? "") : (o.district ?? ""),
          o.name,
          STATUS[o.status],
          o.sub ?? "",
        ];
        vals.forEach((v, j) => {
          row.getCell(j + 1).value = v;
          style(row.getCell(j + 1), {
            size: j === 5 ? 11 : 10,
            bold: j === 1 || j === 2,
            bg,
            border: true,
            h: j <= 2 ? "center" : "left",
            color: j === 6 ? STATUS_STYLE[o.status].ink : undefined,
          });
        });
      });
    });
  }
}

export interface ExportInput {
  regions: TreeRegion[]; // buildTree() output — all sheets, or just one region
  orgs: LiveOrg[]; // every live row (for «Takroriy STIR»)
  checkedAt: string;
  removed?: RemovedOrg[];
  excluded?: ExcludedOrg[];
  onlyRegion?: string; // canonical region name → that region's file
}

/**
 * exceljs writes <sheetPr> children as pageSetUpPr, outlinePr when a sheet has
 * both fit-to-page and outline settings; the schema wants outlinePr first, and
 * Excel refuses to open the file otherwise. Put them back in schema order.
 */
async function fixSheetPr(raw: ArrayBuffer | Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(raw);
  for (const name of Object.keys(zip.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))) {
    const xml = await zip.file(name)!.async("string");
    const fixed = xml.replace(/<sheetPr>(.*?)<\/sheetPr>/, (_, inner: string) => {
      const tab = inner.match(/<tabColor[^>]*\/>/)?.[0] ?? "";
      const outline = inner.match(/<outlinePr[^>]*\/>/)?.[0] ?? "";
      const page = inner.match(/<pageSetUpPr[^>]*\/>/)?.[0] ?? "";
      return `<sheetPr>${tab}${outline}${page}</sheetPr>`;
    });
    if (fixed !== xml) zip.file(name, fixed);
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export async function liveWorkbook(x: ExportInput): Promise<{ buf: Buffer; filename: string }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "hrm-argos-dashboard";
  wb.created = new Date(x.checkedAt);
  const s = stamp(x.checkedAt);
  if (x.onlyRegion) {
    const r = x.regions.find((r) => r.name === x.onlyRegion);
    if (r) regionSheet(wb, r, x.checkedAt);
    duplicateSheet(wb, x.orgs, x.onlyRegion);
    const lat = latinRegion(x.onlyRegion).sheet.replace(/[^\p{L}\p{N}]+/gu, "_");
    return { buf: await fixSheetPr(await wb.xlsx.writeBuffer()), filename: `HRM_ARGOS_${lat}_${s.file}.xlsx` };
  }
  summarySheet(wb, x.regions, x.checkedAt);
  const rep = x.regions.filter((r) => isRepublic(r.name));
  for (const r of rep) regionSheet(wb, r, x.checkedAt);
  removedSheet(wb, x.removed ?? [], x.excluded ?? []);
  duplicateSheet(wb, x.orgs);
  for (const r of x.regions.filter((r) => !isRepublic(r.name))) regionSheet(wb, r, x.checkedAt);
  return { buf: await fixSheetPr(await wb.xlsx.writeBuffer()), filename: `HRM_ARGOS_BARCHA_HUDUDLAR_${s.file}.xlsx` };
}
