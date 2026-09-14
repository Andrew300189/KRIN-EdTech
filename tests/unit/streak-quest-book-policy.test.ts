import { STREAK_QUEST_BOOK, streakQuestBookLevelForMilestone, streakQuestBookProgress, streakQuestBookRewardFloor } from "@/modules/motivation/services/streak-quest-book.service";

describe("streak quest book policy", () => {
  it("uses verified streak milestones as the persisted book level", () => {
    expect(STREAK_QUEST_BOOK).toMatchObject({ dropDenominator: 8, maximumLevel: 10_000 });
    expect(streakQuestBookLevelForMilestone(3)).toBe(3);
    expect(streakQuestBookLevelForMilestone(103)).toBe(103);
    expect(streakQuestBookLevelForMilestone(10_000)).toBe(10_000);
    expect(streakQuestBookLevelForMilestone(50_000)).toBe(10_000);
  });

  it("raises reward floors at each eligible book streak", () => {
    const atThree = streakQuestBookRewardFloor(3);
    const atOneHundred = streakQuestBookRewardFloor(100);
    const atOneHundredThree = streakQuestBookRewardFloor(103);
    const atTenThousand = streakQuestBookRewardFloor(10_000);
    expect(atOneHundred.experience).toBeGreaterThan(atThree.experience);
    expect(atOneHundredThree.experience).toBeGreaterThan(atOneHundred.experience);
    expect(atTenThousand.experience).toBeGreaterThan(atOneHundredThree.experience);
  });

  it("advances only from correct vocabulary review totals and never regresses", () => {
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 40, currentProgress: 0, target: 10 })).toBe(0);
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 44, currentProgress: 2, target: 10 })).toBe(4);
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 41, currentProgress: 4, target: 10 })).toBe(4);
    expect(streakQuestBookProgress({ baselineCorrectWords: 40, correctWordAnswers: 61, currentProgress: 4, target: 10 })).toBe(10);
  });
});
