import {
  STREAK_CHEST_DAILY_LIMITS,
  canAwardStreakChestExperience,
  isCenturyStreakChest,
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

  it("applies daily limits to ordinary 201–299 and 101–200 XP rewards", () => {
    const counts = streakChestDailyCounts([201, 230, 299, 220, 240, 250, 260, ...Array(20).fill(150)]);

    expect(counts.UPPER).toBe(STREAK_CHEST_DAILY_LIMITS.UPPER);
    expect(counts.MID).toBe(STREAK_CHEST_DAILY_LIMITS.MID);
    expect(counts.JACKPOT).toBe(0);
    expect(canAwardStreakChestExperience(300, counts)).toBe(false);
    expect(canAwardStreakChestExperience(250, counts)).toBe(false);
    expect(canAwardStreakChestExperience(150, counts)).toBe(false);
    expect(canAwardStreakChestExperience(100, counts)).toBe(true);
  });

  it("reserves 300, 400 or 500 XP for each exact hundred-streak chest", () => {
    const dailyCounts = { LOW: 999, MID: 20, UPPER: 7, JACKPOT: 999 };
    const normalRewards = Array.from({ length: 30 }, () => selectStreakChestExperience({
      ceiling: 500,
      previous: null,
      previousJackpot: null,
      dailyCounts,
      isCenturyMilestone: false,
    }));
    const centuryReward = selectStreakChestExperience({
      ceiling: 10,
      previous: 100,
      previousJackpot: 400,
      dailyCounts,
      isCenturyMilestone: true,
    });

    expect(normalRewards.every((experience) => experience >= 10 && experience <= 100)).toBe(true);
    expect([300, 500]).toContain(centuryReward);
    expect(isCenturyStreakChest(100)).toBe(true);
    expect(isCenturyStreakChest(200)).toBe(true);
    expect(isCenturyStreakChest(124)).toBe(false);
    expect(streakChestRewardBand(100)).toBe("LOW");
    expect(streakChestRewardBand(101)).toBe("MID");
    expect(streakChestRewardBand(201)).toBe("UPPER");
    expect(streakChestRewardBand(300)).toBe("JACKPOT");
  });
});
