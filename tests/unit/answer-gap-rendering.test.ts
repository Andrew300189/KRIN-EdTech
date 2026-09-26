import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExerciseRenderer, renderAnswerGaps } from "@/modules/lessons/components/ExerciseRenderer";
import type { LessonExercise } from "@/modules/lessons/components/lesson-content";
import { LocaleProvider } from "@/core/i18n/locale";

describe("lesson answer gaps", () => {
  it("renders the legacy middle dot as an underlined word gap", () => {
    const html = renderToStaticMarkup(createElement("span", null, renderAnswerGaps("My parents · at work", "uk", true)));
    expect(html).not.toContain("·");
    expect(html).toContain('aria-label="пропущене слово"');
    expect(html).toContain("My parents ");
    expect(html).toContain(" at work");
  });

  it("renders authored underscores as a gap without altering ordinary dots", () => {
    const html = renderToStaticMarkup(createElement("span", null, renderAnswerGaps("She ___ here. Next · topic.", "en")));
    expect(html).toContain('aria-label="missing word"');
    expect(html).toContain("Next · topic.");
  });
});

describe("sentence-builder card heading", () => {
  it("hides the redundant legacy prompt while keeping the word tiles", () => {
    const exercise: LessonExercise = {
      id: "word-order-1", type: "SENTENCE_ORDER", engineKey: "sentence-builder", variantKey: null,
      instruction: "Build the sentence in natural English word order.", question: "Put every word in the right place.",
      content: { options: ["He", "is", "a", "doctor"] }, explanation: null, hint: null, hintsEnabled: false,
      basePoints: 1, timeLimitSeconds: 50, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false,
      correctAnswer: ["He", "is", "a", "doctor"],
    };
    const html = renderToStaticMarkup(createElement(LocaleProvider, null,
      createElement(ExerciseRenderer, { exercise, active: false, previewMode: true })));
    expect(html).not.toContain("Put every word in the right place.");
    expect(html).toContain("Build the sentence in natural English word order.");
    expect(html).toContain("doctor");
  });
});
