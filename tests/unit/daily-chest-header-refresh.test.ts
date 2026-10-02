/** @jest-environment jsdom */

import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LocaleProvider } from "@/core/i18n/locale";
import { DailyChestHeaderButton } from "@/modules/motivation/components/DailyChestHeaderButton";

describe("daily chest header refresh", () => {
  beforeEach(() => { window.localStorage.setItem("krin.locale", "en"); });

  it("updates an initially lesson-locked chest when the learner returns to the tab", async () => {
    let completed = false;
    const mockFetch = jest.fn().mockImplementation(async () => ({ ok: true, json: async () => ({ data: completed
      ? { available: true, lessonRequired: false, nextAt: null }
      : { available: false, lessonRequired: true, nextAt: null } }) }));
    global.fetch = mockFetch as unknown as typeof fetch;
    render(createElement(LocaleProvider, null, createElement(DailyChestHeaderButton)));

    expect(await screen.findByRole("button", { name: "Complete one lesson to unlock today's chest" })).toBeDisabled();
    completed = true;
    fireEvent.focus(window);
    await waitFor(() => expect(screen.getByRole("button", { name: "Open daily chest" })).toBeEnabled());
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
