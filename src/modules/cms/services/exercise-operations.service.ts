import { Prisma, type ExerciseType } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import type { UpdateExerciseInput } from "@/modules/courses/schemas/content.schemas";
import { validateExerciseConfiguration } from "@/modules/cms/exercise-engines/configuration";
import { getDefaultExerciseSubtype, resolveExerciseEngineKey } from "@/modules/cms/exercise-engines/registry";
import { recordCmsContentVersion } from "@/modules/cms/services/content-workflow.service";
import { canonicalExerciseAnswer } from "@/modules/courses/utils/exercise-evaluation";

type ExerciseForOrder = { id: string; order: number };

function inputJson(value: Prisma.JsonValue | null) {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

function toInputJson(value: unknown) {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export { validateExerciseConfiguration } from "@/modules/cms/exercise-engines/configuration";

export function validateExerciseOrder(exercises: ExerciseForOrder[], orderedIds: string[]) {
  if (exercises.length !== orderedIds.length || new Set(orderedIds).size !== orderedIds.length) throw new Error("The exercise order must contain every exercise exactly once.");
  const known = new Set(exercises.map((exercise) => exercise.id));
  if (orderedIds.some((id) => !known.has(id))) throw new Error("Exercises can only be reordered inside their current block.");
}

async function getOrCreateExerciseBlock(tx: Prisma.TransactionClient, lessonId: string) {
  const existing = await tx.lessonBlock.findFirst({
    where: { lessonId, type: "EXERCISE", contentStatus: { not: "ARCHIVED" } },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  if (existing) return existing;
  const last = await tx.lessonBlock.findFirst({ where: { lessonId }, orderBy: { order: "desc" }, select: { order: true } });
  return tx.lessonBlock.create({
    data: { lessonId, type: "EXERCISE", title: "Exercises", order: (last?.order ?? 0) + 1, contentStatus: "DRAFT" },
    select: { id: true },
  });
}

async function nextExerciseOrder(tx: Prisma.TransactionClient, lessonBlockId: string) {
  const last = await tx.exercise.findFirst({ where: { lessonBlockId }, orderBy: { order: "desc" }, select: { order: true } });
  return (last?.order ?? 0) + 1;
}

function configForValidation(source: {
  type: string;
  engineKey: string;
  variantKey: string | null;
  instruction: string;
  question: string;
  content: Prisma.JsonValue | null;
  correctAnswer: Prisma.JsonValue;
}, update: UpdateExerciseInput = {}) {
  return {
    type: update.type ?? source.type,
    engineKey: resolveExerciseEngineKey(update.engineKey ?? source.engineKey, update.type ?? source.type),
    variantKey: update.variantKey ?? source.variantKey,
    instruction: update.instruction ?? source.instruction,
    question: update.question ?? source.question,
    content: update.content ?? source.content,
    correctAnswer: update.correctAnswer ?? source.correctAnswer,
  };
}

export async function updateCmsExercise(actorId: string, exerciseId: string, input: UpdateExerciseInput) {
  const source = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!source) throw new Error("Exercise not found.");
  const mergedConfiguration = configForValidation(source, input);
  const engineKey = mergedConfiguration.engineKey;
  const variantKey = input.variantKey !== undefined
    ? input.variantKey.trim() || getDefaultExerciseSubtype(engineKey)
    : source.variantKey ?? getDefaultExerciseSubtype(engineKey);
  const issues = validateExerciseConfiguration({ ...mergedConfiguration, variantKey });
  if (issues.length) throw new Error(issues.join(" "));
  const updated = await prisma.exercise.update({
    where: { id: exerciseId },
    data: {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.engineKey !== undefined ? { engineKey } : {}),
      ...(input.variantKey !== undefined || (input.engineKey !== undefined && !source.variantKey) ? { variantKey } : {}),
      ...(input.instruction !== undefined ? { instruction: input.instruction } : {}),
      ...(input.question !== undefined ? { question: input.question } : {}),
      ...(input.content !== undefined ? { content: toInputJson(input.content) } : {}),
      ...(input.correctAnswer !== undefined ? { correctAnswer: toInputJson(input.correctAnswer) } : {}),
      ...(input.alternativeAnswers !== undefined ? { alternativeAnswers: toInputJson(input.alternativeAnswers) } : {}),
      ...(input.explanation !== undefined ? { explanation: input.explanation?.trim() || null } : {}),
      ...(input.hint !== undefined ? { hint: input.hint?.trim() || null } : {}),
      ...(input.hintsEnabled !== undefined ? { hintsEnabled: input.hintsEnabled } : {}),
      ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
      ...(input.basePoints !== undefined ? { basePoints: input.basePoints } : {}),
      ...(input.timeLimitSeconds !== undefined ? { timeLimitSeconds: input.timeLimitSeconds ?? null } : {}),
      ...(input.solutionCost !== undefined ? { solutionCost: input.solutionCost } : {}),
      ...(input.allowInstantCheck !== undefined ? { allowInstantCheck: input.allowInstantCheck } : {}),
      ...(input.allowExtraExercise !== undefined ? { allowExtraExercise: input.allowExtraExercise } : {}),
    },
  });
  await recordCmsContentVersion({ actorId, entityType: "EXERCISE", entityId: updated.id, action: "UPDATED", snapshot: updated });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_EXERCISE_UPDATED", entityType: "Exercise", entityId: updated.id } });
  return updated;
}

export async function reorderCmsExercises(actorId: string, lessonBlockId: string, exerciseIds: string[]) {
  const exercises = await prisma.exercise.findMany({ where: { lessonBlockId }, orderBy: { order: "asc" }, select: { id: true, order: true } });
  validateExerciseOrder(exercises, exerciseIds);
  await prisma.$transaction(async (tx) => {
    await tx.exercise.updateMany({ where: { id: { in: exerciseIds } }, data: { order: { increment: exercises.length + 10_000 } } });
    for (const [index, id] of exerciseIds.entries()) {
      const updated = await tx.exercise.update({ where: { id }, data: { order: index + 1 } });
      const latest = await tx.cmsContentVersion.aggregate({ where: { entityType: "EXERCISE", entityId: id }, _max: { version: true } });
      await tx.cmsContentVersion.create({ data: { entityType: "EXERCISE", entityId: id, version: (latest._max.version ?? 0) + 1, action: "REORDERED", snapshot: updated, actorId } });
    }
    await tx.contentAuditLog.create({ data: { actorId, action: "CMS_EXERCISES_REORDERED", entityType: "Exercise", entityId: exerciseIds[0], metadata: { lessonBlockId, exerciseIds } } });
  });
}

async function copiedExerciseData(source: {
  type: ExerciseType;
  engineKey: string;
  variantKey: string | null;
  instruction: string;
  question: string;
  content: Prisma.JsonValue | null;
  correctAnswer: Prisma.JsonValue;
  alternativeAnswers: Prisma.JsonValue | null;
  explanation: string | null;
  hint: string | null;
  hintsEnabled: boolean;
  difficulty: number;
  basePoints: number;
  timeLimitSeconds: number | null;
  solutionCost: number;
  allowInstantCheck: boolean;
  allowExtraExercise: boolean;
}, lessonBlockId: string, order: number, previousVersionId: string | null = null) {
  const engineKey = resolveExerciseEngineKey(source.engineKey, source.type);
  return {
    lessonBlockId,
    previousVersionId,
    type: source.type,
    engineKey,
    variantKey: source.variantKey ?? getDefaultExerciseSubtype(engineKey),
    instruction: source.instruction,
    question: source.question,
    content: inputJson(source.content),
    correctAnswer: inputJson(source.correctAnswer),
    alternativeAnswers: inputJson(source.alternativeAnswers),
    explanation: source.explanation,
    hint: source.hint,
    hintsEnabled: source.hintsEnabled,
    difficulty: source.difficulty,
    basePoints: source.basePoints,
    timeLimitSeconds: source.timeLimitSeconds,
    solutionCost: source.solutionCost,
    allowInstantCheck: source.allowInstantCheck,
    allowExtraExercise: source.allowExtraExercise,
    contentStatus: "DRAFT" as const,
    order,
  };
}

/** Copies an exercise to a lesson, creating a canonical EXERCISE block if needed. */
export async function duplicateCmsExercise(actorId: string, exerciseId: string, targetLessonId: string, previousVersionId: string | null = null) {
  const source = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!source) throw new Error("Exercise not found.");
  const targetLesson = await prisma.lesson.findUnique({ where: { id: targetLessonId }, select: { id: true } });
  if (!targetLesson) throw new Error("Target lesson not found.");
  return prisma.$transaction(async (tx) => {
    const block = await getOrCreateExerciseBlock(tx, targetLesson.id);
    const copied = await tx.exercise.create({ data: await copiedExerciseData(source, block.id, await nextExerciseOrder(tx, block.id), previousVersionId) });
    await tx.cmsContentVersion.create({ data: { entityType: "EXERCISE", entityId: copied.id, version: 1, action: previousVersionId ? "DUPLICATED" : "DUPLICATED", snapshot: { sourceExerciseId: source.id, targetLessonId, previousVersionId }, actorId } });
    await tx.contentAuditLog.create({ data: { actorId, action: previousVersionId ? "CMS_EXERCISE_NEW_VERSION_CREATED" : "CMS_EXERCISE_DUPLICATED", entityType: "Exercise", entityId: copied.id, metadata: { sourceExerciseId: source.id, targetLessonId, previousVersionId } } });
    return copied;
  });
}

/** A successor starts as a draft, keeping source analytics tied to its original ID. */
export async function createCmsExerciseVersion(actorId: string, exerciseId: string) {
  const source = await prisma.exercise.findUnique({ where: { id: exerciseId }, include: { lessonBlock: { select: { lessonId: true } } } });
  if (!source) throw new Error("Exercise not found.");
  return duplicateCmsExercise(actorId, exerciseId, source.lessonBlock.lessonId, source.id);
}

export async function moveCmsExercise(actorId: string, exerciseId: string, targetLessonId: string) {
  const source = await prisma.exercise.findUnique({ where: { id: exerciseId }, include: { lessonBlock: { select: { lessonId: true } }, _count: { select: { attempts: true, mistakes: true, learningActivities: true } } } });
  if (!source) throw new Error("Exercise not found.");
  if (source.lessonBlock.lessonId === targetLessonId) return source;
  const hasHistoricalAnalytics = source._count.attempts + source._count.mistakes + source._count.learningActivities > 0;
  if (hasHistoricalAnalytics) {
    const replacement = await duplicateCmsExercise(actorId, exerciseId, targetLessonId, source.id);
    await prisma.exercise.update({ where: { id: exerciseId }, data: { contentStatus: "ARCHIVED", archivedAt: new Date() } });
    await recordCmsContentVersion({ actorId, entityType: "EXERCISE", entityId: exerciseId, action: "ARCHIVED", snapshot: { movedToLessonId: targetLessonId, replacementExerciseId: replacement.id } });
    await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_EXERCISE_MOVED_AS_VERSION", entityType: "Exercise", entityId: exerciseId, metadata: { targetLessonId, replacementExerciseId: replacement.id } } });
    return { ...replacement, movedAsVersion: true };
  }
  const targetLesson = await prisma.lesson.findUnique({ where: { id: targetLessonId }, select: { id: true } });
  if (!targetLesson) throw new Error("Target lesson not found.");
  const moved = await prisma.$transaction(async (tx) => {
    const targetBlock = await getOrCreateExerciseBlock(tx, targetLesson.id);
    return tx.exercise.update({ where: { id: exerciseId }, data: { lessonBlockId: targetBlock.id, order: await nextExerciseOrder(tx, targetBlock.id) } });
  });
  await recordCmsContentVersion({ actorId, entityType: "EXERCISE", entityId: moved.id, action: "UPDATED", snapshot: { ...moved, movedToLessonId: targetLessonId } });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_EXERCISE_MOVED", entityType: "Exercise", entityId: moved.id, metadata: { targetLessonId } } });
  return moved;
}

export async function saveCmsExerciseTemplate(actorId: string, exerciseId: string, input: { title: string; description?: string }) {
  const source = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!source) throw new Error("Exercise not found.");
  const engineKey = resolveExerciseEngineKey(source.engineKey, source.type);
  const template = await prisma.cmsExerciseTemplate.create({
    data: {
      title: input.title,
      description: input.description?.trim() || null,
      sourceExerciseId: source.id,
      createdById: actorId,
      type: source.type,
      engineKey,
      variantKey: source.variantKey ?? getDefaultExerciseSubtype(engineKey),
      instruction: source.instruction,
      question: source.question,
      content: inputJson(source.content),
      correctAnswer: inputJson(source.correctAnswer),
      alternativeAnswers: inputJson(source.alternativeAnswers),
      explanation: source.explanation,
      hint: source.hint,
      hintsEnabled: source.hintsEnabled,
      difficulty: source.difficulty,
      basePoints: source.basePoints,
      timeLimitSeconds: source.timeLimitSeconds,
      solutionCost: source.solutionCost,
      allowInstantCheck: source.allowInstantCheck,
      allowExtraExercise: source.allowExtraExercise,
    },
  });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_EXERCISE_TEMPLATE_CREATED", entityType: "CmsExerciseTemplate", entityId: template.id, metadata: { sourceExerciseId: source.id } } });
  return template;
}

