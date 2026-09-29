import { prisma } from "@/core/server/prisma";
import { carryLessonAnswerStreakToNextLesson, getLessonAnswerStreak } from "@/modules/motivation/services/lesson-answer-streak.service";
import { correctAnswerStreak, streakChestMilestonesCrossed } from "@/modules/motivation/utils/correct-answer-streak";

jest.mock("@/core/server/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("@/modules/motivation/services/motivation.service", () => ({ rewardRestoredExerciseAnswer: jest.fn() }));

function courseFixture(count: number) {
  const ids = Array.from({ length: count }, (_, index) => `lesson-${index + 1}`);
  const streaks = new Map<string, { current: number; best: number; recoverable: number }>();
  const completed = new Set<string>();
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    lesson: { findUnique: jest.fn().mockImplementation(async () => ({
      isPublished: true,
      module: { isPublished: true, course: { isPublished: true,
        modules: ids.map((id) => ({ lessons: [{ id }] })),
      } },
    })) },
    lessonProgress: { findUnique: jest.fn().mockImplementation(async ({ where }: { where: { userId_lessonId: { lessonId: string } } }) =>
      completed.has(where.userId_lessonId.lessonId) ? { status: "COMPLETED" } : null) },
    lessonAnswerStreak: {
      findUnique: jest.fn().mockImplementation(async ({ where }: { where: { userId_lessonId: { lessonId: string } } }) =>
        streaks.get(where.userId_lessonId.lessonId) ?? null),
      create: jest.fn().mockImplementation(async ({ data }: { data: { lessonId: string; current: number; best: number; recoverable: number } }) => {
        const value = { current: data.current, best: data.best, recoverable: data.recoverable };
        streaks.set(data.lessonId, value);
        return value;
      }),
    },
    userStreak: { findUnique: jest.fn().mockResolvedValue({ waterLilyCount: 0 }) },
    coinTransaction: { findMany: jest.fn().mockResolvedValue([]) },
  };
  (prisma.$transaction as jest.Mock).mockImplementation((run) => run(tx));
  return { ids, streaks, completed, tx };
}

describe("server-owned answer streak between lessons", () => {
  beforeEach(() => jest.clearAllMocks());

  it("carries a long streak through ten adjacent lessons and keeps reward checkpoints", async () => {
    const { ids, streaks, completed, tx } = courseFixture(11);
    streaks.set(ids[0], { current: 995, best: 995, recoverable: 0 });
    for (let index = 0; index < 10; index += 1) {
      completed.add(ids[index]);
      const carried = await carryLessonAnswerStreakToNextLesson("student-1", ids[index], ids[index + 1]);
      expect(carried).toMatchObject({ current: 995 + index * 10, transferred: true });
      await expect(getLessonAnswerStreak("student-1", ids[index + 1]))
        .resolves.toMatchObject({ current: 995 + index * 10 });
      // Verified answers in the new lesson use this persisted starting value.
      const next = streaks.get(ids[index + 1])!;
      next.current += 10;
      next.best = next.current;
    }
    expect(streaks.get(ids[10])?.current).toBe(1095);
    expect(streakChestMilestonesCrossed(1099, 1100)).toEqual([1100]);
    expect(correctAnswerStreak(1100).bonusExperience).toBe(5);
    expect(tx.lessonAnswerStreak.create).toHaveBeenCalledTimes(10);
  });

  it("does not duplicate the seed on retry or overwrite answers in the destination", async () => {
    const { ids, streaks, completed, tx } = courseFixture(2);
    completed.add(ids[0]);
    streaks.set(ids[0], { current: 75, best: 90, recoverable: 0 });
    await carryLessonAnswerStreakToNextLesson("student-1", ids[0], ids[1]);
    streaks.get(ids[1])!.current = 79;
    await expect(carryLessonAnswerStreakToNextLesson("student-1", ids[0], ids[1]))
      .resolves.toMatchObject({ current: 79, transferred: false });
    expect(tx.lessonAnswerStreak.create).toHaveBeenCalledTimes(1);
  });

  it("rejects skips and unfinished lessons, and cannot carry a broken streak", async () => {
    const { ids, streaks, completed, tx } = courseFixture(3);
    streaks.set(ids[0], { current: 0, best: 20, recoverable: 20 });
    await expect(carryLessonAnswerStreakToNextLesson("student-1", ids[0], ids[1]))
      .rejects.toThrow("Finish the lesson");
    completed.add(ids[0]);
    await expect(carryLessonAnswerStreakToNextLesson("student-1", ids[0], ids[2]))
      .rejects.toThrow("not the next published lesson");
    await expect(carryLessonAnswerStreakToNextLesson("student-1", ids[0], ids[1]))
      .resolves.toMatchObject({ current: 0, transferred: false });
    expect(tx.lessonAnswerStreak.create).not.toHaveBeenCalled();
  });
});
