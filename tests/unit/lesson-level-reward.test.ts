import { lessonLevelRewardBonus } from "@/modules/motivation/utils/lesson-level-reward";

describe("first-completion level bonus", () => {
  it("grows by one XP per level without changing the base reward", () => {
    expect(lessonLevelRewardBonus(1)).toBe(0);
    expect(lessonLevelRewardBonus(4)).toBe(3);
    expect(lessonLevelRewardBonus(26)).toBe(25);
    expect(lessonLevelRewardBonus(100)).toBe(25);
  });

  it("rejects invalid or negative levels", () => {
    expect(lessonLevelRewardBonus(NaN)).toBe(0);
    expect(lessonLevelRewardBonus(-5)).toBe(0);
  });
});
