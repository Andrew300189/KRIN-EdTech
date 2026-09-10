const { buildPlan, validatePlan } = require("../../database/scripts/import-present-simple-full-mastery.cjs");

describe("Present Simple full-mastery course plan", () => {
  it("builds the promised four-module, forty-lesson course", () => {
    expect(validatePlan(buildPlan())).toEqual({
      modules: 4,
      lessons: 40,
      blocks: 240,
      exercises: 960,
      skills: 12,
    });
  });

  it("gives every teachable fragment exactly twelve linked activities", () => {
    const plan = buildPlan();
    for (const lesson of plan.modules.flatMap((modulePlan: { lessons: unknown[] }) => modulePlan.lessons) as Array<{ blocks: Array<{ isLearningFragment?: boolean; requiresTwelveExercises?: boolean; exercises?: unknown[] }> }>) {
      expect(lesson.blocks.filter((block) => block.isLearningFragment)).toHaveLength(2);
      for (const practice of lesson.blocks.filter((block) => block.requiresTwelveExercises)) {
        expect(practice.exercises).toHaveLength(12);
      }
    }
  });
});
