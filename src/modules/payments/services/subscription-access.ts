import { requireAuth } from "@/core/server/session";
import { hasPremiumPlanAccess } from "@/modules/payments/constants/plans";

type SubscriptionAccessUser = {
  role: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionCurrentPeriodEnd: Date | null;
};

export function hasPremiumSubscriptionAccess(
  user: SubscriptionAccessUser,
  now = new Date(),
) {
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
  if (!hasPremiumPlanAccess(user.subscriptionPlan)) return false;
  if (
    user.subscriptionStatus !== "ACTIVE" &&
    user.subscriptionStatus !== "TRIALING"
  ) {
    return false;
  }

  return Boolean(
    user.subscriptionCurrentPeriodEnd &&
    user.subscriptionCurrentPeriodEnd.getTime() > now.getTime(),
  );
}

export async function getCurrentSubscriptionAccess() {
  const authenticated = await requireAuth();
  if (!authenticated) return null;

  return {
    user: authenticated.user,
    hasPremiumAccess: hasPremiumSubscriptionAccess(authenticated.user),
  };
}
