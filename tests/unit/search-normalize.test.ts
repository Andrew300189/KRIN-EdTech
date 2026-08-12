import {
  escapeLike,
  normalizeSearchQuery,
} from "@/modules/search/utils/normalize-query";

describe("search query normalization", () => {
  test("trims and collapses spaces", () => {
    expect(normalizeSearchQuery("   english    for   IT   ")).toBe(
      "english for IT",
    );
  });

  test("limits length", () => {
    const value = "a".repeat(300);
    expect(normalizeSearchQuery(value)).toHaveLength(150);
  });

  test("escapes like wildcards", () => {
    expect(escapeLike("100%_ok")).toBe("100\\%\\_ok");
  });
});
