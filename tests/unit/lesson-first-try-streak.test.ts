import { calculateFirstTryLessonStreak, streakRestoreCoinCostMinor, streakRestoreXpCost } from "@/modules/motivation/services/motivation.service";

describe("lesson First-Time Right streaks", () => {
  it("stores the total perfect-answer credit separately from the longest continuous run", () => {
    const result = calculateFirstTryLessonStreak([
      { exerciseId: "one", isCorrect: true },
      { exerciseId: "two", isCorrect: true },
      { exerciseId: "three", isCorrect: false },
      { exerciseId: "three", isCorrect: true }, // correction: never qualifies
      { exerciseId: "four", isCorrect: true },
      { exerciseId: "five", isCorrect: true },
      { exerciseId: "six", isCorrect: true },
      { exerciseId: "seven", isCorrect: true },
      { exerciseId: "eight", isCorrect: true },
      { exerciseId: "nine", isCorrect: false },
    ]);

    expect(result).toEqual({ firstTryCorrectTotal: 7, longestFirstTryRun: 5 });
  });

  it("uses the approved escalating XP restore grid and an equivalent coin cost", () => {
    expect(streakRestoreXpCost(3)).toBe(30);
    expect(streakRestoreXpCost(11)).toBe(40);
    expect(streakRestoreXpCost(31)).toBe(70);
    expect(streakRestoreXpCost(71)).toBe(90);
    expect(streakRestoreXpCost(100)).toBe(200);
    expect(streakRestoreXpCost(150)).toBe(300);
    expect(streakRestoreCoinCostMinor(30)).toBe(3);
  });
});
