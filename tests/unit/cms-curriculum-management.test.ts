import {
  cmsCurriculumNodeDuplicateSchema,
  cmsCurriculumNodeMoveSchema,
  cmsCurriculumNodeTranslationSchema,
  cmsCurriculumNodeUpdateSchema,
} from "@/modules/cms/schemas/content-management.schemas";

describe("CMS curriculum management input validation", () => {
  it("permits SEO and visibility changes but not direct unsafe route/order changes", () => {
    expect(cmsCurriculumNodeUpdateSchema.safeParse({
      seoTitle: "A1 personal pronouns",
      seoDescription: "Learn A1 personal pronouns.",
      seoKeywords: "A1, pronouns",
      showOnHomepage: true,
      showInSearch: false,
    }).success).toBe(true);
    expect(cmsCurriculumNodeUpdateSchema.safeParse({ parentId: "clx9q1y5j0000q2v4gl4p4x2a" }).success).toBe(false);
    expect(cmsCurriculumNodeUpdateSchema.safeParse({ order: 4 }).success).toBe(false);
  });

  it("validates safe moves, copies and relational localization payloads", () => {
    expect(cmsCurriculumNodeMoveSchema.safeParse({ parentId: "clx9q1y5j0000q2v4gl4p4x2a" }).success).toBe(true);
    expect(cmsCurriculumNodeDuplicateSchema.safeParse({ targetLevelCode: "B1", targetParentId: "clx9q1y5j0000q2v4gl4p4x2a" }).success).toBe(true);
    expect(cmsCurriculumNodeTranslationSchema.safeParse({ locale: "uk", title: "Особові займенники", description: "Тема для рівня A1." }).success).toBe(true);
    expect(cmsCurriculumNodeTranslationSchema.safeParse({ locale: "ukrainian", title: "Invalid" }).success).toBe(false);
  });
});
