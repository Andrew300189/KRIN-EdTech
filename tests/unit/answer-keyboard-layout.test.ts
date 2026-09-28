import { characterForWrongAnswerLayout } from "@/modules/lessons/utils/answer-keyboard-layout";

describe("answer field keyboard layout fallback", () => {
  it("types English letters from physical keys when Cyrillic layout is active", () => {
    expect(characterForWrongAnswerLayout("en", "ш", "KeyI")).toBe("i");
    expect(characterForWrongAnswerLayout("en", "І", "KeyS")).toBe("S");
    expect(characterForWrongAnswerLayout("en", "ф", "KeyA")).toBe("a");
  });

  it("does not alter correct letters, shortcuts or non-letter keys", () => {
    expect(characterForWrongAnswerLayout("en", "i", "KeyI")).toBeNull();
    expect(characterForWrongAnswerLayout("en", "Enter", "Enter")).toBeNull();
    expect(characterForWrongAnswerLayout("en", "ш", "Unidentified")).toBeNull();
  });

  it("supports Russian and Ukrainian answer fields in the other direction", () => {
    expect(characterForWrongAnswerLayout("uk", "s", "KeyS")).toBe("і");
    expect(characterForWrongAnswerLayout("ru", "s", "KeyS")).toBe("ы");
    expect(characterForWrongAnswerLayout("uk", "g", "Backslash")).toBe("ґ");
    expect(characterForWrongAnswerLayout("uk", "\\", "Backslash")).toBe("ґ");
    expect(characterForWrongAnswerLayout("uk", "]", "BracketRight")).toBe("ї");
    expect(characterForWrongAnswerLayout("uk", "ы", "KeyS")).toBe("і");
    expect(characterForWrongAnswerLayout("ru", "і", "KeyS")).toBe("ы");
    expect(characterForWrongAnswerLayout("uk", "G", "KeyG", true)).toBe("П");
    expect(characterForWrongAnswerLayout("uk", "п", "KeyG")).toBeNull();
  });
});
