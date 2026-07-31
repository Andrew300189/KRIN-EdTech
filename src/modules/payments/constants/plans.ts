export const SUBSCRIPTION_PLANS = ["FREE", "BASIC", "PREMIUM", "PRO", "CORPORATE"] as const;
export const PAID_SUBSCRIPTION_PLANS = ["BASIC", "PREMIUM", "PRO", "CORPORATE"] as const;
export const BILLING_PERIODS = ["NONE", "MONTH", "QUARTER", "SEMI_ANNUAL", "YEAR"] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];
export type PaidSubscriptionPlan = (typeof PAID_SUBSCRIPTION_PLANS)[number];
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const PAYMENT_PLANS: Record<SubscriptionPlan, { label: string; description: string }> = {
  FREE: { label: "Free", description: "A1 to B1 course content." },
  BASIC: { label: "Basic", description: "Core courses and full vocabulary practice." },
  PREMIUM: { label: "Premium", description: "All course content, including B2 to C2." },
  PRO: { label: "Pro", description: "Specialised courses, certificates, and advanced tools." },
  CORPORATE: { label: "Corporate", description: "Premium access for organisational learning." },
};

export function isPaidSubscriptionPlan(value: string): value is PaidSubscriptionPlan {
  return PAID_SUBSCRIPTION_PLANS.includes(value as PaidSubscriptionPlan);
}

export function isBillingPeriod(value: string): value is BillingPeriod {
  return BILLING_PERIODS.includes(value as BillingPeriod);
}

export function hasPremiumPlanAccess(plan: string) {
  return plan === "PREMIUM" || plan === "PRO" || plan === "CORPORATE";
}

export function getStripePriceId(plan: PaidSubscriptionPlan, billingPeriod: BillingPeriod = "MONTH") {
  const suffix = billingPeriod === "YEAR" ? "YEARLY" : billingPeriod === "MONTH" ? "MONTHLY" : billingPeriod;
  const key = `STRIPE_PRICE_${plan}_${suffix}`;
  const priceId = process.env[key];

  if (!priceId) {
    throw new Error(`Stripe price is not configured for ${plan} (${billingPeriod}).`);
  }

  return priceId;
}
