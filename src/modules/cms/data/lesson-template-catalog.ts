import { GRAMMAR_TYPICAL_LESSON_TEMPLATE } from "@/modules/cms/data/grammar-typical-lesson-template";

export type LessonTemplateDefinition = {
  key: string;
  title: string;
  description: string;
  lessonType: string;
  estimatedDuration: number;
  exerciseCount: number;
  tags: readonly string[];
};

/**
 * A single catalogue for reusable lesson blueprints. Sections store only the
 * key, so a lesson template remains a source definition instead of a copied
 * lesson or a second content system.
 */
export const LESSON_TEMPLATE_CATALOG: readonly LessonTemplateDefinition[] = [
  {
    key: GRAMMAR_TYPICAL_LESSON_TEMPLATE.key,
    title: "Grammar Typical Lesson",
    description: GRAMMAR_TYPICAL_LESSON_TEMPLATE.description,
    lessonType: "Grammar",
    estimatedDuration: GRAMMAR_TYPICAL_LESSON_TEMPLATE.estimatedDuration,
    exerciseCount: GRAMMAR_TYPICAL_LESSON_TEMPLATE.exercises.length,
    tags: ["Theory", "Practice", "Seven activities"],
  },
];

export function getLessonTemplateDefinition(
  key: string,
): LessonTemplateDefinition | null {
  return LESSON_TEMPLATE_CATALOG.find((template) => template.key === key) ?? null;
}
