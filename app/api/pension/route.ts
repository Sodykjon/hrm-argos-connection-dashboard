import { getPensionHistory } from "@/lib/data";
import { hasBlob, publishPension } from "@/lib/store";
import type { PensionSnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UploadBody {
  password?: string;
  snapshot?: PensionSnapshot;
}

function validSnapshot(s: unknown): s is PensionSnapshot {
  const x = s as PensionSnapshot;
  return (
    !!x &&
    typeof x.date === "string" &&
    Array.isArray(x.regions) &&
    !!x.overall &&
    typeof x.overall.total === "number" &&
    x.overall.total > 0
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

  if (!hasBlob() && process.env.NODE_ENV === "production") {
    return Response.json({ error: "nostore" }, { status: 501 });
  }

  try {
    const result = await publishPension(body.snapshot);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { error: "server", detail: String(e) },
      { status: 500 },
    );
  }
}

// Lightweight history for the admin panel.
export async function GET() {
  const history = await getPensionHistory();
  return Response.json({
    count: history.length,
    snapshots: history.map((h) => ({
      date: h.date,
      uploadedAt: h.uploadedAt,
      overall: h.overall,
    })),
  });
}
