import { hasBlob, publish } from "@/lib/store";
import type { Registry, Snapshot } from "@/lib/types";

export const runtime = "nodejs";

interface UploadBody {
  password?: string;
  snapshot?: Snapshot;
  registry?: Registry | null;
}

function validSnapshot(s: unknown): s is Snapshot {
  const x = s as Snapshot;
  return (
    !!x &&
    typeof x.date === "string" &&
    Array.isArray(x.orgs) &&
    x.orgs.length > 0 &&
    Array.isArray(x.regions) &&
    !!x.totals &&
    typeof x.totals.total === "number"
  );
}

export async function POST(request: Request) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    return Response.json({ error: "nostore" }, { status: 501 });
  }

  let body: UploadBody;
  try {
    body = (await request.json()) as UploadBody;
  } catch {
    return Response.json({ error: "bad" }, { status: 400 });
  }

  if (body.password !== pw) {
    return Response.json({ error: "auth" }, { status: 401 });
  }

  if (!validSnapshot(body.snapshot)) {
    return Response.json({ error: "bad" }, { status: 400 });
  }

  // On Vercel's read-only filesystem we can only persist via Blob.
  if (!hasBlob() && process.env.NODE_ENV === "production") {
    return Response.json({ error: "nostore" }, { status: 501 });
  }

  try {
    const result = await publish(body.snapshot, body.registry ?? null);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { error: "server", detail: String(e) },
      { status: 500 },
    );
  }
}
