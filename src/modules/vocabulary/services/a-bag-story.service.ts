import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";
import { answerMatches } from "@/modules/courses/utils/exercise-evaluation";
import { recordExerciseResult } from "@/modules/motivation/services/motivation.service";
import { assessPronunciation } from "@/modules/vocabulary/utils/pronunciation";
import { experienceForExerciseSpeed, exerciseSpeedWindowSeconds } from "@/modules/courses/utils/exercise-speed-reward";
import { BAG_CHUNK_STAGE_SPAN, bagChunkKey, bagQuickCheckEligible, buildBagStoryStages, buildBagReviewStages, bagStageExperience, bagStory, type BagStage } from "@/modules/vocabulary/utils/a-bag-story-plan";
import { vocabularyMasteryTranslation, type VocabularyMasteryLocale } from "@/modules/vocabulary/utils/course-vocabulary-mastery";
import { z } from "zod";

type Word = { id: string; lemma: string; translation: string; britishAudioUrl: string | null; americanAudioUrl: string | null };
type State = { stageIndex: number; stepIndex: number; hadMistake: boolean; failedLine: boolean; locale: VocabularyMasteryLocale; masteredChunks: string[]; relearningChunks: string[] };
const attemptSchema = z.object({ stageIndex: z.number().int().min(0), stepIndex: z.number().int().min(0), locale: z.enum(["uk", "ru"]), answer: z.string().trim().min(1).max(500), speedWindowId: z.string().trim().min(1).max(80).optional() });
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const json = (value: unknown) => value as Prisma.InputJsonValue;
const stateOf = (payload: unknown): State => {
  const raw = asRecord(asRecord(payload).state);
  return { stageIndex: Number.isInteger(raw.stageIndex) ? Math.max(0, Number(raw.stageIndex)) : 0, stepIndex: Number.isInteger(raw.stepIndex) ? Math.max(0, Number(raw.stepIndex)) : 0, hadMistake: raw.hadMistake === true, failedLine: raw.failedLine === true, locale: raw.locale === "uk" ? "uk" : "ru", masteredChunks: Array.isArray(raw.masteredChunks) ? raw.masteredChunks.filter((item): item is string => typeof item === "string") : [], relearningChunks: Array.isArray(raw.relearningChunks) ? raw.relearningChunks.filter((item): item is string => typeof item === "string") : [] };
};

async function lessonData(lessonId: string, locale: VocabularyMasteryLocale) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: {
    id: true, module: { select: { courseId: true } },
    blocks: { where: { type: "VOCABULARY" }, select: { id: true, settings: true, exercises: { orderBy: { order: "asc" }, select: { id: true, basePoints: true, difficulty: true } } } },
    vocabulary: { orderBy: { order: "asc" }, select: { word: { select: { id: true, lemma: true, britishAudioUrl: true, americanAudioUrl: true, meanings: { orderBy: { order: "asc" }, take: 1, select: { translation: true, definition: true } } } } } },
  } });
  if (!lesson) throw new Error("Lesson not found");
  const block = lesson.blocks.find((candidate) => asRecord(candidate.settings).engine === "bag-story");
  if (!block) throw new Error("Bag story is not configured for this lesson");
  const words: Word[] = lesson.vocabulary.map(({ word }) => ({ id: word.id, lemma: word.lemma, translation: vocabularyMasteryTranslation(block.settings, word.lemma, locale, word.meanings[0]?.translation ?? word.meanings[0]?.definition ?? word.lemma), britishAudioUrl: word.britishAudioUrl, americanAudioUrl: word.americanAudioUrl }));
  const reviewAll = asRecord(block.settings).reviewAll === true;
  const stages = reviewAll ? buildBagReviewStages(words.map((word) => word.id)) : buildBagStoryStages(words.map((word) => word.id), words.map((word) => word.lemma));
  if ((reviewAll ? words.length !== 30 : words.length !== 5) || block.exercises.length !== stages.length) throw new Error("Bag story content is incomplete. Re-import the course.");
  return { lesson, block, words, stages, reviewAll };
}

