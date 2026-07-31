# Russian Language Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any viewer read every screen of the dashboard in Russian, chosen by a header toggle, without changing a single URL or byte of stored data.

**Architecture:** Two typed dictionaries (`uz`, `ru`) behind one accessor. Server Components read the `hrm_lang` cookie via `getS()`; Client Components read the same dictionary through a context provider (`useS()`). The local variable stays named `S` in every file, so JSX bodies are untouched — only the line that obtains `S` changes. Region names get a display-name lookup; their canonical Uzbek-Cyrillic keys stay as the data/slug/map identity.

**Tech Stack:** Next.js 16.2.11 (App Router), React 19.2.4, TypeScript 5, Tailwind v4. No new dependencies.

## Global Constraints

- **No new npm dependency.** The i18n layer is in-repo.
- **Next 16 APIs:** `cookies()` from `next/headers` is **async** — `const c = await cookies()`. Cookies **cannot** be set during Server Component render; setting happens in a Server Function (`"use server"`) or Route Handler. Source: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`.
- **Read the bundled docs before using an unfamiliar Next API** — `AGENTS.md` warns this Next version differs from training data.
- **Canonical region key = Uzbek Cyrillic** (e.g. `"Фарғона вилояти"`). Never translate a value used as a key, slug input, map-feature match, or KV payload field.
- **Organisation names are never translated** — they render exactly as uploaded.
- **Number/date formats are identical in both languages:** `3 886`, `66,9%`, `02.07.2026`.
- **Default language is `uz`.** Any unknown cookie value falls back to `uz`.
- **Git:** commit after every task. Branch `ru-tili`. Do not push (pushing `main` triggers a Vercel deploy; this branch merges only after the final verification pass).
- **No test runner exists in this project.** Each task's gate is `npx tsc --noEmit` plus the stated manual check. Do not invent a test framework.

---

### Task 1: The i18n core — dictionaries and accessors

**Files:**
- Create: `lib/i18n/uz.ts` (content moved verbatim from `lib/strings.ts`)
- Create: `lib/i18n/ru.ts`
- Create: `lib/i18n/index.ts`
- Create: `lib/i18n/server.ts`
- Create: `lib/i18n/client.tsx`
- Modify: `lib/strings.ts` (becomes a re-export shim; deleted in Task 9)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Lang = "uz" | "ru"`, `const LANG_COOKIE = "hrm_lang"`, `function getStrings(lang: Lang): Strings`, `type Strings = typeof UZ` — from `lib/i18n/index.ts`
  - `async function getLang(): Promise<Lang>`, `async function getS(): Promise<Strings>` — from `lib/i18n/server.ts` (Server Components only)
  - `function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }): JSX.Element`, `function useLang(): Lang`, `function useS(): Strings` — from `lib/i18n/client.tsx` (Client Components only)

- [ ] **Step 1: Move the Uzbek dictionary**

`git mv lib/strings.ts lib/i18n/uz.ts`, then in `lib/i18n/uz.ts` rename the export `S` → `UZ` **and drop the `as const` suffix**:

```ts
// All user-facing UI text — Uzbek Cyrillic. Data labels (region/org names)
// come from the source file and are rendered as-is.
// No `as const`: the Russian dictionary is typed against this one, and literal
// types would demand identical text rather than the same shape.

export const UZ = {
  appTitle: "HRM ARGOS — уланиш мониторинги",
  // …every existing key, text unchanged…
};
```

Dropping `as const` widens every field to `string` / `(n: number) => string`, which is exactly the contract the Russian dictionary must meet. Nothing in the codebase depends on the literal types — `npx tsc --noEmit` in Step 7 proves it.

- [ ] **Step 2: Add the accessor module**

`lib/i18n/index.ts`:

```ts
import { UZ } from "./uz";
import { RU } from "./ru";

export type Lang = "uz" | "ru";

/** Shape every dictionary must satisfy. */
export type Strings = typeof UZ;

/** Cookie holding the viewer's language choice (readable by the client). */
export const LANG_COOKIE = "hrm_lang";

export const DEFAULT_LANG: Lang = "uz";

const DICT: Record<Lang, Strings> = { uz: UZ, ru: RU };

export function getStrings(lang: Lang): Strings {
  return DICT[lang] ?? DICT[DEFAULT_LANG];
}

/** Narrow an arbitrary cookie value to a supported language. */
export function toLang(value: string | undefined): Lang {
  return value === "ru" ? "ru" : DEFAULT_LANG;
}

/** <html lang> value. */
export function htmlLang(lang: Lang): string {
  return lang === "ru" ? "ru" : "uz-Cyrl";
}
```

