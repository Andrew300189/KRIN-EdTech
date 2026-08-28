import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";
import { answerMatches } from "@/modules/courses/utils/exercise-evaluation";
import { normalizeWord } from "@/modules/vocabulary/utils/normalize-word";
import { recordVocabularyReview, recordWordAdded } from "@/modules/motivation/services/motivation.service";
import { notificationService } from "@/modules/communications/services/notification.service";
import { invalidatePublicLearningStatistics } from "@/modules/analytics/services/platform-statistics.service";
import { determineReviewQuality, isEligibleForMastery, scheduleNextReview } from "@/modules/vocabulary/services/review-scheduler";
import {
  addCustomDictionaryWordSchema,
  addVocabularyCollocationSchema,
  addVocabularyExampleSchema,
  addVocabularyMeaningSchema,
  addVocabularyRelationSchema,
  addDictionaryWordSchema,
  createTrainingSessionSchema,
  createVocabularyWordSchema,
  submitVocabularyAnswerSchema,
  updateDictionaryWordSchema,
  updateVocabularySettingsSchema,
  vocabularyQuerySchema,
  type CreateTrainingSessionInput,
  type VocabularyQuery,
  updateVocabularyWordSchema,
  vocabularyImportSchema,
} from "@/modules/vocabulary/schemas/vocabulary.schemas";

type JsonRecord = Record<string, unknown>;
type Candidate = { value: string; wordId?: string };

