import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderAnswerGaps } from "@/modules/lessons/components/ExerciseRenderer";

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
