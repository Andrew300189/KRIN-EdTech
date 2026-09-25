import { hasBurnedDailyStreak, localDayStartUtc, restoredDailyStreakLength, waterLilyEligibilityStart } from "@/modules/motivation/utils/streak-recovery";

describe("visible daily streak recovery", () => {
  const streak = { currentStreak: 12, lastQualifiedDate: "2026-09-23", freezeCount: 0 };

  it("does not claim a lost streak on the next day or before a first qualified day", () => {
    expect(hasBurnedDailyStreak(streak, "2026-09-24")).toBe(false);
    expect(hasBurnedDailyStreak({ ...streak, currentStreak: 0 }, "2026-09-25")).toBe(false);
    expect(hasBurnedDailyStreak({ ...streak, lastQualifiedDate: null }, "2026-09-25")).toBe(false);
  });

  it("shows recovery as soon as an unprotected learning day was missed", () => {
    expect(hasBurnedDailyStreak(streak, "2026-09-25")).toBe(true);
    expect(hasBurnedDailyStreak({ ...streak, freezeCount: 1 }, "2026-09-25")).toBe(false);
    expect(hasBurnedDailyStreak({ ...streak, freezeCount: 1 }, "2026-09-26")).toBe(true);
  });

  it("never grants today's extra day just for buying a restoration", () => {
    expect(restoredDailyStreakLength(12, 0)).toBe(12);
    expect(restoredDailyStreakLength(12, 1)).toBe(13);
    expect(localDayStartUtc("2026-09-25", "Europe/Kiev").toISOString()).toBe("2026-09-24T21:00:00.000Z");
    expect(localDayStartUtc("2026-09-25", "America/New_York").toISOString()).toBe("2026-09-25T04:00:00.000Z");
    expect(waterLilyEligibilityStart(new Date("2026-09-25T14:00:00.000Z"), "Europe/Kiev").toISOString()).toBe("2026-09-24T21:00:00.000Z");
  });
});
