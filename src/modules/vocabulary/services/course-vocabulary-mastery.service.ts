import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";
import { answerMatches } from "@/modules/courses/utils/exercise-evaluation";
import { recordExerciseResult } from "@/modules/motivation/services/motivation.service";
import { assessPronunciation } from "@/modules/vocabulary/utils/pronunciation";
import {
  asVocabularyMasterySettings,
  buildVocabularyMasteryStages,
  vocabularyMasteryTranslation,
  type VocabularyMasteryDirection,
  type VocabularyMasteryLocale,
  type VocabularyMasteryStage,
} from "@/modules/vocabulary/utils/course-vocabulary-mastery";
import { z } from "zod";

type JsonRecord = Record<string, unknown>;
type MasteryWord = {
  id: string;
  lemma: string;
  translation: string;
  britishAudioUrl: string | null;
  americanAudioUrl: string | null;
};
type MasteryState = {
  version: 1;
  stageIndex: number;
  correctInRow: number;
  stageKey: string | null;
  selectedWordIds: string[];
};

const masteryAttemptSchema = z.object({
  stageIndex: z.number().int().min(0).max(10_000),
  locale: z.enum(["ru", "uk"]).optional(),
  transcript: z.string().trim().max(240).optional(),
  answers: z.array(z.string().trim().max(240)).max(24).optional(),
});

const toJson = (value: unknown) => value as Prisma.InputJsonValue;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function stateFromPayload(value: unknown): MasteryState {
  const payload = asRecord(value);
  const raw = asRecord(payload.state);
  return {
    version: 1,
    stageIndex: typeof raw.stageIndex === "number" && Number.isInteger(raw.stageIndex) ? Math.max(0, raw.stageIndex) : 0,
    correctInRow: typeof raw.correctInRow === "number" && Number.isInteger(raw.correctInRow) ? Math.max(0, raw.correctInRow) : 0,
    stageKey: typeof raw.stageKey === "string" ? raw.stageKey : null,
    selectedWordIds: stringList(raw.selectedWordIds),
  };
}

function sampleWordIds(wordIds: string[], count: number) {
  if (count >= wordIds.length) return [...wordIds];
  const pool = [...wordIds];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[target]] = [pool[target], pool[index]];
  }
  return pool.slice(0, count);
}

function stateForStage(stageIndex: number, stages: VocabularyMasteryStage[]): MasteryState {
  const stage = stages[stageIndex];
  return {
    version: 1,
    stageIndex,
    correctInRow: 0,
    stageKey: stage?.key ?? null,
    selectedWordIds: stage ? sampleWordIds(stage.wordIds, stage.promptCount) : [],
  };
}

function normaliseState(state: MasteryState, stages: VocabularyMasteryStage[]) {
  const stage = stages[state.stageIndex];
  if (!stage) return stateForStage(stages.length, stages);
  const expected = new Set(stage.wordIds);
  const correctSelection = state.stageKey === stage.key
    && state.selectedWordIds.length === stage.promptCount
    && state.selectedWordIds.every((wordId) => expected.has(wordId));
  return correctSelection ? state : stateForStage(state.stageIndex, stages);
}

async function getLessonMasteryData(lessonId: string, locale: VocabularyMasteryLocale) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      order: true,
      module: { select: { id: true, order: true, courseId: true } },
      blocks: {
        select: {
          id: true,
          type: true,
          settings: true,
          exercises: { orderBy: { order: "asc" }, select: { id: true, order: true, difficulty: true, basePoints: true } },
        },
      },
    },
  });
  if (!lesson) throw new Error("Lesson not found");
  const block = lesson.blocks.find((candidate) => candidate.type === "VOCABULARY" && asVocabularyMasterySettings(candidate.settings));
  if (!block) throw new Error("Vocabulary mastery is not configured for this lesson");

  const lessons = await prisma.lesson.findMany({
    where: { module: { courseId: lesson.module.courseId } },
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
    select: {
      id: true,
      vocabulary: {
        where: { role: "NEW" },
        orderBy: { order: "asc" },
        select: {
          word: {
            select: {
              id: true,
              lemma: true,
              britishAudioUrl: true,
              americanAudioUrl: true,
              meanings: { orderBy: { order: "asc" }, take: 1, select: { translation: true, definition: true } },
            },
          },
        },
      },
    },
  });
  const lessonPosition = lessons.findIndex((candidate) => candidate.id === lesson.id);
  if (lessonPosition < 0) throw new Error("Lesson vocabulary is unavailable");
  const toWord = (row: typeof lessons[number]["vocabulary"][number]): MasteryWord => ({
    id: row.word.id,
    lemma: row.word.lemma,
    translation: vocabularyMasteryTranslation(
      block.settings,
      row.word.lemma,
      locale,
      row.word.meanings[0]?.translation ?? row.word.meanings[0]?.definition ?? row.word.lemma,
    ),
    britishAudioUrl: row.word.britishAudioUrl,
    americanAudioUrl: row.word.americanAudioUrl,
  });
  const currentWords = lessons[lessonPosition].vocabulary.map(toWord);
  const cumulativeWords = lessons.slice(0, lessonPosition + 1).flatMap((candidate) => candidate.vocabulary.map(toWord));
  const stages = buildVocabularyMasteryStages(currentWords.map((word) => word.id), cumulativeWords.map((word) => word.id));
  if (!currentWords.length || !stages.length) throw new Error("This vocabulary lesson has no words yet");
  if (block.exercises.length !== stages.length) {
    throw new Error("Vocabulary mastery stages do not match the authored lesson. Re-import the course before starting it.");
  }
  return { lesson, block, stages, words: new Map(cumulativeWords.map((word) => [word.id, word])) };
}