const toJson = (value: unknown) => value as Prisma.InputJsonValue;
const activeStatuses = ["NEW", "LEARNING", "REVIEW"] as const;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function primaryMeaning(word: { meanings: Array<{ translation: string | null; definition: string }> }) {
  return word.meanings[0]?.translation ?? word.meanings[0]?.definition ?? "";
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export async function ensureVocabularySettings(userId: string) {
  return prisma.userVocabularySettings.upsert({ where: { userId }, update: {}, create: { userId } });
}

export async function getVocabularySettings(userId: string) {
  return ensureVocabularySettings(userId);
}

export async function updateVocabularySettings(userId: string, input: unknown) {
  const value = updateVocabularySettingsSchema.parse(input);
  return prisma.userVocabularySettings.upsert({ where: { userId }, update: value, create: { userId, ...value } });
}

export async function searchCentralWords(query: string, take = 8) {
  const normalized = normalizeWord(query);
  if (!normalized) return [];
  return prisma.word.findMany({
    where: { isActive: true, OR: [{ normalizedLemma: { contains: normalized } }, { lemma: { contains: query.trim(), mode: "insensitive" } }] },
    orderBy: [{ frequencyRank: "asc" }, { lemma: "asc" }],
    take,
    include: { meanings: { orderBy: { order: "asc" }, take: 3 } },
  });
}

export async function getVocabularyWord(wordId: string) {
  return prisma.word.findUnique({
    where: { id: wordId },
    include: {
      meanings: { orderBy: { order: "asc" } },
      examples: { orderBy: { order: "asc" }, take: 3 },
      collocations: { orderBy: { order: "asc" }, take: 10 },
      sourceRelations: { include: { targetWord: { include: { meanings: { orderBy: { order: "asc" }, take: 1 } } } } },
    },
  });
}

export async function getVocabularyWordForAdmin(wordId: string) {
  return prisma.word.findUnique({
    where: { id: wordId },
    include: {
      meanings: { orderBy: { order: "asc" } },
      examples: { orderBy: { order: "asc" } },
      collocations: { orderBy: { order: "asc" } },
      sourceRelations: { include: { targetWord: { select: { id: true, lemma: true } } } },
      _count: { select: { lessonVocabulary: true, userWords: true } },
    },
  });
}

export async function createVocabularyWord(actorId: string, input: unknown) {
  const value = createVocabularyWordSchema.parse(input);
  const normalizedLemma = normalizeWord(value.lemma);
  const duplicate = await prisma.word.findFirst({ where: { normalizedLemma, partOfSpeech: value.partOfSpeech ?? null }, select: { id: true } });
  if (duplicate) throw new Error("A word with this normalized spelling and part of speech already exists");
  const word = await prisma.word.create({
    data: {
      lemma: value.lemma.trim(), normalizedLemma, partOfSpeech: value.partOfSpeech, cefrLevel: value.cefrLevel,
      britishTranscription: value.britishTranscription, americanTranscription: value.americanTranscription,
      britishAudioUrl: value.britishAudioUrl, americanAudioUrl: value.americanAudioUrl,
      isPhrasalVerb: value.isPhrasalVerb, isIdiomatic: value.isIdiomatic, isSlang: value.isSlang,
      meanings: { create: value.meanings.map((meaning, index) => ({ ...meaning, order: index + 1 })) },
      examples: { create: value.examples.map((example, index) => ({ ...example, order: index + 1 })) },
      collocations: { create: value.collocations.map((collocation, index) => ({ ...collocation, order: index + 1 })) },
    },
    include: { meanings: true },
  });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CREATE", entityType: "Word", entityId: word.id, metadata: { lemma: word.lemma } } });
  return word;
}

export async function listVocabularyWordsForAdmin(query?: string) {
  const normalized = query ? normalizeWord(query) : "";
  return prisma.word.findMany({
    where: query ? { OR: [{ normalizedLemma: { contains: normalized } }, { lemma: { contains: query, mode: "insensitive" } }] } : {},
    orderBy: [{ isActive: "desc" }, { lemma: "asc" }], take: 100,
    include: { meanings: { orderBy: { order: "asc" }, take: 1 }, _count: { select: { lessonVocabulary: true, userWords: true } } },
  });
}

export async function setVocabularyWordActive(actorId: string, wordId: string, isActive: boolean) {
  const word = await prisma.word.update({ where: { id: wordId }, data: { isActive } });
  await prisma.contentAuditLog.create({ data: { actorId, action: isActive ? "ACTIVATE" : "DEACTIVATE", entityType: "Word", entityId: wordId } });
  return word;
}

export async function updateVocabularyWord(actorId: string, wordId: string, input: unknown) {
  const value = updateVocabularyWordSchema.parse(input);
  const current = await prisma.word.findUnique({ where: { id: wordId }, select: { lemma: true, partOfSpeech: true } });
  if (!current) throw new Error("Word not found");
  const lemma = value.lemma?.trim() ?? current.lemma;
  const partOfSpeech = value.partOfSpeech === undefined ? current.partOfSpeech : value.partOfSpeech;
  const normalizedLemma = normalizeWord(lemma);
  const duplicate = await prisma.word.findFirst({ where: { normalizedLemma, partOfSpeech, id: { not: wordId } }, select: { id: true } });
  if (duplicate) throw new Error("A word with this normalized spelling and part of speech already exists");
  const word = await prisma.word.update({ where: { id: wordId }, data: { ...value, lemma, normalizedLemma, partOfSpeech } });
  await prisma.contentAuditLog.create({ data: { actorId, action: "UPDATE", entityType: "Word", entityId: wordId, metadata: { lemma: word.lemma } } });
  return word;
}

export async function addVocabularyWordDetail(actorId: string, wordId: string, kind: "meaning" | "example" | "collocation" | "relation", input: unknown) {
  const word = await prisma.word.findUnique({ where: { id: wordId }, select: { id: true } });
  if (!word) throw new Error("Word not found");
  if (kind === "meaning") {
    const value = addVocabularyMeaningSchema.parse(input);
    const last = await prisma.wordMeaning.findFirst({ where: { wordId }, orderBy: { order: "desc" }, select: { order: true } });
    const result = await prisma.wordMeaning.create({ data: { wordId, ...value, order: (last?.order ?? 0) + 1 } });
    await prisma.contentAuditLog.create({ data: { actorId, action: "CREATE", entityType: "WordMeaning", entityId: result.id } });
    return result;
  }
  if (kind === "example") {
    const value = addVocabularyExampleSchema.parse(input);
    const last = await prisma.wordExample.findFirst({ where: { wordId }, orderBy: { order: "desc" }, select: { order: true } });
    const result = await prisma.wordExample.create({ data: { wordId, ...value, order: (last?.order ?? 0) + 1 } });
    await prisma.contentAuditLog.create({ data: { actorId, action: "CREATE", entityType: "WordExample", entityId: result.id } });
    return result;
  }
  if (kind === "collocation") {
    const value = addVocabularyCollocationSchema.parse(input);
    const last = await prisma.wordCollocation.findFirst({ where: { wordId }, orderBy: { order: "desc" }, select: { order: true } });
    const result = await prisma.wordCollocation.create({ data: { wordId, ...value, order: (last?.order ?? 0) + 1 } });
    await prisma.contentAuditLog.create({ data: { actorId, action: "CREATE", entityType: "WordCollocation", entityId: result.id } });
    return result;
  }
  const value = addVocabularyRelationSchema.parse(input);
  if (value.targetWordId === wordId) throw new Error("A word cannot be related to itself");
  const target = await prisma.word.findUnique({ where: { id: value.targetWordId }, select: { id: true } });
  if (!target) throw new Error("Related word not found");
  const result = await prisma.wordRelation.upsert({ where: { sourceWordId_targetWordId_type: { sourceWordId: wordId, targetWordId: value.targetWordId, type: value.type } }, update: { note: value.note }, create: { sourceWordId: wordId, targetWordId: value.targetWordId, type: value.type, note: value.note } });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CREATE", entityType: "WordRelation", entityId: result.id } });
  return result;
}

export async function linkWordToLesson(actorId: string, lessonId: string, wordId: string, role: "NEW" | "REVIEW" | "OPTIONAL" | "HOMEWORK" | "PHRASE_OF_THE_DAY", isRequired = false, order?: number) {
  const [lesson, word, last] = await Promise.all([
    prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } }),
    prisma.word.findFirst({ where: { id: wordId, isActive: true }, select: { id: true } }),
    prisma.lessonVocabulary.findFirst({ where: { lessonId }, orderBy: { order: "desc" }, select: { order: true } }),
  ]);
  if (!lesson || !word) throw new Error("Lesson or active word not found");
  const item = await prisma.lessonVocabulary.upsert({
    where: { lessonId_wordId: { lessonId, wordId } },
    update: { role, isRequired, ...(order ? { order } : {}) },
    create: { lessonId, wordId, role, isRequired, order: order ?? (last?.order ?? 0) + 1 },
  });
  await prisma.contentAuditLog.create({ data: { actorId, action: "LINK", entityType: "LessonVocabulary", entityId: item.id, metadata: { lessonId, wordId } } });
  return item;
}

export async function unlinkWordFromLesson(actorId: string, lessonId: string, wordId: string) {
  const deleted = await prisma.lessonVocabulary.deleteMany({ where: { lessonId, wordId } });
  if (deleted.count) await prisma.contentAuditLog.create({ data: { actorId, action: "UNLINK", entityType: "LessonVocabulary", entityId: `${lessonId}:${wordId}` } });
  return deleted.count > 0;
}

export async function listLessonVocabulary(lessonId: string) {
  return prisma.lessonVocabulary.findMany({
    where: { lessonId, word: { isActive: true } }, orderBy: { order: "asc" },
    include: { word: { include: { meanings: { orderBy: { order: "asc" } }, examples: { orderBy: { order: "asc" }, take: 1 }, collocations: { orderBy: { order: "asc" }, take: 5 }, sourceRelations: { include: { targetWord: { include: { meanings: { orderBy: { order: "asc" }, take: 1 } } } } } } } },
  });
}

