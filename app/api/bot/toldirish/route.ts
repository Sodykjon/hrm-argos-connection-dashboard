import { completionList } from "@/lib/bot-api";
import { json, withLive } from "@/lib/bot-route";
import { regionSlug } from "@/lib/regions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Organisations of the latest completion file, lowest first:
// [?hudud=<slug>][&kam=<per cent, strictly below>][&limit=<n ≤ 5000>].
export async function GET(request: Request) {
  return withLive(request, (live, meta, c) => {
    if (!c) return json({ xato: "Toʻldirish fayli hali yuklanmagan" }, 503);
    const p = new URL(request.url).searchParams;
    const slug = p.get("hudud") ?? undefined;
    if (slug && !live.result.regions.some((g) => regionSlug(g.name) === slug))
      return json({ xato: "Bunday hudud yoʻq", slug }, 404);
    const kamRaw = p.get("kam");
    const kam = kamRaw === null ? undefined : Number(kamRaw);
    if (kam !== undefined && !(kam > 0 && kam <= 100)) return json({ xato: "kam: 0 dan katta, 100 gacha son" }, 400);
    const limitRaw = p.get("limit");
    const limit = limitRaw === null ? undefined : Math.min(Math.max(Number(limitRaw) || 1, 1), 5000);
    return json({ ...meta, ...(slug ? { slug } : {}), ...completionList(live.result, c, { slug, kam, limit }) });
  });
}
