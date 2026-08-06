// All user-facing UI text (Uzbek Cyrillic). Data labels (region/org names)
// come from the source file and are rendered as-is.
// Deliberately no `as const`: lib/i18n/ru.ts is typed against this object, and
// literal types would demand identical text rather than the same shape.

export const UZ = {
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
    gapLabel: "100%'гача:",
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
    completion: "Маълумотлар тўлдириш даражаси",
    admin: "Маълумот юклаш",
    pension: "Пенсия ёши",
    groupRollout: "АРГОС жорий этилиши",
    groupAnalytics: "Кадрлар таҳлили",
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
    unconnectedHint: "раҳбар ва телефон билан",
    trendHint: "Уланиш даражасининг вақт бўйича ўзгариши",
    orgsConnected: "та ташкилот уланган",
  },

  notFound: {
    title: "Саҳифа топилмади",
    hint: "Сўралган ҳудуд ёки саҳифа мавжуд эмас.",
    home: "Бош саҳифага қайтиш",
  },

  map: {
    connection: "Уланиш",
    connected: "Уланган",
    unconnected: "Уланмаган",
    completion: "Тўлдирилиш",
    orgs: "Ташкилотлар",
    loading: "Харита юкланмоқда…",
    ariaConnection: "Ўзбекистон ҳудудлари бўйича уланиш харитаси",
    ariaCompletion: "Ўзбекистон ҳудудлари бўйича тўлдирилиш харитаси",
    ariaPension: "Ўзбекистон ҳудудлари бўйича алмашинув эҳтиёжи харитаси",
    people: "Ходимлар",
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
    allStatuses: "Барча ҳолатлар",
    export: "Excel'га юклаш",
    sheet: "Ташкилотлар",
    count: (n: number) => `${n} та ташкилот`,
    empty: "Танланган шарт бўйича ташкилот топилмади.",
    col: {
      n: "№",
      name: "Ташкилот номи",
      region: "Ҳудуд",
      stir: "СТИР",
      rahbar: "Раҳбар",
      tel: "Телефон",
      email: "Электрон почта",
      manzil: "Манзил",
      status: "Ҳолат",
      contract: "Шартнома",
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
    totalOption: "Жами (Республика бўйича)",
    change: "Ўзгариш (биринчи ҳисоботдан)",
  },

  completion: {
    navTitle: "Маълумотлар тўлдирилиши",
    title: "Ходимлар маълумотлари тўлдирилиш даражаси",
    subtitle:
      "hrm.argos.uz бўйича ташкилотларда ходимлар маълумотларининг тўлдирилиш фоизи",
    asOf: "ҳолатига",
    avg: "Ўртача тўлдирилиш",
    avgHint: "Барча ташкилотлар бўйича",
    orgs: "Жами ташкилотлар",
    orgsHint: "Тизимга киритилган",
    zero: "Маълумот йўқ (0%)",
    zeroHint: "Ҳали бошланмаган",
    below50: "50% дан паст",
    below50Hint: "Эътибор талаб қилади",
    mapTitle: "Ҳудудлар бўйича тўлдирилиш",
    mapHint: "Ҳудуд устига босиб, батафсил кўринг",
    rankingTitle: "Ҳудудлар рейтинги",
    rankingHint: "пастдан юқорига",
    orgsUnit: "та ташкилот",
    distributionTitle: "Тўлдирилиш бўйича тақсимот",
    distributionHint: "ташкилотлар сони",
    trendTitle: "Тўлдирилиш динамикаси",
    trendSubtitle: "Вақт бўйича ўртача тўлдирилишнинг ўзгариши",
    trendLine: "Ўртача тўлдирилиш, %",
    trendSingle:
      "Ҳозирча битта кунлик маълумот мавжуд. Ҳар куни CSV юкланган сари динамика тўлдирилиб боради.",
    orgList: "Ташкилотлар рўйхати",
    search: "Ташкилот, ID ёки ҳудуд бўйича қидириш…",
    allRegions: "Барча ҳудудлар",
    export: "Excel'га юклаш",
    count: (n: number) => `${n} та ташкилот`,
    empty: "Танланган шарт бўйича ташкилот топилмади.",
    col: {
      n: "№",
      name: "Ташкилот номи",
      region: "Ҳудуд",
      id: "ID",
      rate: "Тўлдирилиш, %",
    },
    sheet: "Тўлдирилиш",
    totalOption: "Жами (Республика бўйича)",
    ring: "Тўлдирилиш даражаси",
    overviewCard: "Маълумотлар тўлдирилиши",
    overviewMore: "Батафсил",
    central: "Марказий аппарат",
    centralHint: "Соғлиқни сақлаш вазирлиги марказий аппарати",
    centralMore: "Батафсил кўриш",
  },

  pension: {
    navTitle: "Пенсия ёши",
    title: "Пенсия ёшидаги ва унга яқинлашган ходимлар",
    subtitle:
      "hrm.argos.uz статистика конструктори асосида — ҳудудлар кесимида",
    asOf: "ҳолатига",

    heroEyebrow: "Кадрлар алмашинуви эҳтиёжи",
    // The big number is rendered separately; this is the sentence after it.
    heroTail: (oneIn: number, nearly: boolean) =>
      `ходим — ${nearly ? "деярли " : ""}ҳар ${oneIn} нафардан бири — бугун пенсия ёшида ёки шу йил ичида пенсия ёшига етади`,
    // Used when the share is too small for an honest "one in N".
    heroTailPlain:
      "ходим бугун пенсия ёшида ёки шу йил ичида пенсия ёшига етади",

    working: "Пенсия ёшида, ишламоқда",
    workingHint: "Пенсия ҳуқуқига эга бўлиб, фаолиятда",
    reaching: "Шу йили пенсия ёшига етади",
    reachingHint: "Жорий йил ичида",
    total: "Жами ходимлар",
    totalHint: "Амалдаги ходимлар сони",
    women: "Шундан хотин-қизлар",
    womenHint: "Пенсия ёшидагилар ичида",

    mapTitle: "Ҳудудлар бўйича алмашинув эҳтиёжи",
    mapHint: "Ҳудуд устига босиб, батафсил кўринг",
    mapKey: (lo: string, hi: string) =>
      `Шкала ${lo} — ${hi} оралиғида (нисбий)`,
    rankingTitle: "Ҳудудлар рейтинги",
    rankingHint: "юқоридан пастга",

    ageTitle: "Ёш таркиби",
    ageHint: "Ходимларнинг ёш гуруҳлари бўйича тақсимоти",
    band: {
      u30: "30 ёшгача",
      a3040: "30–40 ёш",
      a4050: "40–50 ёш",
      a5060: "50–60 ёш",
      a60p: "60 ёшдан юқори",
    },

    tableTitle: "Ҳудудлар кесими",
    search: "Ҳудуд бўйича қидириш…",
    export: "Excel'га юклаш",
    sheet: "Пенсия ёши",
    count: (n: number) => `${n} та ҳудуд`,
    empty: "Танланган шарт бўйича ҳудуд топилмади.",
    col: {
      n: "№",
      region: "Ҳудуд",
      total: "Жами ходим",
      women: "Хотин-қизлар",
      working: "Пенсия ёшида",
      reaching: "Шу йили етади",
      share: "Алмашинув улуши",
    },

    // Not S.region.rankOf: on the connection and completion region pages rank 1
    // means BEST in the country. Here it means the most exposed, so the metric
    // has to be named or the number reads as its own opposite.
    rankOf: (n: number, total: number) =>
      `Алмашинув эҳтиёжи бўйича: ${n} / ${total}`,

    // Sits under the hero's absolute count. ARGOS publishes several staff
    // totals that differ by over 100 000 depending on which report you open,
    // so the page names the one it used and says what that one counts.
    sourceNote: (date: string) =>
      `Манба: hrm.argos.uz — статистика конструктори, ${date} ҳолатига. Кўрсаткич «Амалдаги ходимлар сони» устунидан олинган; тизимнинг бошқа ҳисоботларида қамров фарқ қилиши мумкин.`,

    noRegions: "Ҳудудлар кесими ҳали юкланмаган",
    noRegionsHint:
      "Ҳозирча фақат республика бўйича умумий кўрсаткич мавжуд. Ҳудудлар кесими юклангач, харита ва рейтинг кўринади.",

    overviewCard: "Пенсия ёши ва кадрлар алмашинуви",
    peopleUnit: "нафар",
    regionsUnit: "та ҳудуд",
  },

  login: {
    eyebrow: "Хавфсиз кириш",
    title: "HRM ARGOS мониторинги",
    subtitle: "Давом этиш учун паролни киритинг",
    ministry: "Ўзбекистон Республикаси Соғлиқни сақлаш вазирлиги",
    passwordLabel: "Парол",
    passwordPh: "Паролни киритинг",
    submit: "Кириш",
    submitting: "Текширилмоқда…",
    success: "Хуш келибсиз",
    errorWrong: "Парол нотўғри. Қайта уриниб кўринг.",
    errorGeneric: "Хатолик юз берди. Қайта уриниб кўринг.",
    show: "Кўрсатиш",
    hide: "Яшириш",
    logout: "Чиқиш",
    protected: "Ушбу тизим фақат ваколатли фойдаланувчилар учун",
  },

  admin: {
    title: "Маълумот юклаш",
    subtitle:
      "ARGOS берган янги ҳисоботни юкланг — дашборд автоматик янгиланади.",
    compSection: "Маълумот тўлдирилиши (кунлик CSV)",
    compSubtitle:
      "hrm.argos.uz бўйича тўлдирилиш CSV файлини юкланг (bookmarklet юклаб берган).",
    compFile: "Тўлдирилиш CSV файли",
    compHint: "HRM_tuldirilish_ЙИЛ-ОЙ-КУН.csv",
    compAvg: "Ўртача",
    compOrgs: "Ташкилотлар",
    compZero: "0%",
    compBelow50: "50%<",
    compPublish: "Тўлдирилиш дашбордини янгилаш",
    compHistory: "Юкланган кунлар",
    compErrParse:
      "CSV файлни ўқиб бўлмади. hrm.argos.uz статистика конструкторидан олинган .csv файл эканига ишонч ҳосил қилинг.",
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
    again: "Яна юклаш",
    records: (n: string) => `${n} ёзув`,
    penSection: "Пенсия ёши (CSV)",
    penSubtitle:
      "hrm.argos.uz статистика конструкторидан олинган CSV файлни юкланг (docs/bookmarklets/kadrlar.md даги скрипт тайёрлайди).",
    penFile: "Пенсия ёши CSV файли",
    penHint: "HRM_kadrlar_ЙИЛ-ОЙ-КУН.csv",
    penTotal: "Жами",
    penWorking: "Пенсия ёшида",
    penReaching: "Шу йили етади",
    penRegions: "Ҳудудлар",
    penPublish: "Пенсия дашбордини янгилаш",
    penHistory: "Юкланган ҳисоботлар",
    penErrParse:
      "CSV файлни ўқиб бўлмади. hrm.argos.uz статистика конструкторидан олинган .csv файл эканига ишонч ҳосил қилинг.",
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
};
