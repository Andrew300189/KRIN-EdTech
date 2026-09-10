const { buildPlan, validatePlan } = require("../../database/scripts/import-past-simple-full-mastery.cjs");

describe("Past Simple full-mastery course plan", () => {
  it("builds the promised four-module, forty-lesson course", () => {
    expect(validatePlan(buildPlan())).toEqual({
      modules: 4,
      lessons: 40,
      blocks: 1000,
      exercises: 5280,
      skills: 22,
    });
  });

  it("gives every one of ten teachable fragments twelve linked activities", () => {
    const plan = buildPlan();
    for (const lesson of plan.modules.flatMap((modulePlan: { lessons: unknown[] }) => modulePlan.lessons) as Array<{ blocks: Array<{ isLearningFragment?: boolean; requiresTwelveExercises?: boolean; exercises?: unknown[] }> }>) {
      expect(lesson.blocks.filter((block) => block.isLearningFragment)).toHaveLength(10);
      for (const practice of lesson.blocks.filter((block) => block.requiresTwelveExercises)) {
        expect(practice.exercises).toHaveLength(12);
      }
    }
  });
});
