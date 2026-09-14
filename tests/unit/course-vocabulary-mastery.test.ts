import { buildVocabularyMasteryStages, vocabularyMasteryStageCount } from "@/modules/vocabulary/utils/course-vocabulary-mastery";

const words = Array.from({ length: 12 }, (_, index) => `word-${index + 1}`);

describe("course vocabulary mastery plan", () => {
  it("uses 3 pronunciation successes and 5 consecutive translations for a new word", () => {
    const stages = buildVocabularyMasteryStages(words, words);

    expect(stages.slice(0, 3)).toEqual([
      expect.objectContaining({ direction: "SPEAK", requiredConsecutive: 3, wordIds: ["word-1"] }),
      expect.objectContaining({ direction: "EN_RU", requiredConsecutive: 5, wordIds: ["word-1"] }),
      expect.objectContaining({ direction: "RU_EN", requiredConsecutive: 5, wordIds: ["word-1"] }),
    ]);
  });

  it("consolidates each four-word block, the first eight and the full lesson", () => {
    const stages = buildVocabularyMasteryStages(words, words);

    expect(stages).toHaveLength(58);
    expect(stages).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "group-1-2-en-ru", wordIds: ["word-1", "word-2"] }),
      expect.objectContaining({ key: "group-1-3-ru-en", wordIds: ["word-1", "word-2", "word-3"] }),
      expect.objectContaining({ key: "first-eight-en-ru", wordIds: words.slice(0, 8) }),
      expect.objectContaining({ key: "lesson-block-ru-en", wordIds: words }),
    ]));
  });

  it("adds a saved four-word sample from the cumulative pool after later lessons", () => {
    const cumulative = Array.from({ length: 24 }, (_, index) => `word-${index + 1}`);
    const stages = buildVocabularyMasteryStages(words, cumulative);
    const cumulativeStage = stages.find((stage) => stage.key === "cumulative-24-en-ru");

    expect(cumulativeStage).toEqual(expect.objectContaining({ promptCount: 4, requiredConsecutive: 5, wordIds: cumulative }));
    expect(vocabularyMasteryStageCount(4, 4)).toBe(20);
  });
});
