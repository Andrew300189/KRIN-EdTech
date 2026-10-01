/** @jest-environment jsdom */

import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LocaleProvider } from "@/core/i18n/locale";
import { DailyChestCard } from "@/modules/motivation/components/DailyChestCard";
import { MilestoneChestsPanel } from "@/modules/motivation/components/MilestoneChestsPanel";
import { ReviewStreakChestReward } from "@/modules/motivation/components/ReviewStreakChestReward";

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

describe("unopened chest cues", () => {
  beforeEach(() => { window.localStorage.setItem("krin.locale", "en"); });

  it("pulses a claimable daily chest only until it is opened", async () => {
    global.fetch = jest.fn().mockImplementation(async (_url: string, options?: RequestInit) => ({
      ok: true,
      json: async () => ({ data: options?.method === "POST"
        ? { opened: true, experience: 500, coins: 0, waterLily: 3, nextAt: null }
        : { available: true, lessonRequired: false, nextAt: null } }),
    })) as never;
    render(createElement(LocaleProvider, null, createElement(DailyChestCard)));
    const open = await screen.findByRole("button", { name: "Open chest" });
    expect(open.closest("article")).toHaveClass("available");
    fireEvent.click(open);
    await waitFor(() => expect(open.closest("article")).not.toHaveClass("available"));
  });

  it("pulses an earned milestone chest, but removes it after the claim", async () => {
    let claimed = false;
    global.fetch = jest.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === "POST") claimed = true;
      return { ok: true, json: async () => ({ data: options?.method === "POST"
        ? { opened: true, experience: 300, coins: 0, waterLily: 1 }
        : { completedLessons: 1, chests: [{ kind: "FIRST_STEPS", available: !claimed, availableCount: claimed ? 0 : 1, nextSourceId: claimed ? null : "first", progress: 1, target: 1, claimed }] } }) };
    }) as never;
    render(createElement(LocaleProvider, null, createElement(MilestoneChestsPanel)));
    const open = await screen.findByRole("button", { name: "Open chest" });
    expect(open.closest("article")).toHaveClass("available");
    fireEvent.click(open);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Open chest" })).not.toBeInTheDocument());
  });

  it("stops pulsing the correction chest after revealing the flower", () => {
    render(createElement(LocaleProvider, null, createElement(ReviewStreakChestReward, {
      chest: { flowerId: "chamomile", experience: 12, waterLily: 1, milestone: 3 }, onClose: jest.fn(),
    })));
    const bud = screen.getByRole("dialog").querySelector('img[src="/flower-chests/mystery-bud.png"]');
    expect(bud).toHaveClass("pending");
    fireEvent.click(screen.getByRole("button", { name: "Open flower" }));
    expect(screen.getByRole("dialog").querySelector("img")).not.toHaveClass("pending");
  });
});
