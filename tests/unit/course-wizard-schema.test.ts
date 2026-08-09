import { createCourseSchema, updateCourseSchema } from "@/modules/courses/schemas/content.schemas";

const baseCourse = {
  levelCode: "A1" as const,
  categorySlug: "grammar",
  title: "Present Simple Essentials",
  shortDescription: "Build accurate A1 Present Simple sentences.",
};

describe("CMS course creation wizard schema", () => {
  it("persists canonical access, author and display settings on a course", () => {
    const parsed = createCourseSchema.parse({
      ...baseCourse,
      courseType: "EXAM_PREP",
      accessMode: "ONE_TIME_PURCHASE",
      priceAmount: 1999,
      priceCurrency: "USD",
      instructorId: "clx9q1y5j0000q2v4gl4p4x2a",
      isVisibleInCatalog: false,
      isVisibleInSearch: false,
      isVisibleOnHomepage: true,
      isVisibleInRecommendations: true,
      isVisibleInLevelBlock: false,
      isVisibleInAcademy: false,
      isVisibleInStudentDashboard: true,
    });

    expect(parsed.courseType).toBe("EXAM_PREP");
    expect(parsed.accessMode).toBe("ONE_TIME_PURCHASE");
    expect(parsed.isVisibleOnHomepage).toBe(true);
    expect(parsed.isVisibleInCatalog).toBe(false);
    expect(parsed.instructorId).toBe("clx9q1y5j0000q2v4gl4p4x2a");
  });

  it("keeps existing course creation callers backward-compatible through safe defaults", () => {
    const parsed = createCourseSchema.parse(baseCourse);
    expect(parsed.courseType).toBe("STANDARD");
    expect(parsed.accessMode).toBe("FREE");
    expect(parsed.isVisibleInCatalog).toBe(true);
    expect(parsed.isVisibleInSearch).toBe(true);
    expect(parsed.isVisibleOnHomepage).toBe(false);
  });

  it("allows the wizard to save display settings independently after draft creation", () => {
    expect(updateCourseSchema.safeParse({ isVisibleInRecommendations: true, isVisibleInStudentDashboard: false }).success).toBe(true);
    expect(updateCourseSchema.safeParse({ accessMode: "NOT_A_MODE" }).success).toBe(false);
  });
});
