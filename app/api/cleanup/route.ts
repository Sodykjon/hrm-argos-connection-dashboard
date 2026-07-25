import { cleanupBlobs, hasBlob } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    return Response.json({ error: "noauth" }, { status: 501 });
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return Response.json({ error: "bad" }, { status: 400 });
  }

  if (body.password !== pw) {
    return Response.json({ error: "auth" }, { status: 401 });
  }

  if (!hasBlob()) {
    // Local dev writes to ./.data/ — nothing to clean in Blob.
    return Response.json({ ok: true, deleted: 0, note: "no-blob" });
  }

  const result = await cleanupBlobs();
  return Response.json({ ok: true, ...result });
}
