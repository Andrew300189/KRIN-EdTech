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
    window.sessionStorage.setItem("krin-streak-recovery-shown:2026-09-25T21:00:00.000Z", "1");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {
        streak: { currentStreak: 0, longestStreak: 7, freezeCount: 0, waterLilyCount: 0, recoverableStreak: 7 },
        streakRecovery: { available: true, streakLength: 7, experienceCost: 30, coinCostMinor: 10, waterLilyCount: 0, waterLilyReady: false, lostAt: "2026-09-25T21:00:00.000Z" },
        wallet: { balance: 1, fractionalBalance: 0 },
        level: { level: 2, lifetimeExperience: 50 },
      } }),
    } as never) as unknown as typeof fetch;
  });

  it("opens even when an old session flag exists and stays dismissed during refresh", async () => {
    render(createElement(LocaleProvider, null, createElement(DailyStreakHeaderStatus, { showBadge: false })));
    const dialog = await screen.findByRole("dialog", { name: /lost streak|втрачену серію|потерянную серию/i });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close streak details|закрити відомості|закрыть сведения/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    window.dispatchEvent(new Event(MOTIVATION_UPDATED_EVENT));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
