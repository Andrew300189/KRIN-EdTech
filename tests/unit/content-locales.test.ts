import {
  contentLocales,
  defaultContentLocale,
  isContentLocale,
  isTranslatableContentLocale,
  normalizeContentLocale,
} from "@/modules/courses/localization/content-locales";

describe("course content locales", () => {
  it("uses English as the canonical fallback", () => {
    expect(normalizeContentLocale(undefined)).toBe(defaultContentLocale);
    expect(normalizeContentLocale("unsupported-locale")).toBe(defaultContentLocale);
  });

  it("normalizes regional browser and route locale values", () => {
    expect(normalizeContentLocale("UK-ua")).toBe("uk");
    expect(normalizeContentLocale(" ru ")).toBe("ru");
  });

  it("keeps the supported locale registry closed and deterministic", () => {
    expect(contentLocales).toEqual(["en", "uk", "ru", "es", "fr", "it", "de", "pt", "pl"]);
    expect(isContentLocale("uk")).toBe(true);
    expect(isContentLocale("ja")).toBe(false);
  });

  it("does not create a duplicate translation row for English", () => {
    expect(isTranslatableContentLocale("en")).toBe(false);
    expect(isTranslatableContentLocale("uk-UA")).toBe(true);
  });
});
