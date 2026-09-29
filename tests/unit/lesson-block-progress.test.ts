import { lessonBlockProgressFractions, lessonProgressPercent } from "@/modules/lessons/utils/lesson-block-progress";

const blocks = Array.from({ length: 12 }, (_, index) => ({
  id: `block-${index + 1}`,
  exerciseIds: [`exercise-${index + 1}-1`, `exercise-${index + 1}-2`],
  isBagStory: true,
}));

describe("lesson block timeline", () => {
  it("shows one segment per block and counts partial work in the current block", () => {
    const fractions = lessonBlockProgressFractions(
      blocks,
      ["block-1", "block-2"],
      new Set<string>(),
      { blockId: "block-3", completedStages: 3, totalStages: 10 },
    );
    expect(fractions).toHaveLength(12);
    expect(fractions.slice(0, 4)).toEqual([1, 1, 0.3, 0]);
    expect(lessonProgressPercent(fractions)).toBe(19);
  });

  it("uses saved exercise attempts until the active story stage count is loaded", () => {
    const fractions = lessonBlockProgressFractions(
      blocks,
      ["block-1"],
      new Set(["exercise-2-1"]),
      null,
    );
    expect(fractions.slice(0, 3)).toEqual([1, 0.5, 0]);
    expect(lessonProgressPercent(fractions)).toBe(13);
  });

  it("never double-counts a completed block and reports 100% only for all complete", () => {
    const fractions = lessonBlockProgressFractions(
      blocks,
      blocks.map((block) => block.id),
      new Set(["exercise-1-1"]),
      { blockId: "block-1", completedStages: 3, totalStages: 10 },
    );
    expect(fractions).toEqual(Array(12).fill(1));
    expect(lessonProgressPercent(fractions)).toBe(100);
    expect(lessonProgressPercent([])).toBe(0);
  });
});
