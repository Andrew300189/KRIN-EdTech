export type LessonProgressStatus = "STARTED" | "COMPLETED";

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
