"use server";

// Cookies cannot be set while a Server Component renders (Next 16), so the
// language toggle calls this Server Function instead.

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
