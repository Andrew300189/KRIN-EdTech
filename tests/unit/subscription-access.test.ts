import { hasPremiumPlanAccess, isPaidSubscriptionPlan } from "@/modules/payments/constants/plans";
import { hasPremiumSubscriptionAccess } from "@/modules/payments/services/subscription-access";

const now = new Date("2026-07-30T12:00:00.000Z");

describe("subscription access", () => {
  it("keeps Free users out of Premium courses", () => {
    expect(hasPremiumSubscriptionAccess({
      role: "STUDENT",
      subscriptionPlan: "FREE",
      subscriptionStatus: "NONE",
      subscriptionCurrentPeriodEnd: null,
    }, now)).toBe(false);
  });

  it("grants both Premium and Corporate active subscriptions", () => {
    const activeUntil = new Date("2026-08-30T12:00:00.000Z");
    expect(hasPremiumSubscriptionAccess({ role: "STUDENT", subscriptionPlan: "PREMIUM", subscriptionStatus: "ACTIVE", subscriptionCurrentPeriodEnd: activeUntil }, now)).toBe(true);
    expect(hasPremiumSubscriptionAccess({ role: "STUDENT", subscriptionPlan: "CORPORATE", subscriptionStatus: "TRIALING", subscriptionCurrentPeriodEnd: activeUntil }, now)).toBe(true);
  });

  it("revokes access for an expired, canceled, or past-due subscription", () => {
    expect(hasPremiumSubscriptionAccess({ role: "STUDENT", subscriptionPlan: "PREMIUM", subscriptionStatus: "ACTIVE", subscriptionCurrentPeriodEnd: new Date("2026-07-29T12:00:00.000Z") }, now)).toBe(false);
    expect(hasPremiumSubscriptionAccess({ role: "STUDENT", subscriptionPlan: "PREMIUM", subscriptionStatus: "CANCELED", subscriptionCurrentPeriodEnd: new Date("2026-08-30T12:00:00.000Z") }, now)).toBe(false);
    expect(hasPremiumSubscriptionAccess({ role: "STUDENT", subscriptionPlan: "PREMIUM", subscriptionStatus: "PAST_DUE", subscriptionCurrentPeriodEnd: new Date("2026-08-30T12:00:00.000Z") }, now)).toBe(false);
  });

  it("accepts only paid checkout plans and recognises paid access plans", () => {
    expect(isPaidSubscriptionPlan("PREMIUM")).toBe(true);
    expect(isPaidSubscriptionPlan("CORPORATE")).toBe(true);
    expect(isPaidSubscriptionPlan("FREE")).toBe(false);
    expect(hasPremiumPlanAccess("PREMIUM")).toBe(true);
    expect(hasPremiumPlanAccess("CORPORATE")).toBe(true);
    expect(hasPremiumPlanAccess("FREE")).toBe(false);
  });
});
