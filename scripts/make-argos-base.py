"""
/argos-jonli sahifasi (va bosh sahifa) uchun bazaviy reestr ro'yxatini quradi.

Kirish:
  --excel  HRM_ARGOS_05.10.2026_BARCHA_HUDUDLAR_FINAL.xlsx  (varaqlar: «Respublika markazlari» + 14 hudud
           + «Roʻyxatdan chiqarilganlar»; boshqa varaqlar o'qilmaydi)
  --overrides scripts/argos-overrides.json
    faol / ulanmagan / faolStir — qo'lda qaror (daraxtdan ustun)
    remove  — reestrdan chiqarilgan: bazaga tushmaydi, STIR «ignoreStir»ga
    exclude — statistikaga kiritilmaydi (masalan, internet yo'q): «excluded»ga + «ignoreStir»ga
    stirFix — xato STIR: [varaq, nom, eski, yangi]; Excel'da eskisi tursa almashtiriladi
  --aliases scripts/argos-district-aliases.json — bir tumanning turlicha yozilishi → bitta guruh
Chiqish:
  data/argos-live-base.json — Excel tartibida (varaq → guruh → satr); guruh = tuman/shahar yoki
                              respublika tizimi
  (ixtiyoriy) --expected tests/fixtures/argos-excel-expected.json — Excel holatlari va shu holatlarni
              beradigan daraxt (test uchun)

Satr kaliti: nom + STIR (varaqsiz — 25.09 da 418 ta boʻlinma respublika varag'iga ko'chgan).
Reestr (17.09) holati: «17.09 dan oʻzgarish» ustunidagi «edi: …», bo'sh bo'lsa joriy holat.
"""
import argparse, json, os, re
from collections import defaultdict
import openpyxl

REPUBLIC_SHEET = "Respublika markazlari"
REGION = {
    REPUBLIC_SHEET: "Республика муассасалари",
    "Qoraqalpogʻiston": "Қорақалпоғистон Республикаси",
    "Andijon": "Андижон вилояти", "Buxoro": "Бухоро вилояти", "Jizzax": "Жиззах вилояти",
    "Qashqadaryo": "Қашқадарё вилояти", "Navoiy": "Навоий вилояти", "Namangan": "Наманган вилояти",
    "Samarqand": "Самарқанд вилояти", "Surxondaryo": "Сурхондарё вилояти", "Sirdaryo": "Сирдарё вилояти",
    "Toshkent viloyati": "Тошкент вилояти", "Fargʻona": "Фарғона вилояти", "Xorazm": "Хоразм вилояти",
    "Toshkent shahri": "Тошкент шаҳри",
}
ST = {"Ulangan (faol)": "ulangan", "Ulanmagan": "ulanmagan", "Tizimdan oʻchirilgan": "ochirilgan"}
EDI = {"ulanmagan": "ulanmagan", "ulangan": "ulangan", "oʻchirilgan": "ochirilgan"}
# Columns (1-based): №, guruh/hudud, nom, STIR, holat, shartnoma, to'lov, —, bo'ysunuvi, o'zgarish, izoh
C_NO, C_GRP, C_NAME, C_STIR, C_ST, C_CON, C_PAY, C_SUB, C_CHG, C_NOTE = 1, 2, 3, 4, 5, 6, 7, 9, 10, 11

# Izoh parts that only restate the tree-derived status — the page recomputes those live.
LIVE_NOTE = re.compile(
    r"^(ARGOS daraxtida yoʻq|Daraxtda bor, billing nofaol|Monitoring sayti|⚠ STIR takror|"
    r"STIR yoʻq — reyestr holati|Qoʻlda belgilangan \(daraxtda yoʻq\)|Togʻli hudud)"
)


def s(v):
    return str(v).strip() if v is not None else ""


def stir_of(v):
    if v is None or v == "":
        return ""
    if isinstance(v, float):
        v = int(v)
    return str(v).strip()


ap = argparse.ArgumentParser()
ap.add_argument("--excel", required=True)
ap.add_argument("--overrides", default="scripts/argos-overrides.json")
ap.add_argument("--aliases", default="scripts/argos-district-aliases.json")
ap.add_argument("--out", default="data/argos-live-base.json")
ap.add_argument("--expected")
a = ap.parse_args()

ov = json.load(open(a.overrides, encoding="utf-8"))
aliases = json.load(open(a.aliases, encoding="utf-8"))
OV_FA = {(k[1], k[2]) for k in ov["faol"]}
OV_UL = {(k[1], k[2]) for k in ov["ulanmagan"]}
OV_STIR = set(ov["faolStir"])
REMOVE = {(k[1], k[2]) for k in ov.get("remove", [])}
EXCLUDE = {(k[1], k[2]): k[3] for k in ov.get("exclude", [])}
STIRFIX = {(k[1], k[2]): k[3] for k in ov.get("stirFix", [])}

wb = openpyxl.load_workbook(a.excel)

# «Roʻyxatdan chiqarilganlar»: hudud, tuman, nom, STIR, holat, sabab, izoh, sana
removed_info = {}
if "Roʻyxatdan chiqarilganlar" in wb.sheetnames:
    w = wb["Roʻyxatdan chiqarilganlar"]
    for r in w.iter_rows(min_row=5, values_only=True):
        if isinstance(r[0], int):
            removed_info[(s(r[3]), stir_of(r[4]))] = {
                "hudud": s(r[1]), "district": s(r[2]) or None,
                "reason": s(r[6]) or None, "date": s(r[8]) or None,
            }

