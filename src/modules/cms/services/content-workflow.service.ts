import { Prisma, type CmsContentEntityType, type CmsContentStatus, type CmsContentVersionAction } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { validateExerciseConfiguration } from "@/modules/cms/exercise-engines/configuration";

export type CmsWorkflowAction = "PUBLISH" | "SUBMIT_FOR_REVIEW" | "UNPUBLISH" | "SCHEDULE" | "ARCHIVE" | "RESTORE";

export type CmsIntegrityIssue = {
  code: string;
  message: string;
  path?: string;
};

type WorkflowRecord = {
  id: string;
  contentStatus: CmsContentStatus;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
};

type WorkflowClient = Prisma.TransactionClient;

function isLiveOrScheduled(status: CmsContentStatus) {
  return status === "PUBLISHED" || status === "SCHEDULED";
}

function serializeSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getTransition(action: CmsWorkflowAction, scheduledAt?: Date) {
  if (action === "SCHEDULE") {
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      throw new Error("Choose a future publication date.");
    }
    return { status: "SCHEDULED" as const, versionAction: "UPDATED" as const, scheduledAt };
  }

  const transitions: Record<Exclude<CmsWorkflowAction, "SCHEDULE">, { status: CmsContentStatus; versionAction: CmsContentVersionAction }> = {
    PUBLISH: { status: "PUBLISHED", versionAction: "PUBLISHED" },
    SUBMIT_FOR_REVIEW: { status: "REVIEW", versionAction: "UPDATED" },
    UNPUBLISH: { status: "UNPUBLISHED", versionAction: "UNPUBLISHED" },
    ARCHIVE: { status: "ARCHIVED", versionAction: "ARCHIVED" },
    RESTORE: { status: "DRAFT", versionAction: "RESTORED" },
  };
  return { ...transitions[action], scheduledAt: undefined };
}

function lifecycleData(status: CmsContentStatus, now: Date, scheduledAt?: Date) {
  return {
    contentStatus: status,
    scheduledAt: status === "SCHEDULED" ? scheduledAt ?? null : null,
    publishedAt: status === "PUBLISHED" ? now : null,
    archivedAt: status === "ARCHIVED" ? now : null,
  };
}

async function findWorkflowRecord(entityType: CmsContentEntityType, entityId: string): Promise<WorkflowRecord | null> {
  switch (entityType) {
    case "LANGUAGE_LEVEL": return prisma.languageLevel.findUnique({ where: { id: entityId } });
    case "CURRICULUM_NODE": return prisma.curriculumNode.findUnique({ where: { id: entityId } });
    case "COURSE_CATEGORY": return prisma.courseCategory.findUnique({ where: { id: entityId } });
    case "COURSE": return prisma.course.findUnique({ where: { id: entityId } });
    case "COURSE_MODULE": return prisma.courseModule.findUnique({ where: { id: entityId } });
    case "LESSON": return prisma.lesson.findUnique({ where: { id: entityId } });
    case "LESSON_BLOCK": return prisma.lessonBlock.findUnique({ where: { id: entityId } });
    case "EXERCISE": return prisma.exercise.findUnique({ where: { id: entityId } });
    case "GRAMMAR_TOPIC": return prisma.grammarTopic.findUnique({ where: { id: entityId } });
    case "WORD": return prisma.word.findUnique({ where: { id: entityId } });
    case "CONTENT_SLOT": return prisma.cmsContentSlot.findUnique({ where: { id: entityId } });
  }
}

