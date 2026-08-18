/** @jest-environment jsdom */

import { describe, expect, it } from "@jest/globals";
import { getPlacementState } from "@/modules/courses/components/PlacementTest";

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
});
