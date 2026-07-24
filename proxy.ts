import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Site-wide single-shared-password gate (Next 16 "proxy", formerly middleware).
// The cookie holds sha256(SITE_PASSWORD) — never the plaintext. If SITE_PASSWORD
// is not configured the site stays open (fail-open: no lockout, mirrors the
// ADMIN_PASSWORD "not set = feature off" convention) so a deploy can ship before
// the env var is added.

const COOKIE = "hrm_site";
const ALLOW = ["/login", "/api/login", "/api/logout"];

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(req: NextRequest) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (ALLOW.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;
  if (token && token === (await sha256hex(pw))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|moh-logo.jpg|uzbekistan.geo.json|icon.jpg).*)",
  ],
};
