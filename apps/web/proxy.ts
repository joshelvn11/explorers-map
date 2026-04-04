import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server.js";
import { NextResponse } from "next/server.js";

import { getSignInHref } from "./lib/routes.ts";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request.headers);

  if (sessionCookie) {
    return NextResponse.next();
  }

  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const signInUrl = new URL(getSignInHref(returnTo), request.url);

  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/account/:path*", "/cms/:path*"],
};
