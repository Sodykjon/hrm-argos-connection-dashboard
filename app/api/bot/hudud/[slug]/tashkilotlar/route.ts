import type { LiveStatus } from "@/lib/argos-live";
import { regionOrgs, STATUSES } from "@/lib/bot-api";
import { json, withLive } from "@/lib/bot-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every registry row of a region, registry order; ?holat=ulangan|ulanmagan|ochirilgan narrows it.
export async function GET(request: Request, ctx: RouteContext<"/api/bot/hudud/[slug]/tashkilotlar">) {
  const { slug } = await ctx.params;
  return withLive(request, (live, meta) => {
    const holat = new URL(request.url).searchParams.get("holat") ?? undefined;
    if (holat && !STATUSES.includes(holat as LiveStatus))
      return json({ xato: "holat: ulangan, ulanmagan yoki ochirilgan" }, 400);
    const list = regionOrgs(live.result, slug, holat as LiveStatus | undefined);
    if (!list) return json({ xato: "Bunday hudud yoʻq", slug }, 404);
    return json({ ...meta, slug, jami: list.length, tashkilotlar: list });
  });
}
