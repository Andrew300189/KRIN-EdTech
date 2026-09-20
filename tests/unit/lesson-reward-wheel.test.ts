/** @jest-environment jsdom */

import { createElement } from "react";
import { jest } from "@jest/globals";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider } from "@/core/i18n/locale";
import { LessonRewardWheel } from "@/modules/lessons/components/LessonRewardWheel";

const unspun = {
  available: true,
  spun: false,
  alreadySpun: false,
  baseExperience: 40,
  multiplierStep: null,
  multiplier: null,
  bonusExperience: 0,
  totalExperience: 40,
};

describe("LessonRewardWheel", () => {
  beforeEach(() => {
    window.localStorage.setItem("krin.locale", "en");
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
  });

  it("submits only one spin while a touch or keyboard event is repeated", async () => {
    let resolveSpin: ((value: { ok: boolean; json: () => Promise<{ data: typeof unspun } | { data: typeof unspun & { spun: true; multiplierStep: number; multiplier: number; bonusExperience: number; totalExperience: number } }> }) => void) | null = null;
    const fetchMock = jest.fn((_: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== "POST") return Promise.resolve({ ok: true, json: async () => ({ data: unspun }) });
      return new Promise((resolve) => { resolveSpin = resolve; });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const onCollected = jest.fn();
    const onMultiplierApplied = jest.fn();

    render(createElement(
      LocaleProvider,
      null,
      createElement(LessonRewardWheel, { lessonId: "lesson-1", baseExperience: 40, ready: true, onCollected, onMultiplierApplied }),
    ));

    const spinButton = await screen.findByRole("button", { name: "Spin for XP" });
    await waitFor(() => expect(spinButton).toBeEnabled());
    fireEvent.click(spinButton);
    fireEvent.click(spinButton);

    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST")).toHaveLength(1);

    await act(async () => {
      resolveSpin?.({
        ok: true,
        json: async () => ({
          data: { ...unspun, spun: true, multiplierStep: 20, multiplier: 2, bonusExperience: 40, totalExperience: 80 },
        }),
      });
    });

    await waitFor(() => expect(onCollected).toHaveBeenCalledTimes(1));
    expect(onMultiplierApplied).toHaveBeenCalledTimes(1);
  });
});
