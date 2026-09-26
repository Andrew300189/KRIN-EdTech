type LearnerCoursePathInput = {
  slug: string;
  nextLesson: { slug: string } | null;
};

/**
 * Keeps every learner-facing Continue action on the same route: the first
 * unfinished lesson when one exists, otherwise the published course overview.
 */
export function learnerCourseContinueHref(course: LearnerCoursePathInput) {
  const courseSlug = encodeURIComponent(course.slug);
  if (!course.nextLesson) return `/courses/${courseSlug}`;
  return `/courses/${courseSlug}/lessons/${encodeURIComponent(course.nextLesson.slug)}`;
}

/** Match the dashboard's Continue choice: prefer actual recent learning,
 * then a course with an unfinished lesson, then the first available course. */
export function learnerCourseToContinue<T extends LearnerCoursePathInput & { lastActivityAt: string | null }>(courses: readonly T[]) {
  return courses.find((course) => course.lastActivityAt)
    ?? courses.find((course) => course.nextLesson)
    ?? courses[0]
    ?? null;
}
