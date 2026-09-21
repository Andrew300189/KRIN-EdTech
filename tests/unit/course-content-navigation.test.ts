import { courseContentHref } from "@/modules/lessons/utils/course-content-navigation";

describe("course content navigation", () => {
  it("uses the canonical course route when a lesson has no localized prefix", () => {
    expect(courseContentHref("verb-to-be-masterclass")).toBe("/courses/verb-to-be-masterclass?content=open");
  });

  it("preserves the Ukrainian course route", () => {
    expect(courseContentHref("verb-to-be-masterclass", "/uk/courses/verb-to-be-masterclass/lessons"))
      .toBe("/uk/courses/verb-to-be-masterclass?content=open");
  });

  it("preserves a localized route even if its lesson prefix has a trailing slash", () => {
    expect(courseContentHref("verb-to-be-masterclass", "/ru/courses/verb-to-be-masterclass/lessons/"))
      .toBe("/ru/courses/verb-to-be-masterclass?content=open");
  });
});
