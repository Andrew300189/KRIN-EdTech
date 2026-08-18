import type { SubscriptionPlan } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";

const planRank: Record<SubscriptionPlan, number> = {
  FREE: 0,
  BASIC: 1,
  PREMIUM: 2,
  PRO: 3,
  CORPORATE: 3,
};

const activeWindow = (now: Date) => ({
  status: "ACTIVE" as const,
  startsAt: { lte: now },
  OR: [{ endsAt: null }, { endsAt: { gt: now } }],
});

export type StudentCatalogCourse = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  fullDescription: string | null;
  accessPlan: SubscriptionPlan;
  courseType: string;
  academySlug: string;
  pathSlug: string;
  stageSlug: string;
  isFeatured: boolean;
  entitled: boolean;
  inLibrary: boolean;
  level: { code: string; title: string };
  category: { slug: string; title: string };
};

/**
 * Canonical learner-facing catalogue. The same published-course query powers
 * both the server-rendered catalogue and its retry API, so client filtering
 * can never drift from the data initially rendered on the page.
 */
export async function listStudentCatalogCourses(userId: string): Promise<StudentCatalogCourse[]> {
  const now = new Date();
  const [courses, directEntitlements, subscription] = await Promise.all([
    prisma.course.findMany({
      where: {
        isPublished: true,
        isTemplate: false,
        isVisibleInCatalog: true,
        accessMode: { in: ["FREE", "SUBSCRIPTION", "ONE_TIME_PURCHASE"] },
        level: { isPublished: true },
        category: { isPublished: true },
      },
      orderBy: [
        { isFeatured: "desc" },
        { order: "asc" },
        { updatedAt: "desc" },
        { title: "asc" },
      ],
      take: 500,
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        fullDescription: true,
        accessPlan: true,
        courseType: true,
        academySlug: true,
        pathSlug: true,
        stageSlug: true,
        isFeatured: true,
        level: { select: { code: true, title: true } },
        category: { select: { slug: true, title: true } },
        studentCourses: {
          where: { studentId: userId, status: "ACTIVE" },
          select: { id: true },
        },
      },
    }),
    prisma.entitlement.findMany({
      where: {
        userId,
        courseId: { not: null },
        moduleId: null,
        ...activeWindow(now),
      },
      select: { courseId: true },
    }),
    prisma.entitlement.findFirst({
      where: {
        userId,
        type: "SUBSCRIPTION",
        ...activeWindow(now),
        plan: { isNot: null },
      },
      orderBy: { createdAt: "desc" },
      select: { plan: { select: { code: true } } },
    }),
  ]);

  const directCourseIds = new Set(
    directEntitlements.flatMap((entitlement) =>
      entitlement.courseId ? [entitlement.courseId] : [],
    ),
  );
  const subscriptionRank = subscription?.plan
    ? planRank[subscription.plan.code]
    : -1;

  return courses.map((course) => ({
    ...course,
    entitled:
      course.accessPlan === "FREE" ||
      directCourseIds.has(course.id) ||
      subscriptionRank >= planRank[course.accessPlan],
    inLibrary: course.studentCourses.length > 0,
  }));
}
