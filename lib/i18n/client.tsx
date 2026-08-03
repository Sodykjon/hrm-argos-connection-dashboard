"use client";

// The root layout reads the cookie on the server and publishes the language
// here, so client components never touch cookies themselves.

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
