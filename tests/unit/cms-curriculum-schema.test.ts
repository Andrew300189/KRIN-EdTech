import {
  cmsCourseCurriculumLinksSchema,
  cmsCurriculumNodeSchema,
} from "@/modules/cms/schemas/content-management.schemas";

const sectionId = "clx9q1y5j0000q2v4gl4p4x2a";
const topicId = "clx9q1y5j0001q2v4gl4p4x2b";

describe("CMS curriculum hierarchy input validation", () => {
  it("accepts a level-scoped section and does not require a JSON hierarchy", () => {
    expect(cmsCurriculumNodeSchema.safeParse({
      levelCode: "A1",
      type: "SECTION",
      slug: "grammar",
      title: "Grammar",
      order: 10,
    }).success).toBe(true);
  });

  it("rejects duplicate course links and more than one primary placement", () => {
    expect(cmsCourseCurriculumLinksSchema.safeParse({
      links: [
        { nodeId: sectionId, relation: "PRIMARY" },
        { nodeId: sectionId, relation: "RELATED" },
      ],
    }).success).toBe(false);

    expect(cmsCourseCurriculumLinksSchema.safeParse({
      links: [
        { nodeId: sectionId, relation: "PRIMARY" },
        { nodeId: topicId, relation: "PRIMARY" },
      ],
    }).success).toBe(false);
  });

  it("allows a course to remain directly attached to its CEFR level", () => {
    expect(cmsCourseCurriculumLinksSchema.safeParse({ links: [] }).success).toBe(true);
  });
});
