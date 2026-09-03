/** Shared, serialisable marker for the automatic retrieval-practice block. */
export const SPACED_REVIEW_SYSTEM = "SPACED_REVIEW";
export const SPACED_REVIEW_QUESTION_COUNT = 10;
export const SPACED_REVIEW_XP = 1.5;

export function isSpacedReviewSettings(value: unknown) {
  return Boolean(
    value
      && typeof value === "object"
      && !Array.isArray(value)
      && (value as Record<string, unknown>).system === SPACED_REVIEW_SYSTEM,
  );
}
