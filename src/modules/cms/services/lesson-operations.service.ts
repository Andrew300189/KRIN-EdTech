import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import type { UpdateLessonInput } from "@/modules/courses/schemas/content.schemas";
import { recordCmsContentVersion } from "@/modules/cms/services/content-workflow.service";

type LessonForOrder = { id: string; order: number; prerequisiteLessonId: string | null };

function inputJson(value: Prisma.JsonValue | null) {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

/** Prevents an explicit prerequisite from becoming a forward reference or cycle. */
export function validateLessonOrder(lessons: LessonForOrder[], orderedIds: string[]) {
  if (lessons.length !== orderedIds.length || new Set(orderedIds).size !== orderedIds.length) {
    throw new Error("The lesson order must contain every lesson exactly once.");
  }
  const knownIds = new Set(lessons.map((lesson) => lesson.id));
  if (orderedIds.some((id) => !knownIds.has(id))) throw new Error("Lessons can only be reordered inside their current module.");

  const position = new Map(orderedIds.map((id, index) => [id, index]));
  for (const lesson of lessons) {
    if (!lesson.prerequisiteLessonId) continue;
    const prerequisitePosition = position.get(lesson.prerequisiteLessonId);
    const lessonPosition = position.get(lesson.id);
    if (prerequisitePosition === undefined || lessonPosition === undefined || prerequisitePosition >= lessonPosition) {
      throw new Error("A lesson must remain after its prerequisite lesson.");
    }
  }
}

async function validateLessonPrerequisite(input: {
  moduleId: string;
  lessonId: string;
  order: number;
  prerequisiteLessonId: string | null;
}) {
  if (!input.prerequisiteLessonId) return;
  if (input.prerequisiteLessonId === input.lessonId) throw new Error("A lesson cannot be its own prerequisite.");
  const prerequisite = await prisma.lesson.findUnique({
    where: { id: input.prerequisiteLessonId },
    select: { moduleId: true, order: true },
  });
  if (!prerequisite || prerequisite.moduleId !== input.moduleId) {
    throw new Error("A lesson prerequisite must belong to the same module.");
  }
  if (prerequisite.order >= input.order) throw new Error("A lesson must remain after its prerequisite lesson.");
}

/** Updates lesson metadata without bypassing its lifecycle or content block model. */
export async function updateCmsLesson(actorId: string, lessonId: string, input: UpdateLessonInput) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, moduleId: true, order: true, prerequisiteLessonId: true },
  });
  if (!lesson) throw new Error("Lesson not found.");
  const prerequisiteLessonId = input.prerequisiteLessonId === undefined
    ? lesson.prerequisiteLessonId
    : input.prerequisiteLessonId;
  await validateLessonPrerequisite({
    moduleId: lesson.moduleId,
    lessonId,
    order: lesson.order,
    prerequisiteLessonId: prerequisiteLessonId ?? null,
  });

  if (input.slug) {
    const matching = await prisma.lesson.findUnique({ where: { slug: input.slug }, select: { id: true } });
    if (matching && matching.id !== lessonId) throw new Error("A lesson with this slug already exists.");
  }

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.estimatedDuration !== undefined ? { estimatedDuration: input.estimatedDuration } : {}),
      ...(input.phraseOfTheDay !== undefined ? { phraseOfTheDay: input.phraseOfTheDay?.trim() || null } : {}),
      ...(input.motivationalQuote !== undefined ? { motivationalQuote: input.motivationalQuote?.trim() || null } : {}),
      ...(input.learningObjectives !== undefined ? { learningObjectives: input.learningObjectives as Prisma.InputJsonValue } : {}),
      ...(input.previewText !== undefined ? { previewText: input.previewText?.trim() || null } : {}),
      ...(input.prerequisiteLessonId !== undefined ? { prerequisiteLessonId: input.prerequisiteLessonId } : {}),
      ...(input.requiredPrerequisiteCompletion !== undefined ? { requiredPrerequisiteCompletion: input.requiredPrerequisiteCompletion } : {}),
      ...(input.autoUnlockNextLesson !== undefined ? { autoUnlockNextLesson: input.autoUnlockNextLesson } : {}),
      ...(input.isFree !== undefined ? { isFree: input.isFree } : {}),
    },
  });
  await recordCmsContentVersion({ actorId, entityType: "LESSON", entityId: updated.id, action: "UPDATED", snapshot: updated });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_LESSON_UPDATED", entityType: "Lesson", entityId: updated.id } });
  return updated;
}

