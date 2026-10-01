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
    expect(screen.getAllByRole("button", { name: "Let it bloom" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Let it bloom" })[0]).toHaveClass("pending");
    screen.getAllByRole("button", { name: "Let it bloom" }).forEach((button) => {
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

      fireEvent.click(screen.getAllByRole("button", { name: "Let it bloom" })[0]);

      await waitFor(() => expect(refreshes).toBe(1));
      expect(fetchMock).toHaveBeenCalledWith("/api/profile/rewards/streak-chest", expect.objectContaining({ method: "POST" }));
      expect(screen.getByText("+30 XP")).toBeInTheDocument();
    } finally {
      window.removeEventListener(MOTIVATION_UPDATED_EVENT, onMotivationUpdated);
    }
  });

  it("reveals a photographed flower and links the new discovery to the album", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {
        opened: true, alreadyOpened: false, rewardId: "flower-white-lily",
        flowerId: "white-lily", firstDiscovery: true, experience: 1000,
        coins: 0, hintCredits: 0, translationCredits: 0,
      } }),
    }) as unknown as typeof fetch;

    render(createElement(LocaleProvider, null, createElement(StreakChestReward, { milestone: 7, onDismiss: jest.fn() })));
    expect(screen.getAllByRole("button", { name: "Let it bloom" })[0].querySelector("img")).toHaveAttribute("src", "/flower-chests/mystery-bud.png");
    fireEvent.click(screen.getAllByRole("button", { name: "Let it bloom" })[0]);

    await waitFor(() => expect(screen.getByText(/New flower discovered/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Let it bloom" })).not.toHaveClass("pending");
    expect(screen.getByRole("link", { name: /Open flower album/ })).toHaveAttribute("href", "/student/flowers");
    expect(screen.getByRole("dialog").querySelector('img[src="/flower-chests/white-lily.webp"]')).toBeInTheDocument();
  });

  it("shows buds only at streak 3 and 7, then rotates open flower previews", () => {
    for (const [milestone, image, label] of [
      [3, "/flower-chests/mystery-bud.png", "Let it bloom"],
      [7, "/flower-chests/mystery-bud.png", "Let it bloom"],
      [12, "/flower-chests/chamomile.webp", "Collect flower"],
      [24, "/flower-chests/poppy.webp", "Collect flower"],
      [48, "/flower-chests/cornflower.webp", "Collect flower"],
    ] as const) {
      const view = render(createElement(LocaleProvider, null, createElement(StreakChestReward, { milestone, onDismiss: jest.fn() })));
      expect(screen.getAllByRole("button", { name: label })[0].querySelector("img")).toHaveAttribute("src", image);
      view.unmount();
    }
  });

  it("keeps the learner in the lesson until all crossed chest milestones are opened", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { opened: true, alreadyOpened: false, rewardId: "level-2-xp-30", experience: 30, coins: 0, hintCredits: 0, translationCredits: 0 } }),
    }) as unknown as typeof fetch;
    const onDismiss = jest.fn();
    render(createElement(LocaleProvider, null, createElement(StreakChestReward, { milestone: 7, onDismiss, hasMorePending: true })));
    fireEvent.click(screen.getAllByRole("button", { name: "Let it bloom" })[0]);
    await waitFor(() => expect(screen.getByText("+30 XP")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /Open flower album/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
