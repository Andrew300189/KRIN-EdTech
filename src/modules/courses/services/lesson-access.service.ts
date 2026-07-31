import { prisma } from "@/core/server/prisma";
import { hasAnyRole, parseRole } from "@/core/utils/role";
import { hasPremiumSubscriptionAccess } from "@/modules/payments/services/subscription-access";
import { hasCourseEntitlement } from "@/modules/payments/services/entitlement.service";

export type LessonAccessReason = "AVAILABLE" | "AUTH_REQUIRED" | "PREMIUM_REQUIRED" | "UNPUBLISHED" | "NOT_FOUND";
export type LessonAccessResult = {
  allowed: boolean;
  reason: LessonAccessReason;
  lessonId?: string;
  courseSlug?: string;
};

type AccessRule = {
  courseAccessPlan: string;
  firstFreeLessonCount: number;
  lessonIsFree: boolean;
  lessonPosition: number;
};

type AccessUser = {
  role: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionCurrentPeriodEnd: Date | null;
};

export function determineLessonAccess(user: AccessUser | null, rule: AccessRule): LessonAccessResult {
  const isFreeRange = rule.lessonPosition < rule.firstFreeLessonCount;
  if (rule.courseAccessPlan === "FREE" || rule.lessonIsFree || isFreeRange) {
    return { allowed: true, reason: "AVAILABLE" };
  }
  if (!user) return { allowed: false, reason: "AUTH_REQUIRED" };
  if (hasAnyRole(parseRole(user.role), ["content_manager"]) || hasPremiumSubscriptionAccess(user)) {
    return { allowed: true, reason: "AVAILABLE" };
  }
  return { allowed: false, reason: "PREMIUM_REQUIRED" };
}

export async function canAccessLesson(userId: string | null, lessonId: string): Promise<LessonAccessResult> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      isPublished: true,
      isFree: true,
      module: {
        select: {
          isPublished: true,
          course: {
            select: {
              id: true,
              slug: true,
              isPublished: true,
              category: { select: { isPublished: true } },
              accessPlan: true,
              firstFreeLessonCount: true,
              level: { select: { isPublished: true } },
              modules: {
                where: { isPublished: true },
                orderBy: { order: "asc" },
                select: { lessons: { where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!lesson) return { allowed: false, reason: "NOT_FOUND" };
  const course = lesson.module.course;
  if (!lesson.isPublished || !lesson.module.isPublished || !course.isPublished || !course.level.isPublished || !course.category.isPublished) {
    return { allowed: false, reason: "UNPUBLISHED", lessonId, courseSlug: course.slug };
  }

  const orderedLessonIds = course.modules.flatMap((module) => module.lessons.map((item) => item.id));
  const lessonPosition = orderedLessonIds.indexOf(lesson.id);
  const user = userId ? await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionCurrentPeriodEnd: true },
  }) : null;
  const access = determineLessonAccess(user, {
    courseAccessPlan: course.accessPlan,
    firstFreeLessonCount: course.firstFreeLessonCount,
    lessonIsFree: lesson.isFree,
    lessonPosition: Math.max(0, lessonPosition),
  });
  // Direct course/module purchases and subscription entitlements are evaluated
  // on the server at request time; the legacy user fields are only a cache.
  if (!access.allowed && userId && await hasCourseEntitlement(userId, course.id)) {
    return { allowed: true, reason: "AVAILABLE", lessonId, courseSlug: course.slug };
  }
  return { ...access, lessonId, courseSlug: course.slug };
}
