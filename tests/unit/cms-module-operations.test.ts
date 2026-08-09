import { createModuleSchema, updateModuleSchema } from "@/modules/courses/schemas/content.schemas";
import { validateCourseModuleOrder } from "@/modules/cms/services/module-operations.service";

describe("CMS module operations", () => {
  const first = "clx9q1y5j0000q2v4gl4p4x2a";
  const second = "clx9q1y5j0001q2v4gl4p4x2a";

  it("accepts module learning rules with a bounded completion requirement", () => {
    expect(createModuleSchema.safeParse({ title: "Module 2", isRequired: true, requiresSequentialCompletion: true, unlockAfterModuleId: first, requiredCompletionPercent: 80 }).success).toBe(true);
    expect(updateModuleSchema.safeParse({ requiredCompletionPercent: 101 }).success).toBe(false);
  });

  it("keeps an explicit prerequisite before its dependent module", () => {
    expect(() => validateCourseModuleOrder([
      { id: first, unlockAfterModuleId: null },
      { id: second, unlockAfterModuleId: first },
    ], [first, second])).not.toThrow();
    expect(() => validateCourseModuleOrder([
      { id: first, unlockAfterModuleId: null },
      { id: second, unlockAfterModuleId: first },
    ], [second, first])).toThrow("prerequisite");
  });

  it("rejects incomplete or foreign module order lists", () => {
    expect(() => validateCourseModuleOrder([{ id: first, unlockAfterModuleId: null }], [])).toThrow("every course module");
    expect(() => validateCourseModuleOrder([{ id: first, unlockAfterModuleId: null }], [second])).toThrow("course");
  });
});
