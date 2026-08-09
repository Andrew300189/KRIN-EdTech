import type { CourseSection } from "@/modules/courses/types/course-catalog.types";
import { getLevel } from "./get-level";

/** Returns a section only when it belongs to the requested CEFR level. */
export function getSection(level: string, section: string): CourseSection | null {
  return getLevel(level)?.sections.find((item) => item.slug === section) ?? null;
}
