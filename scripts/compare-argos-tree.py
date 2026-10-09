"""
ARGOS daraxti ↔ dashboard reestri solishtiruvi.

Kirish:
  --tree  argos_tree_YYYY-MM-DD.json   (hrm.argos.uz GetSpInstitutionTreeV2, tekis: tin, billing, label, path)
  --base  data/argos-live-base.json
Chiqish (--out-json): toifalar
  auto    — reestr satri daraxtdagi o'z STIR'iga aniq mos keldi (hudud + tuman + tur + raqam/joy nomi,
            yagona nomzod; satrning hozirgi STIR'i TTB bilan bo'lishilgan yoki daraxtda yo'q)
  review  — taxminiy / bir nechta nomzod — qo'lda ko'rib chiqish
  new     — daraxtda bor, reestrda mos satr topilmadi (qo'shish uchun nomzod)
  missing — reestrdagi STIR daraxtda yo'q va hech qanday daraxt tashkiloti unga moslanmadi

Daraxt nomlari ruscha, reestr nomlari o'zbekcha (lotin/kirill) — shuning uchun matn emas, tuzilma
solishtiriladi: tuman nomining undosh «skeleti» (rus/o'zbek unlilari farq qiladi: Торткуль ↔ To'rtko'l),
muassasa turi, raqam va qo'shtirnoqdagi joy nomi.
"""
import argparse, json, re, collections

