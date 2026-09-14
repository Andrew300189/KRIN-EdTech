import { assessPronunciation, normalizePronunciationText } from "@/modules/vocabulary/utils/pronunciation";

describe("vocabulary pronunciation feedback", () => {
  it("normalizes punctuation, accents and apostrophe variants only for speech matching", () => {
    expect(normalizePronunciationText("  Résumé — DON'T! ")).toBe("resume dont");
  });

  it("accepts an exact recognized word", () => {
    expect(assessPronunciation("Beautiful", "beautiful").verdict).toBe("MATCH");
  });

  it("marks a close multi-word transcript for another try instead of failing practice", () => {
    expect(assessPronunciation("take care", "take kare").verdict).toBe("CLOSE");
  });

  it("does not accept a different short word as a match", () => {
    expect(assessPronunciation("cat", "cut").verdict).toBe("RETRY");
  });
});
