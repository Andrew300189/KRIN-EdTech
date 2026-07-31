import { NextRequest } from "next/server";

const attempts = new Map<string, { count: number; resetAt: number }>();
const CHECKOUT_LIMIT = 5;
const CHECKOUT_WINDOW_MS = 60_000;

function configuredOrigin(request: NextRequest) {
  return new URL(process.env.NEXTAUTH_URL || request.url).origin;
}

export function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === configuredOrigin(request));
}

export function consumeCheckoutAttempt(userId: string) {
  const now = Date.now();
  const current = attempts.get(userId);
  if (!current || current.resetAt <= now) {
    attempts.set(userId, { count: 1, resetAt: now + CHECKOUT_WINDOW_MS });
    return true;
  }
  if (current.count >= CHECKOUT_LIMIT) return false;
  current.count += 1;
  return true;
}

export function consumeBillingAttempt(scope: string, userId: string, limit = 5) {
  const key = `${scope}:${userId}`;
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + CHECKOUT_WINDOW_MS }); return true; }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