export async function createCmsExerciseFromTemplate(actorId: string, templateId: string, targetLessonId: string) {
  const template = await prisma.cmsExerciseTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.isArchived) throw new Error("Exercise template not found.");
  const engineKey = resolveExerciseEngineKey(template.engineKey, template.type);
  const variantKey = template.variantKey ?? getDefaultExerciseSubtype(engineKey);
  const issues = validateExerciseConfiguration({ ...template, engineKey, variantKey });
  if (issues.length) throw new Error(issues.join(" "));
  const targetLesson = await prisma.lesson.findUnique({ where: { id: targetLessonId }, select: { id: true } });
  if (!targetLesson) throw new Error("Target lesson not found.");
  return prisma.$transaction(async (tx) => {
    const block = await getOrCreateExerciseBlock(tx, targetLesson.id);
    const exercise = await tx.exercise.create({
      data: {
        lessonBlockId: block.id,
        type: template.type,
        engineKey,
        variantKey,
        instruction: template.instruction,
        question: template.question,
        content: inputJson(template.content),
        correctAnswer: inputJson(template.correctAnswer),
        alternativeAnswers: inputJson(template.alternativeAnswers),
        explanation: template.explanation,
        hint: template.hint,
        hintsEnabled: template.hintsEnabled,
        difficulty: template.difficulty,
        basePoints: template.basePoints,
        timeLimitSeconds: template.timeLimitSeconds,
        solutionCost: template.solutionCost,
        allowInstantCheck: template.allowInstantCheck,
        allowExtraExercise: template.allowExtraExercise,
        contentStatus: "DRAFT",
        order: await nextExerciseOrder(tx, block.id),
      },
    });
    await tx.cmsContentVersion.create({ data: { entityType: "EXERCISE", entityId: exercise.id, version: 1, action: "CREATED", snapshot: { templateId, targetLessonId }, actorId } });
    await tx.contentAuditLog.create({ data: { actorId, action: "CMS_EXERCISE_CREATED_FROM_TEMPLATE", entityType: "Exercise", entityId: exercise.id, metadata: { templateId, targetLessonId } } });
    return exercise;
  });
}

