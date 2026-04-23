import { NextResponse, type NextRequest } from "next/server";

const AUTH_BASE =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "https://auth.andrewcromar.org";

export function proxy(request: NextRequest) {
  if (request.cookies.get("session_token")) {
    return NextResponse.next();
  }

  const returnTo =
    request.nextUrl.origin + request.nextUrl.pathname + request.nextUrl.search;
  const loginUrl = `${AUTH_BASE}/pages/login.html?redirect=${encodeURIComponent(returnTo)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!api/|_next/|manifest\\.webmanifest|sw\\.js|favicon\\.ico|globe\\.svg|file\\.svg|next\\.svg|vercel\\.svg|window\\.svg).*)",
  ],
};
