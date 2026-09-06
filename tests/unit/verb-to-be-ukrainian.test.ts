import { translateVerbToBeJsonToUkrainian, translateVerbToBeTextToUkrainian } from "@/modules/courses/localization/verb-to-be-ukrainian";

describe("legacy To Be Ukrainian learner copy", () => {
  it("translates feedback without changing the English answer", () => {
    expect(translateVerbToBeTextToUkrainian("Правильный ответ: are.")).toBe("Правильна відповідь: are.");
    expect(translateVerbToBeTextToUkrainian("I am ready.")).toBe("I am ready.");
  });

  it("translates Russian explanatory text nested in exercise content", () => {
    expect(translateVerbToBeJsonToUkrainian({ prompt: "Впишите пропущенное слово: I ___ ready." })).toEqual({
      prompt: "Впишіть пропущене слово: I ___ ready.",
    });
  });

  it("translates the legacy course title and summary", () => {
    expect(translateVerbToBeTextToUkrainian("Глагол to be: Present Simple для A1")).toBe("Дієслово to be: Present Simple для A1");
    expect(translateVerbToBeTextToUkrainian("Полный A1-курс по to be: утверждения, отрицания и вопросы в 40 интерактивных уроках по 20 минут.")).toBe("Повний A1-курс з to be: твердження, заперечення та запитання у 40 інтерактивних уроках по 20 хвилин.");
  });
});
