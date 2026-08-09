import type { CourseTopic } from "@/modules/courses/types/course-catalog.types";
import { getSection } from "./get-section";

/**
 * A topic lookup is always scoped by both its level and section.  There is no
 * fallback catalogue, so an invalid URL can never surface another level's
 * content.
 */
export function getTopic(level: string, section: string, topic: string): CourseTopic | null {
  return getSection(level, section)?.topics.find((item) => item.slug === topic) ?? null;
}
