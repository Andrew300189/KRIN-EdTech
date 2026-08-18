import { preventNumericKey, sanitizeLanguageValue, splitLanguageLines } from "@/modules/cms/utils/language-input";

describe("language-only CMS input", () => {
  it("removes numeric characters while preserving language punctuation", () => {
    expect(sanitizeLanguageValue("A2: she doesn't go!")).toBe("A: she doesn't go!");
  });

  it("splits and cleans language values", () => {
    expect(splitLanguageLines("first\nsecond2\n\nthird")).toEqual(["first", "second", "third"]);
  });

  it("blocks direct numeric key presses", () => {
    const preventDefault = jest.fn();
    preventNumericKey({ key: "4", preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
