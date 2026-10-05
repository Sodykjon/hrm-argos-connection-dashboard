"use server";

import { cookies } from "next/headers";
import { THEME_COOKIE, toThemePref, type ThemePref } from "./index";

export async function setThemePref(pref: ThemePref): Promise<void> {
  const store = await cookies();
  store.set(THEME_COOKIE, toThemePref(pref), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
