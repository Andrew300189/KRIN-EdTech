import { z } from "zod";

const wordPartOfSpeech = z.enum(["NOUN", "VERB", "ADJECTIVE", "ADVERB", "PRONOUN", "PREPOSITION", "CONJUNCTION", "DETERMINER", "NUMERAL", "INTERJECTION", "PHRASE", "PHRASAL_VERB", "IDIOM", "OTHER"]);
const cefrLevel = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
const userWordStatus = z.enum(["NEW", "LEARNING", "REVIEW", "MASTERED", "ARCHIVED", "SUSPENDED"]);
const sessionSource = z.enum(["DAILY_REVIEW", "LESSON_WARM_UP", "USER_SELECTED", "DIFFICULT_WORDS", "NEW_WORDS", "HOMEWORK"]);
const jsonValue: z.ZodType<unknown> = z.unknown();

export const wordPartOfSpeechSchema = wordPartOfSpeech;
export const createVocabularyWordSchema = z.object({
  lemma: z.string().trim().min(1).max(160),
  partOfSpeech: wordPartOfSpeech.optional(),
  cefrLevel: cefrLevel.optional(),
  britishTranscription: z.string().trim().max(200).optional(),
  americanTranscription: z.string().trim().max(200).optional(),
  britishAudioUrl: z.string().url().max(2048).optional(),
  americanAudioUrl: z.string().url().max(2048).optional(),
  isPhrasalVerb: z.boolean().default(false),
  isIdiomatic: z.boolean().default(false),
  isSlang: z.boolean().default(false),
  meanings: z.array(z.object({ definition: z.string().trim().min(1).max(2000), translation: z.string().trim().max(1000).optional(), article: z.string().trim().max(50).optional(), usageLabel: z.string().trim().max(80).optional(), context: z.string().trim().max(2000).optional() })).min(1).max(20),
  examples: z.array(z.object({ sentence: z.string().trim().min(1).max(3000), translation: z.string().trim().max(3000).optional(), source: z.string().trim().max(500).optional(), cefrLevel: cefrLevel.optional() })).max(20).default([]),
  collocations: z.array(z.object({ value: z.string().trim().min(1).max(500), translation: z.string().trim().max(1000).optional(), example: z.string().trim().max(2000).optional() })).max(30).default([]),
});

export const updateVocabularyWordSchema = z.object({
  lemma: z.string().trim().min(1).max(160).optional(),
  partOfSpeech: wordPartOfSpeech.nullable().optional(),
  cefrLevel: cefrLevel.nullable().optional(),
  britishTranscription: z.string().trim().max(200).nullable().optional(),
  americanTranscription: z.string().trim().max(200).nullable().optional(),
  britishAudioUrl: z.string().url().max(2048).nullable().optional(),
  americanAudioUrl: z.string().url().max(2048).nullable().optional(),
  isPhrasalVerb: z.boolean().optional(),
  isIdiomatic: z.boolean().optional(),
  isSlang: z.boolean().optional(),
  isActive: z.boolean().optional(),
  wordFormation: z.string().trim().max(2000).nullable().optional(),
  etymology: z.string().trim().max(2000).nullable().optional(),
});

export const addVocabularyMeaningSchema = z.object({
  definition: z.string().trim().min(1).max(2000),
  translation: z.string().trim().max(1000).optional(),
  article: z.string().trim().max(50).optional(),
  usageLabel: z.string().trim().max(80).optional(),
  context: z.string().trim().max(2000).optional(),
});
export const addVocabularyExampleSchema = z.object({
  sentence: z.string().trim().min(1).max(3000),
  translation: z.string().trim().max(3000).optional(),
  source: z.string().trim().max(500).optional(),
  cefrLevel: cefrLevel.optional(),
});
export const addVocabularyCollocationSchema = z.object({
  value: z.string().trim().min(1).max(500),
  translation: z.string().trim().max(1000).optional(),
  example: z.string().trim().max(2000).optional(),
});
export const addVocabularyRelationSchema = z.object({
  targetWordId: z.string().cuid(),
  type: z.enum(["SYNONYM", "ANTONYM", "RELATED", "PHRASAL_EQUIVALENT", "FORMAL_EQUIVALENT", "INFORMAL_EQUIVALENT", "BRITISH_VARIANT", "AMERICAN_VARIANT"]),
  note: z.string().trim().max(1000).optional(),
});
export const lessonVocabularyLinkSchema = z.object({
  wordId: z.string().cuid(),
  role: z.enum(["NEW", "REVIEW", "OPTIONAL", "HOMEWORK", "PHRASE_OF_THE_DAY"]).default("NEW"),
  isRequired: z.boolean().default(false),
  order: z.number().int().min(1).max(10000).optional(),
});

