// Shared plumbing for app/api/bot/*: the bot's own bearer token (BOT_API_TOKEN — the site
// password gate in proxy.ts lets /api/bot through, so every route must call this) and the
// live data every answer is counted from.

import { createHash, timingSafeEqual } from "node:crypto";
import { getLive, type LiveData } from "@/lib/argos-live-data";
import type { CompletionData } from "@/lib/bot-api";
import { getCompletionView } from "@/lib/completion-data";

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

/** The latest completion file as /toldirilish shows it; null while only the demo seed exists. */
async function getCompletion(): Promise<CompletionData | null> {
  const { snapshot, isSeed } = await getCompletionView();
  if (isSeed) return null;
  return { sana: snapshot.date, overall: snapshot.overall, regions: snapshot.regions, orgs: snapshot.orgs };
}

/** Token check + live data (+ the completion file, null when none); `fn` builds the answer. */
export async function withLive(
  request: Request,
  fn: (live: LiveData, meta: TreeMeta, completion: CompletionData | null) => Response,
): Promise<Response> {
  const denied = botAuth(request);
  if (denied) return denied;
  const live = await getLive();
  if (!live) return json({ xato: "ARGOS daraxti hali yuklanmagan" }, 503);
  const completion = await getCompletion();
  return fn(
    live,
    { daraxtOlingan: live.tree.at, tekshirilgan: live.manifest?.checkedAt ?? live.tree.at },
    completion,
  );
}
