const {
  buildPlan,
  validatePlan,
  makeScenario,
} = require("../../database/scripts/import-past-continuous-full-mastery.cjs");

describe("Past Continuous full-mastery course plan", () => {
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

  it("teaches the required be form, -ing form, and Past Simple contrast", () => {
    expect(makeScenario("past-continuous-formula", 1)).toMatchObject({
      correct: expect.stringContaining(" was "),
      incorrect: expect.not.stringContaining(" was "),
    });
    expect(makeScenario("past-continuous-ing", 2).incorrect).toContain(" was ");
    expect(makeScenario("past-continuous-vs-simple", 3)).toMatchObject({
      correct: "I was reading when the phone rang.",
    });
  });
});
