/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { PronunciationCoach } from "@/modules/vocabulary/components/PronunciationCoach";

it("offers a no-XP, streak-safe advance only after three failed recognitions", async () => {
  const attempts: Array<{ onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null }> = [];
  class FakeRecognition {
    lang = "";
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onresult = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    constructor() { attempts.push(this); }
    start() { /* controlled by the test */ }
    abort() { /* cleanup */ }
  }
  const browser = window as typeof window & { webkitSpeechRecognition?: typeof FakeRecognition };
  browser.webkitSpeechRecognition = FakeRecognition;
  const onSkip = jest.fn();
  try {
    render(React.createElement(PronunciationCoach, { word: "a bag of rice", locale: "uk", onSkip }));
    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "🎙 Повторити вголос" }));
      act(() => { attempts[index]!.onerror?.({ error: "no-speech" }); attempts[index]!.onend?.(); });
      if (index < 2) expect(screen.queryByRole("button", { name: "Далі без XP" })).not.toBeInTheDocument();
    }
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Далі без XP" })); });
    expect(onSkip).toHaveBeenCalledTimes(1);
  } finally {
    delete browser.webkitSpeechRecognition;
  }
});
