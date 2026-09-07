export type LessonProgressStatus = "STARTED" | "COMPLETED";

type LessonProgressSnapshot = {
  status: LessonProgressStatus;
  completionPercent: number;
};

/**
 * Completion percentage is the learner-facing source of truth for unlocking.
 * A few historical records reached 100% before an older client wrote the
 * terminal status. Treat those records as finished everywhere, so a learner
 * can never be locked behind a lesson they have already completed.
 */
export function isLessonProgressComplete(progress: LessonProgressSnapshot | null | undefined) {
  return progress?.status === "COMPLETED" || (progress?.completionPercent ?? 0) >= 100;
}

/** A prerequisite can deliberately open before 100% when CMS sets a lower threshold. */
export function hasReachedLessonCompletion(progress: LessonProgressSnapshot | null | undefined, requiredPercent: number) {
  return Boolean(progress) && (isLessonProgressComplete(progress) || progress.completionPercent >= requiredPercent);
}

/**
 * Finishing a lesson is a historical milestone, not a temporary view state.
 * A later practice visit can update attempts and the current step, but it
 * must not erase the learner's completed status.
 */
export function resolveLessonProgressStatus(
  previousStatus: LessonProgressStatus | null | undefined,
  requestIsComplete: boolean,
  allRequiredBlocksComplete: boolean,
): LessonProgressStatus {
  if (previousStatus === "COMPLETED") return "COMPLETED";
  return requestIsComplete && allRequiredBlocksComplete ? "COMPLETED" : "STARTED";
}
