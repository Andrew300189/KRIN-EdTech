import "server-only";

import { prisma } from "@/core/server/prisma";
import type { PublicLearningStatistics } from "@/modules/analytics/types/platform-statistics.types";

/**
 * Public, aggregate-only learning figures. Every value is counted directly
 * from the canonical product tables; no marketing or seeded counter is used.
 */
export async function getPublicLearningStatistics(): Promise<PublicLearningStatistics> {
  const [registeredLearners, masteredWords, completedCourses, completedLessons] =
    await Promise.all([
      prisma.user.count({
        where: { role: "STUDENT", deletedAt: null, isBlocked: false },
      }),
      prisma.userWord.count({
        where: { status: "MASTERED", archivedAt: null },
      }),
      prisma.studentCourse.count({
        where: {
          status: "COMPLETED",
          student: { deletedAt: null, isBlocked: false },
        },
      }),
      prisma.lessonProgress.count({
        where: {
          status: "COMPLETED",
          user: { deletedAt: null, isBlocked: false },
        },
      }),
    ]);

  return {
    registeredLearners,
    masteredWords,
    completedCourses,
    completedLessons,
  };
}
