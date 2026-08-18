import { GRAMMAR_TYPICAL_LESSON_TEMPLATE } from "@/modules/cms/data/grammar-typical-lesson-template";
import { validateExerciseConfiguration } from "@/modules/cms/exercise-engines/configuration";
import { answerMatches } from "@/modules/courses/utils/exercise-evaluation";

describe("Grammar Typical Lesson blueprint", () => {
  it("contains theory and seven valid exercises with hints and feedback", () => {
    expect(GRAMMAR_TYPICAL_LESSON_TEMPLATE.theory.content.text).toContain("Present Simple");
    expect(GRAMMAR_TYPICAL_LESSON_TEMPLATE.exercises).toHaveLength(7);
    expect(new Set(GRAMMAR_TYPICAL_LESSON_TEMPLATE.exercises.map((exercise) => exercise.engineKey)).size).toBe(7);

    for (const exercise of GRAMMAR_TYPICAL_LESSON_TEMPLATE.exercises) {
      expect(exercise.hint).not.toHaveLength(0);
      expect(exercise.explanation).not.toHaveLength(0);
      expect(validateExerciseConfiguration(exercise)).toEqual([]);
    }
  });

  it("keeps sentence-builder answers order-sensitive", () => {
    const exercise = GRAMMAR_TYPICAL_LESSON_TEMPLATE.exercises.find((item) => item.engineKey === "sentence-builder");
    expect(exercise).toBeDefined();
    if (!exercise) return;
    expect(answerMatches(exercise.correctAnswer, exercise.correctAnswer, [], exercise.content)).toBe(true);
    expect(answerMatches(["does", "He", "usually", "homework", "after", "school"], exercise.correctAnswer, [], exercise.content)).toBe(false);
  });
});
