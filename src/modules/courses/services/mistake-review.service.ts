import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { recordMistakeReviewRunCompletion } from "@/modules/motivation/services/motivation.service";

type Tx = Prisma.TransactionClient;
type ReviewScope = "COURSE" | "ALL";

type ReviewLocation = {
  mistakeId: string;
  exerciseId: string;
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonOrder: number;
  moduleOrder: number;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  courseOrder: number;
};

function compareLocation(left: ReviewLocation, right: ReviewLocation) {
  return left.courseOrder - right.courseOrder
    || left.courseTitle.localeCompare(right.courseTitle)
    || left.moduleOrder - right.moduleOrder
    || left.lessonOrder - right.lessonOrder
    || left.lessonTitle.localeCompare(right.lessonTitle)
    || left.mistakeId.localeCompare(right.mistakeId);
}

function toLocation(item: {
  mistakeId: string;
  mistake: {
    exerciseId: string | null;
    lesson: {
      id: string;
      slug: string;
      title: string;
      order: number;
      module: { order: number; course: { id: string; slug: string; title: string; order: number } };
    } | null;
  };
}): ReviewLocation | null {
  const lesson = item.mistake.lesson;
  if (!item.mistake.exerciseId || !lesson) return null;
  return {
    mistakeId: item.mistakeId,
    exerciseId: item.mistake.exerciseId,
    lessonId: lesson.id,
    lessonSlug: lesson.slug,
    lessonTitle: lesson.title,
    lessonOrder: lesson.order,
    moduleOrder: lesson.module.order,
    courseId: lesson.module.course.id,
    courseSlug: lesson.module.course.slug,
    courseTitle: lesson.module.course.title,
    courseOrder: lesson.module.course.order,
  };
}

function reviewUrl(runId: string, location: ReviewLocation) {
  return `/courses/${encodeURIComponent(location.courseSlug)}/lessons/${encodeURIComponent(location.lessonSlug)}?reviewRun=${encodeURIComponent(runId)}&reviewExercise=${encodeURIComponent(location.exerciseId)}`;
}

function firstPerLesson(locations: ReviewLocation[]) {
  const seen = new Set<string>();
  return locations.filter((location) => {
    if (seen.has(location.lessonId)) return false;
    seen.add(location.lessonId);
    return true;
  });
}

async function activeLocations(tx: Tx, userId: string, scope: ReviewScope, courseSlug?: string) {
  const items = await tx.userMistake.findMany({
    where: {
      userId,
      resolvedAt: null,
      exerciseId: { not: null },
      lesson: courseSlug ? { module: { course: { slug: courseSlug } } } : { isPublished: true, module: { course: { isPublished: true } } },
    },
    select: {
      id: true,
      exerciseId: true,
      lesson: {
        select: {
          id: true, slug: true, title: true, order: true,
          module: { select: { order: true, course: { select: { id: true, slug: true, title: true, order: true } } } },
        },
      },
    },
  });
  return items.map((mistake) => toLocation({ mistakeId: mistake.id, mistake })).filter((location): location is ReviewLocation => Boolean(location)).sort(compareLocation);
}

export async function startMistakeReviewRun(userId: string, input: {
  scope: ReviewScope;
  courseSlug?: string;
  startMistakeId?: string;
  afterLessonSlug?: string;
}) {
  if (input.scope === "COURSE" && !input.courseSlug) throw new Error("A course is required for this review.");

  return prisma.$transaction(async (tx) => {
    const locations = await activeLocations(tx, userId, input.scope, input.scope === "COURSE" ? input.courseSlug : undefined);
    if (!locations.length) return null;

    if (input.startMistakeId && !locations.some((location) => location.mistakeId === input.startMistakeId)) {
      throw new Error("That mistake is no longer available for review.");
    }

    // Only one active queue may drive a learner at a time. The underlying
    // mistakes remain untouched, so cancelling a queue never loses work.
    await tx.mistakeReviewRun.updateMany({ where: { userId, status: "ACTIVE" }, data: { status: "CANCELED" } });

    const courseId = input.scope === "COURSE" ? locations[0]?.courseId : null;
    const run = await tx.mistakeReviewRun.create({
      data: {
        userId,
        courseId,
        scope: input.scope,
        initialMistakeCount: locations.length,
        startedFromLessonId: input.startMistakeId
          ? locations.find((location) => location.mistakeId === input.startMistakeId)?.lessonId
          : null,
        items: { create: locations.map((location) => ({ mistakeId: location.mistakeId })) },
      },
      select: { id: true },
    });

    let initial = locations[0];
    if (input.startMistakeId) initial = locations.find((location) => location.mistakeId === input.startMistakeId) ?? initial;
    else if (input.afterLessonSlug) {
      const afterIndex = locations.findIndex((location) => location.lessonSlug === input.afterLessonSlug);
      if (afterIndex >= 0) initial = locations.slice(afterIndex + 1).find((location) => location.lessonId !== locations[afterIndex].lessonId) ?? locations[0];
    }

    return {
      id: run.id,
      initialMistakeCount: locations.length,
      nextUrl: reviewUrl(run.id, initial),
      nextLessonTitle: initial.lessonTitle,
      nextCourseTitle: initial.courseTitle,
    };
  });
}

