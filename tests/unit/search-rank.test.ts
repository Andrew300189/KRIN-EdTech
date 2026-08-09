import { calculateSearchRank, sortSearchResults } from "@/modules/search/utils/rank";

describe("search ranking", () => {
  test("exact match beats partial match", () => {
    const exact = calculateSearchRank({ query: "english", title: "english" });
    const partial = calculateSearchRank({ query: "english", title: "Business english for work" });
    expect(exact).toBeGreaterThan(partial);
  });

  test("mine boost increases score", () => {
    const base = calculateSearchRank({ query: "it", title: "English for IT" });
    const mine = calculateSearchRank({ query: "it", title: "English for IT", boosts: { mine: true } });
    expect(mine).toBeGreaterThan(base);
  });

  test("relevance sort uses score desc", () => {
    const sorted = sortSearchResults([
      { id: "1", type: "COURSE", title: "B", url: "/", score: 10 },
      { id: "2", type: "COURSE", title: "A", url: "/", score: 50 },
    ], "relevance");
    expect(sorted[0]?.id).toBe("2");
  });
});
