import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_CONFIG } from "@/core/constants/session";

const AUTH_ONLY_PATHS = ["/dashboard", "/admin"];
const GUEST_ONLY_PATHS = ["/login", "/register"];
const PREMIUM_COURSE_LEVELS = new Set(["b2", "c1", "c2"]);
const SUBSCRIPTION_ACCESS_COOKIE = "krin_subscription_access";

function isPremiumCoursePath(pathname: string) {
  const [first, level] = pathname.split("/").filter(Boolean);
  return first === "courses" && Boolean(level) && PREMIUM_COURSE_LEVELS.has(level.toLowerCase());
}

function hexToBytes(value: string) {
  if (!/^[a-f0-9]{64}$/i.test(value)) return null;
  return Uint8Array.from(value.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)));
}

async function verifySignedCookie(value: string | undefined) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  const suppliedSignature = signature ? hexToBytes(signature) : null;
  if (!payload || !suppliedSignature) return null;

  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "krin-dev-insecure-session-secret-change-me";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const validSignature = await crypto.subtle.verify(
    "HMAC",
    key,
    suppliedSignature,
    new TextEncoder().encode(payload),
  );
  if (!validSignature) return null;

  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(json) as { userId?: string; premium?: boolean; exp?: number };
    return typeof data.userId === "string" && typeof data.exp === "number" && data.exp > Date.now() / 1000
      ? data
      : null;
  } catch {
    return null;
  }
}

async function getSessionUserId(request: NextRequest) {
  const customSession = await verifySignedCookie(
    request.cookies.get(SESSION_CONFIG.COOKIE_NAME)?.value,
  );
  if (customSession?.userId) return customSession.userId;

  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    return typeof token?.sub === "string" ? token.sub : null;
  } catch {
    return null;
  }
}

async function hasPremiumAccessCookie(request: NextRequest, userId: string) {
  const access = await verifySignedCookie(
    request.cookies.get(SUBSCRIPTION_ACCESS_COOKIE)?.value,
  );
  return access?.premium === true && access.userId === userId;
}

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const sessionUserId = await getSessionUserId(request);
  const hasSession = Boolean(sessionUserId);

  if (matchesPath(pathname, AUTH_ONLY_PATHS) && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("reason", "session_required");
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (isPremiumCoursePath(pathname)) {
    if (!hasSession) {
      const url = new URL("/login", request.url);
      url.searchParams.set("reason", "session_required");
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }

    if (!sessionUserId || !(await hasPremiumAccessCookie(request, sessionUserId))) {
      const url = new URL("/dashboard/billing", request.url);
      url.searchParams.set("returnTo", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
  }

  if (matchesPath(pathname, GUEST_ONLY_PATHS) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
