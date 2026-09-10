import { prisma } from "@/core/server/prisma";
import { hasAnyRole, parseRole } from "@/core/utils/role";
import { hasPremiumSubscriptionAccess } from "@/modules/payments/services/subscription-access";
import { entitlementAllowsLesson, hasLessonEntitlement, listActiveLessonEntitlements } from "@/modules/payments/services/entitlement.service";
import { hasReachedLessonCompletion, isLessonProgressComplete } from "@/modules/lessons/utils/lesson-progress-state";
import { reconcileLessonProgressFromPublishedBlocks } from "@/modules/courses/services/lesson-progress-reconciliation.service";

export type LessonAccessReason = "AVAILABLE" | "AUTH_REQUIRED" | "PREMIUM_REQUIRED" | "SEQUENCE_LOCKED" | "PREREQUISITE_LOCKED" | "UNPUBLISHED" | "NOT_FOUND";
export type LessonAccessResult = { allowed: boolean; reason: LessonAccessReason; lessonId?: string; courseSlug?: string };

type AccessRule = { courseAccessPlan: string; firstFreeLessonCount: number; lessonIsFree: boolean; lessonPosition: number };
type AccessUser = { role: string; subscriptionPlan: string; subscriptionStatus: string; subscriptionCurrentPeriodEnd: Date | null };

export function determineLessonAccess(user: AccessUser | null, rule: AccessRule): LessonAccessResult {
  const isFreeRange = rule.lessonPosition < rule.firstFreeLessonCount;
  if (rule.courseAccessPlan === "FREE" || rule.lessonIsFree || isFreeRange) return { allowed: true, reason: "AVAILABLE" };
  if (!user) return { allowed: false, reason: "AUTH_REQUIRED" };
  if (hasAnyRole(parseRole(user.role), ["content_manager"]) || hasPremiumSubscriptionAccess(user)) return { allowed: true, reason: "AVAILABLE" };
  return { allowed: false, reason: "PREMIUM_REQUIRED" };
}

/**
 * Resolves the complete lesson outline for one course in a bounded number of
 * queries. Public course pages use this instead of running `canAccessLesson`
 * once per card, which prevents an N+1 query pattern as programmes grow.
 */
export async function listCourseLessonAccess(userId: string | null, courseId: string): Promise<Array<[string, LessonAccessResult]>> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true, isTemplate: false, level: { isPublished: true }, category: { isPublished: true } },
    select: {
      id: true,
      slug: true,
      accessPlan: true,
      firstFreeLessonCount: true,
      modules: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          requiresSequentialCompletion: true,
          unlockAfterModuleId: true,
          requiredCompletionPercent: true,
          minimumFinalLessonScore: true,
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            select: { id: true, isFree: true, prerequisiteLessonId: true, requiredPrerequisiteCompletion: true, curriculumRole: true },
          },
        },
      },
    },
  });
  if (!course) return [];

  const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  const [user, entitlements, progress] = await Promise.all([
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { role: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionCurrentPeriodEnd: true } }) : null,
    userId ? listActiveLessonEntitlements(userId, course.id) : [],
    userId ? prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true, status: true, completionPercent: true, grade: true } }) : [],
  ]);
  const progressByLesson = new Map(progress.map((item) => [item.lessonId, item]));
  const orderedLessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  const privileged = hasAnyRole(parseRole(user?.role), ["content_manager"]);
  const results: Array<[string, LessonAccessResult]> = [];

  for (const courseModule of course.modules) {
    const prerequisites = modulePrerequisites(courseModule, course.modules);
    const prerequisiteModulesComplete = prerequisites.every((requiredModule) => {
      if (!requiredModule.lessons.length) return false;
      const completed = requiredModule.lessons.filter((lesson) => isLessonProgressComplete(progressByLesson.get(lesson.id))).length;
      return Math.round((completed / requiredModule.lessons.length) * 100) >= courseModule.requiredCompletionPercent
        && meetsModuleFinalScoreRequirement(requiredModule, progressByLesson);
    });

    for (const lesson of courseModule.lessons) {
      let access = determineLessonAccess(user, {
        courseAccessPlan: course.accessPlan,
        firstFreeLessonCount: course.firstFreeLessonCount,
        lessonIsFree: lesson.isFree,
        lessonPosition: Math.max(0, orderedLessonIds.indexOf(lesson.id)),
      });
      if (!access.allowed && entitlementAllowsLesson(entitlements, { courseId: course.id, moduleId: courseModule.id, lessonOrder: Math.max(0, orderedLessonIds.indexOf(lesson.id)) + 1 })) access = { allowed: true, reason: "AVAILABLE" };
      if (access.allowed && prerequisites.length > 0 && !privileged) {
        access = !userId
          ? { allowed: false, reason: "AUTH_REQUIRED" }
          : prerequisiteModulesComplete
            ? access
            : { allowed: false, reason: "SEQUENCE_LOCKED" };
      }
      if (access.allowed && lesson.prerequisiteLessonId && !privileged) {
        const prerequisite = progressByLesson.get(lesson.prerequisiteLessonId);
        if (!userId) access = { allowed: false, reason: "AUTH_REQUIRED" };
        else if (!hasReachedLessonCompletion(prerequisite, lesson.requiredPrerequisiteCompletion)) access = { allowed: false, reason: "PREREQUISITE_LOCKED" };
      }
      results.push([lesson.id, { ...access, lessonId: lesson.id, courseSlug: course.slug }]);
    }
  }
  return results;
}