function taskFor(state: State, stages: BagStage[], words: Word[], locale: VocabularyMasteryLocale) {
  const stage = stages[state.stageIndex];
  if (!stage) return null;
  const word = words.find((item) => item.id === stage.wordId)!;
  const story = bagStory(word.lemma, word.translation, locale);
  const sentence = stage.storyIndex ? story[stage.storyIndex - 1]! : null;
  const chunk = stage.kind === "BAG_CHUNK" ? sentence!.chunks[stage.chunkIndex!]! : null;
  const reviewCheck = bagQuickCheckEligible(stage, chunk?.english ?? null, state.masteredChunks, state.relearningChunks);
  const recall = stage.kind === "BAG_RECALL" || (stage.kind === "BAG_REVIEW" && stage.code === "RECALL");
  const chunkChoice = stage.kind === "BAG_CHUNK" && (stage.chunkCode === "MEANING" || stage.chunkCode === "HEAR");
  const mode = reviewCheck ? "SPEAK" : chunkChoice || stage.code === "CE" || stage.code === "CL" ? "CHOICE" : stage.kind === "BAG_SENTENCE_ASSEMBLE" || stage.kind === "BAG_CHUNK" && stage.chunkCode === "ASSEMBLE" ? "ASSEMBLE" : stage.kind === "BAG_CHUNK" && stage.chunkCode === "TYPE" || stage.code === "TL" || stage.code === "TE" ? "TYPE" : "SPEAK";
  const target = chunk ? chunk.english : recall ? story[state.stepIndex]!.english : stage.kind === "BAG_SENTENCE" || stage.kind === "BAG_SENTENCE_ASSEMBLE" ? sentence!.english : stage.code === "TE" || stage.code === "CE" ? word.translation : word.lemma;
  const prompt = chunk ? reviewCheck ? chunk.local : stage.chunkCode === "HEAR" ? (locale === "uk" ? "Послухайте та виберіть почуте" : "Послушайте и выберите услышанное") : ["INTRO", "VISIBLE", "MEANING"].includes(stage.chunkCode!) ? chunk.english : chunk.local : recall ? story[state.stepIndex]!.local : stage.kind === "BAG_SENTENCE_ASSEMBLE" ? sentence!.local : stage.kind === "BAG_SENTENCE" ? stage.sentenceMode === "VISIBLE" ? sentence!.english : sentence!.local : stage.code === "P" ? stage.cardNumber === 1 ? word.lemma : word.translation : stage.code === "TE" || stage.code === "CE" ? word.lemma : word.translation;
  const choiceEnglish = stage.code === "CL";
  const chunkPool = story.flatMap((line) => line.chunks).filter((item, index, all) => all.findIndex((candidate) => candidate.english === item.english) === index);
  const chunkOptions = chunkChoice ? [chunk!, ...chunkPool.filter((item) => item.english !== chunk!.english).slice(0, 3)].map((item) => ({ id: stage.chunkCode === "HEAR" ? item.english : item.local, label: stage.chunkCode === "HEAR" ? item.english : item.local })) : [];
  const options = mode === "CHOICE" ? chunkChoice ? chunkOptions : words.map((item) => ({ id: item.id, label: choiceEnglish ? item.lemma : item.translation })).sort((left, right) => ((left.id.charCodeAt(state.stageIndex % left.id.length) + state.stageIndex) % 5) - ((right.id.charCodeAt(state.stageIndex % right.id.length) + state.stageIndex) % 5)) : [];
  const stepCount = stage.requiredSteps;
  return { stageIndex: state.stageIndex, stepIndex: state.stepIndex, stageKey: stage.key, kind: stage.kind, mode, code: stage.code, chunkCode: stage.chunkCode ?? null, chunkLocal: chunk && !reviewCheck && ["INTRO", "VISIBLE"].includes(stage.chunkCode!) ? chunk.local : null, sentenceMode: stage.sentenceMode ?? null, sentenceLocal: stage.kind === "BAG_SENTENCE" && stage.sentenceMode === "VISIBLE" ? sentence!.local : null, prompt, speakTarget: mode === "SPEAK" ? target : null, audioTarget: chunk && !reviewCheck && ["INTRO", "HEAR"].includes(stage.chunkCode!) ? chunk.english : null, options, assembleWords: mode === "ASSEMBLE" ? (chunk ? chunk.english : sentence!.english).replace(/[.!?]$/, "").split(" ").reverse() : [], storyIndex: stage.storyIndex, storyLines: recall ? story.slice(0, stage.storyIndex!).map((line) => line.local) : [], stepCount, cardNumber: stage.cardNumber, wordOrdinal: stage.wordOrdinal, failedLine: state.failedLine, hintEnglish: state.failedLine && (Boolean(chunk) || mode === "SPEAK" || stage.kind === "BAG_SENTENCE_ASSEMBLE") ? chunk?.english ?? target : null, reviewCheck, britishAudioUrl: stage.kind === "BAG_PHRASE" ? word.britishAudioUrl : null, americanAudioUrl: stage.kind === "BAG_PHRASE" ? word.americanAudioUrl : null };
}

