import { createLessonSchema, lessonTypeSchema, updateLessonSchema } from "@/modules/courses/schemas/content.schemas";
import { validateLessonOrder } from "@/modules/cms/services/lesson-operations.service";

describe("CMS lesson operations", () => {
  const first = "clx9q1y5j0000q2v4gl4p4x2a";
  const second = "clx9q1y5j0001q2v4gl4p4x2a";

  it("supports all managed lesson types and safe learner-flow defaults", () => {
    for (const type of ["THEORY", "PRACTICE", "VOCABULARY", "GRAMMAR", "READING", "LISTENING", "WRITING", "TEST", "PROJECT", "MIXED"]) {
      expect(lessonTypeSchema.safeParse(type).success).toBe(true);
    }
    const lesson = createLessonSchema.parse({ title: "Practice", type: "PRACTICE" });
    expect(lesson.autoUnlockNextLesson).toBe(true);
    expect(lesson.requiredPrerequisiteCompletion).toBe(100);
    expect(updateLessonSchema.safeParse({ requiredPrerequisiteCompletion: 101 }).success).toBe(false);
  });

  it("keeps prerequisite lessons before their dependent lessons", () => {
    const lessons = [
      { id: first, order: 1, prerequisiteLessonId: null },
      { id: second, order: 2, prerequisiteLessonId: first },
    ];
    expect(() => validateLessonOrder(lessons, [first, second])).not.toThrow();
    expect(() => validateLessonOrder(lessons, [second, first])).toThrow("prerequisite");
  });

  it("rejects a foreign, duplicate or incomplete lesson order", () => {
    const lessons = [{ id: first, order: 1, prerequisiteLessonId: null }];
    expect(() => validateLessonOrder(lessons, [])).toThrow("every lesson");
    expect(() => validateLessonOrder(lessons, [second])).toThrow("current module");
    expect(() => validateLessonOrder(lessons, [first, first])).toThrow("every lesson");
  });
});
