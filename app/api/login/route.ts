import { cookies } from "next/headers";
import crypto from "node:crypto";

export const runtime = "nodejs";

const COOKIE = "hrm_site";

export async function POST(request: Request) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) {
    // Gate not configured — nothing to log into.
    return Response.json({ error: "noauth" }, { status: 501 });
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return Response.json({ error: "bad" }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password !== pw) {
    return Response.json({ error: "auth" }, { status: 401 });
  }

  const token = crypto.createHash("sha256").update(pw).digest("hex");
  const jar = await cookies();
  jar.set({
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === "production",
  });

  return Response.json({ ok: true });
}