- [ ] **Step 3: Write the Russian dictionary**

`lib/i18n/ru.ts` mirrors `uz.ts` key for key — same nesting, same function signatures for the `(n: number) => string` entries — with the text translated into Russian. Close the object with `satisfies Strings` so a missing or misspelled key fails the build:

```ts
import type { Strings } from "./index";

export const RU = {
  appTitle: "HRM ARGOS — мониторинг подключения",
  appDescription:
    "Министерство здравоохранения — состояние подключения медицинских организаций к системе HRM ARGOS",

  ministry: "Министерство здравоохранения Республики Узбекистан",
  system: "Мониторинг подключения HRM ARGOS",
  systemShort: "Мониторинг HRM ARGOS",
  argosDomain: "hrm.argos.uz",
  // …every remaining key…
  unconnected: {
    // …
    count: (n: number) => `${n} организаций`,
    // …
  },
} satisfies Strings;
```

Fixed vocabulary — use these exact renderings so the site reads consistently:

| Uzbek Cyrillic | Russian |
|---|---|
| Уланган | Подключено |
| Уланмаган | Не подключено |
| Тизимдан ўчирилган | Удалено из системы |
| Уланиш даражаси | Уровень подключения |
| Ташкилот / муассаса | Организация |
| Жами ташкилотлар | Всего организаций |
| Ҳудуд(лар) | Регион(ы) |
| Умумий кўриниш | Обзор |
| Динамика | Динамика |
| Маълумотлар тўлдириш даражаси | Уровень заполнения данных |
| Ўртача тўлдирилиш | Среднее заполнение |
| Маълумот юклаш | Загрузка данных |
| Дашбордни янгилаш | Обновить дашборд |
| Реал вақт мониторинги | Мониторинг в реальном времени |
| Мақсад — 100% | Цель — 100% |
| Эътибор талаб қилади | Требует внимания |
| Республика муассасалари | Республиканские учреждения |
| Марказий аппарат | Центральный аппарат |
| СТИР | ИНН |
| Раҳбар | Руководитель |
| Манзил | Адрес |
| Excel'га юклаш | Скачать в Excel |
| Қидириш | Поиск |
| Барча ҳудудлар | Все регионы |
| Парол | Пароль |
| Кириш | Войти |
| Чиқиш | Выйти |
| ҳолатига | по состоянию на |

`STIR` stays `ИНН` in Russian even though the data column is Uzbek — it is a label, not data.

- [ ] **Step 4: Server accessor**

`lib/i18n/server.ts`:

```ts
import { cookies } from "next/headers";
import { getStrings, toLang, LANG_COOKIE, type Lang, type Strings } from "./index";

/** Language for this request. Server Components only. */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return toLang(store.get(LANG_COOKIE)?.value);
}

/** Dictionary for this request. Server Components only. */
export async function getS(): Promise<Strings> {
  return getStrings(await getLang());
}
```

- [ ] **Step 5: Client provider**

`lib/i18n/client.tsx`:

```tsx
"use client";

import { createContext, useContext } from "react";
import { getStrings, DEFAULT_LANG, type Lang, type Strings } from "./index";

const LangContext = createContext<Lang>(DEFAULT_LANG);

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useS(): Strings {
  return getStrings(useContext(LangContext));
}
```

- [ ] **Step 6: Keep the tree compiling**

`lib/strings.ts`:

