/** Difficulty 7–10 is deliberately reserved for a short, visual celebration. */
export const CONFETTI_DIFFICULTY_THRESHOLD = 7;

export function shouldBurstLessonConfetti(input: {
  isLessonComplete?: boolean;
  isCorrect?: boolean;
  difficulty?: number | null;
}) {
  if (input.isLessonComplete) return true;
  return Boolean(input.isCorrect && (input.difficulty ?? 0) >= CONFETTI_DIFFICULTY_THRESHOLD);
}
