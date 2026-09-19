/** @jest-environment jsdom */

import { createElement } from "react";
import { jest } from "@jest/globals";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider } from "@/core/i18n/locale";
import { LeaderboardRiseNotifier } from "@/modules/motivation/components/LeaderboardRiseNotifier";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";

describe("LeaderboardRiseNotifier", () => {
  beforeEach(() => {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };
    window.cancelAnimationFrame = () => undefined;
    window.localStorage.setItem("krin.locale", "en");
  });

  it("celebrates only an upward rank change after a confirmed reward event", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { rank: 11, participantCount: 40, positionsToTopThree: 8 } }),
    }) as unknown as typeof fetch;

    render(createElement(
      LocaleProvider,
      null,
      createElement(LeaderboardRiseNotifier, { initialRank: 15 }),
    ));

    notifyMotivationUpdated();

    await waitFor(() => expect(screen.getByRole("dialog", { name: "You are passing competitors!" })).toBeInTheDocument());
    expect(screen.getByText("+4 positions gained")).toBeInTheDocument();
    expect(screen.getByText("#15")).toBeInTheDocument();
    expect(screen.getByText("#11")).toBeInTheDocument();
  });
});
