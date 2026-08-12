export const courseSkillLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CourseSkillSlug = "vocabulary" | "grammar" | "use-of-english";

export type CourseSkillDefinition = {
  slug: CourseSkillSlug;
  label: string;
  title: string;
  description: string;
  categorySlugs: readonly string[];
};

/**
 * Server-owned groups used only for public skill discovery. Course records stay
 * in the existing CMS catalogue and are still filtered by their own level.
 */
export const courseSkillCatalog = [
  {
    slug: "vocabulary",
    label: "Vocabulary",
    title: "Vocabulary courses",
    description: "Build useful words, phrases and confidence for your current English level.",
    categorySlugs: ["vocabulary"],
  },
  {
    slug: "grammar",
    label: "Grammar",
    title: "Grammar courses",
    description: "Practise grammar in context, with courses organised from A1 to C2.",
    categorySlugs: ["grammar"],
  },
  {
    slug: "use-of-english",
    label: "Use of English",
    title: "Use of English courses",
    description: "Improve accuracy, range and natural expression through integrated language practice.",
    categorySlugs: [
      "use-of-english",
      "grammar",
      "vocabulary",
      "phrasal-verbs",
      "idioms",
      "fixed-expressions",
      "collocations",
      "synonyms",
      "antonyms",
      "word-formation",
      "punctuation",
      "lexicology",
      "phraseology",
    ],
  },
] as const satisfies readonly CourseSkillDefinition[];

export function getCourseSkill(slug: string): CourseSkillDefinition | null {
  return courseSkillCatalog.find((skill) => skill.slug === slug) ?? null;
}
