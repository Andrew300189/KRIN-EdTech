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
