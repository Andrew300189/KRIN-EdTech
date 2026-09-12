/** @jest-environment jsdom */

import { createElement } from "react";
import { jest } from "@jest/globals";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/core/i18n/locale";
import { StreakChestReward } from "@/modules/motivation/components/StreakChestReward";

jest.mock("@/modules/motivation/motivation-events", () => ({
  notifyMotivationUpdated: jest.fn(),
}));

describe("StreakChestReward", () => {
  beforeEach(() => {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };
    window.cancelAnimationFrame = () => undefined;
    window.localStorage.setItem("krin.locale", "en");
  });

  it("cannot be dismissed before its reward is opened", () => {
    const onDismiss = jest.fn();
    render(createElement(
      LocaleProvider,
      null,
      createElement(StreakChestReward, { milestone: 5, onDismiss }),
    ));

    expect(screen.getByRole("dialog", { name: "Streak chest" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close streak chest" })).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Open chest" })).toHaveLength(2);
    screen.getAllByRole("button", { name: "Open chest" }).forEach((button) => {
      expect(button).toBeEnabled();
    });
  });
});
