/** @jest-environment jsdom */

import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LocaleProvider } from "@/core/i18n/locale";
import { DailyChestHeaderButton } from "@/modules/motivation/components/DailyChestHeaderButton";

describe("daily chest header refresh", () => {
  beforeEach(() => { window.localStorage.setItem("krin.locale", "en"); });

  it("updates an already claimed chest after the next midnight when the learner returns", async () => {
    let reset = false;
    const mockFetch = jest.fn().mockImplementation(async () => ({ ok: true, json: async () => ({ data: reset
      ? { available: true, nextAt: null }
      : { available: false, nextAt: new Date(Date.now() + 60_000).toISOString() } }) }));
    global.fetch = mockFetch as unknown as typeof fetch;
    render(createElement(LocaleProvider, null, createElement(DailyChestHeaderButton)));

    expect(await screen.findByRole("button", { name: /Next daily chest/ })).toBeDisabled();
    reset = true;
    fireEvent.focus(window);
    await waitFor(() => expect(screen.getByRole("button", { name: "Open daily chest" })).toBeEnabled());
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
