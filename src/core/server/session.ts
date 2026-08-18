import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies, headers as getRequestHeaders } from "next/headers";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { normalizeEmail } from "@/core/server/platform-owner";
import { touchUserPresence } from "@/core/server/presence";
import { prisma } from "@/core/server/prisma";
import { SESSION_CONFIG } from "@/core/constants/session";

const SESSION_COOKIE = SESSION_CONFIG.COOKIE_NAME;
const SESSION_TTL_SECONDS = SESSION_CONFIG.ABSOLUTE_TTL_SECONDS;
const SESSION_IDLE_TTL_SECONDS = SESSION_CONFIG.IDLE_TTL_SECONDS;
const SESSION_RENEW_THRESHOLD_SECONDS = SESSION_CONFIG.RENEW_THRESHOLD_SECONDS;
const MAX_ACTIVE_SESSIONS_PER_USER =
  SESSION_CONFIG.MAX_ACTIVE_SESSIONS_PER_USER;

function getSessionSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXTAUTH_SECRET or SESSION_SECRET must be set in production",
      );
    }
    // Development fallback keeps the local auth flow usable without affecting production.
    return "krin-dev-insecure-session-secret-change-me";
  }
  return secret;
}

function sign(payloadBase64: string) {
  return createHmac("sha256", getSessionSecret())
    .update(payloadBase64)
    .digest("hex");
}

function stableUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) return "unknown";
  return userAgent.toLowerCase().slice(0, 512);
}

function getClientIpFromHeaders(headers?: Headers) {
  if (!headers) return null;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? null;
}

function parseToken(
  token: string,
): { payloadBase64: string; signature: string } | null {
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return null;
  return { payloadBase64, signature };
}

function verifySignature(payloadBase64: string, signature: string) {
  const expected = sign(payloadBase64);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function decodePayload(payloadBase64: string) {
  try {
    return JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf8"),
    ) as {
      userId: string;
      sessionId?: string;
      email?: string;
      role?: string;
      nonce: string;
      exp: number;
    };
  } catch {
    return null;
  }
}

async function revokeSessionRecord(sessionId: string, reason: string) {
  await prisma.session.updateMany({
    where: { id: sessionId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
  });
}

async function clearAuthCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

async function clearNextAuthCookies() {
  const jar = await cookies();
  for (const cookie of jar.getAll()) {
    if (
      cookie.name === "next-auth.session-token" ||
      cookie.name === "__Secure-next-auth.session-token" ||
      cookie.name.startsWith("next-auth.session-token.") ||
      cookie.name.startsWith("__Secure-next-auth.session-token.")
    ) {
      jar.delete(cookie.name);
    }
  }
}

async function getNextAuthValidatedSession(
  requestHeaders?: Headers,
): Promise<ValidatedSession | null> {
  try {
    const headers = requestHeaders ?? (await getRequestHeaders());
    // NextAuth v4's JWT reader uses req.cookies to assemble the session token;
    // a headers-only request shape silently yields null in Server Components.
    // Supplying the framework cookie store keeps Google JWT sessions available
    // to requireAuth(), CMS pages and API routes after OAuth completes.
    const requestCookies = await cookies();
    const token = await getToken({
      req: { headers, cookies: requestCookies } as unknown as NextRequest,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const userId =
      typeof token?.userId === "string"
        ? token.userId
        : typeof token?.sub === "string"
          ? token.sub
          : null;
    if (!userId) return null;

    // A Google session is JWT-backed, so it has no local Session row. Keep
    // the shared user-level presence timestamp current without affecting auth.
    try {
      await touchUserPresence(userId);
    } catch {
      // Presence must never make a valid OAuth session unavailable.
    }

    return { userId, sessionId: `nextauth:${userId}` };
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  context?: { headers?: Headers },
) {
  // Password login must replace an earlier OAuth session for this browser.
  await clearNextAuthCookies();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  const ipAddress = getClientIpFromHeaders(context?.headers);
  const userAgent = stableUserAgent(context?.headers?.get("user-agent"));

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
      ipAddress,
      userAgent,
      lastActivityAt: now,
    },
    select: { id: true },
  });

  try {
    await touchUserPresence(userId, now);
  } catch {
    // Credentials authentication remains available during a presence outage.
  }

  const userClaims = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true },
  });

  if (MAX_ACTIVE_SESSIONS_PER_USER > 0) {
    const activeSessions = await prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    const sessionsToRevoke = activeSessions.slice(MAX_ACTIVE_SESSIONS_PER_USER);
    if (sessionsToRevoke.length > 0) {
      await prisma.session.updateMany({
        where: { id: { in: sessionsToRevoke.map((item) => item.id) } },
        data: {
          isRevoked: true,
          revokedAt: now,
          revokedReason: "session_limit_exceeded",
        },
      });
    }
  }

  const payload = {
    userId,
    sessionId: session.id,
    email: normalizeEmail(userClaims?.email),
    role: userClaims?.role?.toLowerCase(),
    nonce: randomBytes(8).toString("hex"),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(payloadBase64);
  const token = `${payloadBase64}.${signature}`;

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearLegacySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    const parsed = parseToken(token);
    if (parsed && verifySignature(parsed.payloadBase64, parsed.signature)) {
      const payload = decodePayload(parsed.payloadBase64);
      if (payload?.sessionId) {
        await revokeSessionRecord(payload.sessionId, "manual_logout");
      }
    }
  }

  jar.delete(SESSION_COOKIE);
}

