import { courseCatalog } from "@/modules/courses/data/course-catalog";
import type { CourseLevelData } from "@/modules/courses/types/course-catalog.types";

export function getLevel(level: string): CourseLevelData | null {
  return courseCatalog[level.toUpperCase() as keyof typeof courseCatalog] ?? null;
}
