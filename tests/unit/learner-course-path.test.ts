import { learnerCourseContinueHref, learnerCourseToContinue } from "@/modules/courses/utils/learner-course-path";

describe("learner continuation route", () => {
  it("resumes the most recently studied course before untouched courses", () => {
    const courses = [
      { slug: "new-course", nextLesson: { slug: "start" }, lastActivityAt: null },
      { slug: "studied-course", nextLesson: { slug: "next" }, lastActivityAt: "2026-09-25T10:00:00.000Z" },
    ];
    const selected = learnerCourseToContinue(courses);
    expect(selected?.slug).toBe("studied-course");
    expect(selected && learnerCourseContinueHref(selected)).toBe("/courses/studied-course/lessons/next");
  });

  it("falls back to an unfinished course and then the catalogue", () => {
    expect(learnerCourseToContinue([{ slug: "finished", nextLesson: null, lastActivityAt: null }, { slug: "ready", nextLesson: { slug: "one" }, lastActivityAt: null }])?.slug).toBe("ready");
    expect(learnerCourseToContinue([])).toBeNull();
  });
});
