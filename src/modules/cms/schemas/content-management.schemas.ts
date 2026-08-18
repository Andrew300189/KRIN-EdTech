import { z } from "zod";
import { isExerciseEngineKey } from "@/modules/cms/exercise-engines/registry";
import { cefrLevelSchema, courseAccessModeSchema, exerciseTypeSchema, jsonValueSchema, lessonBlockTypeSchema, lessonTypeSchema, subscriptionPlanSchema } from "@/modules/courses/schemas/content.schemas";

const entityTypes = [
  "LANGUAGE_LEVEL",
  "CURRICULUM_NODE",
  "COURSE_CATEGORY",
  "COURSE",
  "COURSE_MODULE",
  "LESSON",
  "LESSON_BLOCK",
  "EXERCISE",
  "GRAMMAR_TOPIC",
  "WORD",
  "CONTENT_SLOT",
] as const;

const contentStatuses = ["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"] as const;
const contentAreas = ["HOME", "STUDENT_DASHBOARD", "TEACHER_DASHBOARD", "LEGAL"] as const;
const mediaKinds = ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "OTHER"] as const;
const curriculumNodeTypes = ["SECTION", "TOPIC", "SUBTOPIC"] as const;
const curriculumRelations = ["PRIMARY", "RELATED"] as const;

const slotKeyPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

const httpUrlSchema = z.string().trim().url().max(2048).refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "https:" || protocol === "http:";
}, "Only HTTP(S) media URLs are supported.");

export const cmsContentEntityTypeSchema = z.enum(entityTypes);
export const cmsContentStatusSchema = z.enum(contentStatuses);
export const cmsContentAreaSchema = z.enum(contentAreas);
export const cmsMediaKindSchema = z.enum(mediaKinds);
export const curriculumNodeTypeSchema = z.enum(curriculumNodeTypes);
export const courseCurriculumRelationSchema = z.enum(curriculumRelations);

const cmsContentLifecycleObject = z.object({
  action: z.enum(["PUBLISH", "SUBMIT_FOR_REVIEW", "UNPUBLISH", "SCHEDULE", "ARCHIVE", "RESTORE"]),
  scheduledAt: z.string().datetime().optional(),
  note: z.string().trim().max(1000).optional(),
});

function requireScheduledAt(
  value: { action: "PUBLISH" | "SUBMIT_FOR_REVIEW" | "UNPUBLISH" | "SCHEDULE" | "ARCHIVE" | "RESTORE"; scheduledAt?: string },
  context: z.RefinementCtx,
) {
  if (value.action === "SCHEDULE" && !value.scheduledAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledAt"], message: "A scheduled publication time is required." });
  }
}

export const cmsContentLifecycleSchema = cmsContentLifecycleObject.superRefine(requireScheduledAt);

export const cmsModuleReorderSchema = z.object({
  courseId: z.string().cuid(),
  moduleIds: z.array(z.string().cuid()).min(1).max(500),
});

export const cmsModuleTargetCourseSchema = z.object({
  targetCourseId: z.string().cuid().optional(),
});

export const cmsModuleMoveSchema = z.object({
  targetCourseId: z.string().cuid(),
});

export const cmsLessonReorderSchema = z.object({
  moduleId: z.string().cuid(),
  lessonIds: z.array(z.string().cuid()).min(1).max(500),
});

export const cmsLessonTargetModuleSchema = z.object({
  targetModuleId: z.string().cuid().optional(),
});

export const cmsExerciseReorderSchema = z.object({
  lessonBlockId: z.string().cuid(),
  exerciseIds: z.array(z.string().cuid()).min(1).max(500),
});

export const cmsExerciseTargetLessonSchema = z.object({
  targetLessonId: z.string().cuid(),
});

/** Target for a reusable multi-block lesson blueprint. */
export const cmsLessonBlueprintTargetModuleSchema = z.object({
  targetModuleId: z.string().cuid(),
});

export const cmsLessonTemplateSectionSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(800).optional().or(z.literal("")),
});

export const cmsLessonTemplateSectionItemSchema = z.object({
  templateKey: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
});

export const cmsExerciseBulkUpdateSchema = z.object({
  exerciseIds: z.array(z.string().cuid()).min(1).max(100),
  basePoints: z.number().int().min(0).max(1000).optional(),
  hintsEnabled: z.boolean().optional(),
}).refine((value) => value.basePoints !== undefined || value.hintsEnabled !== undefined, "Choose at least one bulk change.");

export const cmsExerciseTemplateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
});

export const cmsBulkLifecycleSchema = cmsContentLifecycleObject.extend({
  entityType: cmsContentEntityTypeSchema,
  entityIds: z.array(z.string().cuid()).min(1).max(100),
}).superRefine(requireScheduledAt);

