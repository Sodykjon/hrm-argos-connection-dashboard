// Server Components only. `cookies()` is async in Next 16 and opts the route
// into dynamic rendering — fine here, the site is already per-request.

import { cookies } from "next/headers";
import {
  getStrings,
  toLang,
  LANG_COOKIE,
  type Lang,
  type Strings,
} from "./index";

/** Language for this request. */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return toLang(store.get(LANG_COOKIE)?.value);
}

/** Dictionary for this request. */
export async function getS(): Promise<Strings> {
  return getStrings(await getLang());
}
