// Russian mirror of lib/i18n/uz.ts. `satisfies Strings` makes a missing or
// misspelled key a compile error, so the two dictionaries cannot drift.
// Data labels (organisation names) are never translated — only UI text is.

import type { Strings } from "./index";

export const RU = {
  appTitle: "HRM ARGOS — мониторинг подключения",
  appDescription:
    "Министерство здравоохранения — состояние подключения медицинских организаций к системе HRM ARGOS",

  ministry: "Министерство здравоохранения Республики Узбекистан",
  system: "Мониторинг подключения HRM ARGOS",
  systemShort: "Мониторинг HRM ARGOS",
  argosDomain: "hrm.argos.uz",

  live: {
    monitoring: "Мониторинг в реальном времени",
    active: "Система активна",
    syncing: "Синхронизация…",
    updatedShort: "обновлено",
    lastSync: "последняя синхронизация",
    justNow: "только что",
    secAgo: "сек. назад",
  },

  goal: {
    target: "Цель",
    target100: "Цель — 100%",
    ribbon:
      "Подключить все медицинские организации к системе hrm.argos.uz на 100%",
    remaining: "осталось до 100%",
    toGoal: "до цели",
    reached: "Цель достигнута",
  },

  nav: {
    overview: "Обзор",
    regions: "Регионы",
    unconnected: "Не подключены",
    trend: "Динамика",
    completion: "Уровень заполнения данных",
    admin: "Загрузка данных",
  },

  status: {
    ulangan: "Подключено",
    ulanmagan: "Не подключено",
    ochirilgan: "Удалено из системы",
    ochirilganShort: "Удалено",
  },

  kpi: {
    total: "Всего организаций",
    totalHint: "Имеющие статус юридического лица",
    ulangan: "Подключено",
    ulanmagan: "Не подключено",
    ochirilgan: "Удалено",
    rate: "Уровень подключения",
  },

  overview: {
    asOf: "по состоянию на",
    updated: "Последнее обновление",
    heroEyebrow: "Общий уровень подключения",
    nationalBar: "Распределение",
    mapTitle: "Уровень подключения по регионам",
    mapHint: "Нажмите на регион, чтобы посмотреть подробнее",
    rankingTitle: "Рейтинг регионов",
    rankingHint: "снизу вверх",
    attention: "Требует внимания",
    attentionHint: "3 региона с самым низким уровнем подключения",
    republic: "Республиканские учреждения",
    republicHint: "Не региональные — учреждения центрального подчинения",
    ofTotal: "от общего числа",
    orgsUnit: "организаций",
    seeUnconnected: "Список не подключённых",
    seeTrend: "Смотреть динамику",
  },

  region: {
    back: "Все регионы",
    breakdown: "Распределение организаций",
    orgList: "Список организаций",
    rankOf: (n: number, total: number) => `В рейтинге ${n} / ${total}`,
    empty: "По этому региону организации не найдены.",
  },

  unconnected: {
    title: "Не подключённые организации",
    subtitle: "Учреждения, ещё не подключённые к системе HRM ARGOS",
    search: "Поиск по организации, ИНН или руководителю…",
    allRegions: "Все регионы",
    allStatuses: "Все статусы",
    export: "Скачать в Excel",
    sheet: "Организации",
    count: (n: number) => `${n} организаций`,
    empty: "По выбранным условиям организации не найдены.",
    col: {
      n: "№",
      name: "Наименование организации",
      region: "Регион",
      stir: "ИНН",
      rahbar: "Руководитель",
      tel: "Телефон",
      email: "Электронная почта",
      manzil: "Адрес",
      status: "Статус",
      contract: "Договор",
    },
    noContact: "нет данных",
  },

  trend: {
    title: "Динамика подключения",
    subtitle: "Изменение уровня подключения во времени",
    rateLine: "Уровень подключения, %",
    countLine: "Количество подключённых",
    single:
      "Пока доступен только один отчёт. Динамика будет заполняться по мере загрузки новых отчётов.",
    byRegion: "В разрезе регионов",
    snapshots: (n: number) => `${n} отчётов`,
  },

  completion: {
    navTitle: "Заполнение данных",
    title: "Уровень заполнения данных сотрудников",
    subtitle:
      "Процент заполнения данных сотрудников в организациях по системе hrm.argos.uz",
    asOf: "по состоянию на",
    avg: "Среднее заполнение",
    avgHint: "По всем организациям",
    orgs: "Всего организаций",
    orgsHint: "Внесены в систему",
    zero: "Нет данных (0%)",
    zeroHint: "Работа ещё не начата",
    below50: "Ниже 50%",
    below50Hint: "Требует внимания",
    mapTitle: "Заполнение по регионам",
    mapHint: "Нажмите на регион, чтобы посмотреть подробнее",
    rankingTitle: "Рейтинг регионов",
    rankingHint: "снизу вверх",
    orgsUnit: "организаций",
    distributionTitle: "Распределение по уровню заполнения",
    distributionHint: "количество организаций",
    trendTitle: "Динамика заполнения",
    trendSubtitle: "Изменение среднего заполнения во времени",
    trendLine: "Среднее заполнение, %",
    trendSingle:
      "Пока доступны данные только за один день. Динамика будет заполняться по мере ежедневной загрузки CSV.",
    orgList: "Список организаций",
    search: "Поиск по организации, ID или региону…",
    allRegions: "Все регионы",
    export: "Скачать в Excel",
    count: (n: number) => `${n} организаций`,
    empty: "По выбранным условиям организации не найдены.",
    col: {
      n: "№",
      name: "Наименование организации",
      region: "Регион",
      id: "ID",
      rate: "Заполнение, %",
    },
    ring: "Уровень заполнения",
    overviewCard: "Заполнение данных",
    overviewMore: "Подробнее",
    central: "Центральный аппарат",
    centralHint: "Центральный аппарат Министерства здравоохранения",
    centralMore: "Смотреть подробнее",
  },

  login: {
    eyebrow: "Защищённый вход",
    title: "Мониторинг HRM ARGOS",
    subtitle: "Введите пароль, чтобы продолжить",
    ministry: "Министерство здравоохранения Республики Узбекистан",
    passwordLabel: "Пароль",
    passwordPh: "Введите пароль",
    submit: "Войти",
    submitting: "Проверка…",
    success: "Добро пожаловать",
    errorWrong: "Неверный пароль. Попробуйте ещё раз.",
    errorGeneric: "Произошла ошибка. Попробуйте ещё раз.",
    show: "Показать",
    hide: "Скрыть",
    logout: "Выйти",
    protected: "Система доступна только уполномоченным пользователям",
  },

  admin: {
    title: "Загрузка данных",
    subtitle:
      "Загрузите новый отчёт, полученный из ARGOS — дашборд обновится автоматически.",
    compSection: "Заполнение данных (ежедневный CSV)",
    compSubtitle:
      "Загрузите CSV-файл заполнения по системе hrm.argos.uz (выгружается закладкой-букмарклетом).",
    compFile: "CSV-файл заполнения",
    compHint: "HRM_tuldirilish_ГОД-МЕСЯЦ-ДЕНЬ.csv",
    compAvg: "Среднее",
    compOrgs: "Организации",
    compZero: "0%",
    compBelow50: "50%<",
    compPublish: "Обновить дашборд заполнения",
    compHistory: "Загруженные дни",
    compErrParse:
      "Не удалось прочитать CSV-файл. Убедитесь, что это .csv, выгруженный букмарклетом hrm.argos.uz.",
    password: "Пароль администратора",
    passwordPh: "Введите пароль",
    hisobotFile: "Отчёт HRM ARGOS (.xlsx)",
    hisobotHint: "Файл с листами «Маълумотлар» и «Ҳисобот»",
    registryFile: "Файл реестра (.xlsx) — необязательно",
    registryHint:
      "Для обогащения руководителем, телефоном и адресом (меняется редко)",
    pickFile: "Выберите файл",
    parsing: "Чтение файла…",
    publish: "Обновить дашборд",
    publishing: "Загрузка…",
    preview: "Проверка перед загрузкой",
    previewNone: "Файл ещё не выбран.",
    success: "Успешно обновлено",
    successHint: "Дашборд показывает самые свежие данные.",
    goDashboard: "Перейти на дашборд",
    history: "Загруженные отчёты",
    errParse:
      "Не удалось прочитать файл. Убедитесь, что это .xlsx в формате ARGOS.",
    errAuth: "Неверный пароль.",
    errNoStore:
      "Хранилище (Vercel Blob) не настроено. Настройте токен и попробуйте снова.",
    errGeneric: "Произошла ошибка. Попробуйте ещё раз.",
    validated: "Проверено",
    mismatch: "Обнаружено расхождение с итогом внутри файла",
  },

  units: {
    org: "организация",
    orgs: "организаций",
    of: "из",
  },

  footer: {
    source: "Источник: отчёт ARGOS HRM",
    map: "Карта: geoBoundaries (CC BY 4.0)",
  },
} satisfies Strings;
