import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  jar.delete("hrm_site");
  return Response.json({ ok: true });
}
