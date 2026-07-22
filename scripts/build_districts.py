# -*- coding: utf-8 -*-
"""Build tuman drill-down artifacts:
  public/uz-districts.geo.json  — district geometries for the 13 map viloyats
  data/stir-soato.json          — org STIR(9) -> SOATO(7)
  data/soato-meta.json          — SOATO -> {name, viloyat, feature|null}
Tashkent city (1726) is excluded from the map (shown as a list) because the free
geojson is incomplete for the capital; its SOATO still get names for the list."""
import sys, io, json, re, difflib
from collections import Counter, defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import openpyxl

ROOT = "C:/Users/Admin/Projects/hrm-argos-dashboard"
REG = "C:/Users/Admin/Downloads/Telegram Desktop/1700 РЕЕСТР_02.07.2026.xlsx"

VIL4 = {
    "1703":"Андижон вилояти","1706":"Бухоро вилояти","1708":"Жиззах вилояти",
    "1710":"Қашқадарё вилояти","1712":"Навоий вилояти","1714":"Наманган вилояти",
    "1718":"Самарқанд вилояти","1722":"Сурхондарё вилояти","1724":"Сирдарё вилояти",
    "1726":"Тошкент шаҳри","1727":"Тошкент вилояти","1730":"Фарғона вилояти",
    "1733":"Хоразм вилояти","1735":"Қорақалпоғистон Республикаси",
}
TASHKENT_CITY = "Тошкент шаҳри"   # excluded from the map

def pip_ring(pt, ring):
    x,y=pt; inside=False; n=len(ring); j=n-1
    for i in range(n):
        xi,yi=ring[i][0],ring[i][1]; xj,yj=ring[j][0],ring[j][1]
        if ((yi>y)!=(yj>y)) and (x < (xj-xi)*(y-yi)/(yj-yi+1e-15)+xi): inside=not inside
        j=i
    return inside
def pip_poly(pt,poly): return bool(poly) and pip_ring(pt,poly[0]) and not any(pip_ring(pt,h) for h in poly[1:])
def pip_geom(pt,g):
    if g["type"]=="Polygon": return pip_poly(pt,g["coordinates"])
    if g["type"]=="MultiPolygon": return any(pip_poly(pt,p) for p in g["coordinates"])
    return False
def rep_point(g):
    rings=[g["coordinates"][0]] if g["type"]=="Polygon" else [p[0] for p in g["coordinates"]]
    ring=max(rings,key=len); xs=[c[0] for c in ring]; ys=[c[1] for c in ring]
    return (sum(xs)/len(xs),sum(ys)/len(ys))

adm2=json.load(open(f"{ROOT}/_adm2.json",encoding="utf-8"))
adm1=json.load(open(f"{ROOT}/public/uzbekistan.geo.json",encoding="utf-8"))
def viloyat_of(feat):
    pt=rep_point(feat["geometry"])
    for v in adm1["features"]:
        if pip_geom(pt,v["geometry"]): return v["properties"]["name"]
    best,bd=None,1e18
    for v in adm1["features"]:
        c=rep_point(v["geometry"]); d=(c[0]-pt[0])**2+(c[1]-pt[1])**2
        if d<bd: bd,best=d,v["properties"]["name"]
    return best
for f in adm2["features"]: f["properties"]["_vil"]=viloyat_of(f)

def norm(s):
    s=str(s).lower().strip(); s=re.sub(r"[ʻʼ'`´]","",s)
    for suf in [" tumani"," tuman"," shahri"," sh."," district"," region"]: s=s.replace(suf,"")
    s=s.replace(" city","").strip()
    s=s.replace("kh","h").replace("x","h").replace("ts","s").replace("dzh","j").replace("dj","j")
    s=s.replace("q","k").replace("w","v").replace("yo","o").replace("iy","i")
    s=s.replace("oo","o").replace("aa","a").replace("uu","u")
    return re.sub(r"[^a-z]","",s)