export async function addWordToUserDictionary(userId: string, input: unknown) {
  const value = addDictionaryWordSchema.parse(input);
  if (value.sourceLessonId) {
    const access = await canAccessLesson(userId, value.sourceLessonId);
    if (!access.allowed) throw new Error("You cannot add vocabulary from this lesson");
  }
  const word = await prisma.word.findFirst({ where: { id: value.wordId, isActive: true }, select: { id: true } });
  if (!word) throw new Error("Active word not found");
  const existing = await prisma.userWord.findUnique({ where: { userId_wordId: { userId, wordId: word.id } } });
  const now = new Date();
  if (existing) {
    if (existing.status === "ARCHIVED" || existing.status === "SUSPENDED") {
      return prisma.userWord.update({ where: { id: existing.id }, data: { status: "LEARNING", archivedAt: null, nextReviewAt: now, sourceLessonId: value.sourceLessonId ?? existing.sourceLessonId } });
    }
    return existing;
  }
  const created = await prisma.userWord.create({ data: { userId, wordId: word.id, sourceLessonId: value.sourceLessonId, status: "NEW", nextReviewAt: now, addedAt: now } });
  await recordWordAdded(userId, word.id);
  return created;
}

export async function addCustomWordToUserDictionary(userId: string, input: unknown) {
  const value = addCustomDictionaryWordSchema.parse(input);
  const normalizedTerm = normalizeWord(value.term);
  const existing = await prisma.userCustomWord.findUnique({ where: { userId_normalizedTerm: { userId, normalizedTerm } } });
  const now = new Date();
  if (existing) {
    // A learner may change a suggested translation before or after saving it.
    // Keep one personal card per normalized word instead of creating duplicates.
    return prisma.userCustomWord.update({
      where: { id: existing.id },
      data: {
        term: value.term.trim(),
        translation: value.translation.trim(),
        partOfSpeech: value.partOfSpeech ?? existing.partOfSpeech,
        example: value.example ?? existing.example,
        note: value.note ?? existing.note,
        ...(existing.status === "ARCHIVED" || existing.status === "SUSPENDED"
          ? { status: "LEARNING", archivedAt: null, nextReviewAt: now }
          : {}),
      },
    });
  }
  return prisma.userCustomWord.create({ data: { userId, term: value.term.trim(), normalizedTerm, translation: value.translation.trim(), partOfSpeech: value.partOfSpeech, example: value.example, note: value.note, status: "NEW", nextReviewAt: now } });
}

/** A lightweight exact lookup used by the lesson hover card. */
export async function hasUserVocabularyTerm(userId: string, termInput: string) {
  const normalizedTerm = normalizeWord(termInput);
  if (!normalizedTerm) return false;
  const [custom, global] = await Promise.all([
    prisma.userCustomWord.findUnique({ where: { userId_normalizedTerm: { userId, normalizedTerm } }, select: { id: true } }),
    prisma.userWord.findFirst({
      where: {
        userId,
        word: { normalizedLemma: { in: [normalizedTerm, `to ${normalizedTerm}`] } },
        status: { notIn: ["ARCHIVED", "SUSPENDED"] },
      },
      select: { id: true },
    }),
  ]);
  return Boolean(custom || global);
}

function globalWordWhere(userId: string, query: VocabularyQuery): Prisma.UserWordWhereInput {
  const status = query.status;
  const wordFilters: Prisma.WordWhereInput[] = [];
  if (query.q) {
    wordFilters.push({
      OR: [
        { lemma: { contains: query.q, mode: "insensitive" } },
        { normalizedLemma: { contains: normalizeWord(query.q) } },
        { meanings: { some: { translation: { contains: query.q, mode: "insensitive" } } } },
      ],
    });
  }
  if (query.cefrLevel) wordFilters.push({ cefrLevel: query.cefrLevel });
  if (query.partOfSpeech) wordFilters.push({ partOfSpeech: query.partOfSpeech });
  return {
    userId,
    ...(status === "CUSTOM" ? { id: "__none__" } : status === "DIFFICULT" ? { isDifficult: true } : status !== "ALL" ? { status: status as never } : {}),
    ...(wordFilters.length ? { word: { AND: wordFilters } } : {}),
    ...(query.courseSlug ? { sourceLesson: { module: { course: { slug: query.courseSlug } } } } : {}),
  };
}

export async function getUserVocabulary(userId: string, input: unknown = {}) {
  const query = vocabularyQuerySchema.parse(input);
  const orderBy = query.sort === "alphabetical" ? { word: { lemma: "asc" as const } } : query.sort === "mastery" ? { masteryLevel: "desc" as const } : query.sort === "newest" ? { addedAt: "desc" as const } : { nextReviewAt: "asc" as const };
  const includeCustom = query.status === "ALL" || query.status === "CUSTOM";
  const customWhere: Prisma.UserCustomWordWhereInput = {
    userId,
    ...(query.q ? { OR: [{ term: { contains: query.q, mode: "insensitive" } }, { translation: { contains: query.q, mode: "insensitive" } }] } : {}),
    ...(query.status === "CUSTOM" ? {} : { status: { notIn: ["ARCHIVED", "SUSPENDED"] } }),
  };
  const [globalItems, globalTotal, customItems, customTotal] = await Promise.all([
    prisma.userWord.findMany({ where: globalWordWhere(userId, query), orderBy, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { word: { include: { meanings: { orderBy: { order: "asc" } }, examples: { orderBy: { order: "asc" }, take: 1 }, collocations: { orderBy: { order: "asc" }, take: 5 }, sourceRelations: { include: { targetWord: { include: { meanings: { take: 1 } } } } } } }, sourceLesson: { select: { title: true, slug: true, module: { select: { course: { select: { title: true, slug: true } } } } } } } }),
    prisma.userWord.count({ where: globalWordWhere(userId, query) }),
    includeCustom ? prisma.userCustomWord.findMany({ where: customWhere, orderBy: query.sort === "mastery" ? { masteryLevel: "desc" } : query.sort === "newest" ? { createdAt: "desc" } : query.sort === "alphabetical" ? { term: "asc" } : { nextReviewAt: "asc" }, skip: query.status === "CUSTOM" ? (query.page - 1) * query.pageSize : 0, take: query.status === "CUSTOM" ? query.pageSize : Math.min(5, query.pageSize) }) : Promise.resolve([]),
    includeCustom ? prisma.userCustomWord.count({ where: customWhere }) : Promise.resolve(0),
  ]);
  const items = [
    ...globalItems.map((item) => ({ kind: "GLOBAL" as const, ...item })),
    ...customItems.map((item) => ({ kind: "CUSTOM" as const, ...item })),
  ];
  return { items, total: globalTotal + customTotal, page: query.page, pageSize: query.pageSize };
}