async function updateWorkflowRecord(
  tx: WorkflowClient,
  entityType: CmsContentEntityType,
  entityId: string,
  status: CmsContentStatus,
  now: Date,
  scheduledAt?: Date,
  actorId?: string,
) {
  const lifecycle = lifecycleData(status, now, scheduledAt);
  const isPublished = status === "PUBLISHED";

  switch (entityType) {
    case "LANGUAGE_LEVEL": return tx.languageLevel.update({ where: { id: entityId }, data: { ...lifecycle, isPublished } });
    case "CURRICULUM_NODE": return tx.curriculumNode.update({ where: { id: entityId }, data: lifecycle });
    case "COURSE_CATEGORY": return tx.courseCategory.update({ where: { id: entityId }, data: { ...lifecycle, isPublished } });
    case "COURSE": {
      const course = await tx.course.update({
        where: { id: entityId },
        data: { ...lifecycle, isPublished, ...(actorId ? { updatedById: actorId } : {}) },
      });

      // A course is one learner-facing unit. Publishing it must never leave a
      // public outline whose modules, lessons, theory blocks or exercises are
      // still hidden in draft. The integrity check below verifies the full
      // tree before this atomic cascade can run.
      if (status === "PUBLISHED") {
        await tx.courseModule.updateMany({ where: { courseId: entityId }, data: { ...lifecycle, isPublished: true } });
        await tx.lesson.updateMany({ where: { module: { courseId: entityId } }, data: { ...lifecycle, isPublished: true } });
        await tx.lessonBlock.updateMany({ where: { lesson: { module: { courseId: entityId } } }, data: lifecycle });
        await tx.exercise.updateMany({ where: { lessonBlock: { lesson: { module: { courseId: entityId } } } }, data: lifecycle });
      }
      return course;
    }
    case "COURSE_MODULE": return tx.courseModule.update({ where: { id: entityId }, data: { ...lifecycle, isPublished } });
    case "LESSON": return tx.lesson.update({ where: { id: entityId }, data: { ...lifecycle, isPublished } });
    case "LESSON_BLOCK": return tx.lessonBlock.update({ where: { id: entityId }, data: lifecycle });
    case "EXERCISE": return tx.exercise.update({ where: { id: entityId }, data: lifecycle });
    case "GRAMMAR_TOPIC": return tx.grammarTopic.update({ where: { id: entityId }, data: lifecycle });
    case "WORD": return tx.word.update({ where: { id: entityId }, data: { ...lifecycle, isActive: isPublished } });
    case "CONTENT_SLOT": return tx.cmsContentSlot.update({ where: { id: entityId }, data: lifecycle });
  }
}

async function writeVersion(
  tx: WorkflowClient,
  actorId: string | undefined,
  entityType: CmsContentEntityType,
  entityId: string,
  action: CmsContentVersionAction,
  snapshot: unknown,
  note?: string,
) {
  const latest = await tx.cmsContentVersion.aggregate({
    where: { entityType, entityId },
    _max: { version: true },
  });
  return tx.cmsContentVersion.create({
    data: {
      entityType,
      entityId,
      version: (latest._max.version ?? 0) + 1,
      action,
      snapshot: serializeSnapshot(snapshot),
      note: note?.trim() || null,
      actorId,
    },
  });
}

/** Records an immutable snapshot after a content edit made by a domain service. */
export async function recordCmsContentVersion(input: {
  actorId?: string;
  entityType: CmsContentEntityType;
  entityId: string;
  action: CmsContentVersionAction;
  snapshot: unknown;
  note?: string;
}) {
  return prisma.$transaction((tx) => writeVersion(
    tx,
    input.actorId,
    input.entityType,
    input.entityId,
    input.action,
    input.snapshot,
    input.note,
  ));
}

async function writeAudit(
  tx: WorkflowClient,
  actorId: string | undefined,
  action: string,
  entityType: CmsContentEntityType,
  entityId: string,
  metadata?: Prisma.InputJsonValue,
) {
  if (!actorId) return;
  await tx.contentAuditLog.create({
    data: { actorId, action, entityType, entityId, metadata },
  });
}

