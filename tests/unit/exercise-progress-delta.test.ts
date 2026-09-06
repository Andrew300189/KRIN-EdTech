import { calculateExerciseProgressDelta } from "@/modules/courses/utils/exercise-progress-delta";

describe("exercise progress delta", () => {
  it("credits the first correct response without reading lesson history", () => {
    expect(calculateExerciseProgressDelta({
      previousAttempt: null,
      isCorrect: true,
      scoreAwarded: 8,
      hintUsed: false,
      solutionOpened: false,
    })).toEqual({ score: 8, correctAnswers: 1, incorrectAnswers: 0, hintsUsed: 0, solutionsOpened: 0 });
  });

  it("replaces an incorrect latest answer with a correct one", () => {
    expect(calculateExerciseProgressDelta({
      previousAttempt: { isCorrect: false },
      isCorrect: true,
      scoreAwarded: 4,
      hintUsed: true,
      solutionOpened: false,
    })).toEqual({ score: 4, correctAnswers: 1, incorrectAnswers: -1, hintsUsed: 1, solutionsOpened: 0 });
  });

  it("does not double-count repeated answers with the same outcome", () => {
    expect(calculateExerciseProgressDelta({
      previousAttempt: { isCorrect: false },
      isCorrect: false,
      scoreAwarded: -5,
      hintUsed: false,
      solutionOpened: true,
    })).toEqual({ score: -5, correctAnswers: 0, incorrectAnswers: 0, hintsUsed: 0, solutionsOpened: 1 });
  });
});
