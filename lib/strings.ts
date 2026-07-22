// All user-facing UI text — Uzbek Cyrillic. Data labels (region/org names)
// come from the source file and are rendered as-is.

export const S = {
  appTitle: "HRM ARGOS — уланиш мониторинги",
  appDescription:
    "Соғлиқни сақлаш вазирлиги — тиббиёт ташкилотларининг HRM ARGOS тизимига уланганлик ҳолати",

  ministry: "Ўзбекистон Республикаси Соғлиқни сақлаш вазирлиги",
  system: "HRM ARGOS уланиш мониторинги",
  systemShort: "HRM ARGOS мониторинг",
  argosDomain: "hrm.argos.uz",

  live: {
    monitoring: "Реал вақт мониторинги",
    active: "Тизим фаол",
    syncing: "Синхронизация…",
    updatedShort: "янгиланди",
    lastSync: "сўнгги синхронизация",
    justNow: "ҳозиргина",
    secAgo: "сония олдин",
  },

  goal: {
    target: "Мақсад",
    target100: "Мақсад — 100%",
    ribbon: "Барча тиббиёт ташкилотларини hrm.argos.uz тизимига 100% улаш",
    remaining: "100%'гача қолди",
    toGoal: "мақсадгача",
    reached: "Мақсадга эришилди",
  },

  nav: {
    overview: "Умумий кўриниш",
    regions: "Ҳудудлар",
    unconnected: "Уланмаганлар",
    trend: "Динамика",
    admin: "Маълумот юклаш",
  },

  status: {
    ulangan: "Уланган",
    ulanmagan: "Уланмаган",
    ochirilgan: "Тизимдан ўчирилган",
    ochirilganShort: "Ўчирилган",
  },

  kpi: {
    total: "Жами ташкилотлар",
    totalHint: "Юридик мақомга эга",
    ulangan: "Уланган",
    ulanmagan: "Уланмаган",
    ochirilgan: "Ўчирилган",
    rate: "Уланиш даражаси",
  },

  overview: {
    asOf: "ҳолатига",
    updated: "Сўнгги янгиланиш",
    heroEyebrow: "Умумий уланиш даражаси",
    nationalBar: "Тақсимот",
    mapTitle: "Ҳудудлар бўйича уланиш даражаси",
    mapHint: "Ҳудуд устига босиб, батафсил кўринг",
    rankingTitle: "Ҳудудлар рейтинги",
    rankingHint: "пастдан юқорига",
    attention: "Эътибор талаб қилади",
    attentionHint: "Уланиш даражаси энг паст 3 ҳудуд",
    republic: "Республика муассасалари",
    republicHint: "Ҳудудий эмас — марказий тобе муассасалар",
    ofTotal: "жамидан",
    orgsUnit: "та ташкилот",
    seeUnconnected: "Уланмаганлар рўйхати",
    seeTrend: "Динамикани кўриш",
  },

  region: {
    back: "Барча ҳудудлар",
    breakdown: "Ташкилотлар тақсимоти",
    orgList: "Ташкилотлар рўйхати",
    rankOf: (n: number, total: number) => `Рейтингда ${n} / ${total}`,
    empty: "Бу ҳудуд бўйича ташкилотлар топилмади.",
  },

  unconnected: {
    title: "Уланмаган ташкилотлар",
    subtitle: "HRM ARGOS тизимига ҳали уланмаган муассасалар",
    search: "Ташкилот, СТИР ёки раҳбар бўйича қидириш…",
    allRegions: "Барча ҳудудлар",
    export: "Excel'га юклаш",
    count: (n: number) => `${n} та ташкилот`,
    empty: "Танланган шарт бўйича ташкилот топилмади.",
    col: {
      n: "№",
      name: "Ташкилот номи",
      region: "Ҳудуд",
      stir: "СТИР",
      rahbar: "Раҳбар",
      tel: "Телефон",
      manzil: "Манзил",
      status: "Ҳолат",
    },
    noContact: "маълумот йўқ",
  },

  trend: {
    title: "Уланиш динамикаси",
    subtitle: "Вақт бўйича уланиш даражасининг ўзгариши",
    rateLine: "Уланиш даражаси, %",
    countLine: "Уланганлар сони",
    single:
      "Ҳозирча битта ҳисобот мавжуд. Янги ҳисоботлар юкланган сари динамика тўлдирилиб боради.",
    byRegion: "Ҳудудлар кесимида",
    snapshots: (n: number) => `${n} та ҳисобот`,
  },

  admin: {
    title: "Маълумот юклаш",
    subtitle:
      "ARGOS берган янги ҳисоботни юкланг — дашборд автоматик янгиланади.",
    password: "Админ пароли",
    passwordPh: "Паролни киритинг",
    hisobotFile: "HRM ARGOS ҳисоботи (.xlsx)",
    hisobotHint: "«Маълумотлар» ва «Ҳисобот» варақлари бор файл",
    registryFile: "Реестр файли (.xlsx) — ихтиёрий",
    registryHint: "Раҳбар/телефон/манзил билан бойитиш учун (кам ўзгаради)",
    pickFile: "Файлни танланг",
    parsing: "Файл ўқилмоқда…",
    publish: "Дашбордни янгилаш",
    publishing: "Юкланмоқда…",
    preview: "Юклашдан олдин текшириш",
    previewNone: "Ҳали файл танланмаган.",
    success: "Муваффақиятли янгиланди",
    successHint: "Дашборд энг сўнгги маълумотни кўрсатмоқда.",
    goDashboard: "Дашбордга ўтиш",
    history: "Юкланган ҳисоботлар",
    errParse: "Файлни ўқиб бўлмади. ARGOS форматидаги .xlsx файл эканига ишонч ҳосил қилинг.",
    errAuth: "Парол нотўғри.",
    errNoStore:
      "Сақлаш хизмати (Vercel Blob) созланмаган. Токенни созлагач қайта уриниб кўринг.",
    errGeneric: "Хатолик юз берди. Қайта уриниб кўринг.",
    validated: "Текширилди",
    mismatch: "Файл ичидаги йиғинди билан фарқ борлиги аниқланди",
  },

  units: {
    org: "ташкилот",
    orgs: "ташкилот",
    of: "дан",
  },

  footer: {
    source: "Манба: ARGOS HRM ҳисоботи",
    map: "Харита: geoBoundaries (CC BY 4.0)",
  },
} as const;
