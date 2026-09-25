import { compute, treeFingerprint, validTree, type TreeSnapshot } from "@/lib/argos-live";
import { BASE } from "@/lib/argos-live-data";
import { getLiveManifest, hasStore, publishLiveTree, tashkentDate } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Receives the ARGOS org tree that /argos-jonli/qabul relays from the user's
// hrm.argos.uz tab. Same admin-password gate as the other upload routes; the
// site cookie is already required by proxy.ts.
export async function POST(request: Request) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return Response.json({ error: "nostore" }, { status: 501 });

  let body: { password?: string; tree?: TreeSnapshot };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad" }, { status: 400 });
  }
  if (body.password !== pw) return Response.json({ error: "auth" }, { status: 401 });
  if (!validTree(body.tree)) return Response.json({ error: "bad" }, { status: 400 });
  if (!hasStore() && process.env.NODE_ENV === "production")
    return Response.json({ error: "nostore" }, { status: 501 });

  const tree: TreeSnapshot = {
    at: body.tree.at,
    rows: body.tree.rows.map(([t, b, l]) => (l ? [t, b, l.slice(0, 300)] : [t, b])),
  };
  const r = compute(BASE.orgs, tree);
  try {
    const out = await publishLiveTree(tree, {
      at: tree.at,
      date: tashkentDate(tree.at),
      fingerprint: treeFingerprint(tree.rows),
      total: r.totals.total,
      ulangan: r.totals.ulangan,
      ulanmagan: r.totals.ulanmagan,
      ochirilgan: r.totals.ochirilgan,
      regions: r.regions.map((x) => ({
        name: x.name,
        total: x.total,
        ulangan: x.ulangan,
        ulanmagan: x.ulanmagan,
        ochirilgan: x.ochirilgan,
      })),
    });
    return Response.json({
      ok: true,
      ...out,
      treeSize: tree.rows.length,
      totals: r.totals,
    });
  } catch (e) {
    return Response.json({ error: "server", detail: String(e) }, { status: 500 });
  }
}

// Cheap freshness probe for the page's auto-refresh.
export async function GET() {
  const m = await getLiveManifest();
  return Response.json({
    checkedAt: m?.checkedAt ?? null,
    fingerprint: m?.fingerprint ?? null,
  });
}
