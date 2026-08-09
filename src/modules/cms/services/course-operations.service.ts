import { Prisma, type CmsContentEntityType } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";

const reorderableEntityTypes = [
  "LANGUAGE_LEVEL",
  "CURRICULUM_NODE",
  "COURSE_CATEGORY",
  "COURSE",
  "COURSE_MODULE",
  "LESSON",
  "LESSON_BLOCK",
  "EXERCISE",
  "GRAMMAR_TOPIC",
] as const;

export type CmsReorderableEntityType = (typeof reorderableEntityTypes)[number];

function legacyLevelFor(code: "A1" | "A2" | "B1" | "B2" | "C1" | "C2") {
  if (code === "A1" || code === "A2") return "BEGINNER" as const;
  if (code === "B1" || code === "B2") return "INTERMEDIATE" as const;
  return "ADVANCED" as const;
}

function asInputJson(value: Prisma.JsonValue | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

async function nextCopiedSlug(sourceSlug: string) {
  const base = `${sourceSlug}-copy`;
  let candidate = base;
  let copyNumber = 2;
  while (await prisma.course.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${copyNumber}`;
    copyNumber += 1;
  }
  return candidate;
}

export type CmsCourseCloneOptions = {
  targetLevelCode?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  asTemplate?: boolean;
};

export type CmsCourseMoveInput = {
  levelCode?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  categorySlug?: string;
  /** Omit to keep links in the same level; null intentionally clears them. */
  primaryNodeId?: string | null;
};

export async function duplicateCmsCourse(actorId: string, courseId: string, options: CmsCourseCloneOptions = {}) {
  const source = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      curriculumLinks: { select: { nodeId: true, relation: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              blocks: {
                orderBy: { order: "asc" },
                include: { exercises: { orderBy: { order: "asc" } } },
              },
            },
          },
        },
      },
    },
  });
  if (!source) throw new Error("Course not found.");

  const targetLevel = options.targetLevelCode
    ? await prisma.languageLevel.findUnique({ where: { code: options.targetLevelCode } })
    : await prisma.languageLevel.findUnique({ where: { id: source.levelId } });
  if (!targetLevel) throw new Error("Target language level not found.");

  const [slug, lastCourse] = await Promise.all([
    nextCopiedSlug(source.slug),
    prisma.course.findFirst({ where: { levelId: targetLevel.id, categoryId: source.categoryId }, orderBy: { order: "desc" }, select: { order: true } }),
  ]);

  const created = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        levelId: targetLevel.id,
        categoryId: source.categoryId,
        slug,
        title: `${source.title} (${options.asTemplate ? "template" : "copy"})`,
        shortDescription: source.shortDescription,
        fullDescription: source.fullDescription,
        coverImage: source.coverImage,
        trailerVideoUrl: source.trailerVideoUrl,
        order: (lastCourse?.order ?? 0) + 1,
        language: source.language,
        estimatedDuration: source.estimatedDuration,
        lessonCount: source.lessonCount,
        difficulty: source.difficulty,
        isPublished: false,
        isTemplate: options.asTemplate ?? false,
        contentStatus: "DRAFT",
        isFeatured: false,
        courseType: source.courseType,
        accessMode: source.accessMode,
        isVisibleInCatalog: source.isVisibleInCatalog,
        isVisibleInSearch: source.isVisibleInSearch,
        isVisibleOnHomepage: source.isVisibleOnHomepage,
        isVisibleInRecommendations: source.isVisibleInRecommendations,
        isVisibleInLevelBlock: source.isVisibleInLevelBlock,
        isVisibleInAcademy: source.isVisibleInAcademy,
        isVisibleInStudentDashboard: source.isVisibleInStudentDashboard,
        firstFreeLessonCount: source.firstFreeLessonCount,
        priceAmount: source.priceAmount,
        priceCurrency: source.priceCurrency,
        learningOutcomes: asInputJson(source.learningOutcomes),
        prerequisites: asInputJson(source.prerequisites),
        accessPlan: source.accessPlan,
        legacyLevel: legacyLevelFor(targetLevel.code),
        academySlug: source.academySlug,
        pathSlug: source.pathSlug,
        stageSlug: source.stageSlug,
        instructorId: source.instructorId,
        createdById: actorId,
        updatedById: actorId,
        ...(targetLevel.id === source.levelId && source.curriculumLinks.length
          ? { curriculumLinks: { create: source.curriculumLinks.map((link) => ({ nodeId: link.nodeId, relation: link.relation })) } }
          : {}),
        modules: {
          create: source.modules.map((module) => ({
            title: module.title,
            description: module.description,
            order: module.order,
            isRequired: module.isRequired,
            requiresSequentialCompletion: module.requiresSequentialCompletion,
            unlockAfterModuleId: null,
            requiredCompletionPercent: module.requiredCompletionPercent,
            isPublished: false,
            contentStatus: "DRAFT",
            lessons: {
              create: module.lessons.map((lesson) => ({
                slug: `${lesson.slug}-${slug}`.slice(0, 160),
                prerequisiteLessonId: null,
                requiredPrerequisiteCompletion: lesson.requiredPrerequisiteCompletion,
                autoUnlockNextLesson: lesson.autoUnlockNextLesson,
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
          })),
        },
      },
    });
    await tx.cmsContentVersion.create({
      data: {
        entityType: "COURSE",
        entityId: course.id,
        version: 1,
        action: "DUPLICATED",
        snapshot: { sourceCourseId: source.id, targetLevel: targetLevel.code, isTemplate: options.asTemplate ?? false },
        actorId,
      },
    });
    await tx.contentAuditLog.create({ data: { actorId, action: options.asTemplate ? "CMS_COURSE_TEMPLATE_CREATED" : "CMS_COURSE_DUPLICATED", entityType: "Course", entityId: course.id, metadata: { sourceCourseId: source.id, targetLevel: targetLevel.code, isTemplate: options.asTemplate ?? false } } });
    return course;
  });

  return created;
}

/** A template is a fully cloned draft course, deliberately without learner data. */
export function createCmsCourseTemplate(actorId: string, courseId: string) {
  return duplicateCmsCourse(actorId, courseId, { asTemplate: true });
}

/**
 * Moves a course as one operation. A curriculum node must belong to the new
 * level, and changing a level without a replacement node clears stale links.
 */
export async function moveCmsCourse(actorId: string, courseId: string, input: CmsCourseMoveInput) {
  const source = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, levelId: true, categoryId: true, order: true, curriculumLinks: { select: { nodeId: true } } },
  });
  if (!source) throw new Error("Course not found.");

  const [targetLevel, targetCategory] = await Promise.all([
    input.levelCode
      ? prisma.languageLevel.findUnique({ where: { code: input.levelCode } })
      : prisma.languageLevel.findUnique({ where: { id: source.levelId } }),
    input.categorySlug
      ? prisma.courseCategory.findUnique({ where: { slug: input.categorySlug } })
      : prisma.courseCategory.findUnique({ where: { id: source.categoryId } }),
  ]);
  if (!targetLevel) throw new Error("Target language level not found.");
  if (!targetCategory) throw new Error("Target course category not found.");

  const levelChanged = targetLevel.id !== source.levelId;
  const categoryChanged = targetCategory.id !== source.categoryId;
  const replaceLinks = levelChanged || input.primaryNodeId !== undefined;
  const targetNode = input.primaryNodeId
    ? await prisma.curriculumNode.findUnique({ where: { id: input.primaryNodeId }, select: { id: true, levelId: true, title: true } })
    : null;
  if (targetNode && targetNode.levelId !== targetLevel.id) {
    throw new Error("The selected curriculum node belongs to a different level.");
  }

  const lastCourse = levelChanged || categoryChanged
    ? await prisma.course.findFirst({ where: { levelId: targetLevel.id, categoryId: targetCategory.id, id: { not: source.id } }, orderBy: { order: "desc" }, select: { order: true } })
    : null;
  const nextOrder = lastCourse ? lastCourse.order + 1 : source.order;

  return prisma.$transaction(async (tx) => {
    const moved = await tx.course.update({
      where: { id: source.id },
      data: {
        levelId: targetLevel.id,
        categoryId: targetCategory.id,
        legacyLevel: legacyLevelFor(targetLevel.code),
        order: nextOrder,
        updatedById: actorId,
        ...(replaceLinks ? {
          curriculumLinks: {
            deleteMany: {},
            ...(targetNode ? { create: { nodeId: targetNode.id, relation: "PRIMARY" } } : {}),
          },
        } : {}),
      },
    });
    const latestVersion = await tx.cmsContentVersion.aggregate({ where: { entityType: "COURSE", entityId: moved.id }, _max: { version: true } });
    await tx.cmsContentVersion.create({
      data: {
        entityType: "COURSE",
        entityId: moved.id,
        version: (latestVersion._max.version ?? 0) + 1,
        action: "UPDATED",
        snapshot: {
          levelCode: targetLevel.code,
          categorySlug: targetCategory.slug,
          primaryNodeId: targetNode?.id ?? null,
          previousNodeIds: source.curriculumLinks.map(({ nodeId }) => nodeId),
        },
        actorId,
      },
    });
    await tx.contentAuditLog.create({
      data: {
        actorId,
        action: "CMS_COURSE_MOVED",
        entityType: "Course",
        entityId: moved.id,
        metadata: { levelCode: targetLevel.code, categorySlug: targetCategory.slug, primaryNodeId: targetNode?.id ?? null },
      },
    });
    return moved;
  });
}

/** A concise impact report shown before destructive-looking CMS operations. */
export async function getCmsCourseRelations(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      curriculumLinks: { include: { node: { select: { id: true, title: true, type: true, level: { select: { code: true } } } } } },
      modules: { orderBy: { order: "asc" }, select: { id: true, title: true, lessons: { orderBy: { order: "asc" }, select: { id: true, title: true } } } },
      commerceProducts: { select: { id: true, title: true, code: true, isActive: true } },
      studentAssignments: { take: 20, orderBy: { createdAt: "desc" }, select: { id: true, status: true, teacher: { select: { name: true, email: true } }, student: { select: { name: true, email: true } } } },
      groupAssignments: { take: 20, orderBy: { createdAt: "desc" }, select: { id: true, status: true, group: { select: { name: true } }, assignedBy: { select: { name: true, email: true } } } },
      _count: { select: { studentCourses: true, students: true, studentAssignments: true, groupAssignments: true, coursePurchases: true, entitlements: true, commerceProducts: true } },
    },
  });
  if (!course) throw new Error("Course not found.");
  return course;
}

export type CmsCourseDeletionImpact = {
  courseId: string;
  title: string;
  wasEverPublished: boolean;
  studentsAdded: number;
  legacyEnrolments: number;
  progressRecords: number;
  activeProgressions: number;
  teacherAssignments: number;
  purchases: number;
  entitlements: number;
  analyticsRecords: number;
  learnerVocabularyRecords: number;
  commerceProducts: number;
  certificates: number;
  canDelete: boolean;
  blockers: string[];
};

export class CmsCourseDeletionBlockedError extends Error {
  readonly impact: CmsCourseDeletionImpact;

  constructor(impact: CmsCourseDeletionImpact) {
    super("This course has learner, commercial, publication or analytics history and must be archived instead.");
    this.name = "CmsCourseDeletionBlockedError";
    this.impact = impact;
  }
}

/** Central rule so the UI and DELETE endpoint cannot disagree about safety. */
export function canPhysicallyDeleteCmsCourse(impact: Omit<CmsCourseDeletionImpact, "canDelete" | "blockers">) {
  return !impact.wasEverPublished
    && impact.studentsAdded === 0
    && impact.legacyEnrolments === 0
    && impact.progressRecords === 0
    && impact.teacherAssignments === 0
    && impact.purchases === 0
    && impact.entitlements === 0
    && impact.analyticsRecords === 0
    && impact.learnerVocabularyRecords === 0
    && impact.commerceProducts === 0
    && impact.certificates === 0;
}

/**
 * Gives the owner a complete, non-sensitive impact summary before deleting.
 * There is currently no Certificate model; its value remains explicit so a
 * future certificate relation must be included in this contract.
 */
type CourseDeletionClient = Prisma.TransactionClient | typeof prisma;

async function inspectCmsCourseDeletionImpact(db: CourseDeletionClient, courseId: string): Promise<CmsCourseDeletionImpact> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      isPublished: true,
      contentStatus: true,
      publishedAt: true,
      _count: { select: { studentCourses: true, students: true, studentAssignments: true, groupAssignments: true, assignments: true, coursePurchases: true, entitlements: true, commerceProducts: true } },
    },
  });
  if (!course) throw new Error("Course not found.");

  const lessonFilter = { module: { courseId: course.id } };
  const exerciseFilter = { lessonBlock: { lesson: lessonFilter } };
  const [publishedVersionCount, publishAuditCount, progressRecords, activeProgressions, exerciseAttempts, mistakes, learningActivities, learningSessions, userWords, vocabularySessions] = await Promise.all([
    db.cmsContentVersion.count({ where: { entityType: "COURSE", entityId: course.id, action: "PUBLISHED" } }),
    db.contentAuditLog.count({ where: { entityId: course.id, action: "CMS_PUBLISH", entityType: { in: ["COURSE", "Course"] } } }),
    db.lessonProgress.count({ where: { lesson: lessonFilter } }),
    db.lessonProgress.count({ where: { status: "STARTED", lesson: lessonFilter } }),
    db.exerciseAttempt.count({ where: { exercise: exerciseFilter } }),
    db.userMistake.count({ where: { OR: [{ lesson: lessonFilter }, { exercise: exerciseFilter }] } }),
    db.learningActivity.count({ where: { OR: [{ courseId: course.id }, { lesson: lessonFilter }, { exercise: exerciseFilter }] } }),
    db.learningSession.count({ where: { OR: [{ courseId: course.id }, { lesson: lessonFilter }] } }),
    db.userWord.count({ where: { sourceLesson: lessonFilter } }),
    db.vocabularyTrainingSession.count({ where: { lesson: lessonFilter } }),
  ]);

  const wasEverPublished = course.isPublished || course.contentStatus === "PUBLISHED" || course.publishedAt !== null || publishedVersionCount > 0 || publishAuditCount > 0;
  const base = {
    courseId: course.id,
    title: course.title,
    wasEverPublished,
    studentsAdded: course._count.studentCourses,
    legacyEnrolments: course._count.students,
    progressRecords,
    activeProgressions,
    teacherAssignments: course._count.studentAssignments + course._count.groupAssignments + course._count.assignments,
    purchases: course._count.coursePurchases,
    entitlements: course._count.entitlements,
    analyticsRecords: exerciseAttempts + mistakes + learningActivities + learningSessions,
    learnerVocabularyRecords: userWords + vocabularySessions,
    commerceProducts: course._count.commerceProducts,
    // No certificate entity exists in the current schema. This is kept in the
    // contract rather than silently omitted from a deletion decision.
    certificates: 0,
  };
  const blockers = [
    ...(base.wasEverPublished ? ["The course has been published before."] : []),
    ...(base.studentsAdded ? [`Course added by ${base.studentsAdded} student(s).`] : []),
    ...(base.legacyEnrolments ? [`Course has ${base.legacyEnrolments} legacy enrolment(s).`] : []),
    ...(base.progressRecords ? [`There are ${base.progressRecords} progress record(s).`] : []),
    ...(base.teacherAssignments ? [`There are ${base.teacherAssignments} teacher assignment(s).`] : []),
    ...(base.purchases ? [`There are ${base.purchases} purchase record(s).`] : []),
    ...(base.entitlements ? [`There are ${base.entitlements} access entitlement(s).`] : []),
    ...(base.analyticsRecords ? [`There are ${base.analyticsRecords} analytics record(s).`] : []),
    ...(base.learnerVocabularyRecords ? [`There are ${base.learnerVocabularyRecords} learner vocabulary record(s).`] : []),
    ...(base.commerceProducts ? [`There are ${base.commerceProducts} linked commerce product(s).`] : []),
    ...(base.certificates ? [`There are ${base.certificates} linked certificate(s).`] : []),
  ];
  return { ...base, canDelete: canPhysicallyDeleteCmsCourse(base), blockers };
}

export function getCmsCourseDeletionImpact(courseId: string) {
  return inspectCmsCourseDeletionImpact(prisma, courseId);
}

/** Permanently removes only a never-published course without any historical impact. */
export async function deleteCmsCoursePermanently(actorId: string, courseId: string) {
  return prisma.$transaction(async (tx) => {
    const impact = await inspectCmsCourseDeletionImpact(tx, courseId);
    if (!impact.canDelete) throw new CmsCourseDeletionBlockedError(impact);
    const structure = await tx.course.findUnique({
      where: { id: courseId },
      select: { slug: true, modules: { select: { id: true, lessons: { select: { id: true, blocks: { select: { id: true, exercises: { select: { id: true } } } } } } } } },
    });
    if (!structure) throw new Error("Course not found.");
    const moduleIds = structure.modules.map(({ id }) => id);
    const lessonIds = structure.modules.flatMap((module) => module.lessons.map(({ id }) => id));
    const blockIds = structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.blocks.map(({ id }) => id)));
    const exerciseIds = structure.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.blocks.flatMap((block) => block.exercises.map(({ id }) => id))));
    const revisionTargets = [
      { entityType: "COURSE" as const, ids: [courseId] },
      { entityType: "COURSE_MODULE" as const, ids: moduleIds },
      { entityType: "LESSON" as const, ids: lessonIds },
      { entityType: "LESSON_BLOCK" as const, ids: blockIds },
      { entityType: "EXERCISE" as const, ids: exerciseIds },
    ].filter(({ ids }) => ids.length);
    const auditEntityTypes = ["Course", "COURSE", "CourseModule", "COURSE_MODULE", "Lesson", "LESSON", "LessonBlock", "LESSON_BLOCK", "Exercise", "EXERCISE"];
    const allIds = [courseId, ...moduleIds, ...lessonIds, ...blockIds, ...exerciseIds];
    await tx.cmsContentVersion.deleteMany({ where: { OR: revisionTargets.map(({ entityType, ids }) => ({ entityType, entityId: { in: ids } })) } });
    await tx.contentAuditLog.deleteMany({ where: { entityId: { in: allIds }, entityType: { in: auditEntityTypes } } });
    await tx.course.delete({ where: { id: courseId } });
    await tx.contentAuditLog.create({ data: { actorId, action: "CMS_COURSE_PERMANENTLY_DELETED", entityType: "CourseDeletion", entityId: courseId, metadata: { slug: structure.slug, reason: "Never published and no learner, commercial or analytics history." } } });
    return { courseId, deleted: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export type CmsCourseBulkUpdateInput = {
  courseIds: string[];
  levelCode?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  categorySlug?: string;
  primaryNodeId?: string | null;
  accessMode?: "FREE" | "SUBSCRIPTION" | "ONE_TIME_PURCHASE" | "TEACHER_ASSIGNMENT" | "HIDDEN";
  isVisibleInCatalog?: boolean;
  isVisibleInSearch?: boolean;
  isVisibleOnHomepage?: boolean;
  isVisibleInRecommendations?: boolean;
  isVisibleInLevelBlock?: boolean;
  isVisibleInAcademy?: boolean;
  isVisibleInStudentDashboard?: boolean;
};

const bulkEditableFields = [
  "accessMode",
  "isVisibleInCatalog",
  "isVisibleInSearch",
  "isVisibleOnHomepage",
  "isVisibleInRecommendations",
  "isVisibleInLevelBlock",
  "isVisibleInAcademy",
  "isVisibleInStudentDashboard",
] as const;

/** Applies only editorial metadata; it never touches enrolments, purchases or progress. */
export async function bulkUpdateCmsCourses(actorId: string, input: CmsCourseBulkUpdateInput) {
  const results = await Promise.allSettled(input.courseIds.map(async (courseId) => {
    const hasRelocation = input.levelCode !== undefined || input.categorySlug !== undefined || input.primaryNodeId !== undefined;
    if (hasRelocation) {
      await moveCmsCourse(actorId, courseId, {
        ...(input.levelCode ? { levelCode: input.levelCode } : {}),
        ...(input.categorySlug ? { categorySlug: input.categorySlug } : {}),
        ...(input.primaryNodeId !== undefined ? { primaryNodeId: input.primaryNodeId } : {}),
      });
    }

    const data = Object.fromEntries(
      bulkEditableFields
        .filter((key) => input[key] !== undefined)
        .map((key) => [key, input[key]]),
    );
    if (Object.keys(data).length) {
      const updated = await prisma.course.update({ where: { id: courseId }, data: { ...data, updatedById: actorId } });
      await prisma.$transaction(async (tx) => {
        const latestVersion = await tx.cmsContentVersion.aggregate({ where: { entityType: "COURSE", entityId: courseId }, _max: { version: true } });
        await tx.cmsContentVersion.create({ data: { entityType: "COURSE", entityId: courseId, version: (latestVersion._max.version ?? 0) + 1, action: "UPDATED", snapshot: updated, actorId } });
        await tx.contentAuditLog.create({ data: { actorId, action: "CMS_COURSE_BULK_UPDATED", entityType: "Course", entityId: courseId, metadata: data as Prisma.InputJsonValue } });
      });
    }
    return courseId;
  }));

  const failures = results.flatMap((result, index) => result.status === "rejected"
    ? [{ courseId: input.courseIds[index], error: result.reason instanceof Error ? result.reason.message : "Unable to update course." }]
    : []);
  return { succeeded: results.length - failures.length, failed: failures.length, failures };
}

function assertReorderable(entityType: CmsContentEntityType): asserts entityType is CmsReorderableEntityType {
  if (!reorderableEntityTypes.includes(entityType as CmsReorderableEntityType)) throw new Error("This content type does not support ordering.");
}

async function getSiblingIds(entityType: CmsReorderableEntityType, itemId: string) {
  switch (entityType) {
    case "LANGUAGE_LEVEL": return (await prisma.languageLevel.findMany({ orderBy: { order: "asc" }, select: { id: true } })).map(({ id }) => id);
    case "CURRICULUM_NODE": {
      const item = await prisma.curriculumNode.findUnique({ where: { id: itemId }, select: { levelId: true, parentId: true, type: true } });
      if (!item) return null;
      return (await prisma.curriculumNode.findMany({ where: { levelId: item.levelId, parentId: item.parentId, type: item.type }, orderBy: { order: "asc" }, select: { id: true } })).map(({ id }) => id);
    }
    case "COURSE_CATEGORY": return (await prisma.courseCategory.findMany({ orderBy: { order: "asc" }, select: { id: true } })).map(({ id }) => id);
    case "GRAMMAR_TOPIC": {
      const item = await prisma.grammarTopic.findUnique({ where: { id: itemId }, select: { cefrLevel: true } });
      if (!item) return null;
      return (await prisma.grammarTopic.findMany({ where: { cefrLevel: item.cefrLevel }, orderBy: { order: "asc" }, select: { id: true } })).map(({ id }) => id);
    }
    case "COURSE": {
      const item = await prisma.course.findUnique({ where: { id: itemId }, select: { levelId: true, categoryId: true } });
      if (!item) return null;
      return (await prisma.course.findMany({ where: { levelId: item.levelId, categoryId: item.categoryId }, orderBy: { order: "asc" }, select: { id: true } })).map(({ id }) => id);
    }
    case "COURSE_MODULE": {
      const item = await prisma.courseModule.findUnique({ where: { id: itemId }, select: { courseId: true } });
      if (!item) return null;
      return (await prisma.courseModule.findMany({ where: { courseId: item.courseId }, orderBy: { order: "asc" }, select: { id: true } })).map(({ id }) => id);
    }
    case "LESSON": {
      const item = await prisma.lesson.findUnique({ where: { id: itemId }, select: { moduleId: true } });
      if (!item) return null;
      return (await prisma.lesson.findMany({ where: { moduleId: item.moduleId }, orderBy: { order: "asc" }, select: { id: true } })).map(({ id }) => id);
    }
    case "LESSON_BLOCK": {
      const item = await prisma.lessonBlock.findUnique({ where: { id: itemId }, select: { lessonId: true } });
      if (!item) return null;
      return (await prisma.lessonBlock.findMany({ where: { lessonId: item.lessonId }, orderBy: { order: "asc" }, select: { id: true } })).map(({ id }) => id);
    }
    case "EXERCISE": {
      const item = await prisma.exercise.findUnique({ where: { id: itemId }, select: { lessonBlockId: true } });
      if (!item) return null;
      return (await prisma.exercise.findMany({ where: { lessonBlockId: item.lessonBlockId }, orderBy: { order: "asc" }, select: { id: true } })).map(({ id }) => id);
    }
  }
}

async function shiftOrderSpace(tx: Prisma.TransactionClient, entityType: CmsReorderableEntityType, ids: string[]) {
  const shift = ids.length + 10_000;
  switch (entityType) {
    case "LANGUAGE_LEVEL": return tx.languageLevel.updateMany({ where: { id: { in: ids } }, data: { order: { increment: shift } } });
    case "CURRICULUM_NODE": return tx.curriculumNode.updateMany({ where: { id: { in: ids } }, data: { order: { increment: shift } } });
    case "COURSE_CATEGORY": return tx.courseCategory.updateMany({ where: { id: { in: ids } }, data: { order: { increment: shift } } });
    case "COURSE": return tx.course.updateMany({ where: { id: { in: ids } }, data: { order: { increment: shift } } });
    case "COURSE_MODULE": return tx.courseModule.updateMany({ where: { id: { in: ids } }, data: { order: { increment: shift } } });
    case "LESSON": return tx.lesson.updateMany({ where: { id: { in: ids } }, data: { order: { increment: shift } } });
    case "LESSON_BLOCK": return tx.lessonBlock.updateMany({ where: { id: { in: ids } }, data: { order: { increment: shift } } });
    case "EXERCISE": return tx.exercise.updateMany({ where: { id: { in: ids } }, data: { order: { increment: shift } } });
    case "GRAMMAR_TOPIC": return tx.grammarTopic.updateMany({ where: { id: { in: ids } }, data: { order: { increment: shift } } });
  }
}

async function setOrder(tx: Prisma.TransactionClient, entityType: CmsReorderableEntityType, id: string, order: number) {
  switch (entityType) {
    case "LANGUAGE_LEVEL": return tx.languageLevel.update({ where: { id }, data: { order } });
    case "CURRICULUM_NODE": return tx.curriculumNode.update({ where: { id }, data: { order } });
    case "COURSE_CATEGORY": return tx.courseCategory.update({ where: { id }, data: { order } });
    case "COURSE": return tx.course.update({ where: { id }, data: { order } });
    case "COURSE_MODULE": return tx.courseModule.update({ where: { id }, data: { order } });
    case "LESSON": return tx.lesson.update({ where: { id }, data: { order } });
    case "LESSON_BLOCK": return tx.lessonBlock.update({ where: { id }, data: { order } });
    case "EXERCISE": return tx.exercise.update({ where: { id }, data: { order } });
    case "GRAMMAR_TOPIC": return tx.grammarTopic.update({ where: { id }, data: { order } });
  }
}

export async function reorderCmsContent(actorId: string, entityType: CmsContentEntityType, orderedIds: string[]) {
  assertReorderable(entityType);
  if (!orderedIds.length || new Set(orderedIds).size !== orderedIds.length) throw new Error("The requested order contains duplicate content IDs.");
  const siblingIds = await getSiblingIds(entityType, orderedIds[0]);
  if (!siblingIds || siblingIds.length !== orderedIds.length || siblingIds.some((id) => !orderedIds.includes(id))) throw new Error("Order must contain every item from the same content group exactly once.");

  // The generic reorder endpoint is also used by older CMS screens, so it must
  // preserve lesson-prerequisite safety just like the dedicated lesson board.
  if (entityType === "LESSON") {
    const lessons = await prisma.lesson.findMany({ where: { id: { in: siblingIds } }, select: { id: true, prerequisiteLessonId: true } });
    const positions = new Map(orderedIds.map((id, index) => [id, index]));
    if (lessons.some((lesson) => lesson.prerequisiteLessonId && (positions.get(lesson.prerequisiteLessonId) === undefined || positions.get(lesson.prerequisiteLessonId)! >= positions.get(lesson.id)!))) {
      throw new Error("A lesson must remain after its prerequisite lesson.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await shiftOrderSpace(tx, entityType, siblingIds);
    for (const [index, id] of orderedIds.entries()) await setOrder(tx, entityType, id, index + 1);
    await tx.contentAuditLog.create({ data: { actorId, action: "CMS_REORDERED", entityType, entityId: orderedIds[0], metadata: { orderedIds } } });
  });
}