export async function archiveOrRestoreDictionaryWord(userId: string, itemId: string, input: unknown) {
  const value = updateDictionaryWordSchema.parse(input);
  const now = new Date();
  const isGlobal = value.kind === "GLOBAL";
  const where = { id: itemId, userId };
  if (value.action === "ARCHIVE") return isGlobal ? prisma.userWord.update({ where, data: { status: "ARCHIVED", archivedAt: now, nextReviewAt: null } }) : prisma.userCustomWord.update({ where, data: { status: "ARCHIVED", archivedAt: now, nextReviewAt: null } });
  if (value.action === "RESTORE") return isGlobal ? prisma.userWord.update({ where, data: { status: "LEARNING", archivedAt: null, nextReviewAt: now } }) : prisma.userCustomWord.update({ where, data: { status: "LEARNING", archivedAt: null, nextReviewAt: now } });
  if (value.action === "SUSPEND") return isGlobal ? prisma.userWord.update({ where, data: { status: "SUSPENDED", nextReviewAt: null } }) : prisma.userCustomWord.update({ where, data: { status: "SUSPENDED", nextReviewAt: null } });
  const difficult = value.action === "DIFFICULT";
  return isGlobal ? prisma.userWord.update({ where, data: { isDifficult: difficult } }) : prisma.userCustomWord.update({ where, data: { isDifficult: difficult } });
}

export async function removeCustomWordFromDictionary(userId: string, itemId: string) {
  const deleted = await prisma.userCustomWord.deleteMany({ where: { id: itemId, userId } });
  if (!deleted.count) throw new Error("Custom word not found");
  return true;
}

export async function getWordsDueForReview(userId: string, limit = 20) {
  const now = new Date();
  const [global, custom] = await Promise.all([
    prisma.userWord.findMany({ where: { userId, status: { in: [...activeStatuses] }, nextReviewAt: { lte: now }, word: { isActive: true } }, orderBy: { nextReviewAt: "asc" }, take: limit, include: { word: { include: { meanings: { orderBy: { order: "asc" } }, examples: { orderBy: { order: "asc" }, take: 1 }, collocations: { take: 5 }, sourceRelations: { include: { targetWord: { include: { meanings: { take: 1 } } } } } } } } }),
    prisma.userCustomWord.findMany({ where: { userId, status: { in: [...activeStatuses] }, nextReviewAt: { lte: now } }, orderBy: { nextReviewAt: "asc" }, take: limit }),
  ]);
  return { global, custom };
}

