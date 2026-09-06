import { CONFETTI_DIFFICULTY_THRESHOLD, shouldBurstLessonConfetti } from "@/modules/lessons/utils/lesson-celebration";

describe("lesson celebration rules", () => {
  it("celebrates a correct complex question", () => {
    expect(shouldBurstLessonConfetti({ isCorrect: true, difficulty: CONFETTI_DIFFICULTY_THRESHOLD })).toBe(true);
  });

  it("does not celebrate an incorrect or routine question", () => {
    expect(shouldBurstLessonConfetti({ isCorrect: false, difficulty: 10 })).toBe(false);
    expect(shouldBurstLessonConfetti({ isCorrect: true, difficulty: CONFETTI_DIFFICULTY_THRESHOLD - 1 })).toBe(false);
  });

  it("always celebrates successful lesson completion", () => {
    expect(shouldBurstLessonConfetti({ isLessonComplete: true })).toBe(true);
  });
});
