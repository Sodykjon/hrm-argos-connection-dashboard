"""
Reestrdagi siljigan STIR'lar auditi (09.10.2026).

STIR'ning ARGOS'dagi nomi reestr satriga zid bo'lsa (boshqa raqam, KTMP ↔ OP, boshqa joy nomi), shu
tumandagi to'g'ri tashkilot qidiriladi. Taklif faqat yopiq almashtirish bo'lsa qabul qilinadi: olinadigan
STIR bo'sh yoki zid satrniki; reestrda yo'q STIR faqat billing faol bo'lsa. O'z STIR'i ARGOS'da yo'q
bo'lib, STIR'i boshqa muassasaga o'tgan satr «lose» (STIR bo'shatiladi, ulanmagan).

  python scripts/audit-shifted-stir.py <argos_tree.json> <out.json> [takror satr nomi …]
Chiqish: auto / lose / remove / review (haqiqiy ziddiyat) / soft (ehtimol tarjima farqi).
«auto»ni qo'llashdan oldin ko'z bilan tekshirish SHART (09.10: Jalaquduq juftligi xato chiqdi).
"""
import json, os, sys, collections, re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(REPO, "scripts", "compare-argos-tree.py"), encoding="utf-8").read()
exec(src.split("ap = argparse.ArgumentParser()")[0])
TREE = sys.argv[1]
OUT = sys.argv[2]
tree = {r["tin"]: r for r in json.load(open(TREE, encoding="utf-8"))["rows"]}
B = json.load(open(os.path.join(REPO, "data", "argos-live-base.json"), encoding="utf-8"))
orgs = B["orgs"]
cnt = collections.Counter(o["stir"] for o in orgs if o["stir"])
PRIM = ("op", "oshp", "ktmp")


def dskel(text):
    """district_skel, or — when every word looks generic («Shahrisabz» starts like «shahri») — the first word."""
    d = district_skel(text or "")
    if d:
        return d
    w = re.findall(WORD, text or "")
    return skel(ru_stem(w[0]))[:4] if w else ""


def city(name):
    """True = city-level, False = district-level, None = unknown; «tuman/район» wins (Shahrisabz tumani)."""
    n = lat(name)
    if re.search(r"tuman|rayon", n):
        return False
    return True if re.search(r"gorod|shahar|shahri", n) else None


def bdist(o):
    return dskel(o["district"] or "") if o["region"] != "Республика муассасалари" else dskel(o["name"])


def agree(i, t):
    """good / bad / unknown: tree org t vs registry row i."""
    r, o = tree[t], orgs[i]
    kt, kb = kind(r["label"]), kind(o["name"])
    if (kt == "ktmp") != (kb == "ktmp"):
        return "bad"
    nt, nb = numbers(r["label"]), numbers(o["name"])
    td, bd = tree_district(r), bdist(o)
    if nt and nb:
        return "good" if nt & nb else "bad"
    pt, pb = places(r["label"]) | tokens(r["label"]), places(o["name"]) | tokens(o["name"])
    if share(pt, pb, {td, bd}):
        return "good"
    if kt == kb == "ktmp":
        return "good"
    # two different place names: «A.Ikromov OShP» is not «Семейный медицинский центр Маданият»
    if not nt and not nb and (pt - {td}) and (pb - {bd}):
        return "bad"
    # numbered polyclinic ↔ place-named post: «34-я семейная поликлиника» is not «Madaniyat OShP»
    if nt and not nb and (pb - {bd}):
        return "bad"
    if nb and not nt and (pt - {td}):
        return "bad"
    return "unknown"


# rows that matter: primary-care units (OP/OShP/KTMP) with a unique STIR in the tree, or no STIR
rows = [i for i, o in enumerate(orgs) if o["region"] != "Республика муассасалари" and kind(o["name"]) in PRIM
        and (not o["stir"] or cnt[o["stir"]] == 1)]
bad = [i for i in rows if orgs[i]["stir"] in tree and agree(i, orgs[i]["stir"]) == "bad"]
blank = [i for i in rows if not orgs[i]["stir"] or orgs[i]["stir"] not in tree]

# tree orgs per (region, district skeleton)
def label_district(r):
    m = re.search(r"(" + WORD + r")\s+(района|районного|города|городского)", r["label"]) or         re.search(r"(" + WORD + r")\s+(район|районный|районная|районное)\b", r["label"])
    return dskel(m.group(1)) if m else ""