/** Reorders a module's lessons atomically while preserving prerequisite safety. */
export async function reorderCmsLessons(actorId: string, moduleId: string, lessonIds: string[]) {
  const lessons = await prisma.lesson.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
    select: { id: true, order: true, prerequisiteLessonId: true },
  });
  validateLessonOrder(lessons, lessonIds);
  await prisma.$transaction(async (tx) => {
    const shift = lessons.length + 10_000;
    await tx.lesson.updateMany({ where: { id: { in: lessonIds } }, data: { order: { increment: shift } } });
    for (const [index, id] of lessonIds.entries()) {
      const updated = await tx.lesson.update({ where: { id }, data: { order: index + 1 } });
      const latest = await tx.cmsContentVersion.aggregate({ where: { entityType: "LESSON", entityId: id }, _max: { version: true } });
      await tx.cmsContentVersion.create({
        data: {
          entityType: "LESSON",
          entityId: id,
          version: (latest._max.version ?? 0) + 1,
          action: "REORDERED",
          snapshot: updated,
          actorId,
        },
      });
    }
    await tx.contentAuditLog.create({ data: { actorId, action: "CMS_LESSONS_REORDERED", entityType: "Lesson", entityId: lessonIds[0], metadata: { moduleId, lessonIds } } });
  });
}

async function nextCopiedLessonSlug(sourceSlug: string) {
  const base = `${sourceSlug}-copy`.slice(0, 150);
  let candidate = base;
  let copy = 2;
  while (await prisma.lesson.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${copy}`.slice(0, 160);
    copy += 1;
  }
  return candidate;
}

/** Copies the full authoring tree, while never copying learner progress or live status. */
export async function duplicateCmsLesson(actorId: string, lessonId: string, targetModuleId?: string) {
  const source = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { select: { id: true, courseId: true } },
      blocks: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
    },
  });
  if (!source) throw new Error("Lesson not found.");
  const targetModule = targetModuleId
    ? await prisma.courseModule.findUnique({ where: { id: targetModuleId }, select: { id: true, courseId: true } })
    : source.module;
  if (!targetModule) throw new Error("Target module not found.");
  const [slug, last] = await Promise.all([
    nextCopiedLessonSlug(source.slug),
    prisma.lesson.findFirst({ where: { moduleId: targetModule.id }, orderBy: { order: "desc" }, select: { order: true } }),
  ]);

  return prisma.$transaction(async (tx) => {
    const copied = await tx.lesson.create({
      data: {
        moduleId: targetModule.id,
        prerequisiteLessonId: null,
        requiredPrerequisiteCompletion: source.requiredPrerequisiteCompletion,
        autoUnlockNextLesson: source.autoUnlockNextLesson,
        slug,
        title: `${source.title} (copy)`,
        description: source.description,
        type: source.type,
        order: (last?.order ?? 0) + 1,
        estimatedDuration: source.estimatedDuration,
        phraseOfTheDay: source.phraseOfTheDay,
        motivationalQuote: source.motivationalQuote,
        learningObjectives: inputJson(source.learningObjectives),
        previewText: source.previewText,
        isPublished: false,
        contentStatus: "DRAFT",
        isFree: source.isFree,
        blocks: {
          create: source.blocks.map((block) => ({
            type: block.type,
            title: block.title,
            content: inputJson(block.content),
            settings: inputJson(block.settings),
            order: block.order,
            isRequired: block.isRequired,
            contentStatus: "DRAFT",
            exercises: {
              create: block.exercises.map((exercise) => ({
                type: exercise.type,
                engineKey: exercise.engineKey,
                variantKey: exercise.variantKey,
                instruction: exercise.instruction,
                question: exercise.question,
                content: inputJson(exercise.content),
                correctAnswer: inputJson(exercise.correctAnswer),
                alternativeAnswers: inputJson(exercise.alternativeAnswers),
                explanation: exercise.explanation,
                hint: exercise.hint,
                hintsEnabled: exercise.hintsEnabled,
                difficulty: exercise.difficulty,
                basePoints: exercise.basePoints,
                timeLimitSeconds: exercise.timeLimitSeconds,
                solutionCost: exercise.solutionCost,
                allowInstantCheck: exercise.allowInstantCheck,
                allowExtraExercise: exercise.allowExtraExercise,
                order: exercise.order,
                contentStatus: "DRAFT",
              })),
            },
          })),
        },
      },
    });
    await tx.course.update({ where: { id: targetModule.courseId }, data: { lessonCount: { increment: 1 } } });
    await tx.cmsContentVersion.create({ data: { entityType: "LESSON", entityId: copied.id, version: 1, action: "DUPLICATED", snapshot: { sourceLessonId: source.id, targetModuleId: targetModule.id }, actorId } });
    await tx.contentAuditLog.create({ data: { actorId, action: "CMS_LESSON_DUPLICATED", entityType: "Lesson", entityId: copied.id, metadata: { sourceLessonId: source.id, targetModuleId: targetModule.id } } });
    return copied;
  });
}
