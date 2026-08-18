import type { PublicLearningStatistics } from "@/modules/analytics/types/platform-statistics.types";

export type PublicStatisticCard = {
  icon: string;
  label: string;
  value: number;
};

/** Labels are intentionally limited to metrics that have a canonical row. */
export function buildPublicStatisticCards(
  statistics: PublicLearningStatistics,
): PublicStatisticCard[] {
  return [
    {
      icon: "👥",
      label: "Registered learners",
      value: statistics.registeredLearners,
    },
    {
      icon: "📚",
      label: "Words mastered",
      value: statistics.masteredWords,
    },
    {
      icon: "🎓",
      label: "Courses completed",
      value: statistics.completedCourses,
    },
    {
      icon: "📈",
      label: "Lessons completed",
      value: statistics.completedLessons,
    },
  ];
}
