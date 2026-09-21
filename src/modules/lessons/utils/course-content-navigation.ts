/**
 * Returns the course outline route for a lesson-player header action.
 *
 * Localized lesson routes pass `/uk/courses/.../lessons` (or `/ru/...`), while
 * older routes do not provide a prefix.  Keep the learner in the same locale
 * rather than silently sending them to the canonical English course page.
 */
export function courseContentHref(courseSlug: string, lessonHrefPrefix?: string) {
  const coursePath = lessonHrefPrefix
    ? lessonHrefPrefix.replace(/\/lessons\/?$/, "")
    : `/courses/${encodeURIComponent(courseSlug)}`;

  return `${coursePath}?content=open`;
}
