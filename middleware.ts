import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Routes that must stay reachable without a session: the login page itself,
// secret-key-gated endpoints that authenticate themselves via their own
// ?key= check rather than via login (maintenance endpoints, and the public
// lead-capture webhook called by the website's own contact form), the
// Square payment webhook (authenticates itself via an HMAC signature, not a
// login), and the customer-facing quote/invoice links (gated by an
// unguessable token in the URL itself, not a login).
const PUBLIC_PATHS = [
  "/login",
  "/api/seed",
  "/api/setup-admin",
  "/api/leads",
  "/api/webhooks/square",
  "/q",
  "/i",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const uid = await verifySessionToken(token);
  if (!uid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