export async function bulkUpdateCmsExercises(actorId: string, exerciseIds: string[], input: { basePoints?: number; hintsEnabled?: boolean }) {
  const exercises = await prisma.exercise.findMany({ where: { id: { in: exerciseIds } } });
  if (exercises.length !== exerciseIds.length) throw new Error("One or more exercises were not found.");
  await prisma.$transaction(async (tx) => {
    await tx.exercise.updateMany({
      where: { id: { in: exerciseIds } },
      data: { ...(input.basePoints !== undefined ? { basePoints: input.basePoints } : {}), ...(input.hintsEnabled !== undefined ? { hintsEnabled: input.hintsEnabled } : {}) },
    });
    for (const exercise of exercises) {
      const updated = await tx.exercise.findUnique({ where: { id: exercise.id } });
      const latest = await tx.cmsContentVersion.aggregate({ where: { entityType: "EXERCISE", entityId: exercise.id }, _max: { version: true } });
      if (updated) await tx.cmsContentVersion.create({ data: { entityType: "EXERCISE", entityId: exercise.id, version: (latest._max.version ?? 0) + 1, action: "UPDATED", snapshot: updated, actorId } });
    }
    await tx.contentAuditLog.create({ data: { actorId, action: "CMS_EXERCISES_BULK_UPDATED", entityType: "Exercise", entityId: exerciseIds[0], metadata: { exerciseIds, ...input } } });
  });
}