export const addDictionaryWordSchema = z.object({ wordId: z.string().cuid(), sourceLessonId: z.string().cuid().optional() });
export const addCustomDictionaryWordSchema = z.object({ term: z.string().trim().min(1).max(160), translation: z.string().trim().min(1).max(1000), partOfSpeech: wordPartOfSpeech.optional(), example: z.string().trim().max(2000).optional(), note: z.string().trim().max(2000).optional() });
export const vocabularyQuerySchema = z.object({ q: z.string().trim().max(160).optional(), status: z.union([z.literal("ALL"), userWordStatus, z.literal("CUSTOM"), z.literal("DIFFICULT")]).default("ALL"), cefrLevel: cefrLevel.optional(), partOfSpeech: wordPartOfSpeech.optional(), courseSlug: z.string().trim().max(160).optional(), sort: z.enum(["next_review", "newest", "mastery", "alphabetical"]).default("next_review"), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });
export const updateDictionaryWordSchema = z.object({ kind: z.enum(["GLOBAL", "CUSTOM"]), action: z.enum(["ARCHIVE", "RESTORE", "SUSPEND", "DIFFICULT", "NOT_DIFFICULT"]) });
export const createTrainingSessionSchema = z.object({ source: sessionSource.default("DAILY_REVIEW"), userWordIds: z.array(z.string().cuid()).max(50).optional(), userCustomWordIds: z.array(z.string().cuid()).max(50).optional(), lessonId: z.string().cuid().optional() });
export const submitVocabularyAnswerSchema = z.object({
  submittedAnswer: jsonValue,
  responseTimeSeconds: z.number().int().min(0).max(3600).optional(),
  // The value is a learner signal, not a correctness claim. The server still
  // calculates correctness from the stored answer key.
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});
export const updateVocabularySettingsSchema = z.object({ dailyGoal: z.number().int().min(1).max(100).optional(), maxSessionSize: z.number().int().min(1).max(50).optional(), showTranscription: z.boolean().optional(), autoplayAudio: z.boolean().optional(), pronunciationVariant: z.enum(["BRITISH", "AMERICAN", "BOTH"]).optional(), includeDifficultWords: z.boolean().optional(), dailyReminderEnabled: z.boolean().optional(), translationLanguage: z.string().trim().min(2).max(10).optional() });
const vocabularyImportRowSchema = z.object({
  lemma: z.string().trim().min(1).max(160),
  partOfSpeech: wordPartOfSpeech.optional(),
  cefrLevel: cefrLevel.optional(),
  translation: z.string().trim().max(1000).optional(),
  definition: z.string().trim().max(2000).optional(),
  article: z.string().trim().max(50).optional(),
  britishTranscription: z.string().trim().max(200).optional(),
  americanTranscription: z.string().trim().max(200).optional(),
  britishAudioUrl: z.string().url().max(2048).optional(),
  americanAudioUrl: z.string().url().max(2048).optional(),
  example: z.string().trim().max(3000).optional(),
  exampleTranslation: z.string().trim().max(3000).optional(),
  isPhrasalVerb: z.boolean().default(false),
  isIdiomatic: z.boolean().default(false),
  isSlang: z.boolean().default(false),
  meanings: createVocabularyWordSchema.shape.meanings.optional(),
  examples: createVocabularyWordSchema.shape.examples.optional(),
  collocations: createVocabularyWordSchema.shape.collocations.optional(),
}).superRefine((row, context) => {
  if (!row.meanings?.length && !row.definition && !row.translation) context.addIssue({ code: z.ZodIssueCode.custom, message: "definition or translation is required" });
}).transform((row) => ({
  lemma: row.lemma,
  partOfSpeech: row.partOfSpeech,
  cefrLevel: row.cefrLevel,
  britishTranscription: row.britishTranscription,
  americanTranscription: row.americanTranscription,
  britishAudioUrl: row.britishAudioUrl,
  americanAudioUrl: row.americanAudioUrl,
  isPhrasalVerb: row.isPhrasalVerb,
  isIdiomatic: row.isIdiomatic,
  isSlang: row.isSlang,
  meanings: row.meanings ?? [{ definition: row.definition ?? row.translation ?? "", translation: row.translation, article: row.article }],
  examples: row.examples ?? (row.example ? [{ sentence: row.example, translation: row.exampleTranslation }] : []),
  collocations: row.collocations ?? [],
}));

export const vocabularyImportSchema = z.object({ format: z.enum(["JSON", "CSV"]), rows: z.array(vocabularyImportRowSchema).min(1).max(500) });

export type VocabularyQuery = z.infer<typeof vocabularyQuerySchema>;
export type CreateTrainingSessionInput = z.infer<typeof createTrainingSessionSchema>;
