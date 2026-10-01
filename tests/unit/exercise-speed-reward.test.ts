import {
  baseExperienceForExercise,
  experienceForExerciseSpeed,
  exerciseSpeedWindowSeconds,
  remainingExerciseSpeedPercent,
  speedRewardVisualState,
} from "@/modules/courses/utils/exercise-speed-reward";

describe("exercise speed reward", () => {
  it("uses one XP by default across engines and clamps verified speed XP", () => {
    expect(baseExperienceForExercise()).toBe(1);
    expect(baseExperienceForExercise(Number.NaN)).toBe(1);
    expect(baseExperienceForExercise(2)).toBe(2);
    expect(baseExperienceForExercise(99)).toBe(3);
  });
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

  it("changes smoothly from green to red and alerts only in the red zone", () => {
    expect(speedRewardVisualState(100)).toEqual({ percent: 100, color: "hsl(140 82% 40%)", critical: false });
    expect(speedRewardVisualState(60)).toEqual({ percent: 60, color: "hsl(70 82% 40%)", critical: false });
    expect(speedRewardVisualState(20)).toEqual({ percent: 20, color: "hsl(0 82% 40%)", critical: true });
    expect(speedRewardVisualState(0)).toEqual({ percent: 0, color: "hsl(0 82% 40%)", critical: true });
  });
});
