import { prisma } from "@/core/server/prisma";

export const LEARNING_COMPETENCIES = ["READING", "GRAMMAR", "USE_OF_ENGLISH", "VOCABULARY"] as const;
export type LearningCompetency = (typeof LEARNING_COMPETENCIES)[number];

const competencyLabels: Record<LearningCompetency, string> = {
  READING: "Reading",
  GRAMMAR: "Grammar",
  USE_OF_ENGLISH: "Use of English",
  VOCABULARY: "Vocabulary",
};

export type SkillProgress = {
  key: LearningCompetency;
  label: string;
  progress: number;
  accuracy: number | null;
  lessonCount: number;
  completedLessons: number;
  activeMinutes: number;
};

export type StudentProgressOverview = {
  skills: SkillProgress[];
  totalLessons: number;
  completedLessons: number;
  activeMinutes: number;
  accuracy: number | null;
  weeklyActivity: Array<{ date: string; label: string; minutes: number; lessonsCompleted: number }>;
};

function dateKey(date: Date, timeZone: string | null) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shortDayLabel(date: Date, timeZone: string | null) {
  return new Intl.DateTimeFormat("en", {
    timeZone: timeZone || "UTC",
    weekday: "short",
  }).format(date);
}

/**
 * Competency analytics is calculated exclusively from saved lesson progress.
 * Use of English combines practical, test and mixed-format lessons; the
 * remaining competencies map directly to their lesson type. A competency with
 * no matching lesson remains at zero and is never estimated.
 */
export async function getStudentProgressOverview(userId: string): Promise<StudentProgressOverview> {
  const [user, progress] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } }),
    prisma.lessonProgress.findMany({
      where: { userId },
      select: {
        status: true,
        completionPercent: true,
        correctAnswers: true,
        incorrectAnswers: true,
        activeSeconds: true,
        lesson: { select: { type: true } },
      },
    }),
  ]);

  const skills = LEARNING_COMPETENCIES.map((key) => {
    const entries = progress.filter((entry) => (
      key === "USE_OF_ENGLISH"
        ? entry.lesson.type === "PRACTICE" || entry.lesson.type === "TEST" || entry.lesson.type === "MIXED"
        : entry.lesson.type === key
    ));
    const completedLessons = entries.filter((entry) => entry.status === "COMPLETED").length;
    const correctAnswers = entries.reduce((sum, entry) => sum + entry.correctAnswers, 0);
    const incorrectAnswers = entries.reduce((sum, entry) => sum + entry.incorrectAnswers, 0);
    const answers = correctAnswers + incorrectAnswers;
    const activeSeconds = entries.reduce((sum, entry) => sum + entry.activeSeconds, 0);

    return {
      key,
      label: competencyLabels[key],
      progress: entries.length
        ? Math.round(entries.reduce((sum, entry) => sum + entry.completionPercent, 0) / entries.length)
        : 0,
      accuracy: answers ? Math.round((correctAnswers / answers) * 100) : null,
      lessonCount: entries.length,
      completedLessons,
      activeMinutes: Math.round(activeSeconds / 60),
    } satisfies SkillProgress;
  });

  const totalCorrect = progress.reduce((sum, entry) => sum + entry.correctAnswers, 0);
  const totalIncorrect = progress.reduce((sum, entry) => sum + entry.incorrectAnswers, 0);
  const timeZone = user?.timeZone ?? null;
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  const start = dateKey(sevenDaysAgo, timeZone);
  const end = dateKey(now, timeZone);
  const activities = await prisma.userDailyActivity.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { date: true, activeSeconds: true, lessonsCompleted: true },
  });
  const activityByDate = new Map(activities.map((activity) => [activity.date, activity]));
  const weeklyActivity = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setDate(now.getDate() - 6 + offset);
    const key = dateKey(date, timeZone);
    const activity = activityByDate.get(key);
    return {
      date: key,
      label: shortDayLabel(date, timeZone),
      minutes: Math.round((activity?.activeSeconds ?? 0) / 60),
      lessonsCompleted: activity?.lessonsCompleted ?? 0,
    };
  });

  return {
    skills,
    totalLessons: progress.length,
    completedLessons: progress.filter((entry) => entry.status === "COMPLETED").length,
    activeMinutes: Math.round(progress.reduce((sum, entry) => sum + entry.activeSeconds, 0) / 60),
    accuracy: totalCorrect + totalIncorrect
      ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100)
      : null,
    weeklyActivity,
  };
}
