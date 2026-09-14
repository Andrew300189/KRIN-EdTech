import { STREAK_QUEST_BOOK, STREAK_QUEST_BOOK_LEVELS, streakQuestBookLevelForMilestone, streakQuestBookProgress } from "@/modules/motivation/services/streak-quest-book.service";

describe("streak quest book policy", () => {
  it("has twelve server-owned book levels with strictly increasing rewards", () => {
    expect(STREAK_QUEST_BOOK).toMatchObject({ dropDenominator: 8 });
    expect(STREAK_QUEST_BOOK_LEVELS).toHaveLength(12);
    for (const [index, level] of STREAK_QUEST_BOOK_LEVELS.entries()) {
      expect(level.level).toBe(index + 1);
      if (index) {
        const previous = STREAK_QUEST_BOOK_LEVELS[index - 1];
        expect(level.experience[0]).toBeGreaterThan(previous.experience[1]);
        expect(level.coins[0]).toBeGreaterThan(previous.coins[1]);
        expect(level.unlockCost).toBeGreaterThan(previous.unlockCost);
      }
    }
  });

  it("derives the level from the verified streak milestone and caps at twelve", () => {
    expect(streakQuestBookLevelForMilestone(3)).toBe(1);
    expect(streakQuestBookLevelForMilestone(70)).toBe(6);
    expect(streakQuestBookLevelForMilestone(100)).toBe(7);
    expect(streakQuestBookLevelForMilestone(2_500)).toBe(11);
    expect(streakQuestBookLevelForMilestone(10_000)).toBe(12);
    expect(streakQuestBookLevelForMilestone(50_000)).toBe(12);
  });

  it("advances only from correct vocabulary review totals and never regresses", () => {
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 40, currentProgress: 0, target: 10 })).toBe(0);
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 44, currentProgress: 2, target: 10 })).toBe(4);
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 41, currentProgress: 4, target: 10 })).toBe(4);
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 61, currentProgress: 4, target: 10 })).toBe(10);
  });
});