function taskForState(
  state: MasteryState,
  stages: VocabularyMasteryStage[],
  words: Map<string, MasteryWord>,
  locale: VocabularyMasteryLocale,
) {
  const stage = stages[state.stageIndex];
  if (!stage) return null;
  const selectedWords = state.selectedWordIds.map((wordId) => words.get(wordId)).filter((word): word is MasteryWord => Boolean(word));
  if (selectedWords.length !== stage.promptCount) throw new Error("Vocabulary mastery task is incomplete");
  const isSpeaking = stage.direction === "SPEAK";
  return {
    stageIndex: state.stageIndex,
    stageKey: stage.key,
    direction: stage.direction,
    title: stage.title,
    requiredConsecutive: stage.requiredConsecutive,
    correctInRow: state.correctInRow,
    inputLanguage: stage.direction === "EN_RU" ? locale : "en",
    words: selectedWords.map((word) => isSpeaking
      ? { id: word.id, prompt: word.lemma, britishAudioUrl: word.britishAudioUrl, americanAudioUrl: word.americanAudioUrl }
      : { id: word.id, prompt: stage.direction === "EN_RU" ? word.lemma : word.translation }),
  };
}

function publicState(
  session: { status: string; totalItems: number; correctItems: number; incorrectItems: number },
  state: MasteryState,
  stages: VocabularyMasteryStage[],
  words: Map<string, MasteryWord>,
  locale: VocabularyMasteryLocale,
) {
  const completed = session.status === "COMPLETED" || state.stageIndex >= stages.length;
  return {
    completed,
    progress: {
      completedStages: Math.min(state.stageIndex, stages.length),
      totalStages: stages.length,
      correctStages: session.correctItems,
      incorrectAttempts: session.incorrectItems,
    },
    task: completed ? null : taskForState(state, stages, words, locale),
  };
}

