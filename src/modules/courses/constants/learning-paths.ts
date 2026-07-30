export const COURSE_STAGES = [
  "a0",
  "a1",
  "a2",
  "b1",
  "b2",
  "c1",
  "c2",
  "all-levels",
] as const;

export const LEARNING_ACADEMIES = [
  {
    slug: "general-english",
    title: "General English",
    paths: [
      { slug: "core-journey", title: "Core Journey A0-C2" },
      { slug: "daily-communication", title: "Daily Communication" },
      { slug: "academic-fluency", title: "Academic Fluency" },
    ],
  },
  {
    slug: "grammar-academy",
    title: "Grammar Academy",
    paths: [
      { slug: "verb-tenses", title: "Verb Tenses" },
      { slug: "passive-conditionals", title: "Passive and Conditionals" },
      { slug: "clauses-word-order", title: "Clauses and Word Order" },
    ],
  },
  {
    slug: "vocabulary-academy",
    title: "Vocabulary Academy",
    paths: [
      { slug: "everyday-topics", title: "Everyday Topics" },
      { slug: "professional-topics", title: "Professional Topics" },
      { slug: "science-and-tech", title: "Science and Tech" },
    ],
  },
  {
    slug: "phrasal-verbs-academy",
    title: "Phrasal Verbs Academy",
    paths: [
      { slug: "get-family", title: "GET Family" },
      { slug: "take-family", title: "TAKE Family" },
      { slug: "go-come-put", title: "GO, COME, PUT" },
    ],
  },
  {
    slug: "idioms-academy",
    title: "Idioms Academy",
    paths: [
      { slug: "business-idioms", title: "Business Idioms" },
      { slug: "native-idioms", title: "Native Idioms" },
      { slug: "topic-idioms", title: "Topic Idioms" },
    ],
  },
  {
    slug: "collocations-academy",
    title: "Collocations Academy",
    paths: [
      { slug: "verb-collocations", title: "Verb Collocations" },
      { slug: "adjective-collocations", title: "Adjective Collocations" },
      { slug: "academic-collocations", title: "Academic Collocations" },
    ],
  },
  {
    slug: "synonyms-academy",
    title: "Synonyms Academy",
    paths: [
      { slug: "frequency-bands", title: "Frequency Bands" },
      { slug: "tone-register", title: "Tone and Register" },
      { slug: "precision-choice", title: "Precision Choice" },
    ],
  },
  {
    slug: "antonyms-academy",
    title: "Antonyms Academy",
    paths: [
      { slug: "core-opposites", title: "Core Opposites" },
      { slug: "academic-opposites", title: "Academic Opposites" },
      { slug: "professional-opposites", title: "Professional Opposites" },
    ],
  },
  {
    slug: "pronunciation-academy",
    title: "Pronunciation Academy",
    paths: [
      { slug: "ipa-and-sounds", title: "IPA and Sounds" },
      { slug: "rhythm-stress-linking", title: "Rhythm, Stress, Linking" },
      { slug: "shadowing-lab", title: "Shadowing Lab" },
    ],
  },
  {
    slug: "writing-academy",
    title: "Writing Academy",
    paths: [
      { slug: "email-writing", title: "Email Writing" },
      { slug: "essay-and-reports", title: "Essays and Reports" },
      { slug: "cv-cover-letter", title: "CV and Cover Letter" },
    ],
  },
  {
    slug: "speaking-academy",
    title: "Speaking Academy",
    paths: [
      { slug: "small-talk", title: "Small Talk" },
      {
        slug: "presentations-negotiation",
        title: "Presentations and Negotiation",
      },
      { slug: "interviews-debates", title: "Interviews and Debates" },
    ],
  },
  {
    slug: "professional-english",
    title: "Professional English",
    paths: [
      { slug: "medical-legal", title: "Medical and Legal" },
      { slug: "engineering-it-finance", title: "Engineering, IT, Finance" },
      {
        slug: "hospitality-tourism-support",
        title: "Hospitality, Tourism, Support",
      },
    ],
  },
] as const;

export type CourseStage = (typeof COURSE_STAGES)[number];
export type AcademyConfig = (typeof LEARNING_ACADEMIES)[number];
export type AcademySlug = AcademyConfig["slug"];

export function getDefaultAcademy(): AcademyConfig {
  return LEARNING_ACADEMIES[0];
}

export function isAcademySlug(value: string): value is AcademySlug {
  return LEARNING_ACADEMIES.some((academy) => academy.slug === value);
}

export function getAcademyBySlug(slug: string): AcademyConfig | undefined {
  return LEARNING_ACADEMIES.find((academy) => academy.slug === slug);
}

export function getDefaultPathSlugForAcademy(academySlug: AcademySlug): string {
  const academy = getAcademyBySlug(academySlug);
  return academy?.paths[0]?.slug ?? "core-journey";
}

export function isCourseStage(value: string): value is CourseStage {
  return COURSE_STAGES.includes(value as CourseStage);
}
