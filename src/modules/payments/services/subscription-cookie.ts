import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { hasPremiumSubscriptionAccess } from "@/modules/payments/services/subscription-access";

export const SUBSCRIPTION_ACCESS_COOKIE = "krin_subscription_access";
const ACCESS_COOKIE_TTL_SECONDS = 15 * 60;

type SubscriptionCookieUser = {
  id: string;
  role: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionCurrentPeriodEnd: Date | null;
};

function getCookieSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "krin-dev-insecure-session-secret-change-me";
}

function sign(payload: string) {
  return createHmac("sha256", getCookieSecret()).update(payload).digest("hex");
}

export function createSubscriptionAccessCookieValue(user: SubscriptionCookieUser) {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      premium: hasPremiumSubscriptionAccess(user),
      exp: Math.floor(Date.now() / 1000) + ACCESS_COOKIE_TTL_SECONDS,
    }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function refreshSubscriptionAccessCookie(user: SubscriptionCookieUser) {
  const jar = await cookies();
  jar.set(SUBSCRIPTION_ACCESS_COOKIE, createSubscriptionAccessCookieValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_COOKIE_TTL_SECONDS,
  });
}

export async function clearSubscriptionAccessCookie() {
  const jar = await cookies();
  jar.delete(SUBSCRIPTION_ACCESS_COOKIE);
}