export function buildVocabularyExercise(entry: { lemma: string; meanings: Array<{ translation: string | null; definition: string; article?: string | null }>; examples?: Array<{ sentence: string; translation?: string | null }>; collocations?: Array<{ value: string; translation?: string | null }>; sourceRelations?: Array<{ type: string; targetWord: { lemma: string; meanings: Array<{ translation: string | null; definition: string }> } }> }, candidates: Candidate[], recentTypes: string[], ordinal: number, custom = false) {
  const meaning = primaryMeaning(entry);
  const acceptedLemma = [entry.lemma, normalizeWord(entry.lemma)];
  const distractors = candidates.filter((candidate) => normalizeWord(candidate.value) !== normalizeWord(meaning)).map((candidate) => candidate.value);
  const synonym = entry.sourceRelations?.find((relation) => relation.type === "SYNONYM");
  const article = entry.meanings[0]?.article;
  const example = entry.examples?.[0];
  const possible = [
    meaning ? "WORD_TO_TRANSLATION" : null,
    meaning ? "TRANSLATION_TO_WORD" : null,
    distractors.length >= 3 ? "SINGLE_CHOICE" : null,
    synonym ? "MATCH_SYNONYM" : null,
    article ? "ARTICLE_SELECTION" : null,
    example ? "FILL_IN_SENTENCE" : null,
    entry.collocations?.length ? "COLLOCATION_SELECTION" : null,
  ].filter((value): value is string => Boolean(value));
  const available = possible.filter((type) => !recentTypes.includes(type));
  const type = (available.length ? available : possible)[ordinal % Math.max(1, (available.length ? available : possible).length)] ?? "WORD_TO_TRANSLATION";
  if (type === "SINGLE_CHOICE") {
    const options = shuffle([meaning, ...distractors.slice(0, 3)]);
    return { exerciseType: "SINGLE_CHOICE", payload: { prompt: `Choose the translation for “${entry.lemma}”.`, mode: "choice", options }, answerKey: { acceptedAnswers: [meaning], display: meaning } };
  }
  if (type === "TRANSLATION_TO_WORD") return { exerciseType: "TRANSLATION_TO_WORD", payload: { prompt: `Write the English word for: ${meaning}`, mode: "text" }, answerKey: { acceptedAnswers: acceptedLemma, display: entry.lemma } };
  if (type === "MATCH_SYNONYM" && synonym) return { exerciseType: "MATCH_SYNONYM", payload: { prompt: `Choose a synonym for “${entry.lemma}”.`, mode: "choice", options: shuffle([synonym.targetWord.lemma, ...candidates.filter((candidate) => normalizeWord(candidate.value) !== normalizeWord(synonym.targetWord.lemma)).slice(0, 3).map((candidate) => candidate.value)]) }, answerKey: { acceptedAnswers: [synonym.targetWord.lemma], display: synonym.targetWord.lemma } };
  if (type === "ARTICLE_SELECTION" && article) return { exerciseType: "ARTICLE_SELECTION", payload: { prompt: `Choose the article for “${entry.lemma}”.`, mode: "choice", options: shuffle([article, "a", "an", "the"].filter((item, index, values) => values.indexOf(item) === index)) }, answerKey: { acceptedAnswers: [article], display: article } };
  if (type === "FILL_IN_SENTENCE" && example) return { exerciseType: "FILL_IN_SENTENCE", payload: { prompt: example.sentence.replace(new RegExp(entry.lemma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "_____"), mode: "text" }, answerKey: { acceptedAnswers: acceptedLemma, display: entry.lemma } };
  if (type === "COLLOCATION_SELECTION" && entry.collocations?.[0]) return { exerciseType: "COLLOCATION_SELECTION", payload: { prompt: `Choose the collocation with “${entry.lemma}”.`, mode: "choice", options: shuffle([entry.collocations[0].value, ...distractors.slice(0, 3)]) }, answerKey: { acceptedAnswers: [entry.collocations[0].value], display: entry.collocations[0].value } };
  return { exerciseType: "WORD_TO_TRANSLATION", payload: { prompt: `Translate “${entry.lemma}”.`, mode: "text", audioUrl: custom ? null : undefined }, answerKey: { acceptedAnswers: [meaning], display: meaning } };
}

function shuffledTiles(answer: string) {
  const separator = answer.trim().includes(" ") ? " " : "";
  const original = separator ? answer.trim().split(/\s+/) : Array.from(answer.trim());
  if (original.length < 2) return { tiles: original, separator };
  let tiles = shuffle(original);
  if (tiles.join(separator).toLocaleLowerCase() === original.join(separator).toLocaleLowerCase()) {
    tiles = [...tiles.slice(1), tiles[0]];
  }
  return { tiles, separator };
}

function buildVocabularyDrillExercise(
  entry: { lemma: string; meanings: Array<{ translation: string | null; definition: string }> },
  ordinal: number,
) {
  const translation = primaryMeaning(entry);
  const mode = ordinal % 3;
  if (mode === 0) {
    return {
      exerciseType: "WORD_TO_TRANSLATION",
      payload: { prompt: `Переведите на русский: ${entry.lemma}`, mode: "text", direction: "EN_RU" },
      answerKey: { acceptedAnswers: [translation], display: translation },
    };
  }
  if (mode === 1) {
    return {
      exerciseType: "TRANSLATION_TO_WORD",
      payload: { prompt: `Переведите на английский: ${translation}`, mode: "text", direction: "RU_EN" },
      answerKey: { acceptedAnswers: [entry.lemma, normalizeWord(entry.lemma)], display: entry.lemma },
    };
  }
  const { tiles, separator } = shuffledTiles(entry.lemma);
  return {
    exerciseType: "TEXT_INPUT",
    payload: { prompt: `Соберите английский перевод: ${translation}`, mode: "tiles", direction: "RU_EN", tiles, separator },
    answerKey: { acceptedAnswers: [entry.lemma, normalizeWord(entry.lemma)], display: entry.lemma },
  };
}

async function sessionForUser(userId: string, sessionId: string, includeAnswers = false) {
  return prisma.vocabularyTrainingSession.findFirst({
    where: { id: sessionId, userId },
    include: { items: { orderBy: { order: "asc" }, select: { id: true, exerciseType: true, payload: true, ...(includeAnswers ? { answerKey: true, userWordId: true, userCustomWordId: true, status: true } : { status: true, order: true }) } } },
  });
}

export async function createVocabularyTrainingSession(userId: string, input: unknown = {}) {
  const value = createTrainingSessionSchema.parse(input) as CreateTrainingSessionInput;
  const settings = await ensureVocabularySettings(userId);
  const existing = await prisma.vocabularyTrainingSession.findFirst({ where: { userId, source: value.source, lessonId: value.lessonId ?? null, status: { in: ["CREATED", "IN_PROGRESS"] } }, orderBy: { createdAt: "desc" } });
  if (existing) return sessionForUser(userId, existing.id);
  const limit = settings.maxSessionSize;
  const due = await getWordsDueForReview(userId, limit);
  let global = due.global;
  let custom = due.custom;
  if (value.userWordIds?.length) global = await prisma.userWord.findMany({ where: { id: { in: value.userWordIds }, userId, word: { isActive: true } }, include: { word: { include: { meanings: { orderBy: { order: "asc" } }, examples: { orderBy: { order: "asc" }, take: 1 }, collocations: { take: 5 }, sourceRelations: { include: { targetWord: { include: { meanings: { take: 1 } } } } } } } } });
  if (value.userCustomWordIds?.length) custom = await prisma.userCustomWord.findMany({ where: { id: { in: value.userCustomWordIds }, userId } });
  if (value.source === "USER_SELECTED" && !value.userWordIds?.length && !value.userCustomWordIds?.length) {
    global = await prisma.userWord.findMany({
      where: { userId, status: { in: [...activeStatuses] }, word: { isActive: true } },
      orderBy: [{ isDifficult: "desc" }, { masteryLevel: "asc" }, { addedAt: "asc" }],
      take: 20,
      include: { word: { include: { meanings: { orderBy: { order: "asc" } }, examples: { take: 1 }, collocations: { take: 5 }, sourceRelations: { include: { targetWord: { include: { meanings: { take: 1 } } } } } } } },
    });
    custom = await prisma.userCustomWord.findMany({
      where: { userId, status: { in: [...activeStatuses] } },
      orderBy: [{ isDifficult: "desc" }, { masteryLevel: "asc" }, { createdAt: "asc" }],
      take: Math.max(0, 20 - global.length),
    });
  }
  if (value.source === "DIFFICULT_WORDS" || (global.length + custom.length < Math.min(5, limit) && settings.includeDifficultWords)) {
    const difficult = await prisma.userWord.findMany({ where: { userId, isDifficult: true, status: { in: [...activeStatuses] }, word: { isActive: true }, id: { notIn: global.map((item) => item.id) } }, take: limit - global.length, include: { word: { include: { meanings: { orderBy: { order: "asc" } }, examples: { take: 1 }, collocations: { take: 5 }, sourceRelations: { include: { targetWord: { include: { meanings: { take: 1 } } } } } } } } });
    global = [...global, ...difficult];
  }
  const entries = [...global.flatMap((item) => item.word ? [{ kind: "GLOBAL" as const, item: { ...item, word: item.word } }] : []), ...custom.map((item) => ({ kind: "CUSTOM" as const, item }))].slice(0, value.source === "USER_SELECTED" ? 20 : limit);
  if (!entries.length) return null;
  const candidateWords = await prisma.word.findMany({ where: { isActive: true }, take: 100, include: { meanings: { orderBy: { order: "asc" }, take: 1 } } });
  const candidates = candidateWords.map((word) => ({ value: primaryMeaning(word), wordId: word.id })).filter((candidate) => candidate.value);
  const taskEntries = value.source === "USER_SELECTED"
    ? Array.from({ length: 20 }, (_, index) => entries[index % entries.length])
    : entries;
  const exercises = taskEntries.map((entry, index) => {
    if (value.source === "USER_SELECTED") {
      const vocabularyEntry = entry.kind === "GLOBAL"
        ? entry.item.word
        : { lemma: entry.item.term, meanings: [{ translation: entry.item.translation, definition: entry.item.translation }] };
      return buildVocabularyDrillExercise(vocabularyEntry, index);
    }
    if (entry.kind === "GLOBAL") return buildVocabularyExercise(entry.item.word, candidates, [], index);
    return buildVocabularyExercise({ lemma: entry.item.term, meanings: [{ translation: entry.item.translation, definition: entry.item.translation }], examples: entry.item.example ? [{ sentence: entry.item.example }] : [], collocations: [] }, candidates, [], index, true);
  });
  const session = await prisma.vocabularyTrainingSession.create({
    data: { userId, lessonId: value.lessonId, source: value.source, status: "IN_PROGRESS", totalItems: taskEntries.length, startedAt: new Date(), items: { create: taskEntries.map((entry, index) => ({ userWordId: entry.kind === "GLOBAL" ? entry.item.id : undefined, userCustomWordId: entry.kind === "CUSTOM" ? entry.item.id : undefined, exerciseType: exercises[index].exerciseType as never, payload: toJson(exercises[index].payload), answerKey: toJson(exercises[index].answerKey), order: index + 1 })) } },
  });
  return sessionForUser(userId, session.id);
}

export async function markVocabularyTrainingItemMastered(userId: string, sessionItemId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.vocabularyTrainingItem.findFirst({
      where: { id: sessionItemId, session: { userId, status: "IN_PROGRESS" } },
      include: { session: true },
    });
    if (!item) throw new Error("Active vocabulary exercise not found");
    const now = new Date();
    if (item.userWordId) {
      await tx.userWord.update({ where: { id: item.userWordId, userId }, data: { status: "MASTERED", masteryLevel: 100, masteredAt: now, nextReviewAt: null, isDifficult: false } });
    } else if (item.userCustomWordId) {
      await tx.userCustomWord.update({ where: { id: item.userCustomWordId, userId }, data: { status: "MASTERED", masteryLevel: 100, masteredAt: now, nextReviewAt: null, isDifficult: false } });
    } else {
      throw new Error("Vocabulary word is no longer available");
    }
    const pending = await tx.vocabularyTrainingItem.findMany({
      where: {
        sessionId: item.sessionId,
        status: "PENDING",
        ...(item.userWordId ? { userWordId: item.userWordId } : { userCustomWordId: item.userCustomWordId }),
      },
      select: { id: true },
    });
    if (pending.length) await tx.vocabularyTrainingItem.updateMany({ where: { id: { in: pending.map(({ id }) => id) } }, data: { status: "SKIPPED", submittedAt: now } });
    const completedItems = Math.min(item.session.totalItems, item.session.completedItems + pending.length);
    const sessionCompleted = completedItems >= item.session.totalItems;
    await tx.vocabularyTrainingSession.update({
      where: { id: item.sessionId },
      data: { completedItems, ...(sessionCompleted ? { status: "COMPLETED", completedAt: now } : {}) },
    });
    return { mastered: true, skippedItems: pending.length, sessionCompleted };
  });
  invalidatePublicLearningStatistics();
  return result;
}

