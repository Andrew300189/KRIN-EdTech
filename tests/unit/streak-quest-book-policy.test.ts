import { STREAK_QUEST_BOOK, streakQuestBookProgress } from "@/modules/motivation/services/streak-quest-book.service";

describe("streak quest book policy", () => {
  it("uses server-owned unlock cost, word target and bundled rewards", () => {
    expect(STREAK_QUEST_BOOK).toMatchObject({
      unlockCost: 2,
      targetCorrectWords: 10,
      experienceReward: 120,
      coinReward: 2,
      hintCredits: 1,
      translationCredits: 1,
    });
  });

  it("advances only from correct vocabulary review totals and never regresses", () => {
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 40, currentProgress: 0, target: 10 })).toBe(0);
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 44, currentProgress: 2, target: 10 })).toBe(4);
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 41, currentProgress: 4, target: 10 })).toBe(4);
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 61, currentProgress: 4, target: 10 })).toBe(10);
  });
});