CYR = {
    "а": "a", "б": "b", "в": "v", "г": "g", "ғ": "g", "д": "d", "е": "e", "ё": "yo", "ж": "j", "з": "z", "и": "i",
    "й": "y", "к": "k", "қ": "k", "л": "l", "м": "m", "н": "n", "о": "o", "ў": "o", "п": "p", "р": "r", "с": "s",
    "т": "t", "у": "u", "ф": "f", "х": "h", "ҳ": "h", "ц": "s", "ч": "ch", "ш": "sh", "щ": "sh", "ъ": "", "ы": "i",
    "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def lat(s):
    s = (s or "").lower()
    s = "".join(CYR.get(ch, ch) for ch in s)
    s = re.sub(r"[ʻʼ'’`‘]", "", s)
    s = s.replace("x", "h").replace("q", "k").replace("ts", "s")
    return s


def skel(word):
    w = re.sub(r"[^a-z]", "", lat(word))
    # rus↔o'zbek yozuvi: «Кызыл-джар» ↔ «Kizil-jar», «Казак» ↔ «Kazax», «Макпал» ↔ «Maxpal»
    w = w.replace("dj", "j").replace("h", "k")
    w = re.sub(r"[aeiouy]", "", w)
    return re.sub(r"(.)\1+", r"\1", w)


REGIONS = [
    ("андижан", "Андижон вилояти", "andijon"), ("бухар", "Бухоро вилояти", "buhoro"),
    ("джизак", "Жиззах вилояти", "jizzah"), ("кашкадар", "Қашқадарё вилояти", "kashkadaryo"),
    ("навои", "Навоий вилояти", "navoiy"), ("наваий", "Навоий вилояти", "navoiy"),
    ("наманган", "Наманган вилояти", "namangan"), ("самарканд", "Самарқанд вилояти", "samarkand"),
    ("сурхандар", "Сурхондарё вилояти", "surhondaryo"), ("сырдар", "Сирдарё вилояти", "sirdaryo"),
    ("ферган", "Фарғона вилояти", "fargona"), ("хорезм", "Хоразм вилояти", "horazm"),
    ("каракалпак", "Қорақалпоғистон Республикаси", "korakalpogiston"),
    ("города ташкент", "Тошкент шаҳри", "toshkent shahri"), ("ташкентское городск", "Тошкент шаҳри", "toshkent shahri"),
    ("ташкентской област", "Тошкент вилояти", "toshkent viloyati"), ("ташкентское област", "Тошкент вилояти", "toshkent viloyati"),
]
LATREG = {
    "andijon": "Андижон вилояти", "buhoro": "Бухоро вилояти", "jizzah": "Жиззах вилояти",
    "kashkadaryo": "Қашқадарё вилояти", "navoiy": "Навоий вилояти", "namangan": "Наманган вилояти",
    "samarkand": "Самарқанд вилояти", "surhondaryo": "Сурхондарё вилояти", "sirdaryo": "Сирдарё вилояти",
    "fargona": "Фарғона вилояти", "horazm": "Хоразм вилояти", "korakalpogiston": "Қорақалпоғистон Республикаси",
    "toshkent shahri": "Тошкент шаҳри", "toshkent viloyati": "Тошкент вилояти",
}


def tree_region(row):
    txt = " ".join(row["path"] + [row["label"]]).lower()
    for key, reg, _ in REGIONS:
        if key in txt:
            return reg
    return None


def base_region(o):
    """Geographic region of a registry row (republican sheet rows use their «Hudud»)."""
    if o["region"] != "Республика муассасалари":
        return o["region"]
    h = lat(o.get("hudud") or "")
    for k, reg in LATREG.items():
        if h.startswith(k.split()[0]) and (("shahri" in k) == ("shahri" in h) or "toshkent" not in k):
            return reg
    return None


def kind(name):
    n = lat(name)
    if "sanitar" in n:
        return "ses"
    if (("semeyn" in n and "punkt" in n) or "punkt semeyn" in n or "shifokorlik punkt" in n or "kabinet semeyn" in n
            or re.search(r"oshp", n) or "vrachebn" in n or ("semeyn" in n and "medisinsk" in n and "sentr" in n)):
        return "oshp"
    if "mnogoprofil" in n or "kop tarmokli" in n or "kotarmokli" in n or "sentralnaya poliklin" in n:
        return "ktmp"
    if ("semeyn" in n and "poliklin" in n) or "oilaviy poliklin" in n or "oilaviy poli" in n or re.search(r"op", n):
        return "op"
    if "medisinsk" in n and "obedinen" in n or "tibbiyot birlashma" in n:
        return "ttb"
    if "stomatolog" in n:
        return "stom"
    return "other"


GENERIC = ("rayon", "gorod", "medisin", "obedin", "otdel", "zdravooh", "semeyn", "vracheb", "punkt", "poliklin",
           "sentr", "oblast", "upravlen", "sanitar", "epidem", "spokoy", "obshestv", "zdorov", "tuman", "shahar",
           "shahri", "oilaviy", "shifokor", "sonli", "kop", "tarmok", "markaz", "davlat", "muassasa", "filial",
           "bolim", "imeni", "nomidagi", "son", "op", "oshp", "glavn", "komitet", "uchastk", "bolnis", "kasalhona")
# «Амударьинское» → «Амударь», «Ходжалинское» → «Ходжал» (o'zbekchada «-in-» yo'q: Amudaryo, Xo'jayli)
RU_END = re.compile(r"(инского|инское|инский|инская|инском|ского|ской|ский|ская|ское|ском|ских|ские|ского|ого|ий|ая|ое)$")


def ru_stem(word):
    return RU_END.sub("", word) if re.search(r"[а-я]", word) and len(word) > 6 else word


def generic(word):
    lw = lat(word)
    return len(lw) < 3 or any(lw.startswith(g) for g in GENERIC)


def numbers(name):
    return {int(x) for x in re.findall(r"(?<!\d)(\d{1,3})(?!\d)", name)}


def places(name):
    out = set()
    for q in re.findall(r"[«\"“]([^»\"”]+)[»\"”]", name):
        for w in q.split():
            if len(skel(w)) >= 3:
                out.add(skel(w))
    return out


WORD = r"[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳʻʼ'’]+"


def tokens(name):
    name = re.sub(r"(?<=\w)-(?=\w)", "", name)  # «Qizil-qum» → «Qizilqum»
    return {skel(ru_stem(w)) for w in re.findall(WORD, name) if not generic(w) and len(skel(ru_stem(w))) >= 2}


def share(a, b, skip):
    """Any token in a and b where one skeleton is a prefix of the other (≥2 letters), ignoring district words."""
    for x in a:
        for y in b:
            if x[:4] in skip or y[:4] in skip:
                continue
            s, l = (x, y) if len(x) <= len(y) else (y, x)
            if len(s) >= 2 and l.startswith(s):
                return True
    return False


def city(name):
    """True = city-level, False = district-level, None = unknown."""
    n = lat(name)
    c = bool(re.search(r"gorod|shahar|shahri", n))
    d = bool(re.search(r"rayon|tuman", n))
    return None if c == d else c


def district_skel(text):
    """Skeleton (4 letters) of the first non-generic word, e.g. «Районное объединение Фаришского района» → frsh."""
    for w in re.findall(WORD, text or ""):
        if not generic(w):
            return skel(ru_stem(w))[:4]
    return ""


def tree_district(row):
    for p in reversed(row["path"]):
        pl = p.lower()
        if "объединение" in pl or "отдел здравоохранения" in pl:
            return district_skel(p)
    m = re.search(r"(" + WORD + r")\s+(района|районного|города|городского)", row["label"])
    if m:
        return district_skel(m.group(1))
    m = re.search(r"(района|город[а]?)\s+(" + WORD + ")", row["label"])
    return district_skel(m.group(2)) if m else ""


ap = argparse.ArgumentParser()
ap.add_argument("--tree", required=True)
ap.add_argument("--base", default="data/argos-live-base.json")
ap.add_argument("--out-json", required=True)
a = ap.parse_args()

T = json.load(open(a.tree, encoding="utf-8"))
B = json.load(open(a.base, encoding="utf-8"))
tree = {r["tin"]: r for r in T["rows"]}
orgs = B["orgs"]
ignore = set(B.get("ignoreStir", []))
stir_count = collections.Counter(o["stir"] for o in orgs if o["stir"])
new_tins = [t for t in tree if t not in stir_count and t not in ignore]

note_pair = {}
for i, o in enumerate(orgs):
    m = re.search(r"alohida STIR bor: (\d+)", o.get("note") or "")
    if m:
        note_pair[i] = m.group(1)

# registry rows that may legitimately take a new STIR: shared (TTB) STIR, no STIR, or STIR missing from the tree
eligible = [i for i, o in enumerate(orgs) if not o["stir"] or stir_count[o["stir"]] > 1 or o["stir"] not in tree]


def fit(t, i):
    """Structural agreement between tree org t and registry row i → (ok, reasons)."""
    r, o = tree[t], orgs[i]
    reasons = []
    tr, br = tree_region(r), base_region(o)
    if not tr or tr != br:
        return False, ["region"]
    kt, kb = kind(r["label"]), kind(o["name"])
    if kt != kb:
        return False, ["type %s/%s" % (kt, kb)]
    reasons.append("type")
    td = tree_district(r)
    bd = district_skel(o["district"] or "") if o["region"] != "Республика муассасалари" else district_skel(o["name"])
    if td and bd and td != bd:
        return False, ["district %s/%s" % (td, bd)]
    if td and bd:
        reasons.append("district")
    nt, nb = numbers(r["label"]), numbers(o["name"])
    pt, pb = places(r["label"]) | tokens(r["label"]), places(o["name"]) | tokens(o["name"])
    if nt and nb:
        if nt & nb:
            reasons.append("number")
        else:
            return False, ["number"]
    if share(pt, pb, {td, bd}):
        reasons.append("place")
    ct, cb = city(r["label"]), city(o["name"])
    if ct is not None and cb is not None and ct != cb:
        return False, ["city/district"]
    return True, reasons


matches = collections.defaultdict(list)  # tin -> [(row, reasons)]
for t in new_tins:
    for i in eligible:
        ok, why = fit(t, i)
        k = kind(tree[t]["label"])
        if not ok:
            continue
        # one KTMP / TTB / SES department per district: district + type identify it
        structural = "district" in why and ("number" in why or "place" in why or k in ("ses", "ktmp", "ttb"))
        # or two independent methods agree: the workbook's earlier pairing and a clean structural fit
        noted = note_pair.get(i) == t
        if structural or noted:
            matches[t].append((i, why + (["excel note"] if noted else [])))

claimed = collections.Counter(i for t, l in matches.items() if len(l) == 1 for i, _ in l)
auto, review, new = [], [], []
for t in new_tins:
    l = matches.get(t, [])
    if len(l) == 1 and claimed[l[0][0]] == 1:
        i, why = l[0]
        agree_note = note_pair.get(i) == t
        conflict_note = i in note_pair and note_pair[i] != t
        rec = {"tin": t, "row": i, "why": why, "note": "agree" if agree_note else ("conflict" if conflict_note else "none")}
        (review if conflict_note else auto).append(rec)
    elif l:
        review.append({"tin": t, "rows": [i for i, _ in l], "why": [w for _, w in l]})
    else:
        # the Excel note may still name it
        rows_by_note = [i for i, tt in note_pair.items() if tt == t]
        if rows_by_note:
            review.append({"tin": t, "rows": rows_by_note, "why": ["excel note only"]})
        else:
            new.append({"tin": t})

resolved_rows = {x["row"] for x in auto}
missing = [i for i, o in enumerate(orgs) if o["stir"] and o["stir"] not in tree and i not in resolved_rows]
json.dump({"auto": auto, "review": review, "new": new, "missing": missing,
           "counts": {"tree": len(tree), "new_tins": len(new_tins), "auto": len(auto), "review": len(review),
                      "new": len(new), "missing": len(missing)}},
          open(a.out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps({"tree": len(tree), "new_tins": len(new_tins), "auto": len(auto), "review": len(review),
                  "new": len(new), "missing_rows": len(missing),
                  "auto_note_agree": sum(1 for x in auto if x["note"] == "agree")}, ensure_ascii=False))
