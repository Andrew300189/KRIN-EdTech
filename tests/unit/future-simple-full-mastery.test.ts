const {
  buildPlan,
  validatePlan,
  makeScenario,
} = require("../../database/scripts/import-future-simple-full-mastery.cjs");

describe("Future Simple full-mastery course plan", () => {
  it("builds the promised four-module, forty-lesson curriculum", () => {
    expect(validatePlan(buildPlan())).toEqual({
      modules: 4,
      lessons: 40,
      blocks: 1000,
      exercises: 5280,
      skills: 32,
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

  it("teaches base verbs, questions, clauses, and future-form choice", () => {
    expect(makeScenario("future-simple-base-verb", 1)).toMatchObject({
      correct: expect.stringContaining(" will "),
      incorrect: expect.stringContaining("will "),
    });
    expect(makeScenario("future-simple-negative-base", 2)).toMatchObject({
      correct: expect.stringContaining("won’t"),
      incorrect: expect.stringContaining("won’t"),
    });
    expect(makeScenario("future-simple-general-question", 3).correct).toMatch(/^Will /);
    expect(makeScenario("future-simple-time-clause", 4)).toMatchObject({
      correct: "I will call you when I arrive.",
      incorrect: "I will call you when I will arrive.",
    });
    expect(makeScenario("future-simple-if-clause", 5)).toMatchObject({
      correct: "We will go out if the weather is good.",
      incorrect: "We will go out if the weather will be good.",
    });
    expect(makeScenario("future-simple-vs-going-to", 6).correct).toBe("The phone is ringing. I’ll answer it.");
  });

  it("provides an explained, answerable scenario for every measurable skill", () => {
    const plan = buildPlan();
    for (const skill of plan.skills) {
      const scenario = makeScenario(skill.slug, skill.order);
      expect(scenario.correct).toEqual(expect.any(String));
      expect(scenario.incorrect).toEqual(expect.any(String));
      expect(scenario.answer).toEqual(expect.any(String));
      expect(scenario.rule).toEqual(expect.any(String));
      expect(scenario.formula).toEqual(expect.any(String));
      expect(scenario.translation).toEqual(expect.any(String));
    }
  });
});
