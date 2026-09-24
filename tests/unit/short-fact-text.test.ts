import { shortFactText } from "@/modules/motivation/services/lily-facts.service";

describe("short fact cards", () => {
  it("keeps already concise facts intact", () => {
    expect(shortFactText("A short fact.")).toBe("A short fact.");
  });

  it("stops at a complete first sentence when possible", () => {
    const first = "This opening gives the reader one complete and interesting idea about literature.";
    expect(shortFactText(`${first} Another very long elaboration follows and should not fill the card.`, 100)).toBe(first);
  });

  it("truncates a long sentence at a word boundary", () => {
    const text = shortFactText("A longer fact with many words that keeps going well past the desired card length without a sentence ending", 75);
    expect(text.endsWith("…")).toBe(true);
    expect(text.length).toBeLessThanOrEqual(75);
  });
});
