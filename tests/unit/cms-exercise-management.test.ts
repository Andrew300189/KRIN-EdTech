import { validateExerciseConfiguration } from "@/modules/cms/exercise-engines/configuration";
import { cmsExerciseBulkUpdateSchema } from "@/modules/cms/schemas/content-management.schemas";
import { validateExerciseOrder } from "@/modules/cms/services/exercise-operations.service";
import { createExerciseSchema, updateExerciseSchema } from "@/modules/courses/schemas/content.schemas";

describe("CMS exercise management", () => {
  const first = "clx9q1y5j0000q2v4gl4p4x2a";
  const second = "clx9q1y5j0001q2v4gl4p4x2a";

  it("keeps hints enabled by default and accepts clearing an existing time limit", () => {
    const exercise = createExerciseSchema.parse({
      type: "SINGLE_CHOICE",
      engineKey: "choice",
      instruction: "Choose one answer.",
      question: "What is 2 + 2?",
      content: { options: ["3", "4"] },
      correctAnswer: "4",
    });

    expect(exercise.hintsEnabled).toBe(true);
    expect(updateExerciseSchema.parse({ timeLimitSeconds: null }).timeLimitSeconds).toBeNull();
  });

  it("validates universal engine requirements before publishing", () => {
    expect(validateExerciseConfiguration({
      type: "SINGLE_CHOICE",
      engineKey: "choice",
      instruction: "Choose.",
      question: "Question",
      content: { options: ["Only one"] },
      correctAnswer: "Only one",
    })).toContain("Choice exercises need at least two options in content.options.");

    expect(validateExerciseConfiguration({
      type: "SINGLE_CHOICE",
      engineKey: "choice",
      instruction: "Choose.",
      question: "Question",
      content: { options: ["No", "Yes"] },
      correctAnswer: "Yes",
    })).toEqual([]);

    expect(validateExerciseConfiguration({
      type: "SINGLE_CHOICE",
      engineKey: "single-choice",
      variantKey: "UNREGISTERED_SUBTYPE",
      instruction: "Choose.",
      question: "Question",
      content: { options: ["No", "Yes"] },
      correctAnswer: "Yes",
    })).toContain("Choose a methodical subtype supported by the selected engine.");
  });

  it("does not allow an exercise to be reordered outside its current block", () => {
    const exercises = [{ id: first, order: 1 }, { id: second, order: 2 }];
    expect(() => validateExerciseOrder(exercises, [second, first])).not.toThrow();
    expect(() => validateExerciseOrder(exercises, [first])).toThrow("every exercise");
    expect(() => validateExerciseOrder(exercises, [first, first])).toThrow("every exercise");
  });

  it("requires one actual bulk edit rather than accepting an empty operation", () => {
    expect(cmsExerciseBulkUpdateSchema.safeParse({ exerciseIds: [first] }).success).toBe(false);
    expect(cmsExerciseBulkUpdateSchema.safeParse({ exerciseIds: [first], basePoints: 20 }).success).toBe(true);
    expect(cmsExerciseBulkUpdateSchema.safeParse({ exerciseIds: [first], hintsEnabled: false }).success).toBe(true);
  });
});
