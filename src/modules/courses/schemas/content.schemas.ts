import { z } from "zod";
import { isExerciseEngineKey } from "@/modules/cms/exercise-engines/registry";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Exercise definitions use stable registry codes (for example
// `CONTEXT_SELECTION`). Older authored exercises may use URL-style keys, so
// accept both representations at the API boundary.
const exerciseSubtypePattern = /^(?:[A-Z0-9]+(?:_[A-Z0-9]+)*|[a-z0-9]+(?:-[a-z0-9]+)*)$/;

export const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export const subscriptionPlanSchema = z.enum(["FREE", "PREMIUM", "CORPORATE"]);
export const courseAccessModeSchema = z.enum(["FREE", "SUBSCRIPTION", "ONE_TIME_PURCHASE", "TEACHER_ASSIGNMENT", "HIDDEN"]);
export const courseTypeSchema = z.enum(["STANDARD", "INTENSIVE", "EXAM_PREP", "PROFESSIONAL", "SPECIALIZATION", "SKILL"]);
export const lessonTypeSchema = z.enum([
  "THEORY",
  "PRACTICE",
  "READING",
  "LISTENING",
  "SPEAKING",
  "WRITING",
  "TEST",
  "PROJECT",
  "MIXED",
  "GRAMMAR",
  "VOCABULARY",
]);
export const lessonBlockTypeSchema = z.enum([
  "INTRO",
  "LEARNING_OBJECTIVES",
  "WARM_UP",
  "THEORY",
  "GRAMMAR",
  "VOCABULARY",
  "READING",
  "LISTENING",
  "VIDEO",
  "IMAGE",
  "DIALOGUE",
  "EXERCISE",
  "REVIEW",
  "HOMEWORK",
  "QUOTE",
  "PHRASE_OF_THE_DAY",
  "NEXT_LESSON_PREVIEW",
  "BREAK",
  "DISCUSSION",
]);
export const exerciseTypeSchema = z.enum([
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TEXT_INPUT",
  "FILL_IN_THE_BLANK",
  "MATCHING",
  "WORD_ORDER",
  "SENTENCE_ORDER",
  "ERROR_CORRECTION",
  "SENTENCE_TRANSLATION",
  "TENSE_SELECTION",
  "TENSE_TRANSFORMATION",
  "SYNONYM_SELECTION",
  "ANTONYM_SELECTION",
  "PHRASAL_VERB_MEANING",
  "VERB_PREPOSITION",
  "TRANSCRIPTION_MATCH",
  "LISTENING_QUESTIONS",
  "DICTATION",
  "TEXT_RECONSTRUCTION",
  "EXTRA_WORDS",
]);

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (["string", "number", "boolean"].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

export const jsonValueSchema = z.custom<JsonValue>(isJsonValue, {
  message: "Value must be JSON-serializable",
});

const optionalUrlSchema = z.string().url().max(2048).optional().or(z.literal(""));
const pastedImageDataUrlSchema = z
  .string()
  .regex(/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/, "Invalid pasted image data.")
  .max(2_500_000);
const optionalCourseCoverSchema = z.union([z.string().url().max(2048), pastedImageDataUrlSchema]).optional().or(z.literal(""));

export const createCourseSchema = z.object({
  levelCode: cefrLevelSchema,
  categorySlug: z.string().trim().regex(slugPattern).max(80).default("general-english"),
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(slugPattern).max(160).optional(),
  shortDescription: z.string().trim().min(10).max(500),
  fullDescription: z.string().trim().max(10000).optional(),
  coverImage: optionalCourseCoverSchema,
  trailerVideoUrl: optionalUrlSchema,
  language: z.string().trim().min(2).max(32).default("en"),
  estimatedDuration: z.number().int().min(0).max(100000).default(0),
  difficulty: z.string().trim().max(80).optional(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  courseType: courseTypeSchema.default("STANDARD"),
  accessMode: courseAccessModeSchema.default("FREE"),
  isVisibleInCatalog: z.boolean().default(true),
  isVisibleInSearch: z.boolean().default(true),
  isVisibleOnHomepage: z.boolean().default(false),
  isVisibleInRecommendations: z.boolean().default(false),
  isVisibleInLevelBlock: z.boolean().default(true),
  isVisibleInAcademy: z.boolean().default(true),
  isVisibleInStudentDashboard: z.boolean().default(true),
  instructorId: z.string().cuid().optional(),
  firstFreeLessonCount: z.number().int().min(0).max(1000).default(0),
  accessPlan: subscriptionPlanSchema.default("FREE"),
  priceAmount: z.number().int().min(0).max(100000000).optional(),
  priceCurrency: z.string().trim().regex(/^[A-Za-z]{3}$/).default("USD"),
  learningOutcomes: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
  prerequisites: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
});

export const updateCourseSchema = createCourseSchema
  .omit({ levelCode: true })
  .partial()
  .extend({ levelCode: cefrLevelSchema.optional() });

export const createCourseCategorySchema = z.object({
  slug: z.string().trim().regex(slugPattern).max(80),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  icon: z.string().trim().max(24).optional(),
  coverImage: optionalUrlSchema,
  order: z.number().int().min(0).max(10000).optional(),
  isPublished: z.boolean().default(false),
});

export const createModuleSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  order: z.number().int().min(1).max(10000).optional(),
  isRequired: z.boolean().default(true),
  requiresSequentialCompletion: z.boolean().default(false),
  unlockAfterModuleId: z.string().cuid().nullable().optional(),
  requiredCompletionPercent: z.number().int().min(1).max(100).default(100),
  isPublished: z.boolean().default(false),
});

export const updateModuleSchema = createModuleSchema
  .omit({ order: true, isPublished: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one module field is required.");

export const createLessonSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(slugPattern).max(160).optional(),
  description: z.string().trim().max(5000).optional(),
  type: lessonTypeSchema,
  order: z.number().int().min(1).max(10000).optional(),
  estimatedDuration: z.number().int().min(0).max(10000).default(0),
  phraseOfTheDay: z.string().trim().max(500).optional(),
  motivationalQuote: z.string().trim().max(1000).optional(),
  learningObjectives: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  previewText: z.string().trim().max(2000).optional(),
  prerequisiteLessonId: z.string().cuid().nullable().optional(),
  requiredPrerequisiteCompletion: z.number().int().min(1).max(100).default(100),
  autoUnlockNextLesson: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  isFree: z.boolean().default(false),
});

export const updateLessonSchema = createLessonSchema
  .omit({ order: true, isPublished: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one lesson field is required.");

export const createLessonBlockSchema = z.object({
  type: lessonBlockTypeSchema,
  title: z.string().trim().max(160).optional(),
  content: jsonValueSchema.optional(),
  settings: jsonValueSchema.optional(),
  order: z.number().int().min(1).max(10000).optional(),
  isRequired: z.boolean().default(false),
});

export const updateLessonBlockSchema = createLessonBlockSchema
  .omit({ type: true, order: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one lesson block field is required.");

export const createExerciseSchema = z.object({
  type: exerciseTypeSchema,
  engineKey: z.string().trim().refine(isExerciseEngineKey, "Unsupported exercise engine").optional(),
  variantKey: z.string().trim().regex(exerciseSubtypePattern).max(120).optional(),
  instruction: z.string().trim().min(1).max(2000),
  question: z.string().trim().min(1).max(5000),
  content: jsonValueSchema.optional(),
  correctAnswer: jsonValueSchema,
  alternativeAnswers: z.array(jsonValueSchema).max(50).optional(),
  explanation: z.string().trim().max(5000).optional(),
  hint: z.string().trim().max(2000).optional(),
  hintsEnabled: z.boolean().default(true),
  difficulty: z.number().int().min(1).max(10).default(1),
  basePoints: z.number().int().min(0).max(1000).default(1),
  timeLimitSeconds: z.number().int().min(1).max(86400).optional(),
  solutionCost: z.number().int().min(0).max(10000).default(0),
  allowInstantCheck: z.boolean().default(true),
  allowExtraExercise: z.boolean().default(false),
  order: z.number().int().min(1).max(10000).optional(),
});

export const updateExerciseSchema = createExerciseSchema
  .omit({ order: true })
  .partial()
  .extend({
    // `null` intentionally clears a previously configured limit in the CMS editor.
    timeLimitSeconds: z.number().int().min(1).max(86400).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one exercise field is required.");

export const submitExerciseSchema = z.object({
  answer: jsonValueSchema,
  idempotencyKey: z.string().uuid().optional(),
  timeSpentSeconds: z.number().int().min(0).max(86400).optional(),
  hintUsed: z.boolean().default(false),
  solutionOpened: z.boolean().default(false),
});

export const saveLessonProgressSchema = z.object({
  completedBlockIds: z.array(z.string().cuid()).max(500).default([]),
  currentBlockId: z.string().cuid().nullable().optional(),
  activeSeconds: z.number().int().min(0).max(86400).default(0),
  complete: z.boolean().default(false),
});

export const saveHomeworkSchema = z.object({
  answers: jsonValueSchema.optional(),
  submit: z.boolean().default(false),
});

export const createWordSchema = z.object({
  lemma: z.string().trim().min(1).max(160),
  partOfSpeech: z.enum(["NOUN", "VERB", "ADJECTIVE", "ADVERB", "PRONOUN", "PREPOSITION", "CONJUNCTION", "DETERMINER", "NUMERAL", "INTERJECTION", "PHRASE", "PHRASAL_VERB", "IDIOM", "OTHER"]).optional(),
  cefrLevel: cefrLevelSchema.optional(),
  britishTranscription: z.string().trim().max(200).optional(),
  americanTranscription: z.string().trim().max(200).optional(),
  meanings: z.array(z.object({
    definition: z.string().trim().min(1).max(2000),
    translation: z.string().trim().max(1000).optional(),
    article: z.string().trim().max(50).optional(),
    context: z.string().trim().max(2000).optional(),
    usageLabel: z.string().trim().max(80).optional(),
  })).min(1).max(20),
});

export const createGrammarTopicSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(slugPattern).max(160).optional(),
  cefrLevel: cefrLevelSchema,
  description: z.string().trim().max(5000).optional(),
  order: z.number().int().min(0).max(10000).default(0),
});

export const addUserWordSchema = z.union([
  z.object({ wordId: z.string().cuid(), customWord: z.undefined().optional(), customTranslation: z.undefined().optional() }),
  z.object({ wordId: z.undefined().optional(), customWord: z.string().trim().min(1).max(160), customTranslation: z.string().trim().min(1).max(1000) }),
]);

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CreateCourseCategoryInput = z.infer<typeof createCourseCategorySchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type CreateLessonBlockInput = z.infer<typeof createLessonBlockSchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
