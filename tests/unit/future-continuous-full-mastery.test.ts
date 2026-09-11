const {
  buildPlan,
  validatePlan,
  makeScenario,
} = require("../../database/scripts/import-future-continuous-full-mastery.cjs");

describe("Future Continuous full-mastery course plan", () => {
  it("builds the promised four-module, forty-lesson curriculum", () => {
    expect(validatePlan(buildPlan())).toEqual({
      modules: 4,
      lessons: 40,
      blocks: 1000,
      exercises: 5280,
      skills: 31,
    });
  });

  it("links twelve explained exercises to every learning fragment", () => {
    const plan = buildPlan();
    for (const lesson of plan.modules.flatMap((modulePlan: { lessons: unknown[] }) => modulePlan.lessons) as Array<{
      blocks: Array<{ isLearningFragment?: boolean; requiresTwelveExercises?: boolean; exercises?: Array<{ explanation?: string; skillSlug?: string }> }>;
    }>) {
      expect(lesson.blocks.filter((block) => block.isLearningFragment)).toHaveLength(10);
      expect(new Set(lesson.blocks.map((block) => block.order)).size).toBe(lesson.blocks.length);
      for (const practice of lesson.blocks.filter((block) => block.requiresTwelveExercises)) {
        expect(practice.exercises).toHaveLength(12);
        expect(practice.exercises?.every((exercise) => Boolean(exercise.explanation?.trim()) && Boolean(exercise.skillSlug))).toBe(true);
      }
    }
  });

  it("checks the required be form, V-ing, and time-clause rule", () => {
    expect(makeScenario("future-continuous-be", 1)).toMatchObject({
      correct: expect.stringContaining("will be"),
      incorrect: expect.stringContaining("will is"),
    });
    expect(makeScenario("future-continuous-ing", 2).incorrect).toContain("will be");
    expect(makeScenario("future-continuous-time-clause", 3)).toMatchObject({
      correct: "I’ll be working when you arrive.",
    });
  });
});
