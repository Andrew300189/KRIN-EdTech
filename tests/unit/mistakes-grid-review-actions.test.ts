/** @jest-environment jsdom */

import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MistakesGrid } from "@/app/profile/mistakes/MistakesGrid";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => "/student/mistakes" }));

const mistake = {
  id: "mistake-1",
  occurrenceCount: 1,
  lastOccurredAt: "2026-10-01T12:00:00.000Z",
  question: "Complete the sentence",
  lesson: { title: "First lesson", slug: "first-lesson", course: { slug: "to-be", title: "To be", levelCode: "A1" } },
};

describe("My Mistakes review buttons", () => {
  beforeEach(() => mockPush.mockReset());

  it.each([
    ["Fix this lesson", { scope: "COURSE", courseSlug: "to-be", startMistakeId: "mistake-1" }],
    ["Fix all mistakes", { scope: "ALL" }],
  ])("starts the reward-bearing review run from %s", async (buttonName, body) => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { nextUrl: "/courses/to-be/lessons/first-lesson?reviewRun=run-1" } }) });
    global.fetch = mockFetch as unknown as typeof fetch;
    render(createElement(MistakesGrid, { mistakes: [mistake] }));

    fireEvent.click(screen.getByRole("button", { name: new RegExp(buttonName) }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/courses/to-be/lessons/first-lesson?reviewRun=run-1"));
    expect(mockFetch).toHaveBeenCalledWith("/api/profile/mistakes/review-runs", expect.objectContaining({
      method: "POST", body: JSON.stringify(body),
    }));
  });
});
