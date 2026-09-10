import { grammarSkillSchema, grammarSkillUpdateSchema } from "@/modules/grammar/schemas/grammar-cms.schemas";

describe("grammar skill CMS schemas", () => {
  it("accepts a concise course-owned grammar skill", () => {
    expect(grammarSkillSchema.parse({
      title: "Present Simple: do / does",
      slug: "present-simple-do-does",
      description: "Choose the correct auxiliary in questions and negatives.",
    })).toMatchObject({ slug: "present-simple-do-does" });
  });

  it("rejects an unsafe grammar-skill slug", () => {
    expect(() => grammarSkillSchema.parse({ title: "Do or does", slug: "Do_or_does" })).toThrow();
  });

  it("requires a field when updating a grammar skill", () => {
    expect(() => grammarSkillUpdateSchema.parse({})).toThrow();
  });
});
