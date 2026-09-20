import { findCourseContinuationLesson } from "@/modules/courses/utils/course-continuation";

const lessons = [{ id: "lesson-1" }, { id: "lesson-2" }, { id: "lesson-3" }];

function progress(entries: Array<[string, string, number, string?]>) {
  return new Map(entries.map(([lessonId, status, completionPercent, lastSeenAt]) => [lessonId, {
    lessonId,
    status,
    completionPercent,
    lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : undefined,
  }]));
}

describe("course continuation target", () => {
  it("resumes the most recently studied unfinished lesson", () => {
    const result = findCourseContinuationLesson(
      lessons,
      new Map(lessons.map((lesson) => [lesson.id, { allowed: true }])),
      progress([
        ["lesson-1", "STARTED", 35, "2026-09-01T10:00:00.000Z"],
        ["lesson-2", "STARTED", 60, "2026-09-02T10:00:00.000Z"],
      ]),
    );

    expect(result?.id).toBe("lesson-2");
  });

  it("returns the exact completed lesson whose wheel is blocking the next one", () => {
    const result = findCourseContinuationLesson(
      lessons,
      new Map([
        ["lesson-1", { allowed: true }],
        ["lesson-2", { allowed: false, reason: "WHEEL_REQUIRED" }],
        ["lesson-3", { allowed: false, reason: "WHEEL_REQUIRED" }],
      ]),
      progress([["lesson-1", "COMPLETED", 100, "2026-09-02T10:00:00.000Z"]]),
    );

    expect(result?.id).toBe("lesson-1");
  });

  it("does not fall back to lesson one after a fully resolved course", () => {
    const result = findCourseContinuationLesson(
      lessons,
      new Map(lessons.map((lesson) => [lesson.id, { allowed: true }])),
      progress(lessons.map((lesson) => [lesson.id, "COMPLETED", 100, "2026-09-02T10:00:00.000Z"])),
    );

    expect(result).toBeNull();
  });
});
