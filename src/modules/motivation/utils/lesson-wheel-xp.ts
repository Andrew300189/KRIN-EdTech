/** The lesson's XP is already in the wallet before the wheel opens. Only the
 * difference between the multiplied total and that base may be credited. */
export function lessonWheelXp(baseExperience: number, multiplierStep: number) {
  const base = Math.max(0, Math.trunc(baseExperience));
  const step = Math.max(11, Math.min(30, Math.trunc(multiplierStep)));
  // Even a one-XP lesson must have a real prize: rounding ×1.1 down to the
  // original total must never show a child a zero-XP "reward".
  const bonusExperience = base > 0 ? Math.max(1, Math.round(base * step / 10) - base) : 0;
  return { baseExperience: base, bonusExperience, totalExperience: base + bonusExperience };
}

/** Reopened wheels report what the immutable ledger actually credited, not
 * a second copy of the total stored in the transaction description. */
export function creditedLessonWheelXp(baseExperience: number, creditedBonus: number) {
  const base = Math.max(0, Math.trunc(baseExperience));
  const bonusExperience = Math.max(0, Math.trunc(creditedBonus));
  return { baseExperience: base, bonusExperience, totalExperience: base + bonusExperience };
}
