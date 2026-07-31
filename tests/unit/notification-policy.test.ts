import { isQuietHours } from "@/modules/communications/services/notification.service";
import { notificationPolicy } from "@/modules/communications/types/notification.types";

describe("notification policy", () => {
  it("keeps critical billing and security messages mandatory", () => {
    expect(notificationPolicy("PAYMENT_FAILED")).toMatchObject({ category: "BILLING", mandatory: true, priority: "HIGH", bypassQuietHours: true });
    expect(notificationPolicy("PASSWORD_CHANGED")).toMatchObject({ category: "SECURITY", mandatory: true, priority: "CRITICAL" });
  });

  it("allows motivation messages to respect preferences and quiet hours", () => {
    expect(notificationPolicy("STREAK_AT_RISK")).toMatchObject({ category: "MOTIVATION", mandatory: false, bypassQuietHours: false });
  });

  it("handles quiet hours crossing midnight in the user timezone", () => {
    const settings = { timezone: "UTC", quietHoursEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "08:00" };
    expect(isQuietHours(new Date("2026-07-31T23:00:00.000Z"), settings)).toBe(true);
    expect(isQuietHours(new Date("2026-07-31T12:00:00.000Z"), settings)).toBe(false);
  });
});