ALIAS={
 "buhoro":"buhara","kokon":"kokand","denov":"denau","kitob":"kitab","gallaorol":"gallaaral",
 "rashidov":"sharofrashidov","zomin":"zamin","koson":"kasan","guzor":"guzar","dehkonobod":"dehkanabad",
 "yakkabog":"yakkabag","chirokchi":"chirakchi","muborak":"mubarek","korakol":"karakul","shofirkon":"shafirkan",
 "kogon":"kagan","koravulbozor":"karaulbazar","romiton":"ramitan","vobkent":"vabkent","gijduvon":"gijduvan",
 "chortok":"chartak","kosonsoy":"kasansay","torakorgon":"turakurgan","uchkorgon":"uchkurgan",
 "yangikorgon":"yangikurgan","norin":"narin","pop":"pap","mingbulok":"mingbulak","urganch":"urgench",
 "bogot":"bagat","koshkopir":"koshkupir","hazorasp":"hazarasp","honka":"hanka","shovot":"shavat",
 "yangibozor":"yangibazar","gurlan":"gurlen","boyovut":"bayaut","sayhunobod":"saykhunabad",
 "mirzaobod":"mirzaabad","hovos":"havas","okoltin":"akaltin","termiz":"termez","jarkorgon":"jarkurgan",
 "kumkorgon":"kumkurgan","muzrabot":"muzrabad","sariosiyo":"sariasiya","sherobod":"sherabad",
 "shorchi":"shurchi","oltinsoy":"altinsay","boysun":"baysun","kungirot":"kungrad","hojayli":"hojeyli",
 "koraozak":"karauzyak","konlikol":"kanlikul","moynok":"muynak","tahtakopir":"takhtakupir",
 "chimboy":"chimbay","bulungor":"bulungur","nurobod":"nurabad","paxtachi":"pakhtachi","koshrabod":"koshrabad",
 "jomboy":"jambay","kattakorgon":"kattakurgan","okdaryo":"akdarya","tayloq":"taylak","ishtihon":"ishtikhan",
 "fargona":"fergana","beshorik":"besharik","rishton":"rishtan","bagdod":"bagdad","uchkoprik":"uchkuprik",
 "ozbekiston":"uzbekistan","koshtepa":"kushtepa","sux":"sokh","yozyovon":"yazyavan","oltiarik":"altiarik",
 "korgontepa":"kurgantepa","oltinkol":"altinkul","marhamat":"markhamat","hojaobod":"khadjaabad",
 "xojaobod":"khadjaabad","bulokboshi":"bulakbashi","ulugnor":"ulugnar","paxtaobod":"paxtaabad",
 "shahrihon":"shakhrixan","jalolkuduk":"djalalkuduk","zafarobod":"zafarabad","zarbdor":"zarbdar",
 "yangiobod":"yangiabad","mirzachol":"mirzachul","dostlik":"dustlik","arnasoy":"arnasay","baxmal":"bakhmal",
 "forish":"farish","konimex":"kanimekh","navbahor":"navbakhor","nurota":"nurata","tomdi":"tamdi",
 "shaxrisabz":"shakhrisabz","shahrisabz":"shakhrisabz","kamashi":"kamashi","mirishkor":"mirishkar",
 "guliston":"gulistan","sirdaryo":"sirdarya","ohangaron":"akhangaran","oxangaron":"akhangaran",
 "zangiota":"zangiata","boka":"buka","ortachirchik":"urtachirchik","yangiyol":"yangiyul",
 "yukorichirchik":"yukarichirchik","chinoz":"chinaz","okkorgon":"akkurgan","bekobod":"bekabad",
 "bostonlik":"bostanlik","payarik":"payarik","pastdargom":"pastdargom",
}

# ARGOS soato -> uz name + stir->soato
wb=openpyxl.load_workbook(REG,read_only=True,data_only=True)
ws=wb["для кат"]; rows=list(ws.iter_rows(values_only=True))
def parse_names(a):
    a=str(a or ""); t=""; c=""
    m=re.search(r"([A-Za-zʻʼ'`\-]+)\s*(?:tumani|tuman)\b",a)
    if m: t=m.group(1)
    m=re.search(r"([A-Za-zʻʼ'`\-]+)\s+shahri\b",a) or re.search(r"([A-Za-zʻʼ'`\-]+)\s+sh\.",a)
    if m: c=m.group(1)
    return t,c
snames=defaultdict(Counter); scount=Counter(); scity=defaultdict(Counter); stir_soato={}
for r in rows[4:]:
    s=str(r[14]).strip() if len(r)>14 and r[14] is not None else ""
    # STIR(9) = first 9 digits of STIR+II (col2, 11-digit); fallback col7
    stir11=str(r[2]).strip() if len(r)>2 and r[2] is not None else ""
    stir11=stir11.split(".")[0]
    stir=stir11[:9] if (len(stir11)>=9 and stir11[:9].isdigit()) else ""
    if not stir:
        c7=str(r[7]).strip() if len(r)>7 and r[7] is not None else ""
        stir=c7.split(".")[0]
    if not (s and s.isdigit() and len(s)==7): continue
    if stir and stir.isdigit(): stir_soato[stir]=s
    scount[s]+=1
    t,c=parse_names(r[5] if len(r)>5 else "")
    if t: snames[s][t]+=1
    if c: scity[s][c]+=1
