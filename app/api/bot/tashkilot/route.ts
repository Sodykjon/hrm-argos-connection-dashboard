import { byStir, search } from "@/lib/bot-api";
import { json, withLive } from "@/lib/bot-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ?stir=<STIR> — every registry row under that STIR (several rows can share one);
// ?q=<words>[&hudud=<slug>][&limit=<n ≤ 100>] — name search, registry order.
export async function GET(request: Request) {
  return withLive(request, (live, meta) => {
    const p = new URL(request.url).searchParams;
    const stir = p.get("stir");
    if (stir) {
      if (!/^\d{6,12}$/.test(stir.trim())) return json({ xato: "STIR faqat raqam boʻlishi kerak" }, 400);
      const natijalar = byStir(live.result, stir);
      return json({ ...meta, jami: natijalar.length, natijalar });
    }
    const q = p.get("q")?.trim();
    if (!q) return json({ xato: "stir yoki q parametri kerak" }, 400);
    const limit = Math.min(Math.max(Number(p.get("limit")) || 20, 1), 100);
    return json({ ...meta, ...search(live.result, q, { slug: p.get("hudud") ?? undefined, limit }) });
  });
}