export async function getCmsExerciseAnalytics(exerciseId: string) {
  const [exercise, attempts] = await Promise.all([
    prisma.exercise.findUnique({ where: { id: exerciseId }, select: { id: true, correctAnswer: true, content: true } }),
    prisma.exerciseAttempt.findMany({ where: { exerciseId }, take: 10_000, orderBy: { createdAt: "desc" }, select: { userId: true, submittedAnswer: true, isCorrect: true, scoreAwarded: true, timeSpentSeconds: true, hintUsed: true, createdAt: true } }),
  ]);
  if (!exercise) throw new Error("Exercise not found.");
  const incorrect = new Map<string, { answer: Prisma.JsonValue; count: number }>();
  for (const attempt of attempts) {
    if (attempt.isCorrect) continue;
    const key = canonicalExerciseAnswer(attempt.submittedAnswer, jsonRecord(exercise.content));
    const current = incorrect.get(key);
    incorrect.set(key, current ? { ...current, count: current.count + 1 } : { answer: attempt.submittedAnswer, count: 1 });
  }
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;
  const timed = attempts.filter((attempt) => attempt.timeSpentSeconds !== null);
  return {
    attempts: attempts.length,
    learners: new Set(attempts.map((attempt) => attempt.userId)).size,
    correct,
    accuracyPercent: attempts.length ? Math.round((correct / attempts.length) * 100) : 0,
    averageScore: attempts.length ? Math.round((attempts.reduce((total, attempt) => total + attempt.scoreAwarded, 0) / attempts.length) * 100) / 100 : 0,
    averageTimeSeconds: timed.length ? Math.round(timed.reduce((total, attempt) => total + (attempt.timeSpentSeconds ?? 0), 0) / timed.length) : null,
    hintsUsed: attempts.filter((attempt) => attempt.hintUsed).length,
    frequentErrors: [...incorrect.values()].sort((left, right) => right.count - left.count).slice(0, 10),
  };
}
