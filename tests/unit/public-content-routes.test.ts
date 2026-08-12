import {
  collectCurriculumDescendantIds,
  getPublicCourseHref,
  getPublicCurriculumHref,
} from "@/modules/courses/utils/public-content-routes";

describe("public content routes", () => {
  const level = { code: "A1" };

  it("uses one canonical public route for every published course", () => {
    expect(getPublicCourseHref("present-simple-basics")).toBe("/courses/present-simple-basics");
  });

  it("builds a precise section, topic and subtopic path", () => {
    const section = { type: "SECTION" as const, slug: "grammar", level, parent: null };
    const topic = { type: "TOPIC" as const, slug: "pronouns", level, parent: { type: "SECTION" as const, slug: "grammar", parent: null } };
    const subtopic = { type: "SUBTOPIC" as const, slug: "personal-pronouns", level, parent: { type: "TOPIC" as const, slug: "pronouns", parent: { type: "SECTION" as const, slug: "grammar" } } };

    expect(getPublicCurriculumHref(section)).toBe("/courses/a1/grammar");
    expect(getPublicCurriculumHref(topic)).toBe("/courses/a1/grammar/pronouns");
    expect(getPublicCurriculumHref(subtopic)).toBe("/courses/a1/grammar/pronouns/personal-pronouns");
  });

  it("does not return an unrelated fallback route for a malformed curriculum path", () => {
    expect(getPublicCurriculumHref({ type: "TOPIC", slug: "pronouns", level, parent: null })).toBeNull();
  });

  it("keeps a curriculum page scoped to its own descendants", () => {
    const ids = collectCurriculumDescendantIds([
      { id: "section", parentId: null },
      { id: "topic", parentId: "section" },
      { id: "subtopic", parentId: "topic" },
      { id: "other-section", parentId: null },
      { id: "other-topic", parentId: "other-section" },
    ], "section");

    expect(ids).toEqual(expect.arrayContaining(["section", "topic", "subtopic"]));
    expect(ids).not.toEqual(expect.arrayContaining(["other-section", "other-topic"]));
  });
});
