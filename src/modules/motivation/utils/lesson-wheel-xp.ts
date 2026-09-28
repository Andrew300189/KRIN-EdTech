/** The lesson's XP is already in the wallet before the wheel opens. Only the
 * difference between the multiplied total and that base may be credited. */
export function lessonWheelXp(baseExperience: number, multiplierStep: number) {
  const base = Math.max(0, Math.trunc(baseExperience));
  const step = Math.max(10, Math.min(30, Math.trunc(multiplierStep)));
  const totalExperience = Math.round(base * step / 10);
  return { baseExperience: base, bonusExperience: totalExperience - base, totalExperience };
}

/** Reopened wheels report what the immutable ledger actually credited, not
 * a second copy of the total stored in the transaction description. */
export function creditedLessonWheelXp(baseExperience: number, creditedBonus: number) {
  const base = Math.max(0, Math.trunc(baseExperience));
  const bonusExperience = Math.max(0, Math.trunc(creditedBonus));
  return { baseExperience: base, bonusExperience, totalExperience: base + bonusExperience };
}
