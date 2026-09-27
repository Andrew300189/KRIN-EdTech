import { prisma } from "@/core/server/prisma";
import { completeSpacedLessonReview, getSpacedLessonReview } from "@/modules/courses/services/spaced-review.service";

jest.mock("@/core/server/prisma", () => ({ prisma: {
  lessonSpacedReviewRun: { findUnique: jest.fn() },
  $transaction: jest.fn(),
} }));

describe("retired generated correction cards", () => {
  it("hides old correction cards while retaining the saved review run", async () => {
    (prisma.lessonSpacedReviewRun.findUnique as jest.Mock).mockResolvedValue({
      id: "run-1", status: "ACTIVE", completedAt: null,
      items: [
        { exercise: { id: "correction-1", engineKey: "find-and-correct" } },
        { exercise: { id: "input-1", engineKey: "text-input" } },
      ],
    });
    const run = await getSpacedLessonReview("student-1", "lesson-1");
    expect(run?.questions).toEqual([{ id: "input-1", engineKey: "text-input" }]);
  });

  it("requires attempts only for cards that remain visible", async () => {
    const tx = {
      lessonSpacedReviewRun: {
        findUnique: jest.fn().mockResolvedValue({ id: "run-1", status: "ACTIVE", items: [
          { exerciseId: "correction-1", exercise: { engineKey: "find-and-correct" } },
          { exerciseId: "input-1", exercise: { engineKey: "text-input" } },
        ] }),
        update: jest.fn(),
      },
      exerciseAttempt: { findMany: jest.fn().mockResolvedValue([{ exerciseId: "input-1" }]) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((run) => run(tx));
    await expect(completeSpacedLessonReview("student-1", "lesson-1")).resolves.toEqual({ completed: true, alreadyCompleted: false });
    expect(tx.exerciseAttempt.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ exerciseId: { in: ["input-1"] } }),
    }));
    expect(tx.lessonSpacedReviewRun.update).toHaveBeenCalledTimes(1);
  });
});