```ts
// Deprecated shim — importers are being migrated to lib/i18n.
// Deleted in the final task of the Russian-language migration.
export { UZ as S } from "./i18n/uz";
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If it reports a missing property on `RU`, that key is missing from the Russian dictionary — add it.

- [ ] **Step 8: Commit**

```bash
git add lib/i18n lib/strings.ts
git commit -m "Add uz/ru dictionaries and language accessors"
```

---

### Task 2: Language-aware region labels, status meta and relative time

**Files:**
- Modify: `lib/regions.ts` (add `REGION_RU`, `regionLabel`)
- Modify: `lib/format.ts:33-61` (`STATUS_META` → `statusMeta(lang)`), `lib/format.ts:92-104` (`fmtAgo`)

**Interfaces:**
- Consumes: `Lang` from `lib/i18n`.
- Produces:
  - `function regionLabel(name: string, lang: Lang): string` — from `lib/regions.ts`
  - `function statusMeta(lang: Lang): Record<Status, StatusMeta>` — from `lib/format.ts`
  - `function fmtAgo(iso: string, nowMs: number, lang: Lang): string` — from `lib/format.ts`

- [ ] **Step 1: Region display names**

Append to `lib/regions.ts`:

```ts
import type { Lang } from "./i18n";

/** Display-only Russian names. Keys stay the canonical Uzbek-Cyrillic names. */
const REGION_RU: Record<string, string> = {
  "Республика муассасалари": "Республиканские учреждения",
  "Қорақалпоғистон Республикаси": "Республика Каракалпакстан",
  "Андижон вилояти": "Андижанская область",
  "Бухоро вилояти": "Бухарская область",
  "Жиззах вилояти": "Джизакская область",
  "Қашқадарё вилояти": "Кашкадарьинская область",
  "Навоий вилояти": "Навоийская область",
  "Наманган вилояти": "Наманганская область",
  "Самарқанд вилояти": "Самаркандская область",
  "Сирдарё вилояти": "Сырдарьинская область",
  "Сурхондарё вилояти": "Сурхандарьинская область",
  "Тошкент вилояти": "Ташкентская область",
  "Фарғона вилояти": "Ферганская область",
  "Хоразм вилояти": "Хорезмская область",
  "Тошкент шаҳри": "город Ташкент",
  "Марказий аппарат": "Центральный аппарат",
  "Санитар-эпидемиология қўмитаси": "Комитет санитарно-эпидемиологического благополучия",
  "Республика марказлари": "Республиканские центры",
};

/** How a region name is shown. Never use the result as a key or slug input. */
export function regionLabel(name: string, lang: Lang): string {
  return lang === "ru" ? (REGION_RU[name] ?? name) : name;
}
```

- [ ] **Step 2: Status meta becomes a function**

In `lib/format.ts`, replace the `import { S } from "./strings"` and the `STATUS_META` const with:

```ts
import { getStrings, type Lang } from "./i18n";