export const cmsMediaAssetSchema = z.object({
  kind: cmsMediaKindSchema,
  url: httpUrlSchema,
  storageKey: z.string().trim().max(1024).optional(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().regex(/^[\w.+-]+\/[\w.+-]+$/).max(160),
  sizeBytes: z.number().int().min(0).max(2_147_483_647).optional(),
  width: z.number().int().min(1).max(100_000).optional(),
  height: z.number().int().min(1).max(100_000).optional(),
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
  altText: z.string().trim().max(500).optional(),
  caption: z.string().trim().max(2000).optional(),
  metadata: jsonValueSchema.optional(),
});

export const cmsMediaAssetUpdateSchema = cmsMediaAssetSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export const cmsContentSlotSchema = z.object({
  key: z.string().trim().regex(slotKeyPattern).max(120),
  area: cmsContentAreaSchema,
  title: z.string().trim().min(1).max(160),
  content: jsonValueSchema,
});

export const cmsContentSlotUpdateSchema = cmsContentSlotSchema.partial();

const optionalHttpUrlSchema = httpUrlSchema.optional().or(z.literal(""));
const localeSchema = z.string().trim().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).max(12);

/** Metadata for one of the six fixed A1–C2 level containers. */
export const cmsLanguageLevelSchema = z.object({
  code: cefrLevelSchema,
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(1000),
  coverImage: optionalHttpUrlSchema,
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(160).optional().or(z.literal("")),
  seoKeywords: z.string().trim().max(500).optional().or(z.literal("")),
  order: z.number().int().min(1).max(6),
});

// CEFR codes identify immutable containers. Moving a level changes its order,
// never its code, and a new row may only restore a currently missing code.
export const cmsLanguageLevelUpdateSchema = cmsLanguageLevelSchema
  .omit({ code: true, order: true })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one level field is required.");

export const cmsCurriculumNodeSchema = z.object({
  levelCode: cefrLevelSchema,
  parentId: z.string().cuid().optional(),
  type: curriculumNodeTypeSchema,
  slug: z.string().trim().regex(slotKeyPattern).max(120),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).optional(),
  locale: localeSchema.default("en"),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(160).optional(),
  seoKeywords: z.string().trim().max(500).optional(),
  showOnHomepage: z.boolean().default(false),
  showInSearch: z.boolean().default(true),
  order: z.number().int().min(0).max(100_000).optional(),
});

export const cmsCurriculumNodeUpdateSchema = cmsCurriculumNodeSchema
  .omit({ levelCode: true, type: true, parentId: true, order: true })
  .partial()
  .strict();

export const cmsCurriculumNodeMoveSchema = z.object({
  parentId: z.string().cuid().nullable().optional(),
}).strict();

export const cmsCurriculumNodeDuplicateSchema = z.object({
  targetLevelCode: cefrLevelSchema,
  targetParentId: z.string().cuid().nullable().optional(),
}).strict();

export const cmsCurriculumNodeTranslationSchema = z.object({
  locale: localeSchema,
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(160).optional(),
  seoKeywords: z.string().trim().max(500).optional(),
}).strict();

export const cmsCourseCurriculumLinksSchema = z.object({
  links: z.array(z.object({ nodeId: z.string().cuid(), relation: courseCurriculumRelationSchema })).max(100),
}).superRefine((value, context) => {
  if (new Set(value.links.map((link) => link.nodeId)).size !== value.links.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["links"], message: "A curriculum node may only be linked once." });
  }
  if (value.links.filter((link) => link.relation === "PRIMARY").length > 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["links"], message: "A course may only have one primary curriculum placement." });
  }
});

/** Relocates a course without permitting cross-level curriculum references. */
export const cmsCourseMoveSchema = z.object({
  levelCode: cefrLevelSchema.optional(),
  categorySlug: z.string().trim().regex(slotKeyPattern).max(80).optional(),
  primaryNodeId: z.string().cuid().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Choose at least one destination field.");

const courseVisibilityFields = {
  isVisibleInCatalog: z.boolean().optional(),
  isVisibleInSearch: z.boolean().optional(),
  isVisibleOnHomepage: z.boolean().optional(),
  isVisibleInRecommendations: z.boolean().optional(),
  isVisibleInLevelBlock: z.boolean().optional(),
  isVisibleInAcademy: z.boolean().optional(),
  isVisibleInStudentDashboard: z.boolean().optional(),
};

/** Restricted to CMS-controlled fields; titles and learner data cannot be bulk changed. */
export const cmsCourseBulkUpdateSchema = z.object({
  courseIds: z.array(z.string().cuid()).min(1).max(100),
  levelCode: cefrLevelSchema.optional(),
  categorySlug: z.string().trim().regex(slotKeyPattern).max(80).optional(),
  primaryNodeId: z.string().cuid().nullable().optional(),
  accessMode: courseAccessModeSchema.optional(),
  ...courseVisibilityFields,
}).strict().refine((value) => Object.keys(value).some((key) => key !== "courseIds"), "Choose at least one course field to change.");

const importedExerciseSchema = z.object({
  type: exerciseTypeSchema,
  engineKey: z.string().trim().refine(isExerciseEngineKey, "Unsupported exercise engine"),
  variantKey: z.string().trim().regex(slotKeyPattern).max(120).optional(),
  instruction: z.string().trim().min(1).max(2000),
  question: z.string().trim().min(1).max(5000),
  content: jsonValueSchema.optional(),
  correctAnswer: jsonValueSchema,
  alternativeAnswers: jsonValueSchema.optional(),
  explanation: z.string().trim().max(5000).optional(),
  hint: z.string().trim().max(2000).optional(),
  hintsEnabled: z.boolean().default(true),
  difficulty: z.number().int().min(1).max(10).default(1),
  basePoints: z.number().int().min(0).max(1000).default(1),
  timeLimitSeconds: z.number().int().min(1).max(86_400).optional(),
  solutionCost: z.number().int().min(0).max(10_000).default(0),
  allowInstantCheck: z.boolean().default(true),
  allowExtraExercise: z.boolean().default(false),
});

const importedBlockSchema = z.object({
  type: lessonBlockTypeSchema,
  title: z.string().trim().max(160).optional(),
  content: jsonValueSchema.optional(),
  settings: jsonValueSchema.optional(),
  order: z.number().int().min(1).max(10_000),
  isRequired: z.boolean().default(false),
  exercises: z.array(importedExerciseSchema).max(500).default([]),
});

const importedLessonSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(160),
  description: z.string().trim().max(5000).optional(),
  type: lessonTypeSchema,
  order: z.number().int().min(1).max(10_000),
  estimatedDuration: z.number().int().min(0).max(10_000).default(0),
  phraseOfTheDay: z.string().trim().max(500).optional(),
  motivationalQuote: z.string().trim().max(1000).optional(),
  learningObjectives: jsonValueSchema.optional(),
  previewText: z.string().trim().max(2000).optional(),
  requiredPrerequisiteCompletion: z.number().int().min(1).max(100).default(100),
  autoUnlockNextLesson: z.boolean().default(true),
  isFree: z.boolean().default(false),
  blocks: z.array(importedBlockSchema).max(500).default([]),
});

const importedModuleSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  order: z.number().int().min(1).max(10_000),
  isRequired: z.boolean().default(true),
  requiresSequentialCompletion: z.boolean().default(false),
  requiredCompletionPercent: z.number().int().min(1).max(100).default(100),
  lessons: z.array(importedLessonSchema).max(500).default([]),
});

export const cmsCourseImportDocumentSchema = z.object({
  format: z.literal("krin-course"),
  version: z.literal(1),
  course: z.object({
    levelCode: cefrLevelSchema,
    categorySlug: z.string().trim().regex(slotKeyPattern).max(80),
    title: z.string().trim().min(2).max(160),
    slug: z.string().trim().regex(slotKeyPattern).max(160).optional(),
    shortDescription: z.string().trim().min(10).max(500),
    fullDescription: z.string().trim().max(10_000).optional(),
    coverImage: httpUrlSchema.optional(),
    trailerVideoUrl: httpUrlSchema.optional(),
    language: z.string().trim().min(2).max(32).default("en"),
    estimatedDuration: z.number().int().min(0).max(100_000).default(0),
    difficulty: z.string().trim().max(80).optional(),
    isFeatured: z.boolean().default(false),
    firstFreeLessonCount: z.number().int().min(0).max(1000).default(0),
    priceAmount: z.number().int().min(0).max(100_000_000).optional(),
    priceCurrency: z.string().trim().regex(/^[A-Za-z]{3}$/).default("USD"),
    learningOutcomes: jsonValueSchema.optional(),
    prerequisites: jsonValueSchema.optional(),
    accessPlan: subscriptionPlanSchema.default("FREE"),
    academySlug: z.string().trim().max(120).default("general-english"),
    pathSlug: z.string().trim().max(120).default("core-journey"),
    stageSlug: z.string().trim().max(120).default("all-levels"),
    modules: z.array(importedModuleSchema).max(500).default([]),
  }),
});

export type CmsContentSlotInput = z.infer<typeof cmsContentSlotSchema>;
export type CmsMediaAssetInput = z.infer<typeof cmsMediaAssetSchema>;
export type CmsCourseImportDocument = z.infer<typeof cmsCourseImportDocumentSchema>;
export type CmsCurriculumNodeInput = z.infer<typeof cmsCurriculumNodeSchema>;
export type CmsCurriculumNodeUpdateInput = z.infer<typeof cmsCurriculumNodeUpdateSchema>;
export type CmsCourseCurriculumLinksInput = z.infer<typeof cmsCourseCurriculumLinksSchema>;
export type CmsCourseMoveInput = z.infer<typeof cmsCourseMoveSchema>;
export type CmsCourseBulkUpdateInput = z.infer<typeof cmsCourseBulkUpdateSchema>;
export type CmsCurriculumNodeMoveInput = z.infer<typeof cmsCurriculumNodeMoveSchema>;
export type CmsCurriculumNodeDuplicateInput = z.infer<typeof cmsCurriculumNodeDuplicateSchema>;
export type CmsCurriculumNodeTranslationInput = z.infer<typeof cmsCurriculumNodeTranslationSchema>;
export type CmsLanguageLevelInput = z.infer<typeof cmsLanguageLevelSchema>;
export type CmsLanguageLevelUpdateInput = z.infer<typeof cmsLanguageLevelUpdateSchema>;
