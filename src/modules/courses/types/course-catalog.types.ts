export const COURSE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CourseLevel = (typeof COURSE_LEVELS)[number];
export type CourseAccess = "free" | "premium";

export const COURSE_CATEGORIES = [
  "grammar", "vocabulary", "phrasal-verbs", "idioms", "fixed-expressions",
  "collocations", "synonyms", "antonyms", "word-formation", "pronunciation",
  "punctuation", "lexicology", "phraseology", "speaking", "writing", "reading",
  "listening",
] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export interface CourseSubtopic { id: string; slug: string; title: string; description?: string; example?: string; }
export interface CourseTopic { id: string; slug: string; title: string; description?: string; subtopics: CourseSubtopic[]; }
export interface CourseCategoryData { id: string; slug: CourseCategory; title: string; description?: string; topics: CourseTopic[]; }
export interface CourseLevelData { level: CourseLevel; title: string; description: string; access: CourseAccess; categories: CourseCategoryData[]; }
