import { correctAnswerStreak } from "@/modules/motivation/utils/correct-answer-streak";

describe("correct answer streak modes", () => {
  it("keeps the standard reward before the first three-answer mode", () => {
    expect(correctAnswerStreak(2)).toMatchObject({ current: 2, modeStart: null, bonusExperience: 0, activated: false });
  });

  it.each([
    [3, 3, 1],
    [7, 7, 1],
    [12, 12, 1],
    [24, 24, 2],
    [70, 70, 2],
    [100, 100, 3],
    [148, 148, 3],
    [200, 200, 5],
    [224, 224, 5],
    [548, 548, 5],
  ])("activates the %i-answer mode with a +%i XP bonus", (current, modeStart, bonusExperience) => {
    expect(correctAnswerStreak(current)).toMatchObject({ current, modeStart, bonusExperience, activated: true });
  });

  it("repeats the 100-answer checkpoint pattern without capping the streak", () => {
    expect(correctAnswerStreak(548)).toMatchObject({ current: 548, modeStart: 548, bonusExperience: 5, activated: true });
    expect(correctAnswerStreak(777)).toMatchObject({ current: 777, modeStart: 770, bonusExperience: 5, activated: false });
  });
});
