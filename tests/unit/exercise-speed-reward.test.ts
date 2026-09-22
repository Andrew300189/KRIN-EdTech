import {
  experienceForExerciseSpeed,
  exerciseSpeedWindowSeconds,
  remainingExerciseSpeedPercent,
} from "@/modules/courses/utils/exercise-speed-reward";

describe("exercise speed reward", () => {
  it("starts at three XP and never drops below one XP", () => {
    expect(experienceForExerciseSpeed(0, 45)).toBe(3);
    expect(experienceForExerciseSpeed(45, 45)).toBe(1);
    expect(experienceForExerciseSpeed(200, 45)).toBe(1);
  });

  it("uses the middle tier while the second third of the bar remains", () => {
    expect(experienceForExerciseSpeed(15, 45)).toBe(3);
    expect(experienceForExerciseSpeed(16, 45)).toBe(2);
    expect(experienceForExerciseSpeed(30, 45)).toBe(2);
    expect(experienceForExerciseSpeed(31, 45)).toBe(1);
  });

  it("keeps the visible timer relaxed for every authored card", () => {
    expect(exerciseSpeedWindowSeconds(null)).toBe(45);
    expect(exerciseSpeedWindowSeconds(2)).toBe(45);
    expect(exerciseSpeedWindowSeconds(120)).toBe(90);
    expect(remainingExerciseSpeedPercent(22.5, 45)).toBe(50);
    expect(remainingExerciseSpeedPercent(90, 45)).toBe(0);
  });
});
