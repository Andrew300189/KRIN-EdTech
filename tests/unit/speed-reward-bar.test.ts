/** @jest-environment jsdom */

import React from "react";
import { render } from "@testing-library/react";
import { SpeedRewardBar } from "@/modules/lessons/components/SpeedRewardBar";

describe("SpeedRewardBar", () => {
  it("shrinks with the timer and starts its red alert only in the final fifth", () => {
    const { container, rerender } = render(React.createElement(SpeedRewardBar, { remainingPercent: 100 }));
    const track = container.querySelector("[data-speed-zone]");
    const fill = track?.querySelector("span");
    expect(track?.getAttribute("data-speed-zone")).toBe("normal");
    expect(fill?.getAttribute("style")).toContain("width: 100%");

    rerender(React.createElement(SpeedRewardBar, { remainingPercent: 21 }));
    expect(track?.getAttribute("data-speed-zone")).toBe("normal");

    rerender(React.createElement(SpeedRewardBar, { remainingPercent: 20 }));
    expect(track?.getAttribute("data-speed-zone")).toBe("red");
    expect(fill?.getAttribute("style")).toContain("width: 20%");
  });
});
