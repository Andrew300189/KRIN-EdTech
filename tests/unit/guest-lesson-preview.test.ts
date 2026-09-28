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

  it("counts each short bag-story phrase block as five actions", () => {
    const blocks = Array.from({ length: 5 }, (_, partIndex) => ({ id: `phrase-${partIndex}`, type: "VOCABULARY", exercises: Array.from({ length: 5 }), settings: { engine: "bag-story", version: 3, partIndex } }));
    const plan = buildGuestLessonPreviewPlan(blocks);
    expect(plan.totalUnits).toBe(25);
    expect(plan.freeUnits).toBe(13);
    expect(plan.allowedUnitsByBlockId).toEqual({ "phrase-0": 5, "phrase-1": 5, "phrase-2": 3, "phrase-3": 0, "phrase-4": 0 });
  });
});
