import { courseCatalog } from "@/modules/courses/data/course-catalog";
import { getLevel } from "@/modules/courses/utils/get-level";
import { getSection } from "@/modules/courses/utils/get-section";
import { getTopic } from "@/modules/courses/utils/get-topics";

describe("course catalogue selectors", () => {
  it("keeps all A1 Pronouns topics in the supplied order", () => {
    const pronouns = getSection("a1", "pronouns");
    expect(pronouns?.topics).toHaveLength(6);
    expect(pronouns?.topics.map((topic) => topic.title)).toEqual([
      "Personal pronouns",
      "Possessive pronouns",
      "Possessive with ‘s",
      "Object pronouns",
      "Demonstrative pronouns",
      "Pronouns: something, anything",
    ]);
  });

  it("does not truncate A1 Present tenses or Modal verbs", () => {
    expect(getSection("a1", "present-tenses")?.topics).toHaveLength(11);
    expect(getSection("a1", "modal-verbs")?.topics).toHaveLength(10);
  });

  it("keeps each level isolated", () => {
    const a1Vocabulary = getSection("a1", "vocabulary");
    const a2Vocabulary = getSection("a2", "vocabulary");
    const b1Vocabulary = getSection("b1", "vocabulary");
    expect(a1Vocabulary?.topics.some((topic) => topic.id.startsWith("a2-"))).toBe(false);
    expect(a2Vocabulary?.topics.some((topic) => topic.id.startsWith("a1-"))).toBe(false);
    expect(b1Vocabulary?.topics.map((topic) => topic.title)).toContain("jobs");
    expect(b1Vocabulary?.topics.map((topic) => topic.title)).not.toContain("Idioms and fixed phrases about housing, holidays, music, pets, human qualities, work, feelings, finances, etc.");
  });

  it("uses different IDs for an equal title at different levels", () => {
    const a1Topic = getTopic("a1", "present-tenses", "present-simple-for-habits-and-daily-routines");
    const a2Topic = getTopic("a2", "present-tenses", "present-simple-for-habits-and-daily-routines");
    expect(a1Topic?.id).toBe("a1-present-tenses-present-simple-for-habits-and-daily-routines");
    expect(a2Topic?.id).toBe("a2-present-tenses-present-simple-for-habits-and-daily-routines");
    expect(a1Topic?.id).not.toBe(a2Topic?.id);
  });

  it("never returns another level as a fallback for an invalid level, section or topic", () => {
    expect(getLevel("z9")).toBeNull();
    expect(getSection("a1", "modal-verbs")).not.toBeNull();
    expect(getSection("a1", "conjunctions")).toBeNull();
    expect(getTopic("a1", "pronouns", "personal-pronouns")).not.toBeNull();
    expect(getTopic("a1", "pronouns", "future-perfect")).toBeNull();
    expect(getTopic("a1", "future-tenses", "personal-pronouns")).toBeNull();
  });

  it("keeps the provided section order and leaves C2 empty", () => {
    expect(courseCatalog.A1.sections.map((section) => section.title)).toEqual([
      "Adjectives and adverbs",
      "Articles and quantifiers",
      "Conditionals",
      "Future tenses",
      "Gerund and infinitive",
      "Past tenses",
      "Modal verbs",
      "Prepositions",
      "Pronouns",
      "Present tenses",
      "Questions",
      "Vocabulary",
    ]);
    expect(courseCatalog.A2.sections).toHaveLength(13);
    expect(courseCatalog.B1.sections).toHaveLength(12);
    expect(courseCatalog.B2.sections).toHaveLength(11);
    expect(courseCatalog.C1.sections).toHaveLength(4);
    expect(courseCatalog.C2.sections).toEqual([]);
  });

  it("keeps stable sequential order values without duplicate IDs inside a section", () => {
    for (const level of Object.values(courseCatalog)) {
      expect(level.sections.map((section) => section.order)).toEqual(level.sections.map((_, index) => index + 1));
      for (const section of level.sections) {
        expect(section.topics.map((topic) => topic.order)).toEqual(section.topics.map((_, index) => index + 1));
        expect(new Set(section.topics.map((topic) => topic.id)).size).toBe(section.topics.length);
        expect(new Set(section.topics.map((topic) => topic.slug)).size).toBe(section.topics.length);
      }
    }
  });
});
