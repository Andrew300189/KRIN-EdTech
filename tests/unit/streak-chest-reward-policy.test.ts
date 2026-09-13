import {
  STREAK_CHEST_DAILY_LIMITS,
  canAwardStreakChestExperience,
  selectStreakChestExperience,
  streakChestDailyCounts,
  streakChestExperienceCeiling,
  streakChestRewardBand,
} from "@/modules/motivation/services/reward-economy.service";

describe("streak chest XP policy", () => {
  it("keeps a level- and streak-based chest reward within 10 to 500 XP", () => {
    const early = streakChestExperienceCeiling({ milestone: 3, chestLevel: 1, difficulty: 1, dailyStreak: 0 });
    const late = streakChestExperienceCeiling({ milestone: 10_000, chestLevel: 403, difficulty: 5, dailyStreak: 100 });

    expect(early).toBeGreaterThanOrEqual(10);
    expect(early).toBeLessThan(100);
    expect(late).toBe(500);
  });

  it("applies the exact daily limits to 300+, 201–299 and 101–200 XP", () => {
    const counts = streakChestDailyCounts([300, 400, 500, 201, 230, 299, 220, 240, 250, 260, ...Array(20).fill(150)]);

    expect(counts.JACKPOT).toBe(STREAK_CHEST_DAILY_LIMITS.JACKPOT);
    expect(counts.UPPER).toBe(STREAK_CHEST_DAILY_LIMITS.UPPER);
    expect(counts.MID).toBe(STREAK_CHEST_DAILY_LIMITS.MID);
    expect(canAwardStreakChestExperience(300, counts)).toBe(false);
    expect(canAwardStreakChestExperience(250, counts)).toBe(false);
    expect(canAwardStreakChestExperience(150, counts)).toBe(false);
    expect(canAwardStreakChestExperience(100, counts)).toBe(true);
  });

  it("falls back to unlimited 10–100 XP gifts once every capped band is full", () => {
    const dailyCounts = { LOW: 999, MID: 20, UPPER: 7, JACKPOT: 3 };
    const results = Array.from({ length: 30 }, () => selectStreakChestExperience({ ceiling: 500, previous: null, dailyCounts }));

    expect(results.every((experience) => experience >= 10 && experience <= 100)).toBe(true);
    expect(streakChestRewardBand(100)).toBe("LOW");
    expect(streakChestRewardBand(101)).toBe("MID");
    expect(streakChestRewardBand(201)).toBe("UPPER");
    expect(streakChestRewardBand(300)).toBe("JACKPOT");
  });
});