export async function getVocabularyTrainingSession(userId: string, sessionId: string) {
  return sessionForUser(userId, sessionId);
}

export async function submitVocabularyAnswer(userId: string, sessionItemId: string, input: unknown) {
  const value = submitVocabularyAnswerSchema.parse(input);
  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.vocabularyTrainingItem.findFirst({ where: { id: sessionItemId, session: { userId, status: "IN_PROGRESS" } }, include: { session: true, userWord: { include: { word: true } }, userCustomWord: true } });
    if (!item) throw new Error("Active vocabulary exercise not found");
    if (item.status !== "PENDING") {
      const previous = await tx.wordReviewAttempt.findFirst({ where: { userId, OR: [{ userWordId: item.userWordId ?? undefined }, { userCustomWordId: item.userCustomWordId ?? undefined }] }, orderBy: { reviewedAt: "desc" } });
      return { alreadySubmitted: true, isCorrect: previous?.isCorrect ?? false, quality: previous?.quality ?? "AGAIN", nextReviewAt: null };
    }
    const answerKey = asRecord(item.answerKey);
    const acceptedAnswers = stringArray(answerKey.acceptedAnswers);
    const isCorrect = answerMatches(value.submittedAnswer, acceptedAnswers[0] ?? "", acceptedAnswers.slice(1), { ignorePunctuation: true, ignoreExtraSpaces: true });
    const previousState = item.userWord ? item.userWord : item.userCustomWord;
    if (!previousState) throw new Error("Vocabulary item is no longer available");
    const quality = determineReviewQuality(isCorrect, item.exerciseType, value.responseTimeSeconds);
    const scheduled = scheduleNextReview({
      state: previousState,
      isCorrect,
      exerciseType: item.exerciseType,
      responseTimeSeconds: value.responseTimeSeconds,
      confidence: value.confidence,
      difficulty: item.userWord?.isDifficult || item.userCustomWord?.isDifficult ? 7 : 1,
      previousErrors: previousState.incorrectCount,
      lastReviewedAt: previousState.lastReviewedAt,
    });
    const priorCorrect = await tx.wordReviewAttempt.findMany({ where: item.userWordId ? { userWordId: item.userWordId } : { userCustomWordId: item.userCustomWordId! }, orderBy: { reviewedAt: "desc" }, take: 2, select: { isCorrect: true } });
    const becomesMastered = isEligibleForMastery(scheduled, priorCorrect.length === 2 && priorCorrect.every((attempt) => attempt.isCorrect), isCorrect);
    const status: "MASTERED" | "LEARNING" | "REVIEW" = becomesMastered ? "MASTERED" : scheduled.status;
    const update = { status, easeFactor: scheduled.easeFactor, intervalDays: scheduled.intervalDays, repetitions: scheduled.repetitions, lapses: scheduled.lapses, masteryLevel: scheduled.masteryLevel, nextReviewAt: scheduled.nextReviewAt, lastReviewedAt: new Date(), correctCount: { increment: isCorrect ? 1 : 0 }, incorrectCount: { increment: isCorrect ? 0 : 1 }, masteredAt: becomesMastered ? new Date() : null };
    if (item.userWordId) await tx.userWord.update({ where: { id: item.userWordId, userId }, data: update });
    else await tx.userCustomWord.update({ where: { id: item.userCustomWordId!, userId }, data: update });
    const reviewAttempt = await tx.wordReviewAttempt.create({ data: { userId, userWordId: item.userWordId, userCustomWordId: item.userCustomWordId, wordId: item.userWord?.wordId, exerciseType: item.exerciseType, submittedAnswer: toJson(value.submittedAnswer), isCorrect, quality, responseTimeSeconds: value.responseTimeSeconds, previousIntervalDays: previousState.intervalDays, nextIntervalDays: scheduled.intervalDays, previousMasteryLevel: previousState.masteryLevel, nextMasteryLevel: scheduled.masteryLevel } });
    await tx.vocabularyTrainingItem.update({ where: { id: item.id }, data: { status: "COMPLETED", submittedAt: new Date() } });
    const completedItems = item.session.completedItems + 1;
    const sessionUpdate = { completedItems, correctItems: item.session.correctItems + (isCorrect ? 1 : 0), incorrectItems: item.session.incorrectItems + (isCorrect ? 0 : 1), ...(completedItems >= item.session.totalItems ? { status: "COMPLETED" as const, completedAt: new Date() } : {}) };
    await tx.vocabularyTrainingSession.update({ where: { id: item.sessionId }, data: sessionUpdate });
    const motivationReward = await recordVocabularyReview(tx, { userId, vocabularySessionId: item.sessionId, reviewId: reviewAttempt.id, isCorrect, sessionCompleted: completedItems >= item.session.totalItems, warmUp: item.session.source === "LESSON_WARM_UP" });
    return { alreadySubmitted: false, isCorrect, quality, correctAnswer: answerKey.display ?? null, nextReviewAt: scheduled.nextReviewAt, masteryLevel: scheduled.masteryLevel, mastered: becomesMastered, sessionCompleted: completedItems >= item.session.totalItems, sessionId: item.sessionId, motivationReward };
  });
  if (!result.alreadySubmitted && result.mastered) invalidatePublicLearningStatistics();
  if (!result.alreadySubmitted && result.sessionCompleted) {
    try { await notificationService.createNotification({ userId, type: "VOCABULARY_SESSION_COMPLETED", idempotencyKey: `vocabulary-session-completed:${userId}:${result.sessionId}`, entityType: "VocabularyTrainingSession", entityId: result.sessionId, title: "Vocabulary session completed", message: "Your vocabulary practice has been recorded.", actionUrl: "/dashboard/vocabulary", actionLabel: "Continue vocabulary" }); }
    catch (error) { console.error("[communications] vocabulary notification failed", error); }
  }
  return result;
}

