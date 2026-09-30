import { firstIncompleteRequiredBlockId, hasReachedLessonCompletion, isLessonProgressComplete, lessonEntryBlockId, resolveLessonProgressStatus, unfinishedLessonEntryBlockId } from "@/modules/lessons/utils/lesson-progress-state";

describe("lesson completion state", () => {
  it("keeps a completed lesson completed during a later practice visit", () => {
    expect(resolveLessonProgressStatus("COMPLETED", false, false)).toBe("COMPLETED");
  });

  it("opens a completed lesson at its first block instead of the saved ending", () => {
    const blocks = ["intro", "theory", "exercise"];

    expect(lessonEntryBlockId({ status: "COMPLETED", completionPercent: 100 }, blocks, "exercise")).toBe("intro");
    expect(lessonEntryBlockId({ status: "STARTED", completionPercent: 100 }, blocks, "exercise")).toBe("intro");
    expect(lessonEntryBlockId({ status: "STARTED", completionPercent: 50 }, blocks, "exercise")).toBe("exercise");
  });

  it("completes a new lesson only after the learner finishes required blocks", () => {
    expect(resolveLessonProgressStatus("STARTED", true, true)).toBe("COMPLETED");
    expect(resolveLessonProgressStatus("STARTED", true, false)).toBe("STARTED");
  });

  it("returns to a required block skipped before the saved final step", () => {
    const blocks = [
      { id: "theory", isRequired: true },
      { id: "practice-one", isRequired: true },
      { id: "practice-two", isRequired: true },
      { id: "final", isRequired: true },
    ];

    expect(firstIncompleteRequiredBlockId(blocks, ["practice-one", "practice-two", "final"])).toBe("theory");
    expect(unfinishedLessonEntryBlockId(blocks, ["practice-one", "practice-two", "final"], "final")).toBe("theory");
    expect(unfinishedLessonEntryBlockId(blocks, ["theory"], "practice-one")).toBe("practice-one");
    expect(firstIncompleteRequiredBlockId(blocks, blocks.map((block) => block.id))).toBeNull();
  });

  it("keeps a historical 100% lesson available even when its terminal status was not saved", () => {
    const legacyProgress = { status: "STARTED" as const, completionPercent: 100 };

    expect(isLessonProgressComplete(legacyProgress)).toBe(true);
    expect(hasReachedLessonCompletion(legacyProgress, 100)).toBe(true);
  });

  it("honours a configured prerequisite percentage without requiring an unrelated terminal status", () => {
    const inProgress = { status: "STARTED" as const, completionPercent: 80 };

    expect(hasReachedLessonCompletion(inProgress, 75)).toBe(true);
    expect(hasReachedLessonCompletion(inProgress, 81)).toBe(false);
  });
});
