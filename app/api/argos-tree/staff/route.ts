import { registryFor } from "@/lib/taqsimlash-data";
import { getLiveTree, getStaff, hasStore, publishStaff, tashkentDate } from "@/lib/store";
import { computeTaq, daySummary, validStaff, type StaffSnapshot } from "@/lib/taqsimlash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Head counts per STIR from the ARGOS statistics constructor, relayed by /argos-jonli/qabul once a
// day (the bookmarklet asks GET first). Same admin-password gate as POST /api/argos-tree.
export async function POST(request: Request) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return Response.json({ error: "nostore" }, { status: 501 });

  let body: { password?: string; staff?: StaffSnapshot };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad" }, { status: 400 });
  }
  if (body.password !== pw) return Response.json({ error: "auth" }, { status: 401 });
  if (!validStaff(body.staff)) return Response.json({ error: "bad" }, { status: 400 });
  if (!hasStore() && process.env.NODE_ENV === "production")
    return Response.json({ error: "nostore" }, { status: 501 });

  const staff: StaffSnapshot = { at: body.staff.at, ids: body.staff.ids, rows: body.staff.rows };
  try {
    const tree = await getLiveTree();
    if (!tree) return Response.json({ error: "notree" }, { status: 409 });
    const r = computeTaq(await registryFor(tree), tree.rows, staff);
    const out = await publishStaff(staff, daySummary(r, tashkentDate(staff.at), staff.at));
    return Response.json({ ok: true, ...out, rows: staff.rows.length, totals: r.totals });
  } catch (e) {
    return Response.json({ error: "server", detail: String(e) }, { status: 500 });
  }
}

/** Date (Tashkent) of the latest pull — the bookmarklet pulls again only on a new day. */
export async function GET() {
  const s = await getStaff();
  return Response.json({ at: s?.at ?? null, date: s ? tashkentDate(s.at) : null, today: tashkentDate(new Date().toISOString()) });
}
