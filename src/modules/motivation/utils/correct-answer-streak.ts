export const CORRECT_STREAK_MILESTONES = [3, 7, 12, 24, 48, 70, 100, 124, 148, 170, 200] as const;

export type CorrectStreakTone = "violet" | "blue" | "cyan" | "emerald" | "lime" | "amber" | "orange" | "rose" | "fuchsia" | "indigo" | "gold";

export type CorrectAnswerStreak = {
  current: number;
  modeStart: number | null;
  bonusExperience: number;
  tone: CorrectStreakTone | null;
  activated: boolean;
};

const tones: readonly CorrectStreakTone[] = ["violet", "blue", "cyan", "emerald", "lime", "amber", "orange", "rose", "fuchsia", "indigo", "gold"];

/**
 * Rewards are deliberately tiered rather than multiplying XP forever. The
 * learner can keep an unbounded streak, while the final +5 XP bonus keeps
 * the economy predictable after the 200-answer legendary mode.
 */
export function correctAnswerStreak(streak: number): CorrectAnswerStreak {
  const current = Math.max(0, Math.trunc(Number.isFinite(streak) ? streak : 0));
  const modeIndex = CORRECT_STREAK_MILESTONES.reduce<number>((latest, milestone, index) => current >= milestone ? index : latest, -1);
  if (modeIndex < 0) return { current, modeStart: null, bonusExperience: 0, tone: null, activated: false };

  const modeStart = CORRECT_STREAK_MILESTONES[modeIndex];
  const bonusExperience = modeStart >= 200 ? 5 : modeStart >= 100 ? 3 : modeStart >= 24 ? 2 : 1;
  return {
    current,
    modeStart,
    bonusExperience,
    tone: tones[modeIndex],
    activated: current === modeStart,
  };
}