export function statusMeta(lang: Lang): Record<Status, StatusMeta> {
  const S = getStrings(lang);
  return {
    ulangan: {
      key: "ulangan",
      label: S.status.ulangan,
      color: "var(--color-ul)",
      text: "text-ul",
      bg: "bg-ul",
      softBg: "bg-ul-soft",
      dot: "bg-ul",
    },
    ulanmagan: {
      key: "ulanmagan",
      label: S.status.ulanmagan,
      color: "var(--color-un)",
      text: "text-un",
      bg: "bg-un",
      softBg: "bg-un-soft",
      dot: "bg-un",
    },
    ochirilgan: {
      key: "ochirilgan",
      label: S.status.ochirilganShort,
      color: "var(--color-och)",
      text: "text-och",
      bg: "bg-och",
      softBg: "bg-och-soft",
      dot: "bg-och",
    },
  };
}
```

Leave `StatusMeta`, `fmtInt`, `fmtPct`, `toPct`, `rampColor`, `fmtDate`, `fmtDateTime` unchanged. Every current `STATUS_META` reader is fixed in the task that migrates that component; run `npx tsc --noEmit` to list them — that list is the work.

- [ ] **Step 3: Relative time takes a language**

Replace `fmtAgo` in `lib/format.ts`:

```ts
/** relative time, e.g. "5 сония олдин" / "5 секунд назад" */
export function fmtAgo(iso: string, nowMs: number, lang: Lang): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const s = Math.max(0, Math.floor((nowMs - then) / 1000));
  const ru = lang === "ru";
  if (s < 45) return ru ? `${s} сек. назад` : `${s} сония олдин`;
  const m = Math.floor(s / 60);
  if (m < 60) return ru ? `${m} мин. назад` : `${m} дақиқа олдин`;
  const h = Math.floor(m / 60);
  if (h < 24) return ru ? `${h} ч. назад` : `${h} соат олдин`;
  const d = Math.floor(h / 24);
  return ru ? `${d} дн. назад` : `${d} кун олдин`;
}
```

Abbreviated Russian units avoid the 1/2–4/5+ plural problem; no plural library is needed anywhere else because every count string is `${n} организаций`.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: errors ONLY of the form "STATUS_META is not exported" / "Expected 3 arguments, but got 2" in the component files listed in Tasks 4–8. Record that list; do not fix them yet.

- [ ] **Step 5: Commit**

```bash
git add lib/regions.ts lib/format.ts
git commit -m "Make region labels, status meta and relative time language-aware"
```

---

### Task 3: Wire the language into the app shell and add the switcher

**Files:**
- Create: `lib/i18n/actions.ts`
- Create: `components/LangSwitch.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/SiteHeader.tsx`
- Modify: `components/Nav.tsx:7-18` (module-scope `LINKS` must move inside the component)

**Interfaces:**
- Consumes: `getLang`/`getS` (Task 1), `LangProvider` (Task 1), `htmlLang`/`LANG_COOKIE` (Task 1).
- Produces: `async function setLang(lang: Lang): Promise<void>` — Server Function from `lib/i18n/actions.ts`; `<LangSwitch />` — client component.

- [ ] **Step 1: Server Function that sets the cookie**

Cookies cannot be set while rendering a Server Component, so the toggle calls this. `lib/i18n/actions.ts`:

```ts
"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE, toLang, type Lang } from "./index";