export async function getMistakeReviewLesson(userId: string, runId: string, courseSlug: string, lessonSlug: string) {
  const run = await prisma.mistakeReviewRun.findFirst({
    where: { id: runId, userId, status: "ACTIVE" },
    select: {
      id: true,
      initialMistakeCount: true,
      items: {
        where: { mistake: { resolvedAt: null, lesson: { slug: lessonSlug, module: { course: { slug: courseSlug } } } } },
        select: { mistakeId: true, mistake: { select: { exerciseId: true, lessonId: true } } },
      },
    },
  });
  if (!run) return null;
  const items = run.items.filter((item): item is typeof item & { mistake: { exerciseId: string; lessonId: string } } => Boolean(item.mistake.exerciseId && item.mistake.lessonId));
  if (!items.length) return null;
  return {
    runId: run.id,
    initialMistakeCount: run.initialMistakeCount,
    exerciseIds: [...new Set(items.map((item) => item.mistake.exerciseId))],
    mistakeIds: items.map((item) => item.mistakeId),
  };
}

export async function advanceMistakeReviewRun(userId: string, runId: string, lessonId: string) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.mistakeReviewRun.findFirst({
      where: { id: runId, userId, status: "ACTIVE" },
      select: { id: true, initialMistakeCount: true },
    });
    if (!run) return { state: "NOT_FOUND" as const };

    const unresolvedItems = await tx.mistakeReviewRunItem.findMany({
      where: { runId, mistake: { resolvedAt: null } },
      select: {
        mistakeId: true,
        mistake: {
          select: {
            exerciseId: true,
            lesson: {
              select: {
                id: true, slug: true, title: true, order: true,
                module: { select: { order: true, course: { select: { id: true, slug: true, title: true, order: true } } } },
              },
            },
          },
        },
      },
    });
    const unresolved = unresolvedItems.map((item) => toLocation(item)).filter((location): location is ReviewLocation => Boolean(location)).sort(compareLocation);
    const currentRemaining = unresolved.filter((location) => location.lessonId === lessonId);
    if (currentRemaining.length) return { state: "CURRENT_INCOMPLETE" as const, remaining: currentRemaining.length };

    // Timestamp every queue item that has genuinely been corrected. It is
    // informational, while UserMistake.resolvedAt remains the source of truth.
    await tx.mistakeReviewRunItem.updateMany({
      where: { runId, resolvedAt: null, mistake: { resolvedAt: { not: null } } },
      data: { resolvedAt: new Date() },
    });

    if (unresolved.length) {
      const current = await tx.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, slug: true, title: true, order: true, module: { select: { order: true, course: { select: { id: true, slug: true, title: true, order: true } } } } },
      });
      const currentLocation = current ? toLocation({ mistakeId: "current", mistake: { exerciseId: "current", lesson: current } }) : null;
      const next = currentLocation ? unresolved.find((location) => compareLocation(location, currentLocation) > 0) : unresolved[0];
      const target = next ?? unresolved[0];
      return {
        state: next ? "NEXT" as const : "WRAP" as const,
        nextUrl: reviewUrl(runId, target),
        nextLessonTitle: target.lessonTitle,
        nextCourseTitle: target.courseTitle,
        remainingLessons: firstPerLesson(unresolved).length,
      };
    }

    const completedBefore = await tx.mistakeReviewRun.count({ where: { userId, status: "COMPLETED" } });
    const completed = await tx.mistakeReviewRun.updateMany({
      where: { id: runId, userId, status: "ACTIVE" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (!completed.count) return { state: "NOT_FOUND" as const };
    const reward = await recordMistakeReviewRunCompletion(tx, { userId, runId, firstFocusedRun: completedBefore === 0 });
    await tx.mistakeReviewRun.update({ where: { id: runId }, data: { awardedExperience: reward.experience, awardedCoins: reward.coins } });
    return {
      state: "COMPLETE" as const,
      reward: { experience: reward.experience, coins: reward.coins, firstFocusedRun: completedBefore === 0, achievements: reward.achievements.map((item) => item.title) },
    };
  });
}