function publicState(session: { status: string; incorrectItems: number }, state: State, stages: BagStage[], words: Word[], locale: VocabularyMasteryLocale) {
  return { completed: session.status === "COMPLETED" || state.stageIndex >= stages.length, progress: { completedStages: Math.min(state.stageIndex, stages.length), totalStages: stages.length, incorrectAttempts: session.incorrectItems }, task: taskFor(state, stages, words, locale) };
}

export async function getBagStoryState(userId: string, lessonId: string, locale: VocabularyMasteryLocale) {
  const access = await canAccessLesson(userId, lessonId);
  if (!access.allowed) throw new Error("You cannot access this lesson");
  const data = await lessonData(lessonId, locale);
  // A browser preview cannot attest to completed server exercises. New
  // accounts start at the first verified card instead of trusting localStorage.
  const initial: State = { stageIndex: 0, stepIndex: 0, hadMistake: false, failedLine: false, locale, masteredChunks: [], relearningChunks: [] };
  const session = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`bag-story-session:${userId}:${lessonId}`}))`);
    const existing = await tx.vocabularyTrainingSession.findFirst({ where: { userId, lessonId, source: "USER_SELECTED", items: { some: { answerKey: { path: ["engine"], equals: "bag-story" } } } }, orderBy: { createdAt: "desc" }, include: { items: true } });
    if (existing) return existing;
    const siblingLessons = await tx.lesson.findMany({ where: { module: { courseId: data.lesson.module.courseId } }, select: { id: true } });
    const priorRuns = await tx.vocabularyTrainingSession.findMany({ where: { userId, lessonId: { in: siblingLessons.map((item) => item.id).filter((id) => id !== lessonId) }, source: "USER_SELECTED", status: "COMPLETED", items: { some: { answerKey: { path: ["engine"], equals: "bag-story" } } } }, select: { items: { select: { payload: true } } } });
    initial.masteredChunks = [...new Set(priorRuns.flatMap((run) => run.items.flatMap((item) => stateOf(item.payload).masteredChunks)))];
    return tx.vocabularyTrainingSession.create({ data: { userId, lessonId, source: "USER_SELECTED", status: "IN_PROGRESS", totalItems: 1, startedAt: new Date(), items: { create: { exerciseType: "TEXT_INPUT", payload: json({ engine: "bag-story", state: initial }), answerKey: json({ engine: "bag-story" }), order: 1 } } }, include: { items: true } });
  });
  const state = stateOf(session.items[0]!.payload);
  if (state.locale !== locale) throw new Error("This lesson run uses a different translation language");
  const result = publicState(session, state, data.stages, data.words, locale);
  const exercise = data.block.exercises[state.stageIndex];
  if (!exercise || result.completed) return { ...result, speedWindow: null };
  const speedWindow = await prisma.exerciseSpeedWindow.upsert({ where: { activeKey: `${userId}:${exercise.id}` }, create: { userId, exerciseId: exercise.id, activeKey: `${userId}:${exercise.id}` }, update: {}, select: { id: true, openedAt: true } });
  return { ...result, speedWindow: { id: speedWindow.id, openedAt: speedWindow.openedAt.toISOString(), windowSeconds: exerciseSpeedWindowSeconds(null) } };
}

export async function submitBagStoryAttempt(userId: string, lessonId: string, input: unknown) {
  const value = attemptSchema.parse(input);
  const access = await canAccessLesson(userId, lessonId);
  if (!access.allowed) throw new Error("You cannot access this lesson");
  const data = await lessonData(lessonId, value.locale);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`bag-story:${userId}:${lessonId}`}))`);
    const session = await tx.vocabularyTrainingSession.findFirst({ where: { userId, lessonId, source: "USER_SELECTED", items: { some: { answerKey: { path: ["engine"], equals: "bag-story" } } } }, orderBy: { createdAt: "desc" }, include: { items: true } });
    if (!session) throw new Error("Start the lesson before answering");
    const item = session.items[0]!;
    const state = stateOf(item.payload);
    if (state.locale !== value.locale) throw new Error("This lesson run uses a different translation language");
    if (session.status === "COMPLETED") return { isCorrect: true, stageCompleted: false, state: publicState(session, state, data.stages, data.words, value.locale), exerciseId: null, motivationReward: null };
    if (value.stageIndex !== state.stageIndex || value.stepIndex !== state.stepIndex) throw new Error("This card has changed. Reload the current card.");
    const stage = data.stages[state.stageIndex]!;
    const task = taskFor(state, data.stages, data.words, value.locale)!;
    const word = data.words.find((candidate) => candidate.id === stage.wordId)!;
    const story = bagStory(word.lemma, word.translation, value.locale);
    const sentence = stage.storyIndex ? story[stage.storyIndex - 1]! : null;
    const chunk = stage.kind === "BAG_CHUNK" ? sentence!.chunks[stage.chunkIndex!]! : null;
    const reviewCheck = bagQuickCheckEligible(stage, chunk?.english ?? null, state.masteredChunks, state.relearningChunks);
    const recall = stage.kind === "BAG_RECALL" || (stage.kind === "BAG_REVIEW" && stage.code === "RECALL");
    const target = chunk ? chunk.english : recall ? story[state.stepIndex]!.english : stage.kind === "BAG_SENTENCE" || stage.kind === "BAG_SENTENCE_ASSEMBLE" ? sentence!.english : stage.code === "TE" || stage.code === "CE" ? word.translation : word.lemma;
    const choiceAnswer = chunk ? stage.chunkCode === "MEANING" ? chunk.local : chunk.english : word.id;
    const pronunciation = task.mode === "SPEAK" ? assessPronunciation(target, value.answer) : null;
    const correct = task.mode === "CHOICE" ? value.answer === choiceAnswer : task.mode === "SPEAK" ? Boolean(pronunciation && (pronunciation.verdict === "MATCH" || pronunciation.verdict === "CLOSE" && pronunciation.similarity >= .9)) : answerMatches(value.answer, target, [], { ignorePunctuation: true, ignoreExtraSpaces: true });
    const exercise = data.block.exercises[state.stageIndex]!;
    const now = new Date();
    const speedWindow = value.speedWindowId ? await tx.exerciseSpeedWindow.findFirst({ where: { id: value.speedWindowId, userId, exerciseId: exercise.id, activeKey: `${userId}:${exercise.id}`, consumedAt: null }, select: { id: true, openedAt: true } }) : null;
    const speedExperience = experienceForExerciseSpeed(speedWindow ? Math.floor((now.getTime() - speedWindow.openedAt.getTime()) / 1000) : Number.POSITIVE_INFINITY, null);
    if (!correct) {
      if (speedWindow) await tx.exerciseSpeedWindow.update({ where: { id: speedWindow.id }, data: { activeKey: null, consumedAt: now } });
      if (chunk) {
        const nextReviewAt = new Date(now.getTime() + 86_400_000);
        const normalizedTerm = `${chunk.english.toLocaleLowerCase("en").trim()}:${value.locale}`;
        await tx.userCustomWord.upsert({ where: { userId_normalizedTerm: { userId, normalizedTerm } }, create: { userId, term: chunk.english, normalizedTerm, translation: chunk.local, partOfSpeech: "PHRASE", status: "LEARNING", isDifficult: true, nextReviewAt }, update: { isDifficult: true, status: "LEARNING", nextReviewAt } });
      }
      const next = { ...state, hadMistake: true, failedLine: true, relearningChunks: reviewCheck ? [...state.relearningChunks, stage.key] : state.relearningChunks };
      const updated = await tx.vocabularyTrainingSession.update({ where: { id: session.id }, data: { incorrectItems: { increment: 1 } } });
      await tx.vocabularyTrainingItem.update({ where: { id: item.id }, data: { payload: json({ engine: "bag-story", state: next }) } });
      const previous = await tx.exerciseAttempt.count({ where: { userId, exerciseId: exercise.id } });
      const attempt = await tx.exerciseAttempt.create({ data: { userId, exerciseId: exercise.id, lessonId, submittedAnswer: json({ answer: value.answer, stepIndex: state.stepIndex }), isCorrect: false, scoreAwarded: 0, attemptNumber: previous + 1 }, select: { id: true } });
      let motivationReward = null;
      if (!state.hadMistake) {
        motivationReward = await recordExerciseResult(tx, { userId, exerciseId: exercise.id, lessonId, courseId: data.lesson.module.courseId, attemptId: attempt.id, isCorrect: false, isFirstAttemptCorrect: false, score: 0, difficulty: exercise.difficulty });
      }
      return { isCorrect: false, stageCompleted: false, state: publicState(updated, next, data.stages, data.words, value.locale), exerciseId: exercise.id, motivationReward };
    }
    const nextStep = state.stepIndex + 1;
    if (nextStep < task.stepCount) {
      const next = { ...state, stepIndex: nextStep, failedLine: false };
      await tx.vocabularyTrainingItem.update({ where: { id: item.id }, data: { payload: json({ engine: "bag-story", state: next }) } });
      return { isCorrect: true, stageCompleted: false, state: publicState(session, next, data.stages, data.words, value.locale), exerciseId: null, motivationReward: null };
    }
    const previous = await tx.exerciseAttempt.count({ where: { userId, exerciseId: exercise.id } });
    if (speedWindow) await tx.exerciseSpeedWindow.update({ where: { id: speedWindow.id }, data: { activeKey: null, consumedAt: now } });
    const attempt = await tx.exerciseAttempt.create({ data: { userId, exerciseId: exercise.id, lessonId, submittedAnswer: json({ answer: value.answer, completedSteps: task.stepCount }), isCorrect: true, scoreAwarded: exercise.basePoints, attemptNumber: previous + 1 }, select: { id: true } });
    const streakUnits = recall ? task.stepCount : 1;
    await tx.lessonProgress.upsert({ where: { userId_lessonId: { userId, lessonId } }, create: { userId, lessonId, status: "STARTED", completedBlocks: [], score: 1, correctAnswers: 1, lastSeenAt: new Date() }, update: { score: { increment: 1 }, correctAnswers: { increment: 1 }, lastSeenAt: new Date() } });
    const reward = await recordExerciseResult(tx, { userId, exerciseId: exercise.id, lessonId, courseId: data.lesson.module.courseId, attemptId: attempt.id, isCorrect: true, isFirstAttemptCorrect: !state.hadMistake && previous === 0, score: exercise.basePoints, difficulty: exercise.difficulty, speedExperience, experienceOverride: bagStageExperience(stage, speedExperience), streakUnits });
    const chunkKey = chunk ? bagChunkKey(chunk.english) : null;
    const masteredChunks = chunkKey && stage.chunkCode === "RECALL_3" && !state.masteredChunks.includes(chunkKey) ? [...state.masteredChunks, chunkKey] : state.masteredChunks;
    const next: State = { stageIndex: state.stageIndex + (reviewCheck ? BAG_CHUNK_STAGE_SPAN : 1), stepIndex: 0, hadMistake: false, failedLine: false, locale: state.locale, masteredChunks, relearningChunks: chunkKey && stage.chunkCode === "RECALL_3" ? state.relearningChunks.filter((key) => key !== stage.key.replace(/-8$/, "-0")) : state.relearningChunks };
    const completed = next.stageIndex >= data.stages.length;
    if (completed && data.reviewAll) {
      const nextReviewAt = new Date(now.getTime() + 86_400_000);
      await tx.userWord.createMany({ data: data.words.map((item) => ({ userId, wordId: item.id, sourceLessonId: lessonId, status: "REVIEW", nextReviewAt, addedAt: now })), skipDuplicates: true });
    }
    const updated = await tx.vocabularyTrainingSession.update({ where: { id: session.id }, data: { correctItems: { increment: 1 }, ...(completed ? { status: "COMPLETED", completedItems: 1, completedAt: new Date() } : {}) } });
    await tx.vocabularyTrainingItem.update({ where: { id: item.id }, data: { payload: json({ engine: "bag-story", state: next }), ...(completed ? { status: "COMPLETED", submittedAt: new Date() } : {}) } });
    return { isCorrect: true, stageCompleted: true, state: publicState(updated, next, data.stages, data.words, value.locale), exerciseId: exercise.id, motivationReward: reward };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 20_000 });
}
