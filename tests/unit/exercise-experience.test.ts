import {
  MAX_EXERCISE_EXPERIENCE,
  MIN_EXERCISE_EXPERIENCE,
  experienceForExerciseDifficulty,
} from "@/modules/motivation/utils/exercise-experience";

describe("experienceForExerciseDifficulty", () => {
  it("maps the CMS difficulty scale from 1 through 10 to the 1–15 XP range", () => {
    expect(experienceForExerciseDifficulty(1)).toBe(MIN_EXERCISE_EXPERIENCE);
    expect(experienceForExerciseDifficulty(10)).toBe(MAX_EXERCISE_EXPERIENCE);
    expect(experienceForExerciseDifficulty(2)).toBeGreaterThan(experienceForExerciseDifficulty(1));
    expect(experienceForExerciseDifficulty(8)).toBeGreaterThan(experienceForExerciseDifficulty(4));
  });

  it("keeps malformed and out-of-range difficulty values inside the reward range", () => {
    expect(experienceForExerciseDifficulty(Number.NaN)).toBe(1);
    expect(experienceForExerciseDifficulty(-4)).toBe(1);
    expect(experienceForExerciseDifficulty(100)).toBe(15);
  });
});
