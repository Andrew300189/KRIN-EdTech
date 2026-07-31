import { answerMatches } from "@/modules/courses/utils/exercise-evaluation";
import { createCourseSchema, createExerciseSchema, saveLessonProgressSchema } from "@/modules/courses/schemas/content.schemas";

describe("exercise evaluation", () => {
  it("checks a single-choice answer on the server-compatible representation", () => {
    expect(answerMatches("present simple", "Present Simple", [], {})).toBe(true);
    expect(answerMatches("past simple", "Present Simple", [], {})).toBe(false);
  });

  it("checks multiple-choice answers without relying on their order", () => {
    expect(answerMatches(["has", "have"], ["have", "has"], [], {})).toBe(true);
    expect(answerMatches(["has"], ["have", "has"], [], {})).toBe(false);
  });

  it("supports configured alternatives and punctuation normalization", () => {
    expect(answerMatches("I've got a pen!", "Ive got a pen", ["I have got a pen"], { ignorePunctuation: true })).toBe(true);
  });

  it("uses acceptedAnswers and configured whitespace rules from CMS content", () => {
    expect(answerMatches("I am", "I'm", [], { acceptedAnswers: ["I am"], ignoreExtraSpaces: true })).toBe(true);
    expect(answerMatches("two  words", "two words", [], { ignoreExtraSpaces: false })).toBe(false);
  });

  it("checks matching pairs independent of property order", () => {
    expect(answerMatches({ go: "went", eat: "ate" }, { eat: "ate", go: "went" }, [], {})).toBe(true);
  });
});

describe("learning payload validation", () => {
  it("requires CEFR-specific course creation data", () => {
    expect(createCourseSchema.safeParse({ levelCode: "A1", title: "A1 grammar", shortDescription: "A safe, level-specific course." }).success).toBe(true);
    expect(createCourseSchema.safeParse({ levelCode: "Z9", title: "Bad", shortDescription: "A safe, level-specific course." }).success).toBe(false);
  });

  it("accepts the first five exercise types and rejects unknown types", () => {
    const base = { instruction: "Choose", question: "Pick one", correctAnswer: "a" };
    expect(createExerciseSchema.safeParse({ ...base, type: "SINGLE_CHOICE" }).success).toBe(true);
    expect(createExerciseSchema.safeParse({ ...base, type: "MATCHING" }).success).toBe(true);
    expect(createExerciseSchema.safeParse({ ...base, type: "UNSAFE_CLIENT_CHECK" }).success).toBe(false);
  });

  it("does not accept arbitrary progress block identifiers", () => {
    expect(saveLessonProgressSchema.safeParse({ completedBlockIds: ["not-a-cuid"] }).success).toBe(false);
  });
});
