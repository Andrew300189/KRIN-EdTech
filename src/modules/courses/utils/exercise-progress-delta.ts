export type PreviousExerciseAttemptState = {
  isCorrect: boolean;
} | null | undefined;

type ExerciseProgressDeltaInput = {
  previousAttempt: PreviousExerciseAttemptState;
  isCorrect: boolean;
  scoreAwarded: number;
  hintUsed: boolean;
  solutionOpened: boolean;
};

/**
 * Returns only the change introduced by one immutable exercise attempt.
 * It keeps the lesson-progress write O(1): an answer must never cause a
 * full historical scan of every attempt in the lesson.
 */
export function calculateExerciseProgressDelta({
  previousAttempt,
  isCorrect,
  scoreAwarded,
  hintUsed,
  solutionOpened,
}: ExerciseProgressDeltaInput) {
  const isFirstAttempt = previousAttempt == null;
  const changedCorrectness = previousAttempt?.isCorrect !== isCorrect;
  const correctAnswers = isFirstAttempt
    ? (isCorrect ? 1 : 0)
    : changedCorrectness
      ? (isCorrect ? 1 : -1)
      : 0;
  const incorrectAnswers = isFirstAttempt
    ? (isCorrect ? 0 : 1)
    : changedCorrectness
      ? (isCorrect ? -1 : 1)
      : 0;

  return {
    score: scoreAwarded,
    correctAnswers,
    incorrectAnswers,
    hintsUsed: hintUsed ? 1 : 0,
    solutionsOpened: solutionOpened ? 1 : 0,
  };
}