tkey = collections.defaultdict(set)
for t, r in tree.items():
    if kind(r["label"]) in PRIM:
        for d in {tree_district(r), label_district(r)} - {""}:
            tkey[(tree_region(r), d)].add(t)
# rows the user agreed to delete as duplicates: their STIR is free for the row they duplicate
# (09.10: «Семейный медицинский центр Кахрамон, Аккурганский район» — already gone from v6)
DUPLICATES = set(sys.argv[3:])
REMOVE = {i for i, o in enumerate(orgs) if o["name"] in DUPLICATES}
owner = {orgs[i]["stir"]: i for i in range(len(orgs)) if orgs[i]["stir"] and cnt[orgs[i]["stir"]] == 1 and i not in REMOVE}


def cands(i):
    o = orgs[i]
    cb = city(o["name"])
    return [t for t in tkey.get((base_region(o), bdist(o)), []) if agree(i, t) == "good"
            and (cb is None or city(tree[t]["label"]) in (None, cb))]


need = set(bad) | set(blank)
prop = {}
for i in need:
    c = cands(i)
    # a STIR new to the registry is only taken while its billing is on (user rule, 09.10)
    if len(c) == 1 and (c[0] in owner or tree[c[0]]["billing"] == 1):
        prop[i] = c[0]

# a proposal stands when the tin it takes is free, its own, or held by a row the tree contradicts
# (bad); a bad row that loses its tin and gets none keeps no STIR — it is not in ARGOS under its own
claimed = collections.Counter(prop.values())
cur = {i: t for i, t in prop.items() if claimed[t] == 1}
changed = True
while changed:
    changed = False
    for i, t in list(cur.items()):
        own = owner.get(t)
        if not (own is None or own == i or own in bad):
            del cur[i]
            changed = True
auto = [i for i in cur if cur[i] != orgs[i]["stir"]]
lose = sorted({owner[t] for i, t in cur.items() if owner.get(t) not in (None, i)} - set(cur))
def hard(i):
    r, o = tree[orgs[i]["stir"]], orgs[i]
    nt, nb = numbers(r["label"]), numbers(o["name"])
    return (kind(r["label"]) == "ktmp") != (kind(o["name"]) == "ktmp") or bool(nt and nb and not nt & nb) or bool(cands(i))


review = [i for i in bad if i not in cur and i not in lose and hard(i)]
soft = [i for i in bad if i not in cur and i not in lose and not hard(i)]
res = {
    "auto": [dict(row=i, region=orgs[i]["region"], district=orgs[i]["district"], name=orgs[i]["name"],
                  old=orgs[i]["stir"], new=cur[i], argos=tree[cur[i]]["label"], billing=tree[cur[i]]["billing"],
                  old_argos=tree[orgs[i]["stir"]]["label"] if orgs[i]["stir"] in tree else ("ARGOSda yoʻq" if orgs[i]["stir"] else None)) for i in auto],
    "lose": [dict(row=i, region=orgs[i]["region"], district=orgs[i]["district"], name=orgs[i]["name"], old=orgs[i]["stir"],
                  old_argos=tree[orgs[i]["stir"]]["label"], taken_by=orgs[[k for k, t in cur.items() if t == orgs[i]["stir"]][0]]["name"])
             for i in lose],
    "remove": [dict(row=i, name=orgs[i]["name"], stir=orgs[i]["stir"], district=orgs[i]["district"]) for i in REMOVE],
    "soft": [dict(row=i, district=orgs[i]["district"], name=orgs[i]["name"], stir=orgs[i]["stir"],
                  argos=tree[orgs[i]["stir"]]["label"]) for i in soft],
    "review": [dict(row=i, region=orgs[i]["region"], district=orgs[i]["district"], name=orgs[i]["name"],
                    stir=orgs[i]["stir"], argos=tree[orgs[i]["stir"]]["label"], billing=tree[orgs[i]["stir"]]["billing"],
                    cands=[[t, tree[t]["label"], tree[t]["billing"], orgs[owner[t]]["name"] if t in owner else None]
                           for t in cands(i)]) for i in review],
}
json.dump(res, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps({"rows": len(rows), "bad": len(bad), "blank": len(blank), "auto": len(auto),
                  "auto_blank": sum(1 for i in auto if not orgs[i]["stir"]), "lose": len(lose), "review": len(review), "soft": len(soft)}))
