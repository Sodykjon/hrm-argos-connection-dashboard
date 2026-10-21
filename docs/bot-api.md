# Bot API — tashkilotlarning ARGOS'ga ulanish holati

Telegram bot uchun faqat o'qish API'si. Raqamlar «ARGOS жонли» sahifasidagi bilan aynan bir xil
hisoblanadi: reestr + foydalanuvchi brauzeridan kelgan oxirgi ARGOS daraxti. To'ldirish darajasi
(`toldirish`) — «Тўлдирилиш даражаси» sahifasidagi oxirgi kunlik fayldan, tashkilotga STIR orqali
bog'lanadi.

Manzil: `https://<sayt-manzili>/api/bot/...` — barcha javoblar JSON, kodirovka UTF-8.

## Kirish

Har so'rovda sarlavha:

```
Authorization: Bearer <BOT_API_TOKEN>
```

| Kod | Ma'nosi |
|---|---|
| 401 | Token yo'q yoki noto'g'ri |
| 503 | Serverda token sozlanmagan yoki ARGOS daraxti hali yuklanmagan |
| 400 | Parametr noto'g'ri (javobda `xato` matni) |
| 404 | Bunday hudud yo'q |

Har javobda:

- `daraxtOlingan` — ARGOS daraxti o'qilgan vaqt (ISO, UTC);
- `tekshirilgan` — oxirgi tekshiruv (daraxt o'zgarmagan bo'lsa ham yangilanadi).

## Hudud slug'lari

`respublika`, `qoraqalpogiston`, `andijon`, `buxoro`, `jizzax`, `qashqadaryo`, `navoiy`, `namangan`,
`samarqand`, `sirdaryo`, `surxondaryo`, `toshkent-viloyati`, `fargona`, `xorazm`, `toshkent-shahri`.

To'liq ro'yxat nomlari bilan birga `GET /api/bot/umumiy` javobida keladi.

## Holatlar

| `holat` | `holatMatn` |
|---|---|
| `ulangan` | Уланган |
| `ulanmagan` | Уланмаган |
| `ochirilgan` | Ўчирилган |

`sabab` / `sababMatn` holat nima uchun shundayligini aytadi: `billing` (daraxtda, billing faol),
`billingOff` (daraxtda, billing nofaol), `missing` (ARGOS daraxtida yo'q), `nostir` (STIR yo'q —
reestr holati), `newBilling0` (yangi ulangan, billing hali yoqilmagan), `awaitBilling` (tuman xatidagi INN,
daraxtda bor, billing hali yoqilmagan — ulanmagan), `override` (qo'lda belgilangan).

## Tashkilot obyekti

```json
{
  "id": "919061a623fc",
  "nomi": "Oltinkoʻl tumani tibbiyot birlashmasi",
  "hudud": "Андижон вилояти",
  "hududSlug": "andijon",
  "tuman": "Oltinkoʻl tumani",
  "stir": "200254651",
  "boysunuvi": "Hududiy SSB va tuman hokimligi",
  "holat": "ulangan",
  "holatMatn": "Уланган",
  "sabab": "billing",
  "sababMatn": "Дарахтда, биллинг фаол",
  "billing": 1,
  "toldirish": { "foiz": 87.5, "sana": "2026-10-14" }
}
```

- `id` — doimiy identifikator (hudud + guruh + nom asosida). Tashkilot nomi reestrda tuzatilsa,
  `id` o'zgaradi.
- `stir` — `null` bo'lishi mumkin. Bitta STIR ostida bir nechta tashkilot bo'lishi mumkin.
- `boysunuvi` — reestrdagi «Boʻysunuvi» ustuni: tashkilot kimga bo'ysunadi (masalan «Tuman tibbiyot
  birlashmasi», «Hududiy SSB va tuman hokimligi», «Viloyat SSB»). Qiymat bo'lmasa `null`.
- `billing`: `1` faol, `0` nofaol, `null` daraxtda yo'q.
- `toldirish` — ma'lumotlar to'ldirilish darajasi: `foiz` (0–100, bir kasr xona) va `sana` (fayl
  sanasi, ISO). `null` — tashkilotda STIR yo'q yoki uning STIR'i to'ldirish faylida yo'q.
  Bitta STIR ostidagi bir nechta reestr qatori bir xil qiymat oladi.

## To'ldirish jamlamasi

`umumiy`, `hudud/{slug}` va ularning `hududlar[]` / `tumanlar[]` elementlarida, `toldirish` endpoint'ida:

```json
{ "tashkilotlar": 274, "ortacha": 31.4, "nol": 120, "ellikdanKam": 190, "sana": "2026-10-14" }
```

- `tashkilotlar` — to'ldirish faylidagi tashkilotlar soni (ulanish `jami` bilan bir xil emas:
  boshqa ro'yxat);
- `ortacha` — tashkilotlar foizlarining o'rtachasi; `nol` — 0% dagilar; `ellikdanKam` — 50% dan pastlar.
- Hudud raqamlari «Тўлдирилиш даражаси» sahifasidagi bilan bir xil. Tuman raqami — STIR'i reestrda
  shu tumanda turgan tashkilotlardan; STIR'i reestrda topilmaganlar tumanlarga kirmaydi.
