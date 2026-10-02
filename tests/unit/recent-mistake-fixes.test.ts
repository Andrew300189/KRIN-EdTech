/** @jest-environment jsdom */

import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LocaleProvider } from "@/core/i18n/locale";
import { RecentMistakeFixes } from "@/app/(student)/student/RecentMistakeFixes";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

describe("dashboard Fix shortcuts", () => {
  beforeEach(() => { mockPush.mockReset(); window.localStorage.setItem("krin.locale", "en"); });

  it("shows only Fix squares and starts correction for the selected mistake", async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { nextUrl: "/courses/to-be/lessons/one?reviewRun=run-1" } }) });
    global.fetch = mockFetch as unknown as typeof fetch;
    const { container } = render(createElement(LocaleProvider, null, createElement(RecentMistakeFixes, { mistakes: [
      { id: "mistake-1", lesson: { courseSlug: "to-be" } },
      { id: "mistake-2", lesson: { courseSlug: "to-be" } },
    ] })));

    expect(screen.getAllByText("Fix")).toHaveLength(2);
    expect(container.querySelectorAll("li > button")).toHaveLength(2);
    expect(container.querySelectorAll("li span, li strong, li small")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Fix mistake 2" }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/courses/to-be/lessons/one?reviewRun=run-1"));
    expect(mockFetch).toHaveBeenCalledWith("/api/profile/mistakes/review-runs", expect.objectContaining({
      method: "POST", body: JSON.stringify({ scope: "COURSE", courseSlug: "to-be", startMistakeId: "mistake-2" }),
    }));
  });
});