wb.close()

# geojson features by viloyat (norm key -> enName), split city/rural
gb=defaultdict(lambda:{"rural":{}, "city":{}})
for f in adm2["features"]:
    en=f["properties"]["shapeName"]; vil=f["properties"]["_vil"]
    if " city" in en.lower() or en.lower().endswith("city"):
        gb[vil]["city"][norm(en)]=en
    else:
        gb[vil]["rural"][norm(en)]=en

cross={}; used=defaultdict(set); unresolved=[]
for s,c in scount.items():
    vil=VIL4.get(s[:4],"?")
    if vil==TASHKENT_CITY: continue      # handled as list
    is_city = len(s)==7 and s[4]=="4"
    pool = gb[vil]["city"] if is_city else gb[vil]["rural"]
    nm = (scity[s].most_common(1)[0][0] if (is_city and scity[s]) else
          (snames[s].most_common(1)[0][0] if snames[s] else ""))
    key=norm(nm); key=ALIAS.get(key,key); en=pool.get(key)
    if not en and key:
        cl=difflib.get_close_matches(key,[k for k in pool if pool[k] not in used[vil]],n=1,cutoff=0.72)
        en=pool[cl[0]] if cl else None
    if en and en not in used[vil]:
        cross[s]=en; used[vil].add(en)
    else:
        unresolved.append((s,nm,vil,is_city,c))

# elimination within viloyat+pool
for vil in list(gb.keys()):
    if vil==TASHKENT_CITY: continue
    for pooln in ("rural","city"):
        pool=gb[vil][pooln]
        left_feat=[en for en in pool.values() if en not in used[vil]]
        left_s=[u for u in unresolved if u[2]==vil and u[3]==(pooln=="city")]
        if len(left_feat)==1 and len(left_s)==1:
            s=left_s[0][0]; cross[s]=left_feat[0]; used[vil].add(left_feat[0])
            unresolved=[u for u in unresolved if u[0]!=s]

map_soato=[s for s in scount if VIL4.get(s[:4])!=TASHKENT_CITY]
cov=sum(scount[s] for s in cross); tot=sum(scount[s] for s in map_soato)
print(f"MAP crosswalk: {len(cross)}/{len(map_soato)} soato ({len(cross)*100//len(map_soato)}%) | org coverage {cov}/{tot} ({cov*100//tot}%)")
print("still unresolved (map):", [(s,nm,vil,c) for s,nm,vil,ic,c in sorted(unresolved,key=lambda x:-x[4])][:20])

# ---- artifacts ----
# soato-meta
def display_name(s):
    if snames[s]: return snames[s].most_common(1)[0][0]
    if scity[s]: return scity[s].most_common(1)[0][0]
    return ""
soato_meta={}
for s in scount:
    soato_meta[s]={"name":display_name(s),"viloyat":VIL4.get(s[:4],""),"feature":cross.get(s)}
# enName -> uz label (for geojson feature label)
en_label={}
for s,en in cross.items():
    if soato_meta[s]["name"]: en_label.setdefault(en,soato_meta[s]["name"])

# district geojson: features of the 13 map viloyats
out={"type":"FeatureCollection","features":[]}
for f in adm2["features"]:
    vil=f["properties"]["_vil"]; en=f["properties"]["shapeName"]
    if vil==TASHKENT_CITY: continue
    out["features"].append({"type":"Feature",
        "properties":{"name":en,"label":en_label.get(en,en),"viloyat":vil},
        "geometry":f["geometry"]})
json.dump(out,open(f"{ROOT}/public/uz-districts.geo.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
json.dump(stir_soato,open(f"{ROOT}/data/stir-soato.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
json.dump(soato_meta,open(f"{ROOT}/data/soato-meta.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
import os
print("wrote public/uz-districts.geo.json (%d features, %d KB)"%(len(out["features"]),os.path.getsize(f"{ROOT}/public/uz-districts.geo.json")//1024))
print("wrote data/stir-soato.json (%d), data/soato-meta.json (%d)"%(len(stir_soato),len(soato_meta)))
