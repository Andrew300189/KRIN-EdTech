/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createElement } from "react";
import { LocaleProvider } from "@/core/i18n/locale";
import { ExerciseRenderer } from "@/modules/lessons/components/ExerciseRenderer";
import type { LessonExercise } from "@/modules/lessons/components/lesson-content";
import { LessonAnswerStreakStatus } from "@/modules/motivation/components/LessonAnswerStreakStatus";

const baseExercise: LessonExercise = {
  id: "interaction-test", type: "TEXT_INPUT", engineKey: "text-input", variantKey: null,
  instruction: "Type the answer", question: "Complete: My name ___ Anna.",
  content: {}, correctAnswer: "is", explanation: null, hint: null, hintsEnabled: false,
  basePoints: 1, timeLimitSeconds: 50, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false,
};

describe("lesson card interactions", () => {
  it("submits a completed sentence builder with Enter", async () => {
    const onAttemptResolved = jest.fn();
    render(createElement(LocaleProvider, null, createElement(ExerciseRenderer, {
      exercise: { ...baseExercise, type: "SENTENCE_ORDER", engineKey: "sentence-builder", question: "Put every word in the right place.", content: { options: ["He", "is", "a", "doctor"] }, correctAnswer: ["He", "is", "a", "doctor"] },
      previewMode: true, onAttemptResolved,
    })));
    for (const word of ["He", "is", "a", "doctor"]) fireEvent.click(screen.getByRole("button", { name: word, exact: true }));
    const next = screen.getByRole("button", { name: "Next →" });
    await waitFor(() => expect(next).toHaveFocus());
    fireEvent.keyDown(next, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(onAttemptResolved).toHaveBeenCalledWith(expect.objectContaining({ isCorrect: true })));
  });

  it("substitutes wrong-layout physical keys in an English answer field", () => {
    render(createElement(LocaleProvider, null, createElement(ExerciseRenderer, { exercise: baseExercise, previewMode: true })));
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "ш", code: "KeyI" });
    expect(input).toHaveValue("i");
  });

  it("uses the compact form field for negative matching cards in later To Be modules", async () => {
    const onAttemptResolved = jest.fn();
    render(createElement(LocaleProvider, null, createElement(ExerciseRenderer, {
      exercise: {
        ...baseExercise, id: "negative-matching", type: "MATCHING", engineKey: "matching",
        question: "Take your time and match all ten pairs.",
        content: { left: ["She · here"], right: ["AREN'T — We aren't late.", "ISN'T — She isn't here.", "AM NOT — I am not tired."] },
        correctAnswer: { "She · here": "ISN'T — She isn't here." },
      },
      previewMode: true, onAttemptResolved,
    })));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "isn't" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(onAttemptResolved).toHaveBeenCalledWith(expect.objectContaining({ isCorrect: true })));
  });

  it("shows each matching choice once when several prompts share an answer", () => {
    render(createElement(LocaleProvider, null, createElement(ExerciseRenderer, {
      exercise: {
        ...baseExercise, id: "shared-matching-option", type: "MATCHING", engineKey: "matching",
        content: { left: ["Is she here?"], right: ["Yes, she is.", "Yes, she is.", "No, she isn't."] },
        correctAnswer: { "Is she here?": "Yes, she is." },
      },
      previewMode: true,
    })));
    expect(screen.getAllByRole("option", { name: "Yes, she is." })).toHaveLength(1);
  });

  it("shows one Water Lily icon and counts distinct owned capacities", () => {
    render(createElement(LocaleProvider, null, createElement(LessonAnswerStreakStatus, {
      correctAnswersInRow: 12,
      waterLilies: [{ capacity: 10, quantity: 21 }, { capacity: 15, quantity: 1 }, { capacity: 20, quantity: 1 }, { capacity: 25, quantity: 0 }],
    })));
    expect(screen.getByLabelText(/Water Lily types: 3|Видов кувшинок: 3|Видів латаття: 3/)).toHaveTextContent("🪷3");
    expect(screen.getAllByText("🪷")).toHaveLength(1);
  });
});