out, expected_status, tree_billing = [], [], {}
excluded, removed, ignore, seen = [], [], set(), set()
for sn in REGION:
    w = wb[sn]
    amap = aliases.get(sn, {})
    group = None
    for r in range(10, w.max_row + 1):
        no, grp = w.cell(r, C_NO).value, s(w.cell(r, C_GRP).value)
        if no is None and grp and grp != "JAMI":
            group = grp
            continue
        if not isinstance(no, int):
            continue
        name = s(w.cell(r, C_NAME).value)
        stir = stir_of(w.cell(r, C_STIR).value)
        k = (name, stir)
        status = ST[s(w.cell(r, C_ST).value)]
        chg = s(w.cell(r, C_CHG).value)
        note = s(w.cell(r, C_NOTE).value)
        district = amap.get(group, group)
        hudud = grp if sn == REPUBLIC_SHEET else None
        place = {"region": REGION[sn], "district": district, "name": name, "stir": stir or None}

        if k in REMOVE or k in removed_info:
            seen.add(k)
            if stir:
                ignore.add(stir)
            info = removed_info.get(k, {"reason": None, "date": "29.09.2026"})
            removed.append({**place, "reason": info["reason"], "date": info["date"]})
            continue
        if k in EXCLUDE:
            seen.add(k)
            if stir:
                ignore.add(stir)
            excluded.append({**place, "reason": EXCLUDE[k]})
            continue
        if k in STIRFIX:
            seen.add(k)
            stir = STIRFIX[k]
        m = re.search(r"edi: (\S+)\)", chg)
        reestr = EDI[m.group(1)] if m else status
        o = "ulanmagan" if k in OV_UL else "ulangan" if (k in OV_FA or (stir and stir in OV_STIR)) else None
        pay = w.cell(r, C_PAY).value
        keep = [p.strip() for p in note.split("·") if p.strip() and not LIVE_NOTE.match(p.strip())]
        out.append({
            "region": REGION[sn], "district": district, "hudud": hudud,
            "name": name, "stir": stir or None, "reestr": reestr, "override": o,
            "contract": s(w.cell(r, C_CON).value) or None,
            "pay": float(pay) if isinstance(pay, (int, float)) else None,
            "sub": s(w.cell(r, C_SUB).value) or None,
            "note": " · ".join(keep) or None,
            "_raw": group, "_sheet": sn,
        })
        expected_status.append(status)
        # The tree that would have produced this workbook: in the tree with billing on unless the
        # row says otherwise (absent / billing off / manual / no STIR).
        if stir:
            if "Daraxtda bor, billing nofaol" in note:
                tree_billing.setdefault(stir, 0)
            elif status == "ulangan" and "daraxtda yoʻq" not in note and o is None:
                tree_billing[stir] = 1

# Rows the workbook itself already moved to «Roʻyxatdan chiqarilganlar».
HUDUD = {"Qoraqalpogʻiston Respublikasi": "Qoraqalpogʻiston", "Toshkent viloyati": "Toshkent viloyati",
         "Toshkent shahri": "Toshkent shahri"}
for (name, stir), info in removed_info.items():
    if (name, stir) in seen:
        continue
    seen.add((name, stir))
    h = info["hudud"]
    sheet = HUDUD.get(h) or h.replace(" viloyati", "")
    if stir:
        ignore.add(stir)
    if (name, stir) in EXCLUDE:
        excluded.append({"region": REGION.get(sheet, h), "district": info["district"], "name": name,
                         "stir": stir or None, "reason": EXCLUDE[(name, stir)]})
        continue
    removed.append({"region": REGION.get(sheet, h), "district": info["district"], "name": name,
                    "stir": stir or None, "reason": info["reason"], "date": info["date"]})

# Group order = the workbook's, a merged group sitting where its canonical spelling sits
# (or where its first variant sits when no row uses the canonical spelling).
def group_rank(sheet_orgs):
    raw = list(dict.fromkeys(o["_raw"] for o in sheet_orgs))
    rank = {}
    for i, g in enumerate(raw):
        canon = aliases.get(sheet_orgs[0]["_sheet"], {}).get(g, g)
        rank.setdefault(canon, raw.index(canon) if canon in raw else i)
    return rank

ordered = []
for sn in REGION:
    rows_ = [o for o in out if o["_sheet"] == sn]
    if rows_:
        rk = group_rank(rows_)
        ordered += sorted(rows_, key=lambda o: rk[o["district"]])
idx = {id(o): i for i, o in enumerate(out)}
expected_status = [expected_status[idx[id(o)]] for o in ordered]
out = ordered
for o in out:
    del o["_raw"], o["_sheet"]

# A removed row's STIR shared with a kept row stays countable.
known = {o["stir"] for o in out if o["stir"]}
ignore -= known
missing = (REMOVE | set(EXCLUDE)) - seen
for k in sorted(missing):
    print("diqqat: overrides'dagi satr Excel'da yo'q (allaqachon olib tashlangan bo'lishi mumkin):", k)

json.dump({"source": os.path.splitext(os.path.basename(a.excel))[0], "orgs": out, "excluded": excluded,
           "removed": removed, "ignoreStir": sorted(ignore)},
          open(a.out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("orgs", len(out), "overrides", sum(1 for x in out if x["override"]),
      "excluded", len(excluded), "removed", len(removed), "ignoreStir", len(ignore))
if a.expected:
    json.dump({"status": expected_status, "tree": sorted([t, b] for t, b in tree_billing.items())},
              open(a.expected, "w", encoding="utf-8"), separators=(",", ":"))
