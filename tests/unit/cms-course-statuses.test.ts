import { cmsContentLifecycleSchema, cmsContentStatusSchema } from "@/modules/cms/schemas/content-management.schemas";

describe("course CMS lifecycle statuses", () => {
  it("supports the complete course lifecycle without a second status field", () => {
    for (const status of ["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"]) {
      expect(cmsContentStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("accepts review and unpublish lifecycle actions and still requires schedule time", () => {
    expect(cmsContentLifecycleSchema.safeParse({ action: "SUBMIT_FOR_REVIEW" }).success).toBe(true);
    expect(cmsContentLifecycleSchema.safeParse({ action: "UNPUBLISH" }).success).toBe(true);
    expect(cmsContentLifecycleSchema.safeParse({ action: "SCHEDULE" }).success).toBe(false);
    expect(cmsContentLifecycleSchema.safeParse({ action: "SCHEDULE", scheduledAt: "2027-01-01T10:00:00.000Z" }).success).toBe(true);
  });
});
