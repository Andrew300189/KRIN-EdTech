import { VOCABULARY_REVIEW_CONFIG } from "@/modules/vocabulary/constants/review-config";

export type ReviewQuality = "AGAIN" | "HARD" | "GOOD" | "EASY";
export type ReviewState = { easeFactor: number; intervalDays: number; repetitions: number; lapses: number; masteryLevel: number };
export type ScheduledReview = ReviewState & { nextReviewAt: Date; status: "LEARNING" | "REVIEW" };
export type ReviewSchedulingInput = {
  state: ReviewState;
  isCorrect: boolean;
  exerciseType: string;
  responseTimeSeconds?: number;
  /** 1 = guessed, 2 = reasonably sure, 3 = very sure. */
  confidence?: 1 | 2 | 3;
  difficulty?: number;
  previousErrors?: number;
  lastReviewedAt?: Date | null;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function scheduleNextWordReview(state: ReviewState, quality: ReviewQuality, now = new Date()): ScheduledReview {
  const config = VOCABULARY_REVIEW_CONFIG;
  if (quality === "AGAIN") {
    return {
      easeFactor: clamp(state.easeFactor + config.quality.AGAIN.easeDelta, config.minimumEaseFactor, config.maximumEaseFactor),
      intervalDays: 0,
      repetitions: 0,
      lapses: state.lapses + 1,
      masteryLevel: clamp(state.masteryLevel + config.quality.AGAIN.masteryDelta, config.masteryMinimum, config.masteryMaximum),
      nextReviewAt: new Date(now.getTime() + config.againDelayMinutes * 60_000),
      status: "LEARNING",
    };
  }
  const repetitions = state.repetitions + 1;
  const qualityConfig = config.quality[quality];
  const easeFactor = clamp(state.easeFactor + qualityConfig.easeDelta, config.minimumEaseFactor, config.maximumEaseFactor);
  const baseIntervals = quality === "HARD" ? [1, 2, 4] : quality === "GOOD" ? [1, 3, 7] : [3, 7, 14];
  const intervalDays = repetitions <= 3
    ? baseIntervals[repetitions - 1]
    : Math.max(1, Math.round(Math.max(1, state.intervalDays) * easeFactor * (quality === "EASY" ? 1.3 : quality === "HARD" ? 0.8 : 1)));
  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses: state.lapses,
    masteryLevel: clamp(state.masteryLevel + qualityConfig.masteryDelta, config.masteryMinimum, config.masteryMaximum),
    nextReviewAt: new Date(now.getTime() + intervalDays * 24 * 60 * 60_000),
    status: "REVIEW",
  };
}

export function determineReviewQuality(isCorrect: boolean, exerciseType: string, responseTimeSeconds?: number) : ReviewQuality {
  if (!isCorrect) return "AGAIN";
  const threshold = VOCABULARY_REVIEW_CONFIG.fastResponseSeconds[exerciseType as keyof typeof VOCABULARY_REVIEW_CONFIG.fastResponseSeconds] ?? VOCABULARY_REVIEW_CONFIG.fastResponseSeconds.default;
  if (responseTimeSeconds !== undefined && responseTimeSeconds <= Math.max(2, Math.floor(threshold / 2))) return "EASY";
  if (responseTimeSeconds !== undefined && responseTimeSeconds > threshold) return "HARD";
  return "GOOD";
}

/**
 * The single server-side SM-2 entry point.  It deliberately accepts only
 * modest context adjustments: they can shorten an interval but can never
 * turn an incorrect answer into a successful review.
 */
export function scheduleNextReview(input: ReviewSchedulingInput, now = new Date()): ScheduledReview {
  let quality = determineReviewQuality(input.isCorrect, input.exerciseType, input.responseTimeSeconds);
  if (input.isCorrect && input.confidence === 1 && quality === "EASY") quality = "GOOD";
  if (input.isCorrect && input.confidence === 1 && quality === "GOOD") quality = "HARD";
  if (input.isCorrect && input.confidence === 3 && quality === "GOOD" && input.responseTimeSeconds !== undefined) quality = "EASY";

  const scheduled = scheduleNextWordReview(input.state, quality, now);
  if (!input.isCorrect) return scheduled;

  const difficulty = clamp(Math.floor(input.difficulty ?? 1), 1, 10);
  const priorErrors = Math.max(0, Math.floor(input.previousErrors ?? input.state.lapses));
  const daysSinceReview = input.lastReviewedAt
    ? Math.max(0, Math.floor((now.getTime() - input.lastReviewedAt.getTime()) / 86_400_000))
    : 0;
  // Difficult or repeatedly missed words resurface sooner. A long gap only
  // grants a small recovery nudge and is capped to prevent runaway intervals.
  const difficultyFactor = 1 - (difficulty - 1) * 0.04;
  const errorFactor = Math.max(0.45, 1 - Math.min(priorErrors, 8) * 0.07);
  const overdueFactor = daysSinceReview > Math.max(7, input.state.intervalDays * 2) ? 0.9 : 1;
  const intervalDays = Math.max(1, Math.round(scheduled.intervalDays * difficultyFactor * errorFactor * overdueFactor));
  return { ...scheduled, intervalDays, nextReviewAt: new Date(now.getTime() + intervalDays * 86_400_000) };
}

export function isEligibleForMastery(state: Pick<ReviewState, "masteryLevel" | "repetitions">, latestAttemptsAreCorrect: boolean, isCorrect: boolean) {
  return isCorrect
    && latestAttemptsAreCorrect
    && state.masteryLevel >= VOCABULARY_REVIEW_CONFIG.masteredThreshold
    && state.repetitions >= VOCABULARY_REVIEW_CONFIG.masteredMinimumRepetitions;
}
