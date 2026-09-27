/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { BagStoryBlock } from "@/modules/vocabulary/components/BagStoryBlock";
import { BAG_CHUNK_STAGE_SPAN, buildBagStoryStages } from "@/modules/vocabulary/utils/a-bag-story-plan";

jest.mock("@/modules/vocabulary/components/PronunciationCoach", () => ({
  PronunciationCoach: ({ word, onAssessment }: { word: string; onAssessment: (value: { value: { verdict: string; similarity: number }; transcript: string }) => void }) => React.createElement("button", { type: "button", onClick: () => onAssessment({ value: { verdict: "MATCH", similarity: 1 }, transcript: word }) }, "Record phrase"),
}));

const introWords = [
  ["a bag of rice", "пакет рису"],
  ["a bag of flour", "пакет борошна"],
  ["a bag of apples", "пакет яблук"],
  ["a bag of carrots", "пакет моркви"],
  ["a bag of oranges", "пакет апельсинів"],
].map(([lemma, translation], index) => ({ wordId: `word-${index}`, word: { lemma, meanings: [{ translation, definition: translation }] } }));

describe("Bag story guest preview", () => {
  beforeEach(() => window.localStorage.clear());

  it("starts with a speaking card and shows a new card only after Next", async () => {
    const onGuestLimitReached = jest.fn();
    render(React.createElement(BagStoryBlock, { lessonId: "bag-guest-test", settings: { engine: "bag-story" }, introWords, contentLocale: "uk", canSaveProgress: false, guestStageLimit: 2, onGuestLimitReached }));
    expect(screen.getByText("5 фраз цього уроку")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Почати" }));
    expect(screen.getByText("a bag of rice", { selector: "p" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Record phrase" }));
    expect(screen.getByRole("button", { name: "Далі →" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Далі →" }));
    fireEvent.click(screen.getByRole("button", { name: "пакет рису" }));
    await waitFor(() => expect(onGuestLimitReached).toHaveBeenCalledWith(2));
    expect(JSON.parse(window.localStorage.getItem("krin:bag-story-guest:bag-guest-test") ?? "{}").stageIndex).toBe(2);
  });

  it("uses one hidden recall check for an already mastered chunk", async () => {
    const stages = buildBagStoryStages(introWords.map((item) => item.word.lemma), introWords.map((item) => item.word.lemma));
    const checkIndex = stages.findIndex((stage) => stage.wordOrdinal === 1 && stage.kind === "BAG_CHUNK" && stage.storyIndex === 1 && stage.chunkCode === "INTRO");
    window.localStorage.setItem("krin:bag-story-guest:bag-recall-test", JSON.stringify({ stageIndex: checkIndex, stepIndex: 0, masteredChunks: ["i need"] }));
    render(React.createElement(BagStoryBlock, { lessonId: "bag-recall-test", settings: { engine: "bag-story" }, introWords, contentLocale: "uk", canSaveProgress: false }));
    fireEvent.click(screen.getByRole("button", { name: "Почати" }));
    expect(screen.getByText("Мені потрібен", { selector: "p" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Record phrase" }));
    fireEvent.click(screen.getByRole("button", { name: "Далі →" }));
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem("krin:bag-story-guest:bag-recall-test") ?? "{}").stageIndex).toBe(checkIndex + BAG_CHUNK_STAGE_SPAN));
  });
});
