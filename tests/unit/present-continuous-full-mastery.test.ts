const { buildPlan, validatePlan } = require("../../database/scripts/import-present-continuous-full-mastery.cjs");

describe("Present Continuous full-mastery course plan", () => {
  it("builds the promised four-module, forty-lesson course", () => {
    expect(validatePlan(buildPlan())).toEqual({
      modules: 4,
      lessons: 40,
      blocks: 1000,
      exercises: 5280,
      skills: 31,
    });
  });

  it("gives every teachable fragment twelve linked and explained activities", () => {
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
});
