"""
SES tizimining ikki darajali tuzilmasi (registry workbook'ining «SES tuzilmasi» varag'i) →
data/ses-tuzilma.json. /argos-jonli va bosh sahifadagi daraxt «Sanitariya-epidemiologiya qoʻmitasi
tizimi» guruhini shu bo'yicha ko'rsatadi: blok (Respublika markazi + 14 hudud) → hududiy boshqarma
→ └ tuman/shahar boʻlimlari → ◆ qoʻmitaga bevosita (OITS, oʻlat profilaktikasi filiallari).

Sanoqqa ta'sir qilmaydi — faqat ko'rinish. Satrlar bazadagi SES satrlari bilan nom + STIR bo'yicha
bog'lanadi; bazada yo'q satr («Reestrda yoʻq», masalan Milliy referens laboratoriya) olinmaydi.

  python scripts/make-ses-tuzilma.py --excel ".../HRM_ARGOS_14.10.2026_BARCHA_HUDUDLAR_FINAL.xlsx"
"""
import argparse, json, re, sys
import openpyxl

sys.stdout.reconfigure(encoding="utf-8")

SHEET = "SES tuzilmasi"
SES_GROUP = "Sanitariya-epidemiologiya qoʻmitasi tizimi"
MARKAZ = "markaz"
BLOCK = {
    "QORAQALPOGʻISTON RESPUBLIKASI": "Қорақалпоғистон Республикаси",
    "ANDIJON VILOYATI": "Андижон вилояти", "BUXORO VILOYATI": "Бухоро вилояти", "JIZZAX VILOYATI": "Жиззах вилояти",
    "QASHQADARYO VILOYATI": "Қашқадарё вилояти", "NAVOIY VILOYATI": "Навоий вилояти",
    "NAMANGAN VILOYATI": "Наманган вилояти", "SAMARQAND VILOYATI": "Самарқанд вилояти",
    "SURXONDARYO VILOYATI": "Сурхондарё вилояти", "SIRDARYO VILOYATI": "Сирдарё вилояти",
    "TOSHKENT VILOYATI": "Тошкент вилояти", "FARGʻONA VILOYATI": "Фарғона вилояти",
    "XORAZM VILOYATI": "Хоразм вилояти", "TOSHKENT SHAHRI": "Тошкент шаҳри",
}
ROLE = {
    "Respublika markazi": "markaz",
    "Respublika muassasasi": "resp",
    "Hududiy boshqarma": "boshqarma",
    "Tuman/shahar boʻlimi": "bolim",
    "Qoʻmitaga bevosita": "bevosita",
}


def clean(name):
    return re.sub(r"^[\s└◆]+", "", str(name or "")).strip()


def norm(name):
    return re.sub(r"\s+", " ", clean(name)).strip().lower()


def stir_of(v):
    if v is None or v == "" or v == "—":
        return ""
    return str(int(v)) if isinstance(v, (int, float)) else str(v).strip()


ap = argparse.ArgumentParser()
ap.add_argument("--excel", required=True)
ap.add_argument("--base", default="data/argos-live-base.json")
ap.add_argument("--out", default="data/ses-tuzilma.json")
a = ap.parse_args()

base = json.load(open(a.base, encoding="utf-8"))
ses = [o for o in base["orgs"] if o["district"] == SES_GROUP]
by_key = {(norm(o["name"]), o["stir"] or ""): o for o in ses}
by_name = {}
for o in ses:
    by_name.setdefault(norm(o["name"]), []).append(o)

wb = openpyxl.load_workbook(a.excel, read_only=True, data_only=True)
blocks, cur, used, skipped = [], None, set(), []
for r in wb[SHEET].iter_rows(min_row=9, values_only=True):
    if not r or not any(c is not None for c in r):
        continue
    no, kind, name, stir = r[0], r[1], r[2], r[3]
    title = name if isinstance(name, str) else ""
    if no is None and kind is None and (title.startswith("RESPUBLIKA MARKAZI") or title in BLOCK):
        cur = {"name": MARKAZ if title.startswith("RESPUBLIKA MARKAZI") else BLOCK[title], "rows": []}
        blocks.append(cur)
        continue
    if kind not in ROLE:
        raise SystemExit(f"unknown row type: {r[:4]}")
    o = by_key.get((norm(name), stir_of(stir)))
    if o is None and len(by_name.get(norm(name), [])) == 1:
        o = by_name[norm(name)][0]  # STIR changed since the workbook (own STIR set later)
    if o is None:
        skipped.append(f"{kind}: {clean(name)} [{stir_of(stir) or '—'}]")
        continue
    if id(o) in used:
        raise SystemExit(f"matched twice: {o['name']}")
    used.add(id(o))
    cur["rows"].append({"name": o["name"], "role": ROLE[kind]})

missing = [o["name"] for o in ses if id(o) not in used]
print(f"blocks {len(blocks)}, rows {sum(len(b['rows']) for b in blocks)} / SES in base {len(ses)}")
for x in skipped:
    print("  not in the registry, left out:", x)
if missing:
    raise SystemExit("SES rows of the base not in the sheet: " + "; ".join(missing))
json.dump({"source": a.excel.replace("\\", "/").split("/")[-1], "group": SES_GROUP, "blocks": blocks},
          open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("->", a.out)