export async function destroySession() {
  await clearLegacySession();
  await clearNextAuthCookies();
}

export async function getSessionUserId(): Promise<string | null> {
  const session = await getValidatedSession();
  return session?.userId ?? null;
}

export type ValidatedSession = {
  userId: string;
  sessionId: string;
};

export const AUTHENTICATED_USER_SELECT = {
  id: true,
  role: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  avatar: true,
  emailVerified: true,
  interfaceLanguage: true,
  timeZone: true,
  country: true,
  stripeCustomerId: true,
  subscriptionPlan: true,
  subscriptionStatus: true,
  subscriptionCurrentPeriodEnd: true,
  targetLanguage: true,
  learningGoal: true,
  currentLevel: true,
  dailyIntensityMinutes: true,
  dailyGoalMinutes: true,
  showInLeaderboard: true,
  takePlacementTest: true,
  onboardingCompletedAt: true,
  welcomeBonusPoints: true,
  guidedTourCompleted: true,
  createdAt: true,
  lastLoginAt: true,
  isBlocked: true,
  deletedAt: true,
} as const;

export async function getValidatedSession(options?: {
  headers?: Headers;
  touch?: boolean;
  allowCookieMutation?: boolean;
}): Promise<ValidatedSession | null> {
  // A freshly completed OAuth flow must win over a stale password-session
  // cookie that may still be present in the same browser.
  const nextAuthSession = await getNextAuthValidatedSession(options?.headers);
  if (nextAuthSession) return nextAuthSession;

  const canMutateCookie = options?.allowCookieMutation === true;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return getNextAuthValidatedSession(options?.headers);

  const parsed = parseToken(token);
  if (!parsed) {
    if (canMutateCookie) {
      await clearAuthCookie();
    }
    return getNextAuthValidatedSession(options?.headers);
  }

  if (!verifySignature(parsed.payloadBase64, parsed.signature)) {
    if (canMutateCookie) {
      await clearAuthCookie();
    }
    return getNextAuthValidatedSession(options?.headers);
  }

  const payload = decodePayload(parsed.payloadBase64);
  if (!payload?.userId || !payload.exp || !payload.sessionId) {
    if (canMutateCookie) {
      await clearAuthCookie();
    }
    return getNextAuthValidatedSession(options?.headers);
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSeconds) {
    await revokeSessionRecord(payload.sessionId, "token_expired");
    if (canMutateCookie) {
      await clearAuthCookie();
    }
    return getNextAuthValidatedSession(options?.headers);
  }

  const sessionRecord = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: {
      user: {
        select: {
          id: true,
          isBlocked: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!sessionRecord || sessionRecord.userId !== payload.userId) {
    if (canMutateCookie) {
      await clearAuthCookie();
    }
    return getNextAuthValidatedSession(options?.headers);
  }

  const now = new Date();
  if (sessionRecord.isRevoked || sessionRecord.expiresAt <= now) {
    await revokeSessionRecord(sessionRecord.id, "session_expired_or_revoked");
    if (canMutateCookie) {
      await clearAuthCookie();
    }
    return getNextAuthValidatedSession(options?.headers);
  }

  if (
    !sessionRecord.user ||
    sessionRecord.user.deletedAt ||
    sessionRecord.user.isBlocked
  ) {
    await revokeSessionRecord(sessionRecord.id, "user_inactive");
    if (canMutateCookie) {
      await clearAuthCookie();
    }
    return getNextAuthValidatedSession();
  }

  const incomingUserAgent = stableUserAgent(
    options?.headers?.get("user-agent"),
  );
  if (
    sessionRecord.userAgent &&
    incomingUserAgent !== "unknown" &&
    sessionRecord.userAgent !== incomingUserAgent
  ) {
    await revokeSessionRecord(sessionRecord.id, "user_agent_changed");
    if (canMutateCookie) {
      await clearAuthCookie();
    }
    return getNextAuthValidatedSession();
  }

  if (options?.touch !== false) {
    const idleAgeSeconds = Math.floor(
      (now.getTime() - sessionRecord.lastActivityAt.getTime()) / 1000,
    );
    const shouldRenewExpiry = idleAgeSeconds >= SESSION_RENEW_THRESHOLD_SECONDS;

    const nextExpiresAt = shouldRenewExpiry
      ? new Date(now.getTime() + SESSION_IDLE_TTL_SECONDS * 1000)
      : sessionRecord.expiresAt;

    await prisma.session.update({
      where: { id: sessionRecord.id },
      data: {
        lastActivityAt: now,
        expiresAt: nextExpiresAt,
      },
    });
  }

  try {
    await touchUserPresence(sessionRecord.userId, now);
  } catch {
    // Presence is a dashboard indicator, not an authorization dependency.
  }

  return { userId: sessionRecord.userId, sessionId: sessionRecord.id };
}

export async function requireAuth(options?: { headers?: Headers }) {
  const session = await getValidatedSession({ headers: options?.headers });
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: AUTHENTICATED_USER_SELECT,
  });

  if (!user || user.deletedAt || user.isBlocked) {
    return null;
  }

  return { session, user };
}
