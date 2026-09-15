import { buildVocabularyMasteryStages, vocabularyMasteryStageCount, vocabularyMasteryTranslation } from "@/modules/vocabulary/utils/course-vocabulary-mastery";

const words = Array.from({ length: 12 }, (_, index) => `word-${index + 1}`);

describe("course vocabulary mastery plan", () => {
  it("uses 3 pronunciation successes, then rotates the four words through translation recall", () => {
    const stages = buildVocabularyMasteryStages(words, words);

    expect(stages.slice(0, 3)).toEqual([
      expect.objectContaining({ direction: "SPEAK", requiredConsecutive: 3, wordIds: ["word-1"] }),
      expect.objectContaining({ direction: "EN_RU", requiredConsecutive: 5, promptCount: 1, wordIds: ["word-1", "word-2", "word-3", "word-4"], rotatePrompt: true }),
      expect.objectContaining({ direction: "RU_EN", requiredConsecutive: 5, promptCount: 1, wordIds: ["word-1", "word-2", "word-3", "word-4"], rotatePrompt: true }),
    ]);
  });

  it("consolidates each four-word block, the first eight and the full lesson", () => {
    const stages = buildVocabularyMasteryStages(words, words);

    expect(stages).toHaveLength(58);
    expect(stages).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "group-1-2-en-ru", wordIds: words.slice(0, 4), promptCount: 2, rotatePrompt: true }),
      expect.objectContaining({ key: "group-1-3-ru-en", wordIds: words.slice(0, 4), promptCount: 3, rotatePrompt: true }),
      expect.objectContaining({ key: "first-eight-en-ru", wordIds: words.slice(0, 8), promptCount: 4, rotatePrompt: true }),
      expect.objectContaining({ key: "lesson-block-ru-en", wordIds: words, promptCount: 4, rotatePrompt: true }),
    ]));
  });

  it("adds a saved four-word sample from the cumulative pool after later lessons", () => {
    const cumulative = Array.from({ length: 24 }, (_, index) => `word-${index + 1}`);
    const stages = buildVocabularyMasteryStages(words, cumulative);
    const cumulativeStage = stages.find((stage) => stage.key === "cumulative-24-en-ru");

    expect(cumulativeStage).toEqual(expect.objectContaining({ promptCount: 4, requiredConsecutive: 5, wordIds: cumulative }));
    expect(vocabularyMasteryStageCount(4, 4)).toBe(20);
  });

  it("uses the authored target language instead of a personal dictionary translation", () => {
    const settings = {
      engine: "vocabulary-mastery",
      localizedTranslations: {
        ru: { "dental clinic": "стоматологическая клиника" },
        uk: { "dental clinic": "стоматологічна клініка" },
      },
    };

    expect(vocabularyMasteryTranslation(settings, "Dental   Clinic", "ru", "fallback")).toBe("стоматологическая клиника");
    expect(vocabularyMasteryTranslation(settings, "dental clinic", "uk", "fallback")).toBe("стоматологічна клініка");
  });
});
