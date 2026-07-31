import { calculatePromotionDiscount } from "@/modules/payments/services/payment.service";
import { periodEnd } from "@/modules/payments/services/entitlement.service";

describe("commerce billing rules", () => {
  it("calculates fixed and capped percentage discounts in integer minor units", () => {
    expect(calculatePromotionDiscount(10_000, { type: "FIXED", amount: 1_500, maxDiscount: null, currency: "USD" }, "USD")).toBe(1_500);
    expect(calculatePromotionDiscount(10_000, { type: "PERCENT", amount: 25, maxDiscount: 1_000, currency: "USD" }, "USD")).toBe(1_000);
    expect(calculatePromotionDiscount(10_000, { type: "PERCENT", amount: 25, maxDiscount: null, currency: "UAH" }, "USD")).toBe(0);
  });

  it("never discounts below zero or above the order subtotal", () => {
    expect(calculatePromotionDiscount(500, { type: "FIXED", amount: 2_000, maxDiscount: null, currency: null }, "USD")).toBe(500);
    expect(calculatePromotionDiscount(0, { type: "FIXED", amount: 100, maxDiscount: null, currency: null }, "USD")).toBe(0);
  });

  it("calculates entitlement expiry from billing period", () => {
    const start = new Date("2026-01-31T12:00:00.000Z");
    expect(periodEnd(start, "NONE")).toBeNull();
    expect(periodEnd(start, "QUARTER")?.toISOString()).toBe("2026-05-01T12:00:00.000Z");
    expect(periodEnd(start, "YEAR")?.toISOString()).toBe("2027-01-31T12:00:00.000Z");
  });
});
