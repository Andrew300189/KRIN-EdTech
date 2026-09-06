import { getAuthoredExerciseTranslation, getExerciseTranslationTarget } from "@/modules/courses/utils/exercise-translation-source";

describe("exercise translation source", () => {
  it("translates the visible subject in a compact to be matching card", () => {
    const content = {
      left: ["the students"],
      right: ["am", "is", "are"],
      source: "В левой колонке — лицо или подлежащее. Справа — правильная форма to be.",
      translation: "Перевод:В левой колонке — лицо или подлежащее. Справа — правильная форма to be.",
    };

    const target = getExerciseTranslationTarget({
      question: "Впишите правильную форму: am, is или are.",
      content,
    });

    expect(target).toEqual({ source: "the students", canUseAuthoredTranslation: false });
    expect(getAuthoredExerciseTranslation(content, target)).toBeNull();
  });

  it("uses the learner-visible question and ignores legacy CMS translation fields", () => {
    const content = {
      authoringSource: "A hidden author note",
      translation: "A writer note that must not be shown to a learner.",
      learnerTranslation: "Я люблю кофе.",
    };
    const target = getExerciseTranslationTarget({ question: "I like coffee.", content });

    expect(target).toEqual({ source: "I like coffee.", canUseAuthoredTranslation: true });
    expect(getAuthoredExerciseTranslation(content, target)).toBe("Я люблю кофе.");
  });

  it("never renders a generic legacy translation as a learner answer", () => {
    const content = { translation: "A CMS instruction, not a prompt translation." };
    const target = getExerciseTranslationTarget({ question: "They are ready.", content });

    expect(getAuthoredExerciseTranslation(content, target)).toBeNull();
  });
});
