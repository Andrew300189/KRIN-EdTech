import type { CourseCategoryData } from "@/modules/courses/types/course-catalog.types";
import { getLevel } from "./get-level";

export function getCategory(level: string, category: string): CourseCategoryData | null {
  return getLevel(level)?.categories.find((item) => item.slug === category) ?? null;
}