export async function skipVocabularyTrainingSession(userId: string, sessionId: string) {
  return prisma.vocabularyTrainingSession.updateMany({ where: { id: sessionId, userId, status: { in: ["CREATED", "IN_PROGRESS"] } }, data: { status: "ABANDONED", skippedAt: new Date() } });
}

export async function createLessonWarmUp(userId: string, lessonId: string) {
  const access = await canAccessLesson(userId, lessonId);
  if (!access.allowed) throw new Error("You cannot access warm-up for this lesson");
  const configuration = await prisma.warmUpConfiguration.findUnique({ where: { id: "default" } }) ?? { minItems: 1, maxItems: 10, maxPreviousWords: 3, maxDueWords: 3, maxDifficultWords: 2 };
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              modules: {
                where: { isPublished: true },
                orderBy: { order: "asc" },
                include: {
                  lessons: {
                    where: { isPublished: true },
                    orderBy: { order: "asc" },
                    include: { vocabulary: { orderBy: { order: "asc" } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!lesson) return null;
  const lessons = lesson.module.course.modules.flatMap((module) => module.lessons);
  const currentIndex = lessons.findIndex((item) => item.id === lessonId);
  const previous = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const [previousWords, due, difficult] = await Promise.all([
    previous ? prisma.userWord.findMany({ where: { userId, wordId: { in: previous.vocabulary.map((item) => item.wordId) }, status: { in: [...activeStatuses] } }, orderBy: { addedAt: "desc" }, take: configuration.maxPreviousWords, select: { id: true } }) : [],
    prisma.userWord.findMany({ where: { userId, status: { in: [...activeStatuses] }, nextReviewAt: { lte: new Date() } }, orderBy: { nextReviewAt: "asc" }, take: configuration.maxDueWords, select: { id: true } }),
    prisma.userWord.findMany({ where: { userId, isDifficult: true, status: { in: [...activeStatuses] } }, orderBy: { masteryLevel: "asc" }, take: configuration.maxDifficultWords, select: { id: true } }),
  ]);
  const userWordIds = [...new Set([...previousWords, ...due, ...difficult].map((item) => item.id))].slice(0, configuration.maxItems);
  if (userWordIds.length < configuration.minItems) return null;
  return createVocabularyTrainingSession(userId, { source: "LESSON_WARM_UP", lessonId, userWordIds });
}

export async function getVocabularyReviewPrompt(userId: string) {
  const [settings, due] = await Promise.all([ensureVocabularySettings(userId), prisma.userWord.count({ where: { userId, status: { in: [...activeStatuses] }, nextReviewAt: { lte: new Date() } } })]);
  const now = new Date();
  const dismissed = settings.reviewPromptDismissedUntil && settings.reviewPromptDismissedUntil > now;
  return { shouldShow: settings.dailyReminderEnabled && due > 0 && !dismissed, dueCount: due };
}

export async function dismissVocabularyReviewPrompt(userId: string, hours = 8) {
  const now = new Date();
  return prisma.userVocabularySettings.upsert({ where: { userId }, update: { lastReviewPromptAt: now, reviewPromptDismissedUntil: new Date(now.getTime() + hours * 60 * 60_000) }, create: { userId, lastReviewPromptAt: now, reviewPromptDismissedUntil: new Date(now.getTime() + hours * 60 * 60_000) } });
}

export async function getVocabularyStatistics(userId: string) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const [all, customAll, due, customDue, difficult, customDifficult, attempts, settings] = await Promise.all([
    prisma.userWord.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
    prisma.userCustomWord.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
    prisma.userWord.count({ where: { userId, status: { in: [...activeStatuses] }, nextReviewAt: { lte: new Date() } } }),
    prisma.userCustomWord.count({ where: { userId, status: { in: [...activeStatuses] }, nextReviewAt: { lte: new Date() } } }),
    prisma.userWord.count({ where: { userId, isDifficult: true } }),
    prisma.userCustomWord.count({ where: { userId, isDifficult: true } }),
    prisma.wordReviewAttempt.findMany({ where: { userId, reviewedAt: { gte: weekAgo } }, select: { isCorrect: true, responseTimeSeconds: true, reviewedAt: true } }),
    ensureVocabularySettings(userId),
  ]);
  const byStatus = [...all, ...customAll].reduce<Record<string, number>>((summary, entry) => ({ ...summary, [entry.status]: (summary[entry.status] ?? 0) + entry._count._all }), {});
  const daily = Array.from({ length: 7 }, (_, index) => { const date = new Date(Date.now() - (6 - index) * 24 * 60 * 60_000); const key = date.toISOString().slice(0, 10); return { date: key, reviews: attempts.filter((attempt) => attempt.reviewedAt.toISOString().slice(0, 10) === key).length }; });
  const timed = attempts.filter((attempt) => attempt.responseTimeSeconds !== null);
  return { total: Object.values(byStatus).reduce((sum, count) => sum + count, 0), newCount: byStatus.NEW ?? 0, learning: (byStatus.LEARNING ?? 0) + (byStatus.REVIEW ?? 0), mastered: byStatus.MASTERED ?? 0, due: due + customDue, difficult: difficult + customDifficult, weeklyReviews: attempts.length, weeklyAccuracy: attempts.length ? Math.round((attempts.filter((attempt) => attempt.isCorrect).length / attempts.length) * 100) : 0, averageResponseSeconds: timed.length ? Math.round(timed.reduce((sum, attempt) => sum + (attempt.responseTimeSeconds ?? 0), 0) / timed.length) : null, dailyGoal: settings.dailyGoal, daily };
}

export async function importVocabularyWords(actorId: string, input: unknown) {
  const value = vocabularyImportSchema.parse(input);
  const errors: Array<{ row: number; error: string }> = [];
  let importedRows = 0;
  let skippedRows = 0;
  await prisma.$transaction(async (tx) => {
    for (const [index, row] of value.rows.entries()) {
      const normalizedLemma = normalizeWord(row.lemma);
      try {
        const duplicate = await tx.word.findFirst({ where: { normalizedLemma, partOfSpeech: row.partOfSpeech ?? null }, select: { id: true } });
        if (duplicate) {
          skippedRows += 1;
          errors.push({ row: index + 1, error: "Duplicate normalized lemma and part of speech" });
          continue;
        }
        await tx.word.create({
          data: {
            lemma: row.lemma.trim(),
            normalizedLemma,
            partOfSpeech: row.partOfSpeech,
            cefrLevel: row.cefrLevel,
            britishTranscription: row.britishTranscription,
            americanTranscription: row.americanTranscription,
            britishAudioUrl: row.britishAudioUrl,
            americanAudioUrl: row.americanAudioUrl,
            isPhrasalVerb: row.isPhrasalVerb,
            isIdiomatic: row.isIdiomatic,
            isSlang: row.isSlang,
            meanings: { create: row.meanings.map((meaning, meaningIndex) => ({ ...meaning, order: meaningIndex + 1 })) },
            examples: { create: row.examples.map((example, exampleIndex) => ({ ...example, order: exampleIndex + 1 })) },
            collocations: { create: row.collocations.map((collocation, collocationIndex) => ({ ...collocation, order: collocationIndex + 1 })) },
          },
        });
        importedRows += 1;
      } catch (error) {
        skippedRows += 1;
        errors.push({ row: index + 1, error: error instanceof Error ? error.message : "Invalid row" });
      }
    }
    await tx.vocabularyImportLog.create({ data: { actorId, format: value.format, totalRows: value.rows.length, importedRows, skippedRows, errors: errors.length ? toJson(errors) : undefined } });
    await tx.contentAuditLog.create({ data: { actorId, action: "IMPORT", entityType: "Word", entityId: `import:${Date.now()}`, metadata: { format: value.format, importedRows, skippedRows } } });
  });
  return { totalRows: value.rows.length, importedRows, skippedRows, errors };
}
