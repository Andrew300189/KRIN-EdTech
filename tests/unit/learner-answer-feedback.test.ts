import { learnerAnswerFeedback } from "@/core/i18n/learner-answer-feedback";

describe("learnerAnswerFeedback", () => {
  it.each([
    ["en", "Well done!", "Correct answer:"],
    ["ru", "Отлично!", "Правильный ответ:"],
    ["uk", "Чудово!", "Правильна відповідь:"],
  ] as const)("uses the same short answer feedback for %s", (locale, wellDone, correctAnswer) => {
    const feedback = learnerAnswerFeedback(locale);

    expect(feedback.wellDone).toBe(wellDone);
    expect(feedback.correctAnswer).toBe(correctAnswer);
  });

  it("formats integer and fractional XP without technical text", () => {
    const feedback = learnerAnswerFeedback("ru");

    expect(feedback.xpAwarded(2)).toBe("+2 XP");
    expect(feedback.xpAwarded(1.5)).toBe("+1.5 XP");
  });
});
