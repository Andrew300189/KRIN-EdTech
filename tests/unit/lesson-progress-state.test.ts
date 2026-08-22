import { resolveLessonProgressStatus } from "@/modules/lessons/utils/lesson-progress-state";

describe("resolveLessonProgressStatus", () => {
  it("keeps a completed lesson completed during a later practice visit", () => {
    expect(resolveLessonProgressStatus("COMPLETED", false, false)).toBe("COMPLETED");
  });

  it("completes a new lesson only after the learner finishes required blocks", () => {
    expect(resolveLessonProgressStatus("STARTED", true, true)).toBe("COMPLETED");
    expect(resolveLessonProgressStatus("STARTED", true, false)).toBe("STARTED");
  });
});
