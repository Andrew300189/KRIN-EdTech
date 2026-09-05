/**
 * Exercise authors choose a difficulty from 1 through 10 in the CMS.  XP is
 * calculated on the server from that value, so a client can never inflate a
 * reward by sending its own amount.
 */
export const MIN_EXERCISE_EXPERIENCE = 1;
export const MAX_EXERCISE_EXPERIENCE = 15;
export const MIN_EXERCISE_DIFFICULTY = 1;
export const MAX_EXERCISE_DIFFICULTY = 10;

export function experienceForExerciseDifficulty(difficulty: number) {
  const value = Number.isFinite(difficulty) ? Math.trunc(difficulty) : MIN_EXERCISE_DIFFICULTY;
  const normalized = Math.min(MAX_EXERCISE_DIFFICULTY, Math.max(MIN_EXERCISE_DIFFICULTY, value));
  const progress = (normalized - MIN_EXERCISE_DIFFICULTY) / (MAX_EXERCISE_DIFFICULTY - MIN_EXERCISE_DIFFICULTY);
  return Math.round(MIN_EXERCISE_EXPERIENCE + progress * (MAX_EXERCISE_EXPERIENCE - MIN_EXERCISE_EXPERIENCE));
}
