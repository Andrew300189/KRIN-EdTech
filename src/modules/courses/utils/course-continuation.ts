import { isLessonProgressComplete } from "@/modules/lessons/utils/lesson-progress-state";

type CourseLesson = { id: string };
type CourseLessonProgress = {
  lessonId: string;
  status: string;
  completionPercent: number;
  lastSeenAt?: Date;
};
type CourseLessonAccess = { allowed: boolean; reason?: string };

/**
 * Selects one deliberate course-resume target.
 *
 * A wheel gate belongs to the preceding, already completed lesson. Returning
 * that precise lesson lets the learner resolve the gate in one place instead
 * of falling back to lesson one and replaying an entire course.
 */
export function findCourseContinuationLesson<T extends CourseLesson>(
  lessons: readonly T[],
  accessByLessonId: ReadonlyMap<string, CourseLessonAccess>,
  progressByLessonId: ReadonlyMap<string, CourseLessonProgress>,
): T | null {
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const lastUnfinishedLesson = [...progressByLessonId.values()]
    .filter((progress) => !isLessonProgressComplete(progress) && lessonById.has(progress.lessonId))
    .sort((left, right) => (right.lastSeenAt?.getTime() ?? 0) - (left.lastSeenAt?.getTime() ?? 0))
    .map((progress) => lessonById.get(progress.lessonId)!)
    .find((lesson) => accessByLessonId.get(lesson.id)?.allowed);
  if (lastUnfinishedLesson) return lastUnfinishedLesson;

  const firstAvailableUnfinishedLesson = lessons.find((lesson) => (
    accessByLessonId.get(lesson.id)?.allowed
    && !isLessonProgressComplete(progressByLessonId.get(lesson.id))
  ));
  if (firstAvailableUnfinishedLesson) return firstAvailableUnfinishedLesson;

  const wheelGateIndex = lessons.findIndex((lesson) => accessByLessonId.get(lesson.id)?.reason === "WHEEL_REQUIRED");
  if (wheelGateIndex > 0) {
    const wheelSourceLesson = lessons[wheelGateIndex - 1];
    if (isLessonProgressComplete(progressByLessonId.get(wheelSourceLesson.id))) return wheelSourceLesson;
  }

  return null;
}
