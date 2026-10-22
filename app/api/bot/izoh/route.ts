import { BASE } from "@/lib/argos-live-data";
import { botOrg, izohList, keyById, orgId, regionBySlug } from "@/lib/bot-api";
import { botAuth, json, withLive } from "@/lib/bot-route";
import { applyIzoh, IZOH_MAX, type IzohResult } from "@/lib/izoh";
import { canSave, updateIzohlar } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY_BY_ID = keyById(BASE.orgs);
const KEYS = new Set(KEY_BY_ID.values());

// The notes staff keep on registry rows — the same store as the site's «Изоҳ» column.
// ?id=<row id> — that row (izoh may be null); otherwise every row with a note [?hudud=<slug>].
export async function GET(request: Request) {
  return withLive(request, (live, meta, c) => {
    const p = new URL(request.url).searchParams;
    const id = p.get("id")?.trim();
    if (id) {
      const o = live.result.orgs.find((x) => orgId(x) === id);
      if (!o) return json({ xato: "Bunday id reestrda yoʻq", id }, 404);
      return json({ ...meta, ...botOrg(o, c, live.izoh) });
    }
    const slug = p.get("hudud") ?? undefined;
    if (slug && !regionBySlug(live.result, slug)) return json({ xato: "Bunday hudud yoʻq", slug }, 404);
    const list = izohList(live.result, live.izoh, slug, c);
    return json({ ...meta, ...(slug ? { slug } : {}), jami: list.length, tashkilotlar: list });
  });
}

// {"id": "<row id>", "matn": "<text>"} — sets the row's note; blank matn clears it (user, 22.10.2026:
// staff write with the bot token).
export async function POST(request: Request) {
  const denied = botAuth(request);
  if (denied) return denied;
  let body: { id?: unknown; matn?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ xato: "Soʻrov tanasi JSON boʻlishi kerak" }, 400);
  }
  if (typeof body.id !== "string" || typeof body.matn !== "string")
    return json({ xato: "id va matn maydonlari kerak" }, 400);
  const id = body.id.trim();
  const key = KEY_BY_ID.get(id);
  if (!key) return json({ xato: "Bunday id reestrda yoʻq", id }, 404);
  if (!canSave()) return json({ xato: "Saqlash joyi sozlanmagan" }, 501);

  const text = body.matn;
  const r = await updateIzohlar<IzohResult>((s) => {
    const x = applyIzoh(s, key, text, new Date().toISOString(), KEYS);
    return { store: x.ok ? x.store : null, out: x };
  });
  if (!r.ok)
    return json(
      { xato: r.error === "long" ? `Izoh ${IZOH_MAX} belgidan oshmasligi kerak` : "Bunday id reestrda yoʻq", id },
      400,
    );
  return json({ ok: true, id, izoh: r.izoh ? { matn: r.izoh.text, sana: r.izoh.at } : null });
}
