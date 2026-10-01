import { translateVerbToBeJsonToEnglish } from "@/modules/courses/localization/verb-to-be-english";

describe("legacy To Be English matching copy", () => {
  it("localizes the visible left item and the corresponding answer key together", () => {
    const left = translateVerbToBeJsonToEnglish(["Урок 11. Отрицания: am not, isn't, aren't"]);
    const answers = translateVerbToBeJsonToEnglish({ "Урок 11. Отрицания: am not, isn't, aren't": "am not" });
    expect(Object.keys(answers)).toEqual(left);
  });
});