/** Checks only publication safety. It never mutates live content. */
export async function validateCmsContentIntegrity(entityType: CmsContentEntityType, entityId: string): Promise<CmsIntegrityIssue[]> {
  const issues: CmsIntegrityIssue[] = [];

  if (entityType === "COURSE") {
    const course = await prisma.course.findUnique({
      where: { id: entityId },
      include: {
        level: true,
        category: true,
        curriculumLinks: { include: { node: true } },
        modules: {
          select: {
            id: true,
            lessons: {
              select: {
                id: true,
                blocks: {
                  select: {
                    id: true,
                    type: true,
                    exercises: {
                      select: {
                        id: true,
                        type: true,
                        engineKey: true,
                        instruction: true,
                        question: true,
                        content: true,
                        correctAnswer: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!course) return [{ code: "NOT_FOUND", message: "Course not found." }];
    if (course.isTemplate) issues.push({ code: "TEMPLATE_NOT_PUBLISHABLE", message: "A course template must be cloned into a course before publication." });
    if (!isLiveOrScheduled(course.level.contentStatus)) issues.push({ code: "LEVEL_NOT_READY", message: "Publish or schedule the course level before this course." });
    if (!isLiveOrScheduled(course.category.contentStatus)) issues.push({ code: "CATEGORY_NOT_READY", message: "Publish or schedule the course category before this course." });
    if (course.curriculumLinks.some((link) => link.node.levelId !== course.levelId)) issues.push({ code: "CURRICULUM_LEVEL_MISMATCH", message: "Every linked curriculum item must belong to the course CEFR level." });
    if (course.curriculumLinks.some((link) => !isLiveOrScheduled(link.node.contentStatus))) issues.push({ code: "CURRICULUM_NOT_READY", message: "Publish or schedule every linked section, topic or subtopic before this course." });
    if (course.modules.length === 0) issues.push({ code: "NO_MODULE", message: "A course needs at least one module before it can be published." });
    for (const courseModule of course.modules) {
      if (courseModule.lessons.length === 0) {
        issues.push({ code: "NO_LESSON", path: `module:${courseModule.id}`, message: "Every course module needs at least one lesson before the course can be published." });
      }
      for (const lesson of courseModule.lessons) {
        if (lesson.blocks.length === 0) {
          issues.push({ code: "NO_BLOCK", path: `lesson:${lesson.id}`, message: "Every course lesson needs at least one content block before the course can be published." });
        }
        for (const block of lesson.blocks) {
          if (block.type === "EXERCISE" && block.exercises.length === 0) {
            issues.push({ code: "NO_EXERCISE", path: `block:${block.id}`, message: "Every exercise block needs at least one exercise before the course can be published." });
          }
          for (const exercise of block.exercises) {
            for (const message of validateExerciseConfiguration(exercise)) {
              issues.push({ code: "INVALID_EXERCISE_CONFIGURATION", path: `exercise:${exercise.id}`, message });
            }
          }
        }
      }
    }
  }

  if (entityType === "CURRICULUM_NODE") {
    const node = await prisma.curriculumNode.findUnique({ where: { id: entityId }, include: { level: true, parent: true } });
    if (!node) return [{ code: "NOT_FOUND", message: "Curriculum item not found." }];
    if (!isLiveOrScheduled(node.level.contentStatus)) issues.push({ code: "LEVEL_NOT_READY", message: "Publish or schedule the CEFR level before this curriculum item." });
    if (node.type === "SECTION" && node.parentId) issues.push({ code: "SECTION_PARENT", message: "A section cannot have a parent." });
    if (node.type !== "SECTION") {
      const expected = node.type === "TOPIC" ? "SECTION" : "TOPIC";
      if (!node.parent || node.parent.type !== expected || node.parent.levelId !== node.levelId) issues.push({ code: "PARENT_NOT_READY", message: `This ${node.type.toLowerCase()} needs a ${expected.toLowerCase()} parent in the same level.` });
      else if (!isLiveOrScheduled(node.parent.contentStatus)) issues.push({ code: "PARENT_NOT_READY", message: "Publish or schedule the parent curriculum item first." });
    }
  }

  if (entityType === "COURSE_MODULE") {
    const courseModule = await prisma.courseModule.findUnique({ where: { id: entityId }, include: { course: true, unlockAfterModule: true, lessons: { select: { id: true, contentStatus: true } } } });
    if (!courseModule) return [{ code: "NOT_FOUND", message: "Module not found." }];
    if (!isLiveOrScheduled(courseModule.course.contentStatus)) issues.push({ code: "COURSE_NOT_READY", message: "Publish or schedule the parent course before this module." });
    if (courseModule.lessons.length === 0) issues.push({ code: "NO_LESSON", message: "A module needs at least one lesson before it can be published." });
    if (courseModule.unlockAfterModule) {
      if (courseModule.unlockAfterModule.courseId !== courseModule.courseId) issues.push({ code: "UNLOCK_COURSE_MISMATCH", message: "A module prerequisite must belong to the same course." });
      else if (!isLiveOrScheduled(courseModule.unlockAfterModule.contentStatus)) issues.push({ code: "UNLOCK_NOT_READY", message: "Publish or schedule the explicit prerequisite module before this module." });
    }
    if (courseModule.requiresSequentialCompletion) {
      const previous = await prisma.courseModule.findFirst({ where: { courseId: courseModule.courseId, order: { lt: courseModule.order } }, orderBy: { order: "desc" }, select: { contentStatus: true } });
      if (previous && !isLiveOrScheduled(previous.contentStatus)) issues.push({ code: "SEQUENCE_NOT_READY", message: "Publish or schedule the previous module before this sequential module." });
    }
  }

  if (entityType === "LESSON") {
    const lesson = await prisma.lesson.findUnique({ where: { id: entityId }, include: { module: true, prerequisiteLesson: { select: { id: true, moduleId: true, order: true, contentStatus: true } }, blocks: { select: { id: true, contentStatus: true } } } });
    if (!lesson) return [{ code: "NOT_FOUND", message: "Lesson not found." }];
    if (!isLiveOrScheduled(lesson.module.contentStatus)) issues.push({ code: "MODULE_NOT_READY", message: "Publish or schedule the parent module before this lesson." });
    if (lesson.blocks.length === 0) issues.push({ code: "NO_BLOCK", message: "A lesson needs at least one block before it can be published." });
    if (lesson.prerequisiteLesson) {
      if (lesson.prerequisiteLesson.moduleId !== lesson.moduleId || lesson.prerequisiteLesson.order >= lesson.order) issues.push({ code: "LESSON_PREREQUISITE_ORDER", message: "A lesson prerequisite must be an earlier lesson in the same module." });
      else if (!isLiveOrScheduled(lesson.prerequisiteLesson.contentStatus)) issues.push({ code: "LESSON_PREREQUISITE_NOT_READY", message: "Publish or schedule the prerequisite lesson before this lesson." });
    }
  }

  if (entityType === "LESSON_BLOCK") {
    const block = await prisma.lessonBlock.findUnique({
      where: { id: entityId },
      include: {
        lesson: true,
        exercises: {
          select: {
            id: true,
            contentStatus: true,
            type: true,
            engineKey: true,
            instruction: true,
            question: true,
            content: true,
            correctAnswer: true,
          },
        },
      },
    });
    if (!block) return [{ code: "NOT_FOUND", message: "Lesson block not found." }];
    if (!isLiveOrScheduled(block.lesson.contentStatus)) issues.push({ code: "LESSON_NOT_READY", message: "Publish or schedule the parent lesson before this block." });
    if (block.type === "EXERCISE" && block.exercises.length === 0) issues.push({ code: "NO_EXERCISE", message: "An exercise block needs at least one exercise before it can be published." });
    for (const exercise of block.exercises) {
      for (const message of validateExerciseConfiguration(exercise)) {
        issues.push({ code: "INVALID_EXERCISE_CONFIGURATION", path: `exercise:${exercise.id}`, message });
      }
    }
  }

  if (entityType === "EXERCISE") {
    const exercise = await prisma.exercise.findUnique({ where: { id: entityId }, include: { lessonBlock: true } });
    if (!exercise) return [{ code: "NOT_FOUND", message: "Exercise not found." }];
    if (!isLiveOrScheduled(exercise.lessonBlock.contentStatus)) issues.push({ code: "BLOCK_NOT_READY", message: "Publish or schedule the parent block before this exercise." });
    for (const message of validateExerciseConfiguration(exercise)) {
      issues.push({ code: "INVALID_EXERCISE_CONFIGURATION", message });
    }
  }

  if (entityType === "CONTENT_SLOT") {
    const slot = await prisma.cmsContentSlot.findUnique({ where: { id: entityId }, select: { id: true, title: true } });
    if (!slot) return [{ code: "NOT_FOUND", message: "Content slot not found." }];
    if (!slot.title.trim()) issues.push({ code: "MISSING_TITLE", message: "A content slot needs a title." });
  }

  if (entityType !== "COURSE" && entityType !== "CURRICULUM_NODE" && entityType !== "COURSE_MODULE" && entityType !== "LESSON" && entityType !== "LESSON_BLOCK" && entityType !== "EXERCISE" && entityType !== "CONTENT_SLOT") {
    const existing = await findWorkflowRecord(entityType, entityId);
    if (!existing) issues.push({ code: "NOT_FOUND", message: "Content item not found." });
  }

  return issues;
}

export async function transitionCmsContent(input: {
  actorId?: string;
  entityType: CmsContentEntityType;
  entityId: string;
  action: CmsWorkflowAction;
  scheduledAt?: Date;
  note?: string;
}) {
  const existing = await findWorkflowRecord(input.entityType, input.entityId);
  if (!existing) throw new Error("Content item not found.");

  const transition = getTransition(input.action, input.scheduledAt);
  if (transition.status === "PUBLISHED" || transition.status === "SCHEDULED") {
    const issues = await validateCmsContentIntegrity(input.entityType, input.entityId);
    if (issues.length) throw new Error(issues.map((issue) => issue.message).join(" "));
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const updated = await updateWorkflowRecord(tx, input.entityType, input.entityId, transition.status, now, transition.scheduledAt, input.actorId);
    await writeVersion(tx, input.actorId, input.entityType, input.entityId, transition.versionAction, updated, input.note);
    await writeAudit(tx, input.actorId, `CMS_${input.action}`, input.entityType, input.entityId, {
      previousStatus: existing.contentStatus,
      nextStatus: transition.status,
      scheduledAt: transition.scheduledAt?.toISOString() ?? null,
    });
    return updated;
  });
}

export async function listCmsContentHistory(entityType: CmsContentEntityType, entityId: string) {
  return prisma.cmsContentVersion.findMany({
    where: { entityType, entityId },
    orderBy: { version: "desc" },
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
}

/** Publishes all due entries. Intended to be called by the existing protected worker. */
export async function publishDueCmsContent() {
  const now = new Date();
  const entities: Array<{ entityType: CmsContentEntityType; ids: string[] }> = [
    { entityType: "LANGUAGE_LEVEL", ids: (await prisma.languageLevel.findMany({ where: { contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    // A child cannot be published until its parent is live. Keep this explicit
    // order so a Section, its Topics and its Subtopics scheduled for the same
    // time become available in one worker run.
    { entityType: "CURRICULUM_NODE", ids: (await prisma.curriculumNode.findMany({ where: { type: "SECTION", contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    { entityType: "CURRICULUM_NODE", ids: (await prisma.curriculumNode.findMany({ where: { type: "TOPIC", contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    { entityType: "CURRICULUM_NODE", ids: (await prisma.curriculumNode.findMany({ where: { type: "SUBTOPIC", contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    { entityType: "COURSE_CATEGORY", ids: (await prisma.courseCategory.findMany({ where: { contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    { entityType: "COURSE", ids: (await prisma.course.findMany({ where: { contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    { entityType: "COURSE_MODULE", ids: (await prisma.courseModule.findMany({ where: { contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    { entityType: "LESSON", ids: (await prisma.lesson.findMany({ where: { contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    { entityType: "LESSON_BLOCK", ids: (await prisma.lessonBlock.findMany({ where: { contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    { entityType: "EXERCISE", ids: (await prisma.exercise.findMany({ where: { contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    { entityType: "GRAMMAR_TOPIC", ids: (await prisma.grammarTopic.findMany({ where: { contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    { entityType: "WORD", ids: (await prisma.word.findMany({ where: { contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
    { entityType: "CONTENT_SLOT", ids: (await prisma.cmsContentSlot.findMany({ where: { contentStatus: "SCHEDULED", scheduledAt: { lte: now } }, select: { id: true } })).map(({ id }) => id) },
  ];

  let published = 0;
  let skipped = 0;
  for (const { entityType, ids } of entities) {
    for (const entityId of ids) {
      try {
        await transitionCmsContent({ entityType, entityId, action: "PUBLISH", note: "Published by scheduled CMS worker." });
        published += 1;
      } catch {
        // A parent may have been unpublished after the child was scheduled.
        // Leave it scheduled so the owner can correct the integrity issue.
        skipped += 1;
      }
    }
  }
  return { published, skipped };
}
