/** @jest-environment jsdom */

import { createElement } from "react";
import { jest } from "@jest/globals";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider } from "@/core/i18n/locale";
import { DailyStreakHeaderStatus } from "@/modules/motivation/components/DailyStreakHeaderStatus";
import { MOTIVATION_UPDATED_EVENT } from "@/modules/motivation/motivation-events";


describe("lost streak recovery prompt", () => {
  beforeEach(() => {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => { callback(0); return 1; };
    window.cancelAnimationFrame = () => undefined;
    window.sessionStorage.clear();
    window.sessionStorage.setItem("krin-streak-recovery-shown:2026-09-25T21:00:00.000Z", "1");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {
        streak: { currentStreak: 0, longestStreak: 7, freezeCount: 0, waterLilyCount: 1, recoverableStreak: 7 },
        streakRecovery: { available: true, streakLength: 7, experienceCost: 30, coinCostMinor: 10, waterLilyCount: 1, waterLilyReady: false, lostAt: "2026-09-25T21:00:00.000Z" },
        wallet: { balance: 1, fractionalBalance: 0 },
        level: { level: 2, lifetimeExperience: 50 },
      } }),
    } as never) as unknown as typeof fetch;
  });

  it("opens even when an old session flag exists and stays dismissed during refresh", async () => {
    const view = render(createElement(LocaleProvider, null, createElement(DailyStreakHeaderStatus, { showBadge: false, continueInCurrentLesson: true })));
    const dialog = await screen.findByRole("dialog", { name: /lost streak|втрачену серію|потерянную серию/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore with water lily|відновити за латаття|восстановить за кувшинку/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back to this lesson|повернутися до уроку|вернуться к уроку/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem("krin-streak-recovery-dismissed:2026-09-25T21:00:00.000Z:7")).toBe("1");
    window.dispatchEvent(new Event(MOTIVATION_UPDATED_EVENT));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    view.unmount();
    render(createElement(LocaleProvider, null, createElement(DailyStreakHeaderStatus, { showBadge: false, continueInCurrentLesson: true })));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("links to the learner's next lesson when opened from the dashboard", async () => {
    render(createElement(LocaleProvider, null, createElement(DailyStreakHeaderStatus, { showBadge: false })));
    expect(await screen.findByRole("link", { name: /continue lesson|продовжити урок|продолжить урок/i })).toHaveAttribute("href", "/continue-learning");
  });
});
