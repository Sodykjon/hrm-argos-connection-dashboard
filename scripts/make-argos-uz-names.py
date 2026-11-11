"""
ARGOS'dagi o'zbekcha (lotin) nomlar → scripts/argos-nomlar-uz.json (STIR → nom).

Kirish: hrm.argos.uz GetSpInstitutionTreeV2 javobi «Accept-Language: uz-Latn-UZ» sarlavhasi bilan olingan,
        [tin, billing, label, parentTin] qatorlariga yig'ilgan JSON ({"at", "rows"}).
        (Sarlavhasiz so'rov ruscha nom beradi; «uz-Cyrl-UZ» — kirillcha.)

Tozalash (nom mazmuni o'zgarmaydi):
  - oʻ/gʻ dagi turli apostroflar (' ’ ‘ ` ʼ) → ʻ, qolgan tutuq belgilari → ʼ (reestrdagidek);
  - lotin so'z ichiga tushib qolgan kirill harflar (С, х, о, а …) → lotin;
  - ortiqcha bo'shliqlar.
Butunlay kirillcha nomlar olinmaydi (ARGOS'da o'zbekcha lotin nomi kiritilmagan) — reestr nomi qoladi.

make-argos-base.py bu nomlarni reestrdagi STIRi yagona qatorlarga qo'yadi (bir STIRli bir nechta
qator — masalan TTB STIRidagi bo'linmalar — o'z nomini saqlaydi); reestrdagi nom «excelName»da qoladi.

  python scripts/make-argos-uz-names.py argos_nomlar_uz_<sana>.json
"""
import json, re, sys

CYR2LAT = str.maketrans("АВСЕНКМОРТХаеорсхуіЅѕ", "ABCEHKMOPTXaeopcxyiSs")
CYR = re.compile(r"[Ѐ-ӿ]")
LAT = re.compile(r"[A-Za-z]")
APOS = "'’‘`ʼ´"


def clean(s: str) -> str | None:
    s = re.sub(r"\s+", " ", s or "").strip()
    if not s:
        return None
    if CYR.search(s) and not LAT.search(s):
        return None  # Cyrillic-only: no Latin Uzbek name in ARGOS
    # Latin words with stray Cyrillic look-alikes («Сhimqo'rg'on», «shifoхona»)
    s = re.sub(r"\S+", lambda m: m.group(0).translate(CYR2LAT) if LAT.search(m.group(0)) else m.group(0), s)
    s = re.sub(rf"([OoGg])[{APOS}ʻ]", r"\1ʻ", s)
    s = re.sub(rf"(?<=\w)[{APOS}](?=\w)", "ʼ", s)
    return s


def main():
    src = json.load(open(sys.argv[1], encoding="utf-8"))
    names, skipped = {}, 0
    for tin, _billing, label, *_ in src["rows"]:
        c = clean(label)
        if c:
            names[tin] = c
        else:
            skipped += 1
    out = {"source": "hrm.argos.uz GetSpInstitutionTreeV2 (Accept-Language: uz-Latn-UZ)",
           "at": src.get("at"), "names": dict(sorted(names.items()))}
    with open("scripts/argos-nomlar-uz.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("nomlar", len(names), "kirillcha (olinmadi)", skipped)


if __name__ == "__main__":
    main()
