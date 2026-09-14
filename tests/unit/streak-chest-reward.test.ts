/** @jest-environment jsdom */

import { createElement } from "react";
import { jest } from "@jest/globals";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider } from "@/core/i18n/locale";
import { StreakChestReward } from "@/modules/motivation/components/StreakChestReward";
import { MOTIVATION_UPDATED_EVENT } from "@/modules/motivation/motivation-events";

describe("StreakChestReward", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      createElement(StreakChestReward, { milestone: 7, onDismiss }),
    ));

    expect(screen.getByRole("dialog", { name: "Flower streak chest" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close streak chest" })).not.toBeInTheDocument();
    expect(screen.getByText(/Quest book/)).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Open chest" })).toHaveLength(2);
    screen.getAllByRole("button", { name: "Open chest" }).forEach((button) => {
      expect(button).toBeEnabled();
    });
  });

  it("refreshes the XP balance after recovering an already-credited chest", async () => {
    let refreshes = 0;
    const onMotivationUpdated = () => { refreshes += 1; };
    window.addEventListener(MOTIVATION_UPDATED_EVENT, onMotivationUpdated);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          opened: false,
          alreadyOpened: true,
          rewardId: "level-2-xp-30",
          experience: 30,
          coins: 0,
          hintCredits: 0,
          translationCredits: 0,
        },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      render(createElement(
        LocaleProvider,
        null,
        createElement(StreakChestReward, { milestone: 7, onDismiss: jest.fn() }),
      ));

      fireEvent.click(screen.getAllByRole("button", { name: "Open chest" })[0]);

      await waitFor(() => expect(refreshes).toBe(1));
      expect(fetchMock).toHaveBeenCalledWith("/api/profile/rewards/streak-chest", expect.objectContaining({ method: "POST" }));
      expect(screen.getByText("+30 XP")).toBeInTheDocument();
    } finally {
      window.removeEventListener(MOTIVATION_UPDATED_EVENT, onMotivationUpdated);
    }
  });
});
