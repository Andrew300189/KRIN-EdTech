import { prisma } from "@/core/server/prisma";
import { rewardRestoredExerciseAnswer } from "@/modules/motivation/services/motivation.service";
import { resolveLessonAnswerStreak } from "@/modules/motivation/services/lesson-answer-streak.service";

jest.mock("@/core/server/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("@/modules/motivation/services/motivation.service", () => ({ rewardRestoredExerciseAnswer: jest.fn() }));

describe("server-owned lesson answer streak restoration", () => {
  it("spends two lower-tier lilies for a 12-answer streak and corrects the attempt with XP only once", async () => {
    let recoverable = 12;
    const tx = {
      $executeRaw: jest.fn(),
      lessonAnswerStreak: {
        findUnique: jest.fn().mockImplementation(async () => ({ id: "streak-1", current: 0, best: 12, recoverable })),
        update: jest.fn().mockImplementation(async () => { recoverable = 0; return { current: 13, best: 13, recoverable: 0 }; }),
      },
      exerciseAttempt: {
        findFirst: jest.fn().mockResolvedValue({ id: "attempt-1", exerciseId: "exercise-1", isCorrect: false, scoreAwarded: -5,
          timeSpentSeconds: 3, createdAt: new Date("2026-09-26T10:00:00Z"), solutionOpened: false,
          exercise: { correctAnswer: "am", basePoints: 5, timeLimitSeconds: 30, isGeneratedReview: false } }),
        update: jest.fn(),
      },
      userStreak: { findUnique: jest.fn().mockResolvedValue({ waterLilyCount: 21 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      coinTransaction: { findMany: jest.fn().mockResolvedValue([]) },
      lessonProgress: { updateMany: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue({ timeZone: "UTC" }) },
      userDailyActivity: { updateMany: jest.fn() },
      learningActivity: { findFirst: jest.fn().mockResolvedValue(null) },
      userMistake: { updateMany: jest.fn() },
      userLevel: { upsert: jest.fn().mockResolvedValue({ id: "level-1" }), update: jest.fn() },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((run) => run(tx));
    (rewardRestoredExerciseAnswer as jest.Mock).mockResolvedValue({ awarded: true, experience: 3 });

    const restored = await resolveLessonAnswerStreak("student-1", "lesson-1", "RESTORE");
    expect(restored).toMatchObject({ restored: true, current: 13, recoverable: 0, exerciseId: "exercise-1", correctAnswer: "am", experience: 3,
      liliesUsed: [{ id: "water-lily", capacity: 10, quantity: 2 }] });
    expect(tx.userStreak.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.userStreak.updateMany).toHaveBeenCalledWith({ where: { userId: "student-1", waterLilyCount: { gte: 2 } }, data: { waterLilyCount: { decrement: 2 } } });
    expect(tx.exerciseAttempt.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "attempt-1" }, data: expect.objectContaining({ isCorrect: true, submittedAnswer: "am" }) }));
    expect(rewardRestoredExerciseAnswer).toHaveBeenCalledTimes(1);

    await expect(resolveLessonAnswerStreak("student-1", "lesson-1", "RESTORE")).rejects.toThrow("no interrupted lesson streak");
    expect(tx.userStreak.updateMany).toHaveBeenCalledTimes(1);
  });
});
