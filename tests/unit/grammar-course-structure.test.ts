import { validateGrammarCourseStructure } from "@/modules/cms/validation/grammar-course-structure";

const skill = [{ grammarSkillId: "skill-1" }];

function exercise(index: number) {
  return { id: `exercise-${index}`, correctAnswer: "does", explanation: "Use does with he, she and it.", grammarSkills: skill };
}

function validModule() {
  return {
    id: "module-1",
    minimumFinalLessonScore: 75,
    lessons: Array.from({ length: 10 }, (_, index) => ({
      id: `lesson-${index + 1}`,
      curriculumRole: index === 0 ? "OVERVIEW" : index === 9 ? "FINAL" : "DEEP_DIVE",
      minimumCompletionScore: index === 9 ? 75 : 60,
      grammarSkills: skill,
      blocks: index === 0 ? [
        { id: "theory-1", type: "THEORY", title: "Do and does", content: { text: "Use do with I, you, we and they; use does with he, she and it." }, learningFragmentKey: "do-does", isLearningFragment: true, grammarSkills: skill },
        { id: "practice-1", type: "EXERCISE", learningFragmentKey: "do-does", requiresTwelveExercises: true, exercises: Array.from({ length: 12 }, (_, exerciseIndex) => exercise(exerciseIndex + 1)) },
      ] : [],
    })),
  };
}

describe("grammar course structure validation", () => {
  it("accepts a complete opt-in grammar module", () => {
    expect(validateGrammarCourseStructure({ modules: [validModule()] })).toEqual([]);
  });

  it("keeps legacy STANDARD lessons outside the new contract", () => {
    expect(validateGrammarCourseStructure({ modules: [{ id: "legacy", lessons: [{ id: "lesson", curriculumRole: "STANDARD" }] }] })).toEqual([]);
  });

  it("reports every publication blocker for an incomplete practice fragment", () => {
    const module = validModule();
    module.minimumFinalLessonScore = 60;
    module.lessons[0].blocks[0].content = {};
    module.lessons[0].blocks[1].exercises = [exercise(1)];
    module.lessons[0].blocks[1].exercises[0].explanation = "";

    const codes = validateGrammarCourseStructure({ modules: [module] }).map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining([
      "GRAMMAR_MODULE_FINAL_SCORE",
      "GRAMMAR_FRAGMENT_EXPLANATION",
      "GRAMMAR_TWELVE_EXERCISES",
      "GRAMMAR_EXERCISE_EXPLANATION",
    ]));
  });
});
