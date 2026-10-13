import { changes } from "@/lib/bot-api";
import { json, withLive } from "@/lib/bot-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rows whose status changed between the previous and the current ARGOS tree, [?hudud=<slug>].
// The pair (oldingiDaraxt, daraxtOlingan) names the change set: the same pair = already sent.
export async function GET(request: Request) {
  return withLive(request, (live, meta) => {
    const slug = new URL(request.url).searchParams.get("hudud") ?? undefined;
    const list = changes(live.changes, slug);
    return json({ ...meta, oldingiDaraxt: live.prevAt, jami: list.length, ozgarishlar: list });
  });
}
