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
});
