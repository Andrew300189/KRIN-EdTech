import { prisma } from "@/core/server/prisma";
import { excludeSystemAccounts } from "@/core/server/system-accounts";
import { isLessonProgressComplete } from "@/modules/lessons/utils/lesson-progress-state";

export type PublicProfileLocale = "en" | "ru" | "uk";

type PublicCourse = {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
  translations: Array<{ title: string }>;
  modules: Array<{ lessons: Array<{ id: string }> }>;
};

function displayName(user: { name: string; firstName: string | null }) {
  return user.firstName?.trim() || user.name.trim().split(/\s+/)[0] || "Learner";
}

/**
 * Builds the deliberately limited card that one learner has consented to show
 * to other signed-in learners. This function is the privacy boundary: it
 * never selects emails, wallets, raw answers or a complete lesson history.
 */
export async function getPublicLearnerProfile(username: string, locale: PublicProfileLocale) {
  const learner = await prisma.user.findFirst({
    where: {
      username,
      showInLeaderboard: true,
      showPublicProfile: true,
      isBlocked: false,
      deletedAt: null,
      ...excludeSystemAccounts(),
    },
    select: {
      username: true,
      name: true,
      firstName: true,
      avatar: true,
      avatarDisplayMode: true,
      equippedShopAvatar: true,
      userLevelProgress: { select: { level: true, leaderboardExperienceMinor: true } },
      streak: { select: { currentStreak: true } },
      studentCourses: { where: { status: "ACTIVE" }, select: { courseId: true } },
      lessonProgress: {
        select: {
          status: true,
          completionPercent: true,
          correctAnswers: true,
          incorrectAnswers: true,
          activeSeconds: true,
          lastSeenAt: true,
          lesson: { select: { id: true, module: { select: { courseId: true } } } },
        },
      },
    },
  });
  if (!learner) return null;

  const progressByCourse = new Map<string, {
    seenLessonIds: Set<string>;
    completedLessonIds: Set<string>;
    latestActivity: Date;
  }>();
  let completedLessons = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let activeSeconds = 0;

  for (const progress of learner.lessonProgress) {
    const courseId = progress.lesson.module.courseId;
    const courseProgress = progressByCourse.get(courseId) ?? {
      seenLessonIds: new Set<string>(),
      completedLessonIds: new Set<string>(),
      latestActivity: progress.lastSeenAt,
    };
    courseProgress.seenLessonIds.add(progress.lesson.id);
    if (isLessonProgressComplete(progress)) {
      completedLessons += 1;
      courseProgress.completedLessonIds.add(progress.lesson.id);
    }
    if (progress.lastSeenAt > courseProgress.latestActivity) courseProgress.latestActivity = progress.lastSeenAt;
    progressByCourse.set(courseId, courseProgress);
    correctAnswers += progress.correctAnswers;
    incorrectAnswers += progress.incorrectAnswers;
    activeSeconds += progress.activeSeconds;
  }

  const courseIds = [...new Set([
    ...learner.studentCourses.map((course) => course.courseId),
    ...progressByCourse.keys(),
  ])];
  const courses = courseIds.length ? await prisma.course.findMany({
    where: { id: { in: courseIds }, isPublished: true, isTemplate: false },
    select: {
      id: true,
      slug: true,
      title: true,
      isPublished: true,
      translations: { where: { locale }, select: { title: true }, take: 1 },
      modules: { select: { lessons: { where: { isPublished: true }, select: { id: true } } } },
    },
  }) as PublicCourse[] : [];

  const activeCourses = courses
    .flatMap((course) => {
      const progress = progressByCourse.get(course.id);
      if (!progress) return [];
      const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0);
      const completed = progress.completedLessonIds.size;
      const completionPercent = totalLessons > 0
        ? Math.min(100, Math.round((completed / totalLessons) * 100))
        : Math.min(99, Math.max(0, Math.round([...progress.seenLessonIds].length ? 1 : 0)));
      // Completed courses belong to the achievement history, not the compact
      // "currently learning" list seen by other learners.
      if (totalLessons > 0 && completed >= totalLessons) return [];
      return [{
        id: course.id,
        slug: course.slug,
        title: course.translations[0]?.title ?? course.title,
        completionPercent,
        completedLessons: completed,
        totalLessons,
        latestActivity: progress.latestActivity,
      }];
    })
    .sort((left, right) => right.latestActivity.getTime() - left.latestActivity.getTime())
    .slice(0, 6)
    .map(({ latestActivity: _latestActivity, ...course }) => course);

  const answerCount = correctAnswers + incorrectAnswers;
  return {
    learner: {
      username: learner.username,
      displayName: displayName(learner),
      avatar: learner.avatarDisplayMode === "SHOP" ? null : learner.avatar,
      shopAvatarId: learner.avatarDisplayMode === "SHOP" ? learner.equippedShopAvatar : null,
      level: learner.userLevelProgress?.level ?? 1,
      rankExperience: Math.floor(Math.max(0, learner.userLevelProgress?.leaderboardExperienceMinor ?? 0) / 100),
      currentStreak: learner.streak?.currentStreak ?? 0,
    },
    stats: {
      completedLessons,
      activeMinutes: Math.round(activeSeconds / 60),
      accuracy: answerCount ? Math.round((correctAnswers / answerCount) * 100) : null,
    },
    courses: activeCourses,
  };
}
