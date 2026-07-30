import { NextResponse, type NextRequest } from "next/server";
import { SESSION_CONFIG } from "@/core/constants/session";

const AUTH_ONLY_PATHS = ["/dashboard", "/admin"];
const GUEST_ONLY_PATHS = ["/login", "/register"];

function hasSessionCookie(request: NextRequest) {
  return Boolean(request.cookies.get(SESSION_CONFIG.COOKIE_NAME)?.value);
}

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const hasSession = hasSessionCookie(request);

  if (matchesPath(pathname, AUTH_ONLY_PATHS) && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("reason", "session_required");
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (matchesPath(pathname, GUEST_ONLY_PATHS) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
