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
 * Each real chest checkpoint has its own level: ×3 is level 1, ×7 is level
 * 2, and so on through the ×10,000 level-403 chest.  Chests beyond ×10,000
 * remain at the maximum level while the learner's correct-answer streak can
 * continue without a hidden cap.
 */
export function streakChestLevel(streak: number) {
  const current = Math.max(0, Math.trunc(Number.isFinite(streak) ? streak : 0));
  if (!correctAnswerStreak(current).activated) return 0;
  if (current < 100) {
    const earlyChestMilestones: readonly number[] = CORRECT_STREAK_MILESTONES.slice(0, 6);
    return earlyChestMilestones.indexOf(current) + 1;
  }

  const capped = Math.min(current, 10_000);
  const hundredStart = Math.floor(capped / 100) * 100;
  const offset = capped - hundredStart;
  const offsetIndex = REPEATING_HUNDRED_OFFSETS.indexOf(offset as typeof REPEATING_HUNDRED_OFFSETS[number]);
  return offsetIndex < 0 ? 403 : 6 + ((hundredStart - 100) / 100) * REPEATING_HUNDRED_OFFSETS.length + offsetIndex + 1;
}

/** Exactly one spendable KRIN Coin is awarded on the 100, 200, 300 … streak
 * chests. KRIN Coins are deliberately excluded from leaderboard scoring. */
export function streakChestKrinCoinReward(streak: number) {
  const current = Math.max(0, Math.trunc(Number.isFinite(streak) ? streak : 0));
  return current >= 100 && current % 100 === 0 && correctAnswerStreak(current).activated ? 1 : 0;
}

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
