import { Prisma, type SubscriptionPlan } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { getLearningRewardPreview } from "@/modules/motivation/services/motivation.service";
import { listLessonProgressByLessonIds } from "./content.service";

const PLAN_ORDER: SubscriptionPlan[] = [
  "FREE",
  "BASIC",
  "PREMIUM",
  "PRO",
  "CORPORATE",
];

const activeWindow = (now: Date) => ({
  status: "ACTIVE" as const,
  startsAt: { lte: now },
  OR: [{ endsAt: null }, { endsAt: { gt: now } }],
});

export type LearnerCourseCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  category: string;
  accessPlan: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lessonExperience: number;
  lessonAccuracy: { correctAnswers: number; incorrectAnswers: number };
  source: "ENROLLED" | "PURCHASED" | "SUBSCRIPTION" | "IN_PROGRESS" | "TEACHER_CREATED" | "SELF_ADDED" | "TEACHER_ASSIGNED" | "GROUP_ASSIGNED";
  canRemove: boolean;
  nextLesson: { slug: string; title: string } | null;
};

function plansAvailableTo(subscriptionPlan: SubscriptionPlan | undefined) {
  const rank = subscriptionPlan ? PLAN_ORDER.indexOf(subscriptionPlan) : -1;
  return rank >= 0 ? PLAN_ORDER.slice(0, rank + 1) : [];
}

/**
 * Lists only courses to which this user already has a relationship or an
 * active entitlement. It deliberately never falls back to the public catalog.
 */
export async function listLearnerCourses(userId: string): Promise<LearnerCourseCard[]> {
  const now = new Date();
  const [subscription, rewardPreview] = await Promise.all([
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
    getLearningRewardPreview(),
  ]);
  const subscriptionPlans = plansAvailableTo(subscription?.plan?.code);

  const directEntitlement = { userId, ...activeWindow(now) };
  const purchaseAccess = {
    userId,
    status: "ACTIVE" as const,
    accessStartsAt: { lte: now },
    OR: [{ accessEndsAt: null }, { accessEndsAt: { gt: now } }],
  };
  const libraryAccess: Prisma.CourseWhereInput = { studentCourses: { some: { studentId: userId, status: "ACTIVE" } } };
  const externalAccessConditions: Prisma.CourseWhereInput[] = [
    { instructorId: userId },
    { students: { some: { id: userId } } },
    { coursePurchases: { some: purchaseAccess } },
    { entitlements: { some: directEntitlement } },
    { modules: { some: { entitlements: { some: directEntitlement } } } },
    { modules: { some: { lessons: { some: { progress: { some: { userId } } } } } } },
  ];

  if (subscriptionPlans.length > 0) {
    externalAccessConditions.push({ accessPlan: { in: subscriptionPlans } });
  }

  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      isTemplate: false,
      level: { isPublished: true },
      category: { isPublished: true },
      OR: [
        libraryAccess,
        {
          AND: [
            { studentCourses: { none: { studentId: userId, status: "ARCHIVED" } } },
            { OR: externalAccessConditions },
          ],
        },
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      accessPlan: true,
      instructorId: true,
      level: { select: { code: true } },
      category: { select: { title: true } },
      students: { where: { id: userId }, select: { id: true } },
      coursePurchases: { where: purchaseAccess, select: { id: true } },
      entitlements: { where: directEntitlement, select: { id: true } },
      studentCourses: { where: { studentId: userId, status: "ACTIVE" }, select: { id: true, sourceType: true, sourceId: true } },
      modules: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: {
          isRequired: true,
          entitlements: { where: directEntitlement, select: { id: true } },
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            select: {
              id: true,
              slug: true,
              title: true,
              progress: {
                where: { userId },
                select: { completionPercent: true, status: true },
              },
            },
          },
        },
      },
    },
  });

  const lessonProgressById = new Map(
    (await listLessonProgressByLessonIds(
      userId,
      courses.flatMap((course) => course.modules.flatMap((courseModule) => courseModule.lessons.map((lesson) => lesson.id))),
    )).map((progress) => [progress.lessonId, progress]),
  );

  return courses.map((course) => {
    const lessons = course.modules.flatMap((courseModule) => courseModule.lessons);
    const requiredModules = course.modules.filter((courseModule) => courseModule.isRequired);
    const requiredLessons = requiredModules.length ? requiredModules.flatMap((courseModule) => courseModule.lessons) : lessons;
    const progressEntries = requiredLessons.map((lesson) => lessonProgressById.get(lesson.id));
    const totalLessons = requiredLessons.length;
    const completedLessons = progressEntries.filter(
      (progress) => progress?.status === "COMPLETED",
    ).length;
    const progress = totalLessons === 0
      ? 0
      : Math.round(
          progressEntries.reduce(
            (sum, item) => sum + (item?.completionPercent ?? 0),
            0,
          ) / totalLessons,
        );
    const nextLesson = lessons.find((lesson) => lessonProgressById.get(lesson.id)?.status !== "COMPLETED");
    const lessonAccuracy = progressEntries.reduce(
      (summary, item) => ({
        correctAnswers: summary.correctAnswers + (item?.attemptAccuracy.correctAnswers ?? 0),
        incorrectAnswers: summary.incorrectAnswers + (item?.attemptAccuracy.incorrectAnswers ?? 0),
      }),
      { correctAnswers: 0, incorrectAnswers: 0 },
    );
    const hasModuleEntitlement = course.modules.some(
      (module) => module.entitlements.length > 0,
    );
    const libraryEntry = course.studentCourses[0];
    const librarySource = libraryEntry?.sourceType;
    const source = course.instructorId === userId
      ? "TEACHER_CREATED"
      : librarySource === "GROUP_ASSIGNED"
        ? "GROUP_ASSIGNED"
        : librarySource === "TEACHER_ASSIGNED"
          ? "TEACHER_ASSIGNED"
          : librarySource
            ? "SELF_ADDED"
      : course.coursePurchases.length || course.entitlements.length || hasModuleEntitlement
        ? "PURCHASED"
        : course.students.length
          ? "ENROLLED"
          : progressEntries.some(Boolean)
            ? "IN_PROGRESS"
            : "SUBSCRIPTION";

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.shortDescription,
      level: course.level.code,
      category: course.category.title,
      accessPlan: course.accessPlan,
      progress,
      completedLessons,
      totalLessons,
      lessonExperience: rewardPreview.lesson.experience,
      lessonAccuracy,
      source,
      canRemove: Boolean(libraryEntry),
      nextLesson: nextLesson
        ? { slug: nextLesson.slug, title: nextLesson.title }
        : null,
    };
  });
}