- Ma'lumot bo'lmasa `null`. `sana` eski bo'lsa — kunlik fayl hali yangilanmagan.

## Endpoint'lar

### `GET /api/bot/umumiy`
Respublika jami va hududlar. Misol javob (05.10 daraxti, qisqartirilgan):

```json
{ "jami": 3896, "ulangan": 3434, "ulanmagan": 375, "ochirilgan": 87, "foiz": 88.1,
  "hududlar": [ { "nomi": "Андижон вилояти", "slug": "andijon", "jami": 274, "ulangan": 254, "ulanmagan": 16, "ochirilgan": 4, "foiz": 92.7 } ] }
```

### `GET /api/bot/hudud/{slug}`
Bitta hudud jami va tumanlar (tizimlar) kesimi: `tumanlar[]` — `nomi`, `jami`, `ulangan`,
`ulanmagan`, `ochirilgan`, `foiz`.

### `GET /api/bot/hudud/{slug}/tashkilotlar[?holat=ulanmagan]`
Hududdagi barcha tashkilotlar (reestr tartibida). `holat` berilsa — faqat shu holatdagilar.
Javob: `{ slug, jami, tashkilotlar: [ ...tashkilot obyekti ] }`.

### `GET /api/bot/tashkilot?stir=200254651`
Shu STIR ostidagi barcha tashkilotlar: `{ jami, natijalar: [...] }`.

### `GET /api/bot/tashkilot?q=oltinkol 42[&hudud=andijon][&limit=20]`
Nom bo'yicha qidiruv: so'rovdagi har bir so'z nomdagi biror so'zning boshiga mos kelishi kerak.
Katta-kichik harf, apostrof (ʻ ' ’) va kirill/lotin farqi hisobga olinmaydi («Олтинкўл» =
«oltinkol»). `limit` standart 20, eng ko'pi 100. Javob: `{ jami, natijalar: [...] }` — `jami`
limitdan oldingi umumiy son.

### `GET /api/bot/toldirish[?hudud=andijon][&kam=50][&limit=100]`
To'ldirish faylidagi tashkilotlar, eng past foizdan boshlab. `kam` berilsa — faqat shu foizdan
**past**lar; `limit` — eng ko'pi 5000 (standart: hammasi). Javob:

```json
{ "slug": "andijon", "toldirish": { "tashkilotlar": 274, "ortacha": 31.4, "nol": 120, "ellikdanKam": 190, "sana": "2026-10-14" },
  "jami": 190,
  "tashkilotlar": [ { "nomi": "…", "stir": "200254651", "foiz": 0, "hudud": "Андижон вилояти", "hududSlug": "andijon",
    "tuman": "Oltinkoʻl tumani", "reestrId": "919061a623fc" } ] }
```

- `nomi` — to'ldirish faylidagi nom (ARGOS yozilishi, reestrdagidan farq qilishi mumkin);
- `reestrId` — reestr qatorining `id`si (tashkilot obyekti bilan bog'lash uchun), `tuman` — reestrdagi
  tuman; STIR reestrda topilmasa ikkalasi `null`;
- `toldirish` — butun hudud (yoki respublika) jamlamasi, `kam` filtridan oldin; `jami` — filtrdan
  keyingi, `limit`dan oldingi son.
- 503 — to'ldirish fayli hali yuklanmagan.

### `GET /api/bot/ozgarishlar[?hudud=andijon]`
Oxirgi ikki **turli** ARGOS daraxti orasida holati o'zgargan tashkilotlar: (misol)

```json
{ "oldingiDaraxt": "2026-10-05T11:27:28.709Z", "daraxtOlingan": "2026-10-05T11:37:28.709Z", "jami": 1,
  "ozgarishlar": [ { "id": "919061a623fc", "nomi": "Oltinkoʻl tumani tibbiyot birlashmasi", "hudud": "Андижон вилояти",
    "hududSlug": "andijon", "tuman": "Oltinkoʻl tumani", "stir": "200254651",
    "boysunuvi": "Hududiy SSB va tuman hokimligi", "oldin": "ochirilgan", "oldinMatn": "Ўчирилган", "holat": "ulangan", "holatMatn": "Уланган" } ] }
```

## Bildirishnoma uchun tavsiya

Daraxt foydalanuvchi brauzeridan ~10 daqiqada bir keladi. Ikki usul bor:

1. **`/ozgarishlar` orqali.** Har 5–10 daqiqada so'rang. `oldingiDaraxt` + `daraxtOlingan` juftligi
   oldingi so'rovdagi bilan bir xil bo'lsa — bu o'zgarishlar allaqachon yuborilgan, qayta
   yubormang. Bot uzoq vaqt to'xtab qolsa, oraliqdagi o'zgarishlar yo'qolishi mumkin.
2. **O'z holatingizni saqlab (ishonchliroq).** Har hudud uchun `/hudud/{slug}/tashkilotlar`ni
   oling, `id → holat`ni saqlang va keyingi so'rovda solishtiring. Bot to'xtab qolsa ham hech
   narsa yo'qolmaydi.

Tavsiya: 2-usul + so'rovlar orasida kamida 1 daqiqa.
