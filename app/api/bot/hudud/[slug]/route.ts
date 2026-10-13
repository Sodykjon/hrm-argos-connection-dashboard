import { regionSummary } from "@/lib/bot-api";
import { json, withLive } from "@/lib/bot-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One region's totals and its districts / systems.
export async function GET(request: Request, ctx: RouteContext<"/api/bot/hudud/[slug]">) {
  const { slug } = await ctx.params;
  return withLive(request, (live, meta) => {
    const r = regionSummary(live.result, slug);
    return r ? json({ ...meta, ...r }) : json({ xato: "Bunday hudud yoʻq", slug }, 404);
  });
}
