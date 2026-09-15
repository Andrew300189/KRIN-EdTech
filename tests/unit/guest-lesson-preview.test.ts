import { buildGuestLessonPreviewPlan, guestPreviewUnitsForBlock } from "@/modules/lessons/utils/guest-lesson-preview";

describe("guest lesson preview", () => {
  it("allocates the first half of learner actions in authored order", () => {
    const plan = buildGuestLessonPreviewPlan([
      { id: "reading", type: "TEXT", exercises: [], settings: {} },
      { id: "practice", type: "EXERCISE", exercises: [{}, {}, {}, {}], settings: {} },
      { id: "wrap-up", type: "TEXT", exercises: [], settings: {} },
    ]);

    expect(plan).toEqual({
      totalUnits: 6,
      freeUnits: 3,
      allowedUnitsByBlockId: { reading: 1, practice: 2, "wrap-up": 0 },
    });
  });

  it("treats vocabulary mastery stages as learner actions", () => {
    const block = {
      id: "vocabulary",
      type: "VOCABULARY",
      exercises: [],
      settings: { engine: "vocabulary-mastery", newWordCount: 4, cumulativeWordCount: 4 },
    };

    expect(guestPreviewUnitsForBlock(block)).toBe(20);
    expect(buildGuestLessonPreviewPlan([block]).allowedUnitsByBlockId.vocabulary).toBe(10);
  });
});
