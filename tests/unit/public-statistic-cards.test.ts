import { buildPublicStatisticCards } from "@/modules/analytics/utils/public-statistic-cards";

describe("public platform statistic cards", () => {
  it("uses only canonical learning metrics and keeps their values intact", () => {
    const cards = buildPublicStatisticCards({
      registeredLearners: 12,
      masteredWords: 34,
      completedCourses: 5,
      completedLessons: 89,
    });

    expect(cards).toEqual([
      expect.objectContaining({ label: "Registered learners", value: 12 }),
      expect.objectContaining({ label: "Words mastered", value: 34 }),
      expect.objectContaining({ label: "Courses completed", value: 5 }),
      expect.objectContaining({ label: "Lessons completed", value: 89 }),
    ]);
    expect(cards.some((card) => card.label.includes("Improvement"))).toBe(false);
  });
});
