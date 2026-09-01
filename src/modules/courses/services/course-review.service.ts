import "server-only";

import { prisma } from "@/core/server/prisma";

export const COURSE_REVIEW_ACCESS_ERROR = "Course comments are available after you complete the full course with paid access.";

type ReviewAccess = {
  courseId: string | null;
  courseTitle: string | null;
  eligible: boolean;
  existingRating: number | null;
  existingComment: string | null;
  updatedAt: Date | null;
};

/**
 * This deliberately derives completion from the immutable lesson-progress
 * records instead of trusting any status sent by the browser. A complete
 * course means every published lesson in every published module is complete.
 */
async function resolveReviewAccess(userId: string, courseSlug: string): Promise<ReviewAccess> {
  const course = await prisma.course.findFirst({
    where: { slug: courseSlug, isPublished: true, isTemplate: false },
    select: {
      id: true,
      title: true,
      modules: {
        where: { isPublished: true },
        select: { lessons: { where: { isPublished: true }, select: { id: true } } },
      },
    },
  });

  if (!course) {
    return { courseId: null, courseTitle: null, eligible: false, existingRating: null, existingComment: null, updatedAt: null };
  }

  const lessonIds = course.modules.flatMap((courseModule) => courseModule.lessons.map((lesson) => lesson.id));
  if (lessonIds.length === 0) {
    return { courseId: course.id, courseTitle: course.title, eligible: false, existingRating: null, existingComment: null, updatedAt: null };
  }

  const [completedLessons, directPurchase, paidPlan] = await Promise.all([
    prisma.lessonProgress.count({ where: { userId, lessonId: { in: lessonIds }, status: "COMPLETED" } }),
    prisma.coursePurchase.findFirst({
      where: { userId, courseId: course.id, status: "ACTIVE", order: { is: { status: "PAID" } } },
      select: { id: true },
    }),
    // A completed paid plan still proves the learner paid for access. A
    // revoked entitlement is excluded, e.g. when the underlying order was refunded.
    prisma.entitlement.findFirst({
      where: {
        userId,
        type: "SUBSCRIPTION",
        status: { in: ["ACTIVE", "EXPIRED"] },
        order: { is: { status: "PAID" } },
      },
      select: { id: true },
    }),
  ]);

  if (completedLessons !== lessonIds.length || (!directPurchase && !paidPlan)) {
    return { courseId: course.id, courseTitle: course.title, eligible: false, existingRating: null, existingComment: null, updatedAt: null };
  }

  const review = await prisma.courseReview.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
    select: { rating: true, comment: true, updatedAt: true },
  });
  return {
    courseId: course.id,
    courseTitle: course.title,
    eligible: true,
    existingRating: review?.rating ?? null,
    existingComment: review?.comment ?? null,
    updatedAt: review?.updatedAt ?? null,
  };
}

export async function getCourseReviewEligibility(userId: string, courseSlug: string) {
  const access = await resolveReviewAccess(userId, courseSlug);
  return {
    eligible: access.eligible,
    courseTitle: access.courseTitle,
    existingRating: access.existingRating,
    existingComment: access.existingComment,
    updatedAt: access.updatedAt,
  };
}

export async function saveCourseReview(userId: string, courseSlug: string, input: { comment: string; rating: number }) {
  // Re-check at write time. It prevents a stale eligible response, modified
  // client state, or direct API call from bypassing completion/payment rules.
  const access = await resolveReviewAccess(userId, courseSlug);
  if (!access.eligible || !access.courseId) throw new Error(COURSE_REVIEW_ACCESS_ERROR);

  return prisma.courseReview.upsert({
    where: { userId_courseId: { userId, courseId: access.courseId } },
    create: { userId, courseId: access.courseId, comment: input.comment, rating: input.rating },
    update: { comment: input.comment, rating: input.rating },
    select: { rating: true, comment: true, updatedAt: true },
  });
}

function publicReviewerName(name: string | null) {
  const firstName = name?.trim().split(/\s+/u)[0];
  return firstName || "Verified learner";
}

/** Safe public projection: never expose reviewer ids, emails or payment data. */
export async function listPublicCourseReviews(courseSlug: string) {
  const where = { course: { is: { slug: courseSlug, isPublished: true, isTemplate: false } } };
  const [reviews, summary] = await Promise.all([
    prisma.courseReview.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        rating: true,
        comment: true,
        updatedAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.courseReview.aggregate({ where, _avg: { rating: true }, _count: { _all: true } }),
  ]);

  return {
    averageRating: summary._avg.rating ? Math.round(summary._avg.rating * 10) / 10 : null,
    total: summary._count._all,
    reviews: reviews.map((review) => ({
      rating: review.rating,
      comment: review.comment,
      updatedAt: review.updatedAt,
      reviewerName: publicReviewerName(review.user.name),
    })),
  };
}
