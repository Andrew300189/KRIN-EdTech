/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import "@testing-library/jest-dom";
import { LocaleProvider } from "@/core/i18n/locale";
import { LessonStreakRecoveryCard } from "@/modules/motivation/components/LessonStreakRecoveryCard";

describe("lesson Water Lily recovery prompt", () => {
  it("opens immediately for a broken lesson streak and uses the server result", async () => {
    const onResolved = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { restored: true, current: 8, recoverable: 0, exerciseId: "exercise-1", correctAnswer: "am", experience: 3 } }) }) as never;
    render(createElement(LocaleProvider, null, createElement(LessonStreakRecoveryCard, { lessonId: "lesson-1", brokenStreak: 7, lilies: [{ id: "water-lily", capacity: 10, quantity: 1 }], onResolved })));
    expect(screen.getByRole("dialog", { name: /answer streak paused|серия ответов прервана|серію відповідей перервано/i })).toHaveAttribute("aria-modal", "true");
    fireEvent.click(screen.getByRole("button", { name: /restore streak|восстановить серию|відновити серію/i }));
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith(expect.objectContaining({ current: 8, exerciseId: "exercise-1", correctAnswer: "am" })));
    expect(global.fetch).toHaveBeenCalledWith("/api/learning/lessons/lesson-1/answer-streak", expect.objectContaining({ method: "POST" }));
  });

  it("offers restoration using two lower-tier lilies for a longer streak", () => {
    render(createElement(LocaleProvider, null, createElement(LessonStreakRecoveryCard, {
      lessonId: "lesson-2", brokenStreak: 12, lilies: [{ id: "water-lily", capacity: 10, quantity: 21 }], onResolved: jest.fn(),
    })));
    expect(screen.getByRole("button", { name: /restore streak|восстановить серию|відновити серію/i })).toBeEnabled();
    expect(screen.getByText(/2 × 10/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /get a water lily|купить кувшинку|купити латаття/i })).not.toBeInTheDocument();
  });
});
