export type VocabularyMasteryDirection = "SPEAK" | "EN_RU" | "RU_EN";
export type VocabularyMasteryLocale = "ru" | "uk";

export type VocabularyMasteryStage = {
  key: string;
  direction: VocabularyMasteryDirection;
  /** All words eligible for this stage. Cumulative reviews draw a saved sample from this pool. */
  wordIds: string[];
  /** Number of words the learner sees at the same time. */
  promptCount: number;
  requiredConsecutive: number;
  title: string;
  kind: "WORD" | "BLOCK_REVIEW" | "CUMULATIVE_REVIEW";
};

type JsonRecord = Record<string, unknown>;

export type VocabularyMasterySettings = JsonRecord & {
  engine: "vocabulary-mastery";
  localizedTranslations?: Partial<Record<VocabularyMasteryLocale, Record<string, string>>>;
};

export function asVocabularyMasterySettings(value: unknown): VocabularyMasterySettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const settings = value as JsonRecord;
  return settings.engine === "vocabulary-mastery" ? settings as VocabularyMasterySettings : null;
}

function normalizedTranslationKey(value: string) {
  return value.toLocaleLowerCase("en").trim().replace(/\s+/g, " ");
}

/** A course can author target-language prompts independently of a learner's
 * personal dictionary language. */
export function vocabularyMasteryTranslation(
  settings: unknown,
  lemma: string,
  locale: VocabularyMasteryLocale,
  fallback: string,
) {
  const configured = asVocabularyMasterySettings(settings)?.localizedTranslations?.[locale];
  const value = configured?.[normalizedTranslationKey(lemma)];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function recallStages(key: string, title: string, wordIds: string[], kind: VocabularyMasteryStage["kind"]): VocabularyMasteryStage[] {
  return [
    { key: `${key}-en-ru`, direction: "EN_RU", wordIds, promptCount: wordIds.length, requiredConsecutive: 5, title: `${title}: English → Russian`, kind },
    { key: `${key}-ru-en`, direction: "RU_EN", wordIds, promptCount: wordIds.length, requiredConsecutive: 5, title: `${title}: Russian → English`, kind },
  ];
}

/**
 * Builds the strict learning path for one course vocabulary lesson. New words
 * are learned one by one; every set of four is consolidated in 2-, 3- and
 * 4-word recall. Later lessons add a compact sample from the growing course
 * pool, while the exact sampled words are persisted by the server.
 */
export function buildVocabularyMasteryStages(currentWordIds: string[], cumulativeWordIds: string[]): VocabularyMasteryStage[] {
  const stages: VocabularyMasteryStage[] = [];
  const groups = Array.from({ length: Math.ceil(currentWordIds.length / 4) }, (_, index) => currentWordIds.slice(index * 4, index * 4 + 4)).filter((group) => group.length > 0);

  groups.forEach((group, groupIndex) => {
    group.forEach((wordId, wordIndex) => {
      const ordinal = groupIndex * 4 + wordIndex + 1;
      stages.push(
        { key: `word-${ordinal}-speak`, direction: "SPEAK", wordIds: [wordId], promptCount: 1, requiredConsecutive: 3, title: `Word ${ordinal}: pronunciation`, kind: "WORD" },
        { key: `word-${ordinal}-en-ru`, direction: "EN_RU", wordIds: [wordId], promptCount: 1, requiredConsecutive: 5, title: `Word ${ordinal}: English → Russian`, kind: "WORD" },
        { key: `word-${ordinal}-ru-en`, direction: "RU_EN", wordIds: [wordId], promptCount: 1, requiredConsecutive: 5, title: `Word ${ordinal}: Russian → English`, kind: "WORD" },
      );
    });

    for (let size = 2; size <= group.length; size += 1) {
      stages.push(...recallStages(`group-${groupIndex + 1}-${size}`, `${size} words together`, group.slice(0, size), "BLOCK_REVIEW"));
    }

    // After the second four-word set, deliberately revisit all first eight.
    if (groupIndex === 1) {
      stages.push(...recallStages("first-eight", "First 8 words", currentWordIds.slice(0, 8), "BLOCK_REVIEW"));
    }
  });

  if (currentWordIds.length > 0) {
    stages.push(...recallStages("lesson-block", `This lesson: ${currentWordIds.length} words`, currentWordIds, "BLOCK_REVIEW"));
  }

  // A cumulative stage does not make a learner type 24–100 answers into one
  // page. It selects a saved four-word sample from the entire mastered pool.
  if (cumulativeWordIds.length > currentWordIds.length) {
    const promptCount = Math.min(4, cumulativeWordIds.length);
    stages.push(
      { key: `cumulative-${cumulativeWordIds.length}-en-ru`, direction: "EN_RU", wordIds: cumulativeWordIds, promptCount, requiredConsecutive: 5, title: `Mixed recall from ${cumulativeWordIds.length} words`, kind: "CUMULATIVE_REVIEW" },
      { key: `cumulative-${cumulativeWordIds.length}-ru-en`, direction: "RU_EN", wordIds: cumulativeWordIds, promptCount, requiredConsecutive: 5, title: `Mixed recall from ${cumulativeWordIds.length} words`, kind: "CUMULATIVE_REVIEW" },
    );
  }

  return stages;
}

export function vocabularyMasteryStageCount(newWordCount: number, cumulativeWordCount = newWordCount) {
  return buildVocabularyMasteryStages(
    Array.from({ length: newWordCount }, (_, index) => `new-${index}`),
    Array.from({ length: cumulativeWordCount }, (_, index) => `all-${index}`),
  ).length;
}
