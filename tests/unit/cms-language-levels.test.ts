import {
  cmsLanguageLevelSchema,
  cmsLanguageLevelUpdateSchema,
} from "@/modules/cms/schemas/content-management.schemas";

describe("CMS language level validation", () => {
  it("accepts only the fixed CEFR code set", () => {
    expect(cmsLanguageLevelSchema.safeParse({
      code: "A1",
      title: "Beginner",
      description: "Core English foundations for new learners.",
      order: 1,
      coverImage: "https://cdn.example.test/a1.jpg",
    }).success).toBe(true);

    expect(cmsLanguageLevelSchema.safeParse({
      code: "A3",
      title: "Unknown level",
      description: "This code is not part of the CEFR level set.",
      order: 7,
    }).success).toBe(false);
  });

  it("does not allow an edit request to replace a fixed level code or its position", () => {
    expect(cmsLanguageLevelUpdateSchema.safeParse({ code: "B2", title: "Changed" }).success).toBe(false);
    expect(cmsLanguageLevelUpdateSchema.safeParse({ order: 4, title: "Changed" }).success).toBe(false);
    expect(cmsLanguageLevelUpdateSchema.safeParse({ seoTitle: "B2 English courses" }).success).toBe(true);
  });
});
