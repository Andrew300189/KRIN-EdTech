import { creditedLessonWheelXp, lessonWheelXp } from "@/modules/motivation/utils/lesson-wheel-xp";

describe("lesson wheel XP accounting", () => {
  it("credits only the difference, never the multiplied total again", () => {
    expect(lessonWheelXp(40, 20)).toEqual({ baseExperience: 40, bonusExperience: 40, totalExperience: 80 });
    expect(lessonWheelXp(40, 10)).toEqual({ baseExperience: 40, bonusExperience: 0, totalExperience: 40 });
    expect(lessonWheelXp(40, 30)).toEqual({ baseExperience: 40, bonusExperience: 80, totalExperience: 120 });
  });

  it("restores the displayed total from the credited bonus, not metadata", () => {
    expect(creditedLessonWheelXp(40, 40)).toEqual({ baseExperience: 40, bonusExperience: 40, totalExperience: 80 });
  });
});
