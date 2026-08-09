import { randomUUID } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { recordCmsContentVersion } from "@/modules/cms/services/content-workflow.service";
import type { CreateModuleInput, UpdateModuleInput } from "@/modules/courses/schemas/content.schemas";

type ModuleOrderItem = { id: string; unlockAfterModuleId: string | null };

function asInputJson(value: Prisma.JsonValue | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

/** Ensures a prerequisite never follows, or depends back on, its dependent module. */
export function validateCourseModuleOrder<T extends ModuleOrderItem>(modules: readonly T[], orderedIds: readonly string[]) {
  if (new Set(orderedIds).size !== orderedIds.length || orderedIds.length !== modules.length) {
    throw new Error("The module order must contain every course module exactly once.");
  }
  const ids = new Set(modules.map((module) => module.id));
  if (orderedIds.some((id) => !ids.has(id))) throw new Error("A reordered module does not belong to this course.");

  const position = new Map(orderedIds.map((id, index) => [id, index]));
  for (const courseModule of modules) {
    if (!courseModule.unlockAfterModuleId) continue;
    const prerequisitePosition = position.get(courseModule.unlockAfterModuleId);
    const modulePosition = position.get(courseModule.id);
    if (prerequisitePosition === undefined || modulePosition === undefined || prerequisitePosition >= modulePosition) {
      throw new Error("A module must remain after its explicit prerequisite module.");
    }
  }
}

async function validateModuleUnlockCondition(courseId: string, moduleId: string | null, unlockAfterModuleId: string | null | undefined) {
  if (!unlockAfterModuleId) return;
  if (unlockAfterModuleId === moduleId) throw new Error("A module cannot unlock itself.");

  const prerequisite = await prisma.courseModule.findUnique({
    where: { id: unlockAfterModuleId },
    select: { id: true, courseId: true, unlockAfterModuleId: true },
  });
  if (!prerequisite || prerequisite.courseId !== courseId) {
    throw new Error("The unlock prerequisite must belong to the same course.");
  }

  const visited = new Set<string>(moduleId ? [moduleId] : []);
  let cursor: typeof prerequisite | null = prerequisite;
  while (cursor) {
    if (visited.has(cursor.id)) throw new Error("Module unlock conditions cannot form a cycle.");
    visited.add(cursor.id);
    cursor = cursor.unlockAfterModuleId
      ? await prisma.courseModule.findUnique({ where: { id: cursor.unlockAfterModuleId }, select: { id: true, courseId: true, unlockAfterModuleId: true } })
      : null;
  }
}

export async function updateCmsCourseModule(actorId: string, moduleId: string, input: UpdateModuleInput) {
  const existing = await prisma.courseModule.findUnique({ where: { id: moduleId }, select: { id: true, courseId: true, unlockAfterModuleId: true } });
  if (!existing) throw new Error("Module not found.");
  const unlockAfterModuleId = input.unlockAfterModuleId === undefined ? existing.unlockAfterModuleId : input.unlockAfterModuleId;
  await validateModuleUnlockCondition(existing.courseId, existing.id, unlockAfterModuleId);

  const updatedModule = await prisma.courseModule.update({
    where: { id: moduleId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
      ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}),
      ...(input.requiresSequentialCompletion !== undefined ? { requiresSequentialCompletion: input.requiresSequentialCompletion } : {}),
      ...(input.unlockAfterModuleId !== undefined ? { unlockAfterModuleId: input.unlockAfterModuleId } : {}),
      ...(input.requiredCompletionPercent !== undefined ? { requiredCompletionPercent: input.requiredCompletionPercent } : {}),
    },
  });
  await recordCmsContentVersion({ actorId, entityType: "COURSE_MODULE", entityId: updatedModule.id, action: "UPDATED", snapshot: updatedModule });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_MODULE_UPDATED", entityType: "CourseModule", entityId: updatedModule.id } });
  return updatedModule;
}

export async function reorderCmsCourseModules(actorId: string, courseId: string, moduleIds: string[]) {
  const modules = await prisma.courseModule.findMany({ where: { courseId }, select: { id: true, unlockAfterModuleId: true } });
  if (modules.length === 0) throw new Error("The course has no modules to reorder.");
  validateCourseModuleOrder(modules, moduleIds);

  await prisma.$transaction(async (tx) => {
    // Temporary negative values avoid the unique (courseId, order) constraint
    // while two adjacent items swap places.
    await Promise.all(moduleIds.map((id, index) => tx.courseModule.update({ where: { id }, data: { order: -(index + 1) } })));
    await Promise.all(moduleIds.map((id, index) => tx.courseModule.update({ where: { id }, data: { order: index + 1 } })));
    await tx.contentAuditLog.create({ data: { actorId, action: "CMS_MODULES_REORDERED", entityType: "Course", entityId: courseId, metadata: { moduleIds } } });
  });
  return prisma.courseModule.findMany({ where: { courseId }, orderBy: { order: "asc" } });
}