type ProgressForModuleGate = { status: string; completionPercent: number; grade: number | null };
type PublishedCourseModule = {
  id: string;
  order: number;
  minimumFinalLessonScore: number;
  lessons: Array<{ id: string; curriculumRole: string }>;
};

function modulePrerequisites(module: { id: string; order: number; requiresSequentialCompletion: boolean; unlockAfterModuleId: string | null }, modules: PublishedCourseModule[]) {
  const prerequisites = new Map<string, PublishedCourseModule>();
  if (module.unlockAfterModuleId) {
    const explicit = modules.find((candidate) => candidate.id === module.unlockAfterModuleId);
    if (explicit) prerequisites.set(explicit.id, explicit);
  }
  if (module.requiresSequentialCompletion) {
    const previous = [...modules].filter((candidate) => candidate.order < module.order).sort((left, right) => right.order - left.order)[0];
    if (previous) prerequisites.set(previous.id, previous);
  }
  return [...prerequisites.values()];
}

function minimumGradeForScore(score: number) {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  return 2;
}

function meetsModuleFinalScoreRequirement(module: PublishedCourseModule, progressByLesson: ReadonlyMap<string, ProgressForModuleGate>) {
  if (module.minimumFinalLessonScore <= 0) return true;
  const finalLesson = module.lessons.find((lesson) => lesson.curriculumRole === "FINAL") ?? module.lessons.at(-1);
  if (!finalLesson) return false;
  const progress = progressByLesson.get(finalLesson.id);
  return Boolean(progress && isLessonProgressComplete(progress) && (progress.grade ?? 0) >= minimumGradeForScore(module.minimumFinalLessonScore));
}

async function meetsModuleCompletionRequirement(userId: string, prerequisites: PublishedCourseModule[], requiredCompletionPercent: number) {
  const prerequisiteLessonIds = prerequisites.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  if (prerequisiteLessonIds.length === 0) return false;
  const progress = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: prerequisiteLessonIds } },
    select: { lessonId: true, status: true, completionPercent: true, grade: true },
  });
  const progressByLesson = new Map(progress.map((item) => [item.lessonId, item]));
  const completed = new Set(progress.filter(isLessonProgressComplete).map((item) => item.lessonId));
  return prerequisites.every((module) => {
    if (module.lessons.length === 0) return false;
    const percentage = Math.round((module.lessons.filter((lesson) => completed.has(lesson.id)).length / module.lessons.length) * 100);
    return percentage >= requiredCompletionPercent && meetsModuleFinalScoreRequirement(module, progressByLesson);
  });
}

