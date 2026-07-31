export const VOCABULARY_REVIEW_CONFIG = {
  minimumEaseFactor: 1.3,
  maximumEaseFactor: 3.5,
  masteryMinimum: 0,
  masteryMaximum: 100,
  masteredThreshold: 90,
  masteredMinimumRepetitions: 5,
  againDelayMinutes: 10,
  fastResponseSeconds: { default: 8, TEXT_INPUT: 12, TRANSLATION_TO_WORD: 12, LISTEN_AND_TYPE: 15 },
  quality: {
    AGAIN: { easeDelta: -0.2, masteryDelta: -20 },
    HARD: { easeDelta: -0.15, masteryDelta: 5 },
    GOOD: { easeDelta: 0, masteryDelta: 12 },
    EASY: { easeDelta: 0.15, masteryDelta: 18 },
  },
} as const;