async function getOrCreateMasterySession(userId: string, lessonId: string, initialState: MasteryState) {
  const existing = await prisma.vocabularyTrainingSession.findFirst({
    where: { userId, lessonId, source: "USER_SELECTED" },
    orderBy: { createdAt: "desc" },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (existing) {
    const item = existing.items[0];
    if (item && asRecord(item.payload).engine === "course-vocabulary-mastery") return { session: existing, item };
  }
  const session = await prisma.vocabularyTrainingSession.create({
    data: {
      userId,
      lessonId,
      source: "USER_SELECTED",
      status: "IN_PROGRESS",
      totalItems: 1,
      startedAt: new Date(),
      items: {
        create: {
          exerciseType: "TEXT_INPUT",
          payload: toJson({ engine: "course-vocabulary-mastery", state: initialState }),
          answerKey: toJson({ engine: "course-vocabulary-mastery" }),
          order: 1,
        },
      },
    },
    include: { items: { orderBy: { order: "asc" } } },
  });
  return { session, item: session.items[0]! };
}

async function assertLessonAccess(userId: string, lessonId: string) {
  const access = await canAccessLesson(userId, lessonId);
  if (!access.allowed) throw new Error(access.reason === "PREMIUM_REQUIRED" ? "Premium access is required for this lesson" : "You cannot access this lesson");
}

export async function getCourseVocabularyMasteryState(userId: string, lessonId: string, locale: VocabularyMasteryLocale = "ru") {
  await assertLessonAccess(userId, lessonId);
  const data = await getLessonMasteryData(lessonId, locale);
  const { session, item } = await getOrCreateMasterySession(userId, lessonId, stateForStage(0, data.stages));
  const state = normaliseState(stateFromPayload(item.payload), data.stages);
  if (JSON.stringify(state) !== JSON.stringify(stateFromPayload(item.payload))) {
    await prisma.vocabularyTrainingItem.update({ where: { id: item.id }, data: { payload: toJson({ engine: "course-vocabulary-mastery", state }) } });
  }
  return publicState(session, state, data.stages, data.words, locale);
}

function validatesStageAttempt(
  direction: VocabularyMasteryDirection,
  words: MasteryWord[],
  input: z.infer<typeof masteryAttemptSchema>,
) {
  if (direction === "SPEAK") {
    const transcript = input.transcript ?? "";
    return Boolean(words[0]) && assessPronunciation(words[0].lemma, transcript).verdict === "MATCH";
  }
  if (!input.answers || input.answers.length !== words.length) return false;
  return words.every((word, index) => answerMatches(
    input.answers?.[index] ?? "",
    direction === "EN_RU" ? word.translation : word.lemma,
    [],
    { ignorePunctuation: true, ignoreExtraSpaces: true },
  ));
}

export async function submitCourseVocabularyMasteryAttempt(userId: string, lessonId: string, input: unknown) {
  const value = masteryAttemptSchema.parse(input);
  const locale = value.locale ?? "ru";
  await assertLessonAccess(userId, lessonId);
  const data = await getLessonMasteryData(lessonId, locale);

  return prisma.$transaction(async (tx) => {
    const session = await tx.vocabularyTrainingSession.findFirst({
      where: { userId, lessonId, source: "USER_SELECTED" },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { order: "asc" } } },
    });
    const item = session?.items[0];
    if (!session || !item || asRecord(item.payload).engine !== "course-vocabulary-mastery") {
      throw new Error("Start the vocabulary lesson before submitting an answer");
    }
    if (session.status === "COMPLETED") {
      const state = normaliseState(stateFromPayload(item.payload), data.stages);
      return { isCorrect: true, stageCompleted: false, sessionCompleted: true, state: publicState(session, state, data.stages, data.words, locale), motivationReward: null, exerciseId: null };
    }

    const current = normaliseState(stateFromPayload(item.payload), data.stages);
    if (value.stageIndex !== current.stageIndex) throw new Error("This task has already changed. Please use the current card.");
    const stage = data.stages[current.stageIndex];
    if (!stage) throw new Error("Vocabulary mastery is already complete");
    const taskWords = current.selectedWordIds.map((wordId) => data.words.get(wordId)).filter((word): word is MasteryWord => Boolean(word));
    const isCorrect = taskWords.length === stage.promptCount && validatesStageAttempt(stage.direction, taskWords, value);

    if (!isCorrect) {
      const reset = { ...current, correctInRow: 0 };
      const updatedSession = await tx.vocabularyTrainingSession.update({ where: { id: session.id }, data: { incorrectItems: { increment: 1 } } });
      await tx.vocabularyTrainingItem.update({ where: { id: item.id }, data: { payload: toJson({ engine: "course-vocabulary-mastery", state: reset }) } });
      return { isCorrect: false, stageCompleted: false, sessionCompleted: false, state: publicState(updatedSession, reset, data.stages, data.words, locale), motivationReward: null, exerciseId: null };
    }

    const afterCorrect = current.correctInRow + 1;
    if (afterCorrect < stage.requiredConsecutive) {
      const next = { ...current, correctInRow: afterCorrect };
      await tx.vocabularyTrainingItem.update({ where: { id: item.id }, data: { payload: toJson({ engine: "course-vocabulary-mastery", state: next }) } });
      return { isCorrect: true, stageCompleted: false, sessionCompleted: false, state: publicState(session, next, data.stages, data.words, locale), motivationReward: null, exerciseId: null };
    }

    const exercise = data.block.exercises[current.stageIndex];
    if (!exercise) throw new Error("Vocabulary mastery reward stage is unavailable");
    const previousAttempt = await tx.exerciseAttempt.findFirst({
      where: { userId, exerciseId: exercise.id },
      orderBy: { attemptNumber: "desc" },
      select: { attemptNumber: true },
    });
    const attempt = await tx.exerciseAttempt.create({
      data: {
        userId,
        exerciseId: exercise.id,
        lessonId,
        submittedAnswer: toJson({ direction: stage.direction, wordIds: current.selectedWordIds, consecutive: stage.requiredConsecutive }),
        isCorrect: true,
        scoreAwarded: exercise.basePoints,
        attemptNumber: (previousAttempt?.attemptNumber ?? 0) + 1,
      },
      select: { id: true },
    });
    await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, status: "STARTED", completedBlocks: [], score: exercise.basePoints, correctAnswers: 1, lastSeenAt: new Date() },
      update: { score: { increment: exercise.basePoints }, correctAnswers: { increment: 1 }, lastSeenAt: new Date() },
    });
    const reward = await recordExerciseResult(tx, {
      userId,
      exerciseId: exercise.id,
      lessonId,
      courseId: data.lesson.module.courseId,
      attemptId: attempt.id,
      isCorrect: true,
      isFirstAttemptCorrect: true,
      score: exercise.basePoints,
      difficulty: exercise.difficulty,
    });
    const nextState = stateForStage(current.stageIndex + 1, data.stages);
    const sessionCompleted = nextState.stageIndex >= data.stages.length;
    const updatedSession = await tx.vocabularyTrainingSession.update({
      where: { id: session.id },
      data: {
        correctItems: { increment: 1 },
        ...(sessionCompleted ? { status: "COMPLETED", completedItems: 1, completedAt: new Date() } : {}),
      },
    });
    await tx.vocabularyTrainingItem.update({
      where: { id: item.id },
      data: { status: sessionCompleted ? "COMPLETED" : "PENDING", submittedAt: sessionCompleted ? new Date() : null, payload: toJson({ engine: "course-vocabulary-mastery", state: nextState }) },
    });
    return { isCorrect: true, stageCompleted: true, sessionCompleted, state: publicState(updatedSession, nextState, data.stages, data.words, locale), motivationReward: reward, exerciseId: exercise.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 20_000 });
}
