/** @jest-environment jsdom */

import { createElement } from "react";
import { jest } from "@jest/globals";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider } from "@/core/i18n/locale";
import { ExperienceStatus } from "@/modules/motivation/components/ExperienceStatus";
import { MOTIVATION_UPDATED_EVENT } from "@/modules/motivation/motivation-events";

type OverviewResponse = {
  ok: boolean;
  json: () => Promise<{
    data: {
      level: { level: number; lifetimeExperience: number };
      wallet: { balance: number };
    };
  }>;
};

function overview(experience: number) {
  return {
    ok: true,
    json: async () => ({ data: { level: { level: 2, lifetimeExperience: experience }, wallet: { balance: 0 } } }),
  } satisfies OverviewResponse;
}

describe("ExperienceStatus reward refresh", () => {
  it("keeps the newest server balance when a pre-reward request resolves last", async () => {
    const pending: Array<(response: OverviewResponse) => void> = [];
    const fetchMock = jest.fn(() => new Promise<OverviewResponse>((resolve) => pending.push(resolve)));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(createElement(LocaleProvider, null, createElement(ExperienceStatus)));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    act(() => window.dispatchEvent(new Event(MOTIVATION_UPDATED_EVENT)));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    await act(async () => { pending[1](overview(130)); });
    expect(screen.getByText("130 XP")).toBeInTheDocument();

    await act(async () => { pending[0](overview(100)); });
    expect(screen.getByText("130 XP")).toBeInTheDocument();
    expect(screen.queryByText("100 XP")).not.toBeInTheDocument();
  });
});
