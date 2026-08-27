import "server-only";

import { prisma } from "@/core/server/prisma";
import type { PublicLearningStatistics } from "@/modules/analytics/types/platform-statistics.types";

const PUBLIC_STATISTICS_CACHE_TTL_MS = 15_000;

let cachedStatistics: { value: PublicLearningStatistics; expiresAt: number } | null = null;
let pendingStatisticsRequest: Promise<PublicLearningStatistics> | null = null;

/**
 * Public, aggregate-only learning figures. Every value is counted directly
 * from the canonical product tables; no marketing or seeded counter is used.
 *
 * The short server-local cache coalesces concurrent homepage/API requests.
 * It keeps counters near-real-time while preventing four aggregate database
 * counts from running repeatedly for every visitor in the same few seconds.
 */
export async function getPublicLearningStatistics(): Promise<PublicLearningStatistics> {
  const now = Date.now();
  if (cachedStatistics && cachedStatistics.expiresAt > now) {
    return cachedStatistics.value;
  }

  if (pendingStatisticsRequest) return pendingStatisticsRequest;

  const request = Promise.all([
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
    ]).then(([registeredLearners, masteredWords, completedCourses, completedLessons]) => ({
      registeredLearners,
      masteredWords,
      completedCourses,
      completedLessons,
    }));

  pendingStatisticsRequest = request;

  try {
    const value = await request;
    cachedStatistics = {
      value,
      expiresAt: Date.now() + PUBLIC_STATISTICS_CACHE_TTL_MS,
    };
    return value;
  } finally {
    pendingStatisticsRequest = null;
  }
}
