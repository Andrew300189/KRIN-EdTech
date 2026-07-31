import { normalizeWord } from "@/modules/vocabulary/utils/normalize-word";

describe("vocabulary normalization", () => {
  it("normalizes case, whitespace, unicode apostrophes and hyphens", () => {
    expect(normalizeWord("  DON’T   re–enter  ")).toBe("don't re-enter");
  });

  it("keeps genuinely different spellings distinct", () => {
    expect(normalizeWord("resume")).not.toBe(normalizeWord("résumé"));
  });
});
