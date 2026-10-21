import { summary } from "@/lib/bot-api";
import { json, withLive } from "@/lib/bot-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Republic totals + every region with its slug.
export async function GET(request: Request) {
  return withLive(request, (live, meta, c) => json({ ...meta, ...summary(live.result, c) }));
}
