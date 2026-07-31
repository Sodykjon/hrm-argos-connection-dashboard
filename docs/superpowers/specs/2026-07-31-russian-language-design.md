# Russian language support — design

Date: 2026-07-31
Status: approved

## Goal

The dashboard is Uzbek-Cyrillic only. Add Russian so a Russian-speaking user
(ministry leadership, regional health departments) can read every screen in
Russian, without changing any URL, any stored data, or the Uzbek experience.

## Decisions (agreed with the user)

| Question | Decision |
|---|---|
| How is the language carried? | **Cookie** (`hrm_lang`), not a `/ru` route prefix. Links stay unchanged; each viewer keeps their own choice. |
| How deep does translation go? | **UI chrome + region names.** Organisation names stay exactly as they arrive in the uploaded file. |
| Default language | Uzbek Cyrillic (`uz`). Russian only when chosen. |
| Library | None. A thin in-repo layer, mirroring the existing `lib/strings.ts` pattern. |

Rejected: `next-intl`/`i18next` (new dependency + route restructuring, risky on
this Next version — see `AGENTS.md`), and client-only string swapping (pages are
server-rendered, so the server must know the language).

## Architecture

### Dictionaries

```
lib/i18n/uz.ts      current lib/strings.ts content, unchanged text
lib/i18n/ru.ts      Russian mirror, typed `satisfies typeof UZ`
lib/i18n/index.ts   Lang type, DICT, getStrings(lang), COOKIE name
```

Typing `ru.ts` against `typeof UZ` means a missing or misspelled key is a
**compile error** — translation completeness is verified by `next build`, not by
eye. During the migration `lib/strings.ts` remains as a re-export of the Uzbek
dictionary so the tree keeps compiling; once the last of the 24 importers is
converted it is deleted, leaving `lib/i18n/` as the single source.

### Reading the language

- **Server components** — `lib/i18n/server.ts` exposes `getLang()` and
  `getS()`, reading the `hrm_lang` cookie (Next's async `cookies()` API; consult
  `node_modules/next/dist/docs/` before writing it). Unknown/absent value → `uz`.
- **Client components** (20 files carry `"use client"`) — a `LangProvider`
  mounted in the root layout receives the language as a prop from the server and
  publishes it through context; components call `useS()`.

No component imports a language-specific dictionary directly.

### Switching

`<LangSwitch />` in the site header: two segments, `ЎЗ | РУ`. It writes the
`hrm_lang` cookie (readable by JS, 1-year expiry, `SameSite=Lax`) and calls
`router.refresh()` so the server re-renders in the new language. No API route
and no full page reload. It also appears on `/login`, which renders before
authentication.

### Region names

`lib/regions.ts` gains `REGION_RU` (17 entries: 14 geographic regions +
Республика муассасалари + Марказий аппарат + Санитар-эпидемиология қўмитаси +
Республика марказлари) and `regionLabel(name, lang)`.

**The canonical region key stays the Uzbek-Cyrillic name everywhere** — slugs,
map feature matching, KV payloads, uploaded-file parsing. Only the rendered
label changes. This keeps `/hududlar/fargona` valid in both languages and means
no stored data is touched.

### Language-dependent helpers

- `lib/format.ts`: `fmtAgo(iso, nowMs, lang)` (the "сония олдин" ladder) and
  `STATUS_META` → `statusMeta(lang)`, since its labels come from the dictionary.
- Number and date formats are identical in both languages (`3 886`, `66,9%`,
  `02.07.2026`) — no change.
- `app/layout.tsx`: static `metadata` becomes `generateMetadata()` so the browser
  tab title follows the language; `<html lang>` becomes `uz-Cyrl` or `ru`.
- Excel export (unconnected list, completion list): column headers follow the
  selected language; data cells are untouched.

## Out of scope

- Organisation names in Russian. The registry file carries a Russian name column
  for only ~1 478 of 3 886 organisations, so the list would be half-translated.
  Revisit only if ARGOS supplies a complete Russian name field.
- Uzbek Latin as a third language.
- Translating uploaded file content of any kind.

## Verification

1. `npx tsc --noEmit` — proves the Russian dictionary has every key.
2. `next build` — no build-time regression.
3. Manual pass in the browser, both languages, on: `/`, `/hududlar/[region]`,
   `/ulanmaganlar`, `/trend`, `/toldirilish`, `/toldirilish/[region]`, `/admin`,
   `/login` — checking for untranslated strings, layout breakage from longer
   Russian words, and correct region labels on the map and in tables.
4. Switch language, reload, navigate — the choice must persist.

There is no test framework in this project; verification is the type checker plus
the manual pass.

## Size

~24 files touched, ~220 strings translated. Mechanical, low risk: no data model,
no routing, and no storage change.
