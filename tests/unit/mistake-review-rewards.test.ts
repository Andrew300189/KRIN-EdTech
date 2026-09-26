import { grantEconomyReward } from "@/modules/motivation/services/motivation.service";
import { recordMistakeReviewAnswer } from "@/modules/motivation/services/mistake-review-rewards.service";

jest.mock("@/modules/motivation/services/motivation.service", () => ({ grantEconomyReward: jest.fn() }));

describe("My Mistakes rewards", () => {
  it("gives 2 XP for a correction and a separate flower chest at three flawless fixes", async () => {
    const tx = {
      $executeRaw: jest.fn(),
      mistakeReviewRunItem: { findFirst: jest.fn().mockResolvedValue({ id: "item-3", mistakeId: "mistake-3", hadWrongAttempt: false, run: { correctStreak: 2, bestCorrectStreak: 2 } }), update: jest.fn() },
      mistakeReviewRun: { update: jest.fn() },
      experienceTransaction: { findFirst: jest.fn().mockResolvedValue(null) },
      userStreak: { upsert: jest.fn() },
    };
    (grantEconomyReward as jest.Mock).mockImplementation(async (_tx, reward) => ({ awarded: true, experience: reward.experience }));
    const result = await recordMistakeReviewAnswer(tx as never, { userId: "student-1", runId: "run-1", lessonId: "lesson-1", exerciseId: "exercise-3", isCorrect: true });
    expect(result).toMatchObject({ correctedExperience: 2, currentStreak: 3, chest: { experience: 16, waterLily: 1, milestone: 3 } });
    expect(tx.userStreak.upsert).toHaveBeenCalledTimes(1);
    expect(grantEconomyReward).toHaveBeenCalledWith(tx, expect.objectContaining({ experience: 2, sourceType: "MISTAKE_CORRECTION", idempotencyKey: "mistake-correction:student-1:mistake-3" }));
  });

  it("does not count a correction after a wrong attempt toward the flawless run", async () => {
    const tx = {
      $executeRaw: jest.fn(),
      mistakeReviewRunItem: { findFirst: jest.fn().mockResolvedValue({ id: "item-1", mistakeId: "mistake-1", hadWrongAttempt: true, run: { correctStreak: 0, bestCorrectStreak: 2 } }), update: jest.fn() },
      mistakeReviewRun: { update: jest.fn() },
    };
    (grantEconomyReward as jest.Mock).mockResolvedValue({ awarded: true, experience: 2 });
    const result = await recordMistakeReviewAnswer(tx as never, { userId: "student-1", runId: "run-1", lessonId: "lesson-1", exerciseId: "exercise-1", isCorrect: true });
    expect(result).toMatchObject({ correctedExperience: 2, currentStreak: 0, chest: null });
  });
});
