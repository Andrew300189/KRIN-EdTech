import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_CONFIG } from "@/core/constants/session";
import { isPlatformOwner, normalizeEmail } from "@/core/server/platform-owner";
import { hasCmsAccess } from "@/core/utils/workspace-path";

const AUTH_ONLY_PATHS = ["/dashboard", "/student", "/teacher", "/admin", "/cms"];
const GUEST_ONLY_PATHS = ["/login", "/register"];
const PREMIUM_COURSE_LEVELS = new Set(["b2", "c1", "c2"]);
const SUBSCRIPTION_ACCESS_COOKIE = "krin_subscription_access";

type SessionIdentity = {
  userId: string;
  email?: string;
  role?: string;
};

function hasPossibleNextAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) =>
    cookie.name === "next-auth.session-token"
    || cookie.name === "__Secure-next-auth.session-token"
    || cookie.name.startsWith("next-auth.session-token.")
    || cookie.name.startsWith("__Secure-next-auth.session-token."),
  );
}

function normalizeRole(role: string | undefined) {
  const value = (role ?? "").toLowerCase();
  if (value === "teacher" || value === "instructor") return "teacher" as const;
  return "student" as const;
}

function isCmsRoute(pathname: string) {
  return pathname === "/cms" || pathname.startsWith("/cms/") || pathname === "/admin" || pathname.startsWith("/admin/");
}

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
    const data = JSON.parse(json) as { userId?: string; email?: string; role?: string; premium?: boolean; exp?: number };
    return typeof data.userId === "string" && typeof data.exp === "number" && data.exp > Date.now() / 1000
      ? {
          ...data,
          ...(typeof data.email === "string" ? { email: normalizeEmail(data.email) } : {}),
          ...(typeof data.role === "string" ? { role: data.role.toLowerCase() } : {}),
        }
      : null;
  } catch {
    return null;
  }
}

async function getSessionIdentity(request: NextRequest): Promise<SessionIdentity | null> {
  const customSession = await verifySignedCookie(
    request.cookies.get(SESSION_CONFIG.COOKIE_NAME)?.value,
  );
  if (customSession?.userId) {
    return {
      userId: customSession.userId,
      ...(customSession.email ? { email: customSession.email } : {}),
      ...(customSession.role ? { role: customSession.role } : {}),
    };
  }

  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const tokenUserId = token?.userId;
    const tokenSubject = token?.sub;
    const tokenEmail = token?.email;
    const tokenRole = token?.role;
    const userId = typeof tokenUserId === "string"
      ? tokenUserId
      : typeof tokenSubject === "string"
        ? tokenSubject
        : null;
    if (!userId) return null;
    return {
      userId,
      ...(typeof tokenEmail === "string" ? { email: normalizeEmail(tokenEmail) } : {}),
      ...(typeof tokenRole === "string" ? { role: tokenRole.toLowerCase() } : {}),
    };
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

  if (pathname === "/auth/error") {
    const providerError = request.nextUrl.searchParams.get("error");
    const isPublicError =
      providerError === "google_sign_in_failed" ||
      providerError === "cms_access_denied";

    if (providerError && !isPublicError) {
      // Remove raw NextAuth callback/configuration identifiers before the
      // error page is rendered or serialized into the response.
      const url = new URL("/auth/error", request.url);
      url.searchParams.set("error", "google_sign_in_failed");
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const session = await getSessionIdentity(request);
  const hasSession = Boolean(session?.userId);

  if (pathname === "/cms" || pathname.startsWith("/cms/")) {
    if (!session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }

    const email = normalizeEmail(session.email);
    if (!email || !isPlatformOwner(email)) {
      return NextResponse.redirect(
        new URL(normalizeRole(session.role) === "teacher" ? "/teacher" : "/student", request.url),
      );
    }

    return NextResponse.next();
  }

  if (matchesPath(pathname, AUTH_ONLY_PATHS) && !hasSession) {
    if (hasPossibleNextAuthCookie(request)) {
      return NextResponse.next();
    }

    const url = new URL("/login", request.url);
    url.searchParams.set("reason", "session_required");
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (hasSession && session && isCmsRoute(pathname) && !hasCmsAccess(session.email, session.role)) {
    return NextResponse.redirect(new URL(normalizeRole(session.role) === "teacher" ? "/teacher" : "/student", request.url));
  }

  if (isPremiumCoursePath(pathname)) {
    if (!hasSession) {
      const url = new URL("/login", request.url);
      url.searchParams.set("reason", "session_required");
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }

    if (!session || !session.userId || !(await hasPremiumAccessCookie(request, session.userId))) {
      const url = new URL("/dashboard/billing", request.url);
      url.searchParams.set("returnTo", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
  }

  if (matchesPath(pathname, GUEST_ONLY_PATHS) && hasSession) {
    // Let the auth layout resolve owner-vs-regular workspace using
    // authenticated user email from the server session.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
