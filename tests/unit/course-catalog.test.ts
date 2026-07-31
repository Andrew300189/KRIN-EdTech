import { getCategory } from "@/modules/courses/utils/get-category";
import { getLevel } from "@/modules/courses/utils/get-level";
import { getSubtopic, getTopic } from "@/modules/courses/utils/get-topics";

describe("course catalog selectors", () => {
  it("keeps A1 grammar isolated from A2-C2", () => {
    const grammar = getCategory("a1", "grammar");
    expect(grammar?.topics.some((topic) => topic.id.startsWith("a2-"))).toBe(false);
    expect(grammar?.topics.some((topic) => topic.title === "Present Simple")).toBe(true);
  });

  it("keeps A2 grammar isolated from other levels", () => {
    const grammar = getCategory("a2", "grammar");
    expect(grammar?.topics.every((topic) => topic.id.startsWith("a2-grammar-"))).toBe(true);
    expect(grammar?.topics.some((topic) => topic.title === "Past Simple of To Be")).toBe(false);
  });

  it("returns only B1 vocabulary", () => {
    const vocabulary = getCategory("b1", "vocabulary");
    expect(vocabulary?.topics.map((topic) => topic.title)).toContain("Work");
    expect(vocabulary?.topics.map((topic) => topic.title)).not.toContain("Finance");
  });

  it("returns null for a missing level or category instead of a fallback catalog", () => {
    expect(getLevel("z9")).toBeNull();
    expect(getCategory("a1", "idioms")).toBeNull();
  });

  it("uses distinct IDs for equal topic titles at different levels", () => {
    expect(getTopic("a1", "grammar", "present-simple")?.id).not.toBe(getTopic("a2", "grammar", "present-simple")?.id);
  });

  it("does not substitute content for C2 or missing subtopics", () => {
    expect(getLevel("c2")?.categories).toEqual([]);
    expect(getSubtopic("a1", "grammar", "present-simple", "missing")).toBeNull();
  });

  it("marks only the configured advanced levels as Premium", () => {
    expect(getLevel("a1")?.access).toBe("free");
    expect(getLevel("b1")?.access).toBe("free");
    expect(getLevel("b2")?.access).toBe("premium");
    expect(getLevel("c1")?.access).toBe("premium");
  });
});
