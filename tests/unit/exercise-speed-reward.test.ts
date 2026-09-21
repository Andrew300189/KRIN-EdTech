import {
  experienceForExerciseSpeed,
  exerciseSpeedWindowSeconds,
  remainingExerciseSpeedPercent,
} from "@/modules/courses/utils/exercise-speed-reward";

describe("exercise speed reward", () => {
  it("starts at three XP and never drops below one XP", () => {
    expect(experienceForExerciseSpeed(0, 20)).toBe(3);
    expect(experienceForExerciseSpeed(20, 20)).toBe(1);
    expect(experienceForExerciseSpeed(200, 20)).toBe(1);
  });

  it("uses the middle tier while the second third of the bar remains", () => {
    expect(experienceForExerciseSpeed(6, 20)).toBe(3);
    expect(experienceForExerciseSpeed(7, 20)).toBe(2);
    expect(experienceForExerciseSpeed(13, 20)).toBe(2);
    expect(experienceForExerciseSpeed(14, 20)).toBe(1);
  });

  it("keeps the visible timer practical for authored cards", () => {
    expect(exerciseSpeedWindowSeconds(null)).toBe(20);
    expect(exerciseSpeedWindowSeconds(2)).toBe(10);
    expect(exerciseSpeedWindowSeconds(120)).toBe(60);
    expect(remainingExerciseSpeedPercent(10, 20)).toBe(50);
    expect(remainingExerciseSpeedPercent(30, 20)).toBe(0);
  });
});
