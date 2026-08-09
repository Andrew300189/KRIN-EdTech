export const COURSE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CourseLevel = (typeof COURSE_LEVELS)[number];
export type CourseAccess = "free" | "premium";

/**
 * The public learning path has three levels of hierarchy:
 * CEFR level → topic section → topic.  IDs are deliberately scoped by level
 * and section, because the same topic can legitimately occur at more than one
 * CEFR level.
 */
export interface CourseTopic {
  id: string;
  slug: string;
  title: string;
  description?: string;
  example?: string;
  order: number;
}

export interface CourseSection {
  id: string;
  slug: string;
  title: string;
  description?: string;
  order: number;
  topics: CourseTopic[];
}

export interface CourseLevelData {
  level: CourseLevel;
  title: string;
  description: string;
  access: CourseAccess;
  sections: CourseSection[];
}
