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

  it("does not offer daily streak restoration or consume lesson Water Lilies", async () => {
    render(createElement(LocaleProvider, null, createElement(DailyStreakHeaderStatus)));
    const badge = await screen.findByRole("button", { name: /daily streak|серия дней|серія днів/i });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(badge);
    expect(await screen.findByRole("dialog", { name: /daily streak|серия дней|серія днів/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore|восстановить|відновити/i })).not.toBeInTheDocument();
    window.dispatchEvent(new Event(MOTIVATION_UPDATED_EVENT));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });

  it("does not show a recovery prompt when used without a badge", async () => {
    render(createElement(LocaleProvider, null, createElement(DailyStreakHeaderStatus, { showBadge: false })));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
