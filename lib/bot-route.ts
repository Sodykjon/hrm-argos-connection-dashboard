// Shared plumbing for app/api/bot/*: the bot's own bearer token (BOT_API_TOKEN — the site
// password gate in proxy.ts lets /api/bot through, so every route must call this) and the
// live data every answer is counted from.

import { createHash, timingSafeEqual } from "node:crypto";
import { getLive, type LiveData } from "@/lib/argos-live-data";

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** null when the request carries the right token, otherwise the error response to send. */
export function botAuth(request: Request): Response | null {
  const want = process.env.BOT_API_TOKEN;
  // Not configured = the API is off (fail-closed: unlike the site gate, there is no page to keep open).
  if (!want) return json({ xato: "Bot API yoqilmagan: BOT_API_TOKEN sozlanmagan" }, 503);
  const got = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1]?.trim() ?? "";
  const h = (s: string) => createHash("sha256").update(s).digest();
  if (!got || !timingSafeEqual(h(got), h(want))) return json({ xato: "Token notoʻgʻri" }, 401);
  return null;
}

export interface TreeMeta {
  daraxtOlingan: string; // when the ARGOS tree was read in the browser
  tekshirilgan: string; // the latest push (an identical tree only moves this)
}

/** Token check + live data; `fn` builds the answer. */
export async function withLive(
  request: Request,
  fn: (live: LiveData, meta: TreeMeta) => Response,
): Promise<Response> {
  const denied = botAuth(request);
  if (denied) return denied;
  const live = await getLive();
  if (!live) return json({ xato: "ARGOS daraxti hali yuklanmagan" }, 503);
  return fn(live, { daraxtOlingan: live.tree.at, tekshirilgan: live.manifest?.checkedAt ?? live.tree.at });
}
