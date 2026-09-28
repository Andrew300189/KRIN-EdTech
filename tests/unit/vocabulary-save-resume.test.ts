/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BagStoryBlock } from "@/modules/vocabulary/components/BagStoryBlock";
import { CourseVocabularyMasteryBlock } from "@/modules/vocabulary/components/CourseVocabularyMasteryBlock";
import { buildBagStoryStages } from "@/modules/vocabulary/utils/a-bag-story-plan";

jest.mock("@/core/i18n/locale", () => ({ useLocale: () => ({ locale: "uk" }) }));
jest.mock("@/modules/vocabulary/components/PronunciationCoach", () => ({
  PronunciationCoach: () => React.createElement("div", null, "Pronunciation"),
}));

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  window.localStorage.clear();
  jest.clearAllMocks();
});

it("returns directly to the saved bag-story card after lesson progress hydrates", async () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: {
      completed: false,
      progress: { completedStages: 8, totalStages: 78, incorrectAttempts: 0 },
      task: {
        stageIndex: 8, stepIndex: 1, stageKey: "saved-stage", kind: "BAG_PHRASE", mode: "CHOICE", code: "CE", cardNumber: 9,
        chunkCode: null, chunkLocal: null, sentenceMode: null, sentenceLocal: null, prompt: "Saved bag card",
        speakTarget: null, audioTarget: null, options: ["First choice", "Second choice", "Third choice", "Fourth choice"].map((label) => ({ id: label, label })), assembleWords: [], storyLines: [], stepCount: 2, failedLine: false,
        hintEnglish: null, reviewCheck: false,
      },
      speedWindow: null,
    } }),
  });
  global.fetch = fetchMock;
  const words = [{ wordId: "word-1", word: { lemma: "a bag of rice", meanings: [{ translation: "пакет рису", definition: "пакет рису" }] } }];
  const props = { lessonId: "bag-resume", settings: { engine: "bag-story" }, introWords: words, contentLocale: "uk" as const, canSaveProgress: true };
  const { rerender } = render(React.createElement(BagStoryBlock, { ...props, progressHydrated: false }));
  expect(screen.queryByRole("button", { name: "Почати" })).not.toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();

  rerender(React.createElement(BagStoryBlock, { ...props, progressHydrated: true, resumeOnEntry: true }));
  await waitFor(() => expect(screen.getByText("Saved bag card")).toBeInTheDocument());
  expect(screen.getByText("Saved bag card").closest(".vocabularyCard")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "First choice" }).parentElement).toHaveClass("choiceGrid");
  expect(screen.queryByRole("button", { name: "Почати" })).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("types the lesson's alphabet without changing the system layout", () => {
  const words = [{ wordId: "word-1", word: { lemma: "a bag of rice", meanings: [{ translation: "пакет рису", definition: "пакет рису" }] } }];
  window.localStorage.setItem("krin:bag-story-guest:bag-uk-input", JSON.stringify({ stageIndex: 3, stepIndex: 0 }));
  const { unmount } = render(React.createElement(BagStoryBlock, { lessonId: "bag-uk-input", settings: { engine: "bag-story" }, introWords: words, contentLocale: "uk", canSaveProgress: false }));
  fireEvent.click(screen.getByRole("button", { name: "Почати" }));
  const ukrainianAnswer = screen.getByRole("textbox");
  fireEvent.keyDown(ukrainianAnswer, { key: "g", code: "KeyG" });
  expect(ukrainianAnswer).toHaveValue("п");
  unmount();

  window.localStorage.setItem("krin:bag-story-guest:bag-en-input", JSON.stringify({ stageIndex: 2, stepIndex: 0 }));
  render(React.createElement(BagStoryBlock, { lessonId: "bag-en-input", settings: { engine: "bag-story" }, introWords: words, contentLocale: "uk", canSaveProgress: false }));
  fireEvent.click(screen.getByRole("button", { name: "Почати" }));
  const englishAnswer = screen.getByRole("textbox");
  fireEvent.keyDown(englishAnswer, { key: "ш", code: "KeyI" });
  expect(englishAnswer).toHaveValue("i");
});

it("keeps the assembly card compact and gives Clear a real secondary button", async () => {
  const words = [{ wordId: "word-1", word: { lemma: "a bag of rice", meanings: [{ translation: "пакет рису", definition: "пакет рису" }] } }];
  const stageIndex = buildBagStoryStages(["a bag of rice"], ["a bag of rice"]).findIndex((stage) => stage.kind === "BAG_SENTENCE_ASSEMBLE");
  window.localStorage.setItem("krin:bag-story-guest:bag-assembly", JSON.stringify({ stageIndex, stepIndex: 0 }));
  render(React.createElement(BagStoryBlock, { lessonId: "bag-assembly", settings: { engine: "bag-story" }, introWords: words, contentLocale: "uk", canSaveProgress: false }));
  fireEvent.click(screen.getByRole("button", { name: "Почати" }));
  expect(screen.getByText("Мені потрібен пакет рису.").closest(".assemblyCard")).toBeInTheDocument();
  const clear = screen.getByRole("button", { name: "Очистити" });
  expect(clear).toHaveClass("clearButton");
  fireEvent.click(screen.getByRole("button", { name: "I", exact: true }));
  expect(clear).toBeEnabled();
  fireEvent.click(clear);
  expect(clear).toBeDisabled();
  for (const word of ["I", "need", "a", "bag", "of", "rice"]) {
    fireEvent.click(screen.getByRole("button", { name: word, exact: true }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Перевірити" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Далі →" })).toBeInTheDocument());
  expect(screen.queryByRole("button", { name: "Очистити" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Перевірити" })).not.toBeInTheDocument();
});

it("returns directly to the saved vocabulary-mastery task", async () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: {
      completed: false,
      progress: { completedStages: 3, totalStages: 30, correctStages: 3, incorrectAttempts: 0 },
      task: {
        stageIndex: 3, stageKey: "saved-word", direction: "EN_RU", title: "Word 4", kind: "WORD",
        requiredConsecutive: 5, correctInRow: 2, inputLanguage: "uk",
        metaWords: [{ lemma: "a bottle of milk", lessonNumber: 1 }],
        words: [{ id: "word-4", lemma: "a bottle of milk", lessonNumber: 1, prompt: "Saved bottle card" }],
      },
    } }),
  });
  global.fetch = fetchMock;
  const words = [{ wordId: "word-1", word: { lemma: "a bottle of water", meanings: [{ translation: "пляшка води", definition: "пляшка води" }] } }];
  const props = { lessonId: "bottle-resume", introWords: words, contentLocale: "uk" as const, canSaveProgress: true };
  const { rerender } = render(React.createElement(CourseVocabularyMasteryBlock, { ...props, progressHydrated: false }));
  expect(screen.queryByRole("button", { name: "Почати" })).not.toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();

  rerender(React.createElement(CourseVocabularyMasteryBlock, { ...props, progressHydrated: true, resumeOnEntry: true }));
  await waitFor(() => expect(screen.getByText("Saved bottle card")).toBeInTheDocument());
  expect(screen.getByRole("region", { name: "Vocabulary mastery practice" })).toHaveClass("vocabularyCard");
  expect(screen.getByText("2 / 5")).toBeInTheDocument();
  const answerInput = screen.getByRole("textbox");
  fireEvent.keyDown(answerInput, { key: "g", code: "KeyG" });
  expect(answerInput).toHaveValue("п");
  expect(screen.queryByRole("button", { name: "Почати" })).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
