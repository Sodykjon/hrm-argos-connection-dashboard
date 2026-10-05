import { cookies } from "next/headers";
import { THEME_COOKIE, toThemePref, type ThemePref } from "./index";

export async function getThemePref(): Promise<ThemePref> {
  const store = await cookies();
  return toThemePref(store.get(THEME_COOKIE)?.value);
}
