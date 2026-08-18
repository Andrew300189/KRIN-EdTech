import {
  getLessonTemplateDefinition,
  LESSON_TEMPLATE_CATALOG,
} from "@/modules/cms/data/lesson-template-catalog";

describe("lesson template catalogue", () => {
  it("resolves the reusable grammar blueprint without copying a lesson", () => {
    const template = getLessonTemplateDefinition("grammar-typical-lesson-v1");

    expect(template).toEqual(
      expect.objectContaining({
        key: "grammar-typical-lesson-v1",
        title: "Grammar Typical Lesson",
        exerciseCount: 7,
      }),
    );
    expect(LESSON_TEMPLATE_CATALOG).toContain(template);
  });

  it("does not accept an unknown template key", () => {
    expect(getLessonTemplateDefinition("unknown-template")).toBeNull();
  });
});