export async function duplicateCmsCourseModule(actorId: string, moduleId: string, targetCourseId?: string) {
  const source = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: { lessons: { orderBy: { order: "asc" }, include: { blocks: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } } } } },
  });
  if (!source) throw new Error("Module not found.");
  const destinationCourseId = targetCourseId ?? source.courseId;
  const destination = await prisma.course.findUnique({ where: { id: destinationCourseId }, select: { id: true } });
  if (!destination) throw new Error("Destination course not found.");
  const last = await prisma.courseModule.findFirst({ where: { courseId: destinationCourseId }, orderBy: { order: "desc" }, select: { order: true } });
  const copyId = randomUUID().replace(/-/g, "").slice(0, 10);

  const created = await prisma.courseModule.create({
    data: {
      courseId: destinationCourseId,
      title: `${source.title} (copy)`,
      description: source.description,
      order: (last?.order ?? 0) + 1,
      isRequired: source.isRequired,
      requiresSequentialCompletion: source.requiresSequentialCompletion,
      unlockAfterModuleId: null,
      requiredCompletionPercent: source.requiredCompletionPercent,
      isPublished: false,
      contentStatus: "DRAFT",
      lessons: {
        create: source.lessons.map((lesson) => ({
          slug: `${lesson.slug}-${copyId}`.slice(0, 160),
          title: lesson.title,
          description: lesson.description,
          type: lesson.type,
          order: lesson.order,
          estimatedDuration: lesson.estimatedDuration,
          phraseOfTheDay: lesson.phraseOfTheDay,
          motivationalQuote: lesson.motivationalQuote,
          learningObjectives: asInputJson(lesson.learningObjectives),
          previewText: lesson.previewText,
          isPublished: false,
          contentStatus: "DRAFT",
          isFree: lesson.isFree,
          blocks: {
            create: lesson.blocks.map((block) => ({
              type: block.type,
              title: block.title,
              content: asInputJson(block.content),
              settings: asInputJson(block.settings),
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
                  content: asInputJson(exercise.content),
                  correctAnswer: asInputJson(exercise.correctAnswer),
                  alternativeAnswers: asInputJson(exercise.alternativeAnswers),
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
        })),
      },
    },
  });
  await recordCmsContentVersion({ actorId, entityType: "COURSE_MODULE", entityId: created.id, action: "DUPLICATED", snapshot: { sourceModuleId: source.id, targetCourseId: destinationCourseId } });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_MODULE_DUPLICATED", entityType: "CourseModule", entityId: created.id, metadata: { sourceModuleId: source.id, targetCourseId: destinationCourseId } } });
  return created;
}

export async function moveCmsCourseModule(actorId: string, moduleId: string, targetCourseId: string) {
  const source = await prisma.courseModule.findUnique({ where: { id: moduleId }, include: { _count: { select: { lessons: true } } } });
  if (!source) throw new Error("Module not found.");
  if (source.courseId === targetCourseId) return source;
  const target = await prisma.course.findUnique({ where: { id: targetCourseId }, select: { id: true } });
  if (!target) throw new Error("Destination course not found.");
  const last = await prisma.courseModule.findFirst({ where: { courseId: targetCourseId }, orderBy: { order: "desc" }, select: { order: true } });

  return prisma.$transaction(async (tx) => {
    const moved = await tx.courseModule.update({
      where: { id: moduleId },
      data: {
        courseId: targetCourseId,
        order: (last?.order ?? 0) + 1,
        unlockAfterModuleId: null,
        isPublished: false,
        contentStatus: "DRAFT",
        scheduledAt: null,
        publishedAt: null,
        archivedAt: null,
      },
    });
    await tx.course.update({ where: { id: source.courseId }, data: { lessonCount: { decrement: source._count.lessons } } });
    await tx.course.update({ where: { id: targetCourseId }, data: { lessonCount: { increment: source._count.lessons } } });
    await tx.contentAuditLog.create({ data: { actorId, action: "CMS_MODULE_MOVED", entityType: "CourseModule", entityId: moved.id, metadata: { sourceCourseId: source.courseId, targetCourseId } } });
    return moved;
  });
}

export async function createCmsCourseModule(actorId: string, courseId: string, input: CreateModuleInput) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) throw new Error("Course not found.");
  await validateModuleUnlockCondition(courseId, null, input.unlockAfterModuleId);
  const last = await prisma.courseModule.findFirst({ where: { courseId }, orderBy: { order: "desc" }, select: { order: true } });
  const createdModule = await prisma.courseModule.create({
    data: {
      courseId,
      title: input.title,
      description: input.description?.trim() || null,
      order: input.order ?? (last?.order ?? 0) + 1,
      isRequired: input.isRequired,
      requiresSequentialCompletion: input.requiresSequentialCompletion,
      unlockAfterModuleId: input.unlockAfterModuleId ?? null,
      requiredCompletionPercent: input.requiredCompletionPercent,
      isPublished: false,
      contentStatus: "DRAFT",
    },
  });
  await recordCmsContentVersion({ actorId, entityType: "COURSE_MODULE", entityId: createdModule.id, action: "CREATED", snapshot: createdModule });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_MODULE_CREATED", entityType: "CourseModule", entityId: createdModule.id, metadata: { courseId } } });
  return createdModule;
}
