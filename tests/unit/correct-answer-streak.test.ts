import { correctAnswerStreak, streakChestKrinCoinReward, streakChestLevel } from "@/modules/motivation/utils/correct-answer-streak";

describe("correct answer streak modes", () => {
  it("keeps the standard reward before the first three-answer mode", () => {
    expect(correctAnswerStreak(2)).toMatchObject({ current: 2, modeStart: null, bonusExperience: 0, activated: false });
  });

  it.each([
    [3, 3, 1],
    [7, 7, 1],
    [12, 12, 1],
    [24, 24, 2],
    [70, 70, 2],
    [100, 100, 3],
    [103, 103, 3],
    [107, 107, 3],
    [112, 112, 3],
    [148, 148, 3],
    [200, 200, 5],
    [203, 203, 5],
    [548, 548, 5],
  ])("activates the %i-answer mode with a +%i XP bonus", (current, modeStart, bonusExperience) => {
    expect(correctAnswerStreak(current)).toMatchObject({ current, modeStart, bonusExperience, activated: true });
  });

  it("repeats the 100-answer checkpoint pattern without capping the streak", () => {
    expect(correctAnswerStreak(548)).toMatchObject({ current: 548, modeStart: 548, bonusExperience: 5, activated: true });
    expect(correctAnswerStreak(777)).toMatchObject({ current: 777, modeStart: 770, bonusExperience: 5, activated: false });
  });

  it("gives every real checkpoint its own chest level through 10,000", () => {
    expect(streakChestLevel(3)).toBe(1);
    expect(streakChestLevel(7)).toBe(2);
    expect(streakChestLevel(12)).toBe(3);
    expect(streakChestLevel(24)).toBe(4);
    expect(streakChestLevel(100)).toBe(7);
    expect(streakChestLevel(103)).toBe(8);
    expect(streakChestLevel(124)).toBe(11);
    expect(streakChestLevel(5_470)).toBe(384);
    expect(streakChestLevel(10_000)).toBe(700);
    expect(streakChestLevel(10_024)).toBe(700);
    expect(streakChestLevel(5_478)).toBe(0);
  });

  it("awards one non-ranked KRIN Coin on every hundred-answer chest", () => {
    expect(streakChestKrinCoinReward(100)).toBe(1);
    expect(streakChestKrinCoinReward(124)).toBe(0);
    expect(streakChestKrinCoinReward(200)).toBe(1);
    expect(streakChestKrinCoinReward(5_470)).toBe(0);
    expect(streakChestKrinCoinReward(5_500)).toBe(1);
  });
});
