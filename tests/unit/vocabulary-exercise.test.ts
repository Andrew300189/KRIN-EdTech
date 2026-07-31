import { buildVocabularyExercise } from "@/modules/vocabulary/services/vocabulary.service";

describe("vocabulary exercise construction", () => {
  it("keeps answer data separate from the client-safe payload", () => {
    const exercise = buildVocabularyExercise(
      { lemma: "apple", meanings: [{ definition: "a fruit", translation: "яблоко" }] },
      [{ value: "яблоко" }, { value: "дом" }, { value: "вода" }, { value: "книга" }],
      [],
      0,
    );
    expect(exercise.payload).not.toHaveProperty("acceptedAnswers");
    expect(exercise.payload).not.toHaveProperty("display");
    expect(exercise.answerKey.acceptedAnswers).toContain("яблоко");
  });
});
