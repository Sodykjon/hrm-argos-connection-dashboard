import { orgKey } from "@/lib/argos-live";
import { BASE } from "@/lib/argos-live-data";
import { getLiveTree, getStirAssign, hasStore, putStirAssign } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A person's decision on a STIR the dashboard found in the ARGOS tree for a STIR-less registry row
// (lib/argos-match.ts): «approve» keeps it, «reject» drops it and never offers that pairing again.
// Same admin-password gate as the tree upload.
export async function POST(request: Request) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return Response.json({ error: "nostore" }, { status: 501 });
  let body: { password?: string; key?: string; tin?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad" }, { status: 400 });
  }
  if (body.password !== pw) return Response.json({ error: "auth" }, { status: 401 });
  const { key, tin, action } = body;
  if (!key || !tin || !/^\d{6,12}$/.test(tin) || (action !== "approve" && action !== "reject"))
    return Response.json({ error: "bad" }, { status: 400 });
  if (!hasStore() && process.env.NODE_ENV === "production")
    return Response.json({ error: "nostore" }, { status: 501 });

  // only a STIR-less registry row, and only a STIR the current tree has
  const org = BASE.orgs.find((o) => orgKey(o) === key);
  if (!org || org.stir) return Response.json({ error: "row" }, { status: 400 });
  const tree = await getLiveTree();
  const node = tree?.rows.find((r) => r[0] === tin);
  if (!node) return Response.json({ error: "tin" }, { status: 400 });

  const a = await getStirAssign();
  if (action === "approve") {
    // billing still off would make the row count as switched off — wait for billing instead
    if (!node[1]) return Response.json({ error: "billing" }, { status: 400 });
    const taken = Object.entries(a.items).find(([k, v]) => v.tin === tin && k !== key);
    if (taken || BASE.orgs.some((o) => o.stir === tin)) return Response.json({ error: "taken" }, { status: 409 });
    a.items[key] = { tin, mode: "approved", at: new Date().toISOString(), label: node[2] ?? "" };
    a.rejected[key] = (a.rejected[key] ?? []).filter((t) => t !== tin);
  } else {
    if (a.items[key]?.tin === tin) delete a.items[key];
    a.rejected[key] = [...new Set([...(a.rejected[key] ?? []), tin])];
  }
  if (!a.rejected[key]?.length) delete a.rejected[key];
  await putStirAssign(a);
  return Response.json({ ok: true });
}