export async function canAccessLesson(userId: string | null, lessonId: string): Promise<LessonAccessResult> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      isPublished: true,
      isFree: true,
      prerequisiteLessonId: true,
      requiredPrerequisiteCompletion: true,
      module: {
        select: {
          id: true,
          order: true,
          isPublished: true,
          requiresSequentialCompletion: true,
          unlockAfterModuleId: true,
          requiredCompletionPercent: true,
          minimumFinalLessonScore: true,
          course: {
            select: {
              id: true,
              slug: true,
              isPublished: true,
              isTemplate: true,
              category: { select: { isPublished: true } },
              accessPlan: true,
              firstFreeLessonCount: true,
              level: { select: { isPublished: true } },
              modules: { where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, order: true, minimumFinalLessonScore: true, lessons: { where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, curriculumRole: true } } } },
            },
          },
        },
      },
    },
  });
  if (!lesson) return { allowed: false, reason: "NOT_FOUND" };
  const { module } = lesson;
  const course = module.course;
  if (!lesson.isPublished || !module.isPublished || !course.isPublished || course.isTemplate || !course.level.isPublished || !course.category.isPublished) {
    return { allowed: false, reason: "UNPUBLISHED", lessonId, courseSlug: course.slug };
  }

  const orderedLessonIds = course.modules.flatMap((courseModule) => courseModule.lessons.map((item) => item.id));
  const lessonPosition = orderedLessonIds.indexOf(lesson.id);
  const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionCurrentPeriodEnd: true } }) : null;
  let access = determineLessonAccess(user, { courseAccessPlan: course.accessPlan, firstFreeLessonCount: course.firstFreeLessonCount, lessonIsFree: lesson.isFree, lessonPosition: Math.max(0, lessonPosition) });
  if (!access.allowed && userId && await hasLessonEntitlement(userId, { courseId: course.id, moduleId: module.id, lessonOrder: Math.max(0, lessonPosition) + 1 })) access = { allowed: true, reason: "AVAILABLE" };
  if (!access.allowed) return { ...access, lessonId, courseSlug: course.slug };

  const prerequisites = modulePrerequisites(module, course.modules);
  if (prerequisites.length > 0 && !hasAnyRole(parseRole(user?.role), ["content_manager"])) {
    if (!userId) return { allowed: false, reason: "AUTH_REQUIRED", lessonId, courseSlug: course.slug };
    if (!await meetsModuleCompletionRequirement(userId, prerequisites, module.requiredCompletionPercent)) {
      return { allowed: false, reason: "SEQUENCE_LOCKED", lessonId, courseSlug: course.slug };
    }
  }

  if (lesson.prerequisiteLessonId && !hasAnyRole(parseRole(user?.role), ["content_manager"])) {
    if (!userId) return { allowed: false, reason: "AUTH_REQUIRED", lessonId, courseSlug: course.slug };
    // A previous player version could include hidden CMS drafts in the lesson
    // denominator. Repair that harmless historic record before deciding
    // access, so a learner is never locked behind a lesson they completed.
    await reconcileLessonProgressFromPublishedBlocks(userId, lesson.prerequisiteLessonId);
    const prerequisiteProgress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.prerequisiteLessonId } },
      select: { status: true, completionPercent: true },
    });
    if (!hasReachedLessonCompletion(prerequisiteProgress, lesson.requiredPrerequisiteCompletion)) {
      return { allowed: false, reason: "PREREQUISITE_LOCKED", lessonId, courseSlug: course.slug };
    }
  }
  return { allowed: true, reason: "AVAILABLE", lessonId, courseSlug: course.slug };
}