export async function setLang(lang: Lang): Promise<void> {
  const store = await cookies();
  store.set(LANG_COOKIE, toLang(lang), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
```

- [ ] **Step 2: The toggle**

`components/LangSwitch.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLang } from "@/lib/i18n/actions";
import { useLang } from "@/lib/i18n/client";
import type { Lang } from "@/lib/i18n";

const OPTIONS: { code: Lang; label: string; aria: string }[] = [
  { code: "uz", label: "ЎЗ", aria: "Ўзбекча" },
  { code: "ru", label: "РУ", aria: "Русский" },
];

export function LangSwitch() {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div
      className="inline-flex items-center rounded-full border border-white/20 bg-white/5 p-0.5"
      role="group"
      aria-label="Til / Язык"
    >
      {OPTIONS.map((o) => {
        const active = o.code === lang;
        return (
          <button
            key={o.code}
            type="button"
            aria-pressed={active}
            aria-label={o.aria}
            disabled={pending || active}
            onClick={() =>
              start(async () => {
                await setLang(o.code);
                router.refresh();
              })
            }
            className={[
              "rounded-full px-2.5 py-1 text-[0.72rem] font-semibold transition-colors",
              active
                ? "bg-white text-band"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Root layout reads the cookie**

`app/layout.tsx` — `metadata` becomes `generateMetadata` (it now depends on a request-time value), `<html lang>` follows the choice, and `LangProvider` wraps the app:

```tsx
import type { Metadata } from "next";
import { Golos_Text, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AppChrome } from "@/components/AppChrome";
import { getLang, getS } from "@/lib/i18n/server";
import { htmlLang } from "@/lib/i18n";
import { LangProvider } from "@/lib/i18n/client";

// …font declarations unchanged…

export async function generateMetadata(): Promise<Metadata> {
  const S = await getS();
  return { title: S.appTitle, description: S.appDescription };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html
      lang={htmlLang(lang)}
      className={`${golos.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <LangProvider lang={lang}>
          <AppChrome header={<SiteHeader />} footer={<SiteFooter />}>
            {children}
          </AppChrome>
        </LangProvider>
      </body>
    </html>
  );
}
```

Reading a cookie in the root layout opts every route into dynamic rendering. That is acceptable here and changes nothing in practice: the site already sits behind an auth proxy and reads Upstash KV fresh on every request.

- [ ] **Step 4: Header — server component**

In `components/SiteHeader.tsx`: replace `import { S } from "@/lib/strings"` with `import { getS } from "@/lib/i18n/server"`, make the component `async`, add `const S = await getS();` as its first line, and render `<LangSwitch />` in the right-hand cluster, before `<LiveStatus />`:

```tsx
<div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
  <LangSwitch />
  <LiveStatus />
  <Nav />
  {process.env.SITE_PASSWORD ? <LogoutButton /> : null}
</div>
```

- [ ] **Step 5: Nav — client component with module-scope text**

`components/Nav.tsx` holds `LINKS` at module scope, so its labels would freeze at import time. Move the array inside the component:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useS } from "@/lib/i18n/client";

export function Nav() {
  const S = useS();
  const path = usePathname();
  const LINKS: {
    href: string;
    label: string;
    exact?: boolean;
    highlight?: boolean;
  }[] = [
    { href: "/", label: S.nav.overview, exact: true },
    { href: "/ulanmaganlar", label: S.nav.unconnected },
    { href: "/trend", label: S.nav.trend },
    { href: "/toldirilish", label: S.nav.completion, highlight: true },
    { href: "/admin", label: S.nav.admin },
  ];
  // …rest of the render unchanged…
}
```

- [ ] **Step 6: Run it**

Run: `npm run dev`, open `http://localhost:3000`, log in.
Expected: a `ЎЗ | РУ` toggle in the header. Clicking `РУ` translates the **navigation and header** (the rest is still Uzbek — later tasks). Reload the page: the choice persists. Check the browser tab title changes too.

- [ ] **Step 7: Commit**

```bash
git add lib/i18n/actions.ts components/LangSwitch.tsx app/layout.tsx components/SiteHeader.tsx components/Nav.tsx
git commit -m "Wire language into the app shell and add the ЎЗ/РУ switcher"
```

---

### Task 4: Migrate the overview page

**Files:**
- Modify: `app/page.tsx`, `components/OverviewHero.tsx`, `components/NationalBar.tsx`, `components/NationalBoard.tsx`, `components/AttentionStrip.tsx`, `components/UzMap.tsx`, `components/StatusPill.tsx` (only if it reads `STATUS_META`)

**Interfaces:**
- Consumes: `getS` (server), `useS`/`useLang` (client), `regionLabel`, `statusMeta`.
- Produces: nothing new.

The mechanical rule for every remaining task:

| File kind | Remove | Add as the component's first line |
|---|---|---|
| Server Component | `import { S } from "@/lib/strings";` | `const S = await getS();` (+ make the function `async`, import from `@/lib/i18n/server`) |
| Client Component (`"use client"`) | same import | `const S = useS();` (import from `@/lib/i18n/client`) |

JSX bodies do not change — the variable is still called `S`. Two extra rules:
- Any `STATUS_META` use becomes `const META = statusMeta(lang)` where `lang` comes from `useLang()` (client) or `await getLang()` (server).
- Any rendered region name becomes `regionLabel(name, lang)`. **Only where it is displayed** — leave `regionSlug(name)`, map-feature matching, and object keys alone.

- [ ] **Step 1: Migrate `app/page.tsx`**

It is a Server Component. Make it `async` if it is not already, swap the import, add `const S = await getS();` and `const lang = await getLang();`, and wrap every displayed region name in `regionLabel(name, lang)`.

- [ ] **Step 2: Migrate the five overview components**

Apply the table above per file. `UzMap.tsx` and `NationalBoard.tsx` are client components — they get `useS()`/`useLang()`. In `UzMap.tsx` the map's tooltip and label text must use `regionLabel(name, lang)` while the ECharts `name` field feeding the GeoJSON match stays the canonical Uzbek name.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in the files touched by this task.

- [ ] **Step 4: Visual check**

Run: `npm run dev`, open `/`, toggle `РУ`.
Expected: hero, KPI tiles, map tooltips, ranking list and the attention strip all read Russian; region names show as "Ферганская область"; clicking a region still opens `/hududlar/fargona`.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/OverviewHero.tsx components/NationalBar.tsx components/NationalBoard.tsx components/AttentionStrip.tsx components/UzMap.tsx components/StatusPill.tsx
git commit -m "Translate the overview page"
```

---

### Task 5: Migrate the region page and the unconnected list

**Files:**
- Modify: `app/hududlar/[region]/page.tsx`, `app/ulanmaganlar/page.tsx`, `components/OrgTable.tsx`

**Interfaces:**
- Consumes: same as Task 4.
- Produces: nothing new.

- [ ] **Step 1: Migrate the two pages**

Both are Server Components: `async`, `const S = await getS();`, `const lang = await getLang();`. The page heading, the "back to all regions" link and the breadcrumb use `regionLabel(region, lang)`. The `params` slug lookup (`regionFromSlug`) is untouched.

- [ ] **Step 2: Migrate `components/OrgTable.tsx`**

Client component: `const S = useS(); const lang = useLang();`. Its region filter dropdown shows `regionLabel(name, lang)` as the option **label** while the option **value** stays the canonical name. Its status pills use `statusMeta(lang)`.

- [ ] **Step 3: Excel export headers follow the language**

`OrgTable.tsx` builds the exported sheet. The header row must come from `S.unconnected.col.*` (it already does if it reuses the same strings — otherwise replace the literals). Data cells are unchanged; the file name stays as it is.

- [ ] **Step 4: Type-check and visual check**

Run: `npx tsc --noEmit`, then `npm run dev` and open `/ulanmaganlar` in Russian.
Expected: table headers, the search placeholder, the region dropdown and the "N организаций" counter are Russian; searching by an Uzbek organisation name still works; the exported .xlsx has Russian headers and unchanged organisation names.

- [ ] **Step 5: Commit**

```bash
git add app/hududlar app/ulanmaganlar components/OrgTable.tsx
git commit -m "Translate the region page and the unconnected list"
```

---

### Task 6: Migrate the trend page and the live indicators

**Files:**
- Modify: `app/trend/page.tsx`, `components/TrendChart.tsx`, `components/LiveSync.tsx`, `components/LiveStatus.tsx`

**Interfaces:**
- Consumes: `useS`, `useLang`, `getS`, `fmtAgo(iso, nowMs, lang)`.
- Produces: nothing new.

- [ ] **Step 1: Migrate the page and chart**

`app/trend/page.tsx` is a Server Component; `TrendChart.tsx` is a client component. ECharts series names and axis labels come from `S.trend.*`; per-region series names use `regionLabel(name, lang)`.

- [ ] **Step 2: Fix the `fmtAgo` callers**

`LiveSync.tsx` and `LiveStatus.tsx` call `fmtAgo(iso, now)`. They are client components: add `const lang = useLang();` and pass it — `fmtAgo(iso, now, lang)`.

- [ ] **Step 3: Type-check and visual check**

Run: `npx tsc --noEmit`, then open `/trend` in Russian.
Expected: chart legend, axis labels and the "one report so far" notice are Russian; the header clock reads "… сек. назад".

- [ ] **Step 4: Commit**

```bash
git add app/trend components/TrendChart.tsx components/LiveSync.tsx components/LiveStatus.tsx
git commit -m "Translate the trend page and live indicators"
```

---

### Task 7: Migrate the completion dashboard

**Files:**
- Modify: `app/toldirilish/page.tsx`, `app/toldirilish/[region]/page.tsx`, `components/completion/CompletionBoard.tsx`, `components/completion/CompletionMap.tsx`, `components/completion/CompletionTable.tsx`, `components/completion/CompletionTrend.tsx`, `components/completion/CompletionDistribution.tsx`, `components/ReadinessRing.tsx`

**Interfaces:**
- Consumes: same as Task 4.
- Produces: nothing new.

- [ ] **Step 1: Migrate the two pages**

Server Components: `async`, `getS()`, `getLang()`. Headings use `regionLabel(group, lang)` — this dashboard's groups include the three non-geographic ones (`Марказий аппарат`, `Санитар-эпидемиология қўмитаси`, `Республика марказлари`), all of which are in `REGION_RU`.

- [ ] **Step 2: Migrate the six components**

All are client components: `const S = useS(); const lang = useLang();`. `CompletionMap.tsx` follows the same rule as `UzMap.tsx` — display label translated, GeoJSON match key untouched. `CompletionTable.tsx` exports to Excel: headers from `S.completion.col.*`.

- [ ] **Step 3: Type-check and visual check**

Run: `npx tsc --noEmit`, then open `/toldirilish` and one region page in Russian.
Expected: every card, the distribution chart's bucket labels, the ring caption and the table are Russian; the 17 group names render as Russian; percentages still show as `48,9%`.

- [ ] **Step 4: Commit**

```bash
git add app/toldirilish components/completion components/ReadinessRing.tsx
git commit -m "Translate the completion dashboard"
```

---

### Task 8: Migrate login, admin and the footer

**Files:**
- Modify: `app/login/page.tsx`, `app/admin/page.tsx`, `components/LogoutButton.tsx`, `components/SiteFooter.tsx`

**Interfaces:**
- Consumes: `useS`, `getS`, `LangSwitch`.
- Produces: nothing new.

- [ ] **Step 1: Login page**

`app/login/page.tsx` is a client component: `const S = useS();`. It renders outside the authenticated area but still inside the root layout, so `LangProvider` is available. Add `<LangSwitch />` to the login card so the language can be chosen before signing in.

- [ ] **Step 2: Admin page**

`app/admin/page.tsx` is a client component with 54 `S.` references: `const S = useS();`. Error strings shown from API responses (`S.admin.err*`) are already dictionary keys — nothing extra to do.

- [ ] **Step 3: Footer and logout button**

`SiteFooter.tsx` is a Server Component (`await getS()`); `LogoutButton.tsx` is a client component (`useS()`).

- [ ] **Step 4: Type-check and visual check**

Run: `npx tsc --noEmit`, then open `/login` (in a private window) and `/admin` in Russian.
Expected: both fully Russian, the language toggle works on the login screen before authentication, and an upload still succeeds with a Russian success message.

- [ ] **Step 5: Commit**

```bash
git add app/login app/admin components/LogoutButton.tsx components/SiteFooter.tsx
git commit -m "Translate the login, admin and footer surfaces"
```

---

### Task 9: Remove the shim and verify end to end

**Files:**
- Delete: `lib/strings.ts`
- Modify: any file the final sweep still finds

- [ ] **Step 1: Delete the shim**

```bash
git rm lib/strings.ts
npx tsc --noEmit
```
Expected: no errors. Any error names a file that was missed — migrate it with the Task 4 rule.

- [ ] **Step 2: Sweep for hardcoded Uzbek text**

Search the app for Cyrillic string literals outside `lib/i18n/` and `lib/regions.ts`:

```bash
grep -rn "[Ѐ-ӿ]" app components lib --include=*.tsx --include=*.ts | grep -v "lib/i18n" | grep -v "lib/regions.ts"
```
Expected: no hits. Every hit is an untranslated literal — move it into both dictionaries.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds. Routes are reported as dynamic — that is the intended consequence of reading the language cookie in the root layout.

- [ ] **Step 4: Full manual pass**

With `npm run start`, walk both languages through: `/login`, `/`, `/hududlar/fargona`, `/ulanmaganlar`, `/trend`, `/toldirilish`, `/toldirilish/markaziy-apparat`, `/admin`.
Check per page: no Uzbek text left in Russian mode (and none Russian in Uzbek mode); no layout breakage where Russian words run longer (KPI tiles, nav pills, table headers, chart legends are the risky spots); the language survives navigation and reload; both Excel exports carry headers in the selected language.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Remove the strings shim and finish the Russian migration"
```

---

## Notes for the reviewer

- The diff is large but shallow: in most files exactly one import line and one accessor line change, because the local dictionary variable keeps the name `S`.
- `lib/i18n/index.ts` imports both dictionaries at runtime, so a client component pulling `useS()` ships both. Two dictionaries of ~220 short strings is a few KB gzipped — not worth splitting.
- The three known module-scope traps are `app/layout.tsx` (`metadata`), `lib/format.ts` (`STATUS_META`) and `components/Nav.tsx` (`LINKS`). All three are handled in Tasks 1–3; if a fourth appears, the symptom is text that does not change when the toggle is clicked.
- Nothing in this plan touches `lib/store.ts`, `lib/parse.ts`, `lib/parse-completion.ts`, `proxy.ts` or any API route. If a task wants to edit one of those, stop and re-read the spec.
