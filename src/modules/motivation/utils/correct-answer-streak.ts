export const CORRECT_STREAK_MILESTONES = [3, 7, 12, 24, 48, 70, 100, 124, 148, 170, 200] as const;
const REPEATING_HUNDRED_OFFSETS = [0, 24, 48, 70] as const;

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
 * From 100 onwards, each hundred repeats the same four checkpoints:
 * 100/124/148/170, then 200/224/248/270, and so on. The learner can keep an
 * unbounded streak (548 is a real checkpoint), while the final +5 XP bonus
 * keeps the economy predictable after the 200-answer legendary mode.
 */
export function correctAnswerStreak(streak: number): CorrectAnswerStreak {
  const current = Math.max(0, Math.trunc(Number.isFinite(streak) ? streak : 0));
  if (current < 3) return { current, modeStart: null, bonusExperience: 0, tone: null, activated: false };

  const earlyModeIndex = CORRECT_STREAK_MILESTONES.slice(0, 6).reduce<number>((latest, milestone, index) => current >= milestone ? index : latest, -1);
  if (current < 100) {
    const modeStart = CORRECT_STREAK_MILESTONES[earlyModeIndex];
    return {
      current,
      modeStart,
      bonusExperience: modeStart >= 24 ? 2 : 1,
      tone: tones[earlyModeIndex] ?? "gold",
      activated: current === modeStart,
    };
  }

  const hundredStart = Math.floor(current / 100) * 100;
  const offset = [...REPEATING_HUNDRED_OFFSETS].reverse().find((candidate) => current >= hundredStart + candidate) ?? 0;
  const modeStart = hundredStart + offset;
  const completedHundreds = Math.floor((modeStart - 100) / 100);
  const modeIndex = 6 + (completedHundreds * REPEATING_HUNDRED_OFFSETS.length) + REPEATING_HUNDRED_OFFSETS.indexOf(offset as typeof REPEATING_HUNDRED_OFFSETS[number]);
  const bonusExperience = modeStart >= 200 ? 5 : 3;
  return {
    current,
    modeStart,
    bonusExperience,
    tone: tones[modeIndex % tones.length] ?? "gold",
    activated: current === modeStart,
  };
}
