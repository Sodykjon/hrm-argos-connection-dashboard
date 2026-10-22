import { orgKey } from "@/lib/argos-live";
import { BASE } from "@/lib/argos-live-data";
import { applyIzoh, type IzohResult } from "@/lib/izoh";
import { canSave, updateIzohlar } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEYS = new Set(BASE.orgs.map(orgKey));

// A note on one registry row (lib/izoh.ts). Anyone past the site gate (proxy.ts) may
// write it (user, 22.10.2026); blank text clears it.
export async function POST(request: Request) {
  let body: { key?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad" }, { status: 400 });
  }
  if (typeof body.key !== "string" || typeof body.text !== "string")
    return Response.json({ error: "bad" }, { status: 400 });
  if (!canSave()) return Response.json({ error: "nostore" }, { status: 501 });

  const { key, text } = body;
  const r = await updateIzohlar<IzohResult>((s) => {
    const x = applyIzoh(s, key, text, new Date().toISOString(), KEYS);
    return { store: x.ok ? x.store : null, out: x };
  });
  if (!r.ok) return Response.json({ error: r.error }, { status: 400 });
  return Response.json({ ok: true, izoh: r.izoh });
}
