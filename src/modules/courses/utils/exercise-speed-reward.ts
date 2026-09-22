/**
 * A relaxed, visible answer window makes a fast, confident response feel
 * rewarding without turning ordinary learning into a race.
 * The same pure policy runs in the card and on the server; the server owns the
 * start time and is the only place that can actually grant XP.
 */
export const MIN_EXERCISE_SPEED_XP = 1;
export const MAX_EXERCISE_SPEED_XP = 3;

// The authored limits were originally designed for internal timing.  The
// learner-facing XP bar must be calmer and consistent across every card, so
// even a short authored task receives at least 45 seconds.
const DEFAULT_SPEED_WINDOW_SECONDS = 45;
const MIN_SPEED_WINDOW_SECONDS = 45;
const MAX_SPEED_WINDOW_SECONDS = 90;

export function exerciseSpeedWindowSeconds(configuredSeconds: number | null | undefined) {
  const source = Number.isFinite(configuredSeconds)
    ? Math.trunc(configuredSeconds as number)
    : DEFAULT_SPEED_WINDOW_SECONDS;
  return Math.max(MIN_SPEED_WINDOW_SECONDS, Math.min(MAX_SPEED_WINDOW_SECONDS, source));
}

/**
 * 3 XP for the first third of the bar, 2 XP for the middle third and 1 XP
 * after that. The bar can reach zero, but answering never becomes blocked.
 */
export function experienceForExerciseSpeed(elapsedSeconds: number, configuredSeconds: number | null | undefined) {
  const windowSeconds = exerciseSpeedWindowSeconds(configuredSeconds);
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : windowSeconds;
  const elapsedShare = elapsed / windowSeconds;
  if (elapsedShare <= 1 / MAX_EXERCISE_SPEED_XP) return MAX_EXERCISE_SPEED_XP;
  if (elapsedShare <= 2 / MAX_EXERCISE_SPEED_XP) return 2;
  return MIN_EXERCISE_SPEED_XP;
}

export function remainingExerciseSpeedPercent(elapsedSeconds: number, configuredSeconds: number | null | undefined) {
  const windowSeconds = exerciseSpeedWindowSeconds(configuredSeconds);
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : windowSeconds;
  return Math.max(0, Math.min(100, ((windowSeconds - elapsed) / windowSeconds) * 100));
}
