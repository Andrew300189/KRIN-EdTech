import { calculateUserLevel, leaderboardScoreMinor } from "@/modules/motivation/services/motivation.service";
import { dateDistanceInDays, localWeekStart, userLocalDate, userLocalHour } from "@/modules/motivation/utils/local-date";

describe("motivation levels and local dates", () => {
  it("uses a progressive, non-linear level curve", () => {
    expect(calculateUserLevel(0)).toMatchObject({ level: 1, currentExperience: 0, experienceToNextLevel: 100 });
    expect(calculateUserLevel(100)).toMatchObject({ level: 2, currentExperience: 0, experienceToNextLevel: 150 });
    expect(calculateUserLevel(250)).toMatchObject({ level: 3, currentExperience: 0, experienceToNextLevel: 200 });
  });
  it("derives calendar dates in the user's timezone rather than raw UTC", () => {
    const moment = new Date("2026-07-30T22:30:00.000Z");
    expect(userLocalDate("Europe/Kyiv", moment)).toBe("2026-07-31");
    expect(userLocalDate("UTC", moment)).toBe("2026-07-30");
    expect(userLocalHour("Europe/Kyiv", moment)).toBe(1);
    expect(dateDistanceInDays("2026-07-30", "2026-07-31")).toBe(1);
  });
  it("uses a stable Monday key for a once-per-week learner reward", () => {
    expect(localWeekStart("2026-09-06")).toBe("2026-08-31");
    expect(localWeekStart("2026-09-07")).toBe("2026-09-07");
  });
  it("ranks KRIN Coins at their 1,000 XP exchange value", () => {
    // 11,000 XP must lead 10 KRIN Coins instead of being treated as 11 vs 10.
    expect(leaderboardScoreMinor(11_000 * 100, 0)).toBeGreaterThan(leaderboardScoreMinor(0, 10 * 100));
    expect(leaderboardScoreMinor(10_000 * 100, 0)).toBe(leaderboardScoreMinor(0, 10 * 100));
  });
});
