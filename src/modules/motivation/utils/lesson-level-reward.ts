/** A small, predictable bonus for each newly completed lesson. The first
 * level keeps the existing reward, then each displayed level adds 1 XP, up
 * to +25 XP. Exercise speed rewards and fixed milestone chests are unchanged. */
export function lessonLevelRewardBonus(level: number) {
  if (!Number.isFinite(level)) return 0;
  return Math.min(25, Math.max(0, Math.trunc(level) - 1));
}
