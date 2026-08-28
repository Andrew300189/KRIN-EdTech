import { secondsUntilNextUtcDay, translationCacheKey } from "@/modules/vocabulary/services/translation-cache.service";

describe("translation cache helpers", () => {
  it("uses the same private key for equivalent term spelling", () => {
    expect(translationCacheKey("  Ready   to go ", "en", "ru"))
      .toBe(translationCacheKey("ready to go", "EN", "RU"));
  });

  it("separates translations by target language without storing the phrase in the key", () => {
    const russianKey = translationCacheKey("private phrase", "en", "ru");
    const ukrainianKey = translationCacheKey("private phrase", "en", "uk");
    expect(russianKey).not.toBe(ukrainianKey);
    expect(russianKey).not.toContain("private phrase");
  });

  it("expires entries at the next UTC day", () => {
    expect(secondsUntilNextUtcDay(new Date("2026-08-28T23:59:30.000Z"))).toBe(30);
    expect(secondsUntilNextUtcDay(new Date("2026-08-28T12:00:00.000Z"))).toBe(43_200);
  });
});
