import type { CourseSubtopic, CourseTopic } from "@/modules/courses/types/course-catalog.types";
import { getCategory } from "./get-category";

export function getTopic(level: string, category: string, topic: string): CourseTopic | null {
  return getCategory(level, category)?.topics.find((item) => item.slug === topic) ?? null;
}

export function getSubtopic(level: string, category: string, topic: string, subtopic: string): CourseSubtopic | null {
  return getTopic(level, category, topic)?.subtopics.find((item) => item.slug === subtopic) ?? null;
}
