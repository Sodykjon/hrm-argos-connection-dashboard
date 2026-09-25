# «ARGOS жонли» хатчўпи

`/argos-jonli` саҳифаси ташкилотларнинг ARGOS'га уланиш ҳолатини ARGOS
ташкилотлар дарахти (`GetSpInstitutionTreeV2`) ва биллинг ҳолатидан ҳисоблайди.
Дашборд ARGOS'га ўзи мурожаат **қилмайди** — дарахтни фойдаланувчининг ўз
браузери, ўз сессияси орқали юборади.

## Оқим

```
hrm.argos.uz вкладкаси (фойдаланувчи кирган)
  └─ хатчўп: GetSpInstitutionTreeV2 → [[tin, billing, label], …]  (same-origin, Bearer = localStorage.accessToken)
       └─ window.open(<дашборд>/argos-jonli/qabul) + postMessage       (ARGOS'да CSP/COOP йўқ — 25.09.2026 текширилган)
            └─ qabul саҳифаси: origin === https://hrm.argos.uz текшируви
                 └─ POST /api/argos-tree (сайт cookie + ADMIN_PASSWORD) → KV
  └─ хатчўп ҳар 10 дақиқада такрорлайди; 401 бўлса refresh-token (кенгайтмадаги мантиқ)
/argos-jonli — KV'дан ўқийди, очиқ турса ҳар 2 дақиқада /api/argos-tree GET орқали янгиланади
```

- Манба коди: `lib/argos-bookmarklet.ts`; ўрнатиш саҳифаси `/argos-jonli/ornatish`
  (ҳавола дашборд доменига мослаб қурилади).
- Статус ўчириш: ARGOS вкладкасидаги пастки ўнг бурчакдаги ҳолат қутисини босинг.
- Бир хил дарахт қайта юборилса тарих ўсмайди — фақат «сўнгги текширув» вақти янгиланади.

## Ҳолат қоидаси (`lib/argos-live.ts` → `decide`)

1. Қўлда белгиланган (`override`) — ғолиб.
2. СТИР йўқ — реестр ҳолати.
3. СТИР дарахтда йўқ — реестрда фаол бўлса «ўчирилган», бўлмаса ўз ҳолати.
4. Дарахтда, биллинг фаол — «уланган».
5. Дарахтда, биллинг нофаол — реестрда «уланмаган» бўлса янги уланган («уланган»),
   акс ҳолда «ўчирилган».

`tests/argos-live.test.ts` бу қоида 25.09.2026 дарахтида қўлда юритилган Excel билан
сатрма-сатр бир хил эканини қотиради (3 878 / 3 491 / 286 / 101).

## Базани янгилаш

Реестр рўйхати `data/argos-live-base.json` да. Excel ўзгарса (сатр ўчирилди,
қўлда тузатиш):

```
python scripts/make-argos-base.py \
  --orig "…/HRM_ARGOS_17.09.2026_BARCHA_HUDUDLAR_1 (4).xlsx" \
  --cur  "…/HRM_ARGOS_17.09.2026_BARCHA_HUDUDLAR_1 (4)_yangilangan.xlsx" \
  --overrides scripts/argos-overrides.json
```

Қўлда тузатишлар `scripts/argos-overrides.json` да калит (варақ, ном, СТИР) бўйича.
