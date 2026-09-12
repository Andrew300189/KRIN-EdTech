/** @jest-environment jsdom */

import { describe, expect, it } from "@jest/globals";
import { getPlacementLevelBlockProgress, getPlacementState, shouldAutoAdvancePlacementTest } from "@/modules/courses/components/PlacementTest";

describe("placement test result state", () => {
  it("returns a below-A1 state when the user ends the test before reaching A1", () => {
    const results = Array.from({ length: 20 }, () => false);

    expect(getPlacementState(results)).toMatchObject({
      level: null,
      belowA1: true,
      message: "See you next time",
    });
  });

  it("keeps A1 as the first valid level when the user clears the A1 threshold", () => {
    const results = Array.from({ length: 20 }, (_, i) => i < 14);

    expect(getPlacementState(results)).toMatchObject({
      level: "A1",
      belowA1: false,
    });
  });

  it("keeps an incorrect answer visible until the learner explicitly continues", () => {
    expect(shouldAutoAdvancePlacementTest("test", true, false, false)).toBe(false);
    expect(shouldAutoAdvancePlacementTest("test", true, true, false)).toBe(true);
  });

  it("fills each visible CEFR block only with the questions from its own level", () => {
    expect(getPlacementLevelBlockProgress(27)).toEqual([
      { level: "A1", completed: 20, total: 20, percentage: 100 },
      { level: "A2", completed: 7, total: 20, percentage: 35 },
      { level: "B1", completed: 0, total: 20, percentage: 0 },
      { level: "B2", completed: 0, total: 20, percentage: 0 },
      { level: "C1", completed: 0, total: 20, percentage: 0 },
    ]);
  });
});
