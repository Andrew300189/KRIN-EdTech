import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import type { CmsCourseImportDocument } from "@/modules/cms/schemas/content-management.schemas";

function optionalJson(value: Prisma.JsonValue | null) {
  return value === null ? undefined : value;
}

function inputJson(value: unknown) {
  return value === undefined ? undefined : value as Prisma.InputJsonValue;
}

function nullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function legacyLevelFor(code: "A1" | "A2" | "B1" | "B2" | "C1" | "C2") {
  if (code === "A1" || code === "A2") return "BEGINNER" as const;
  if (code === "B1" || code === "B2") return "INTERMEDIATE" as const;
  return "ADVANCED" as const;
}

async function nextImportedSlug(sourceSlug: string) {
  const base = sourceSlug || "imported-course";
  let candidate = base;
  let suffix = 2;
  while (await prisma.course.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`.slice(0, 160);
    suffix += 1;
  }
  return candidate;
}

export async function exportCmsCourse(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      level: { select: { code: true } },
      category: { select: { slug: true } },
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
  if (!course) return null;
  return {
    format: "krin-course",
    version: 1,
    exportedAt: new Date().toISOString(),
    course: {
      levelCode: course.level.code,
      categorySlug: course.category.slug,
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription,
      fullDescription: course.fullDescription ?? undefined,
      coverImage: course.coverImage ?? undefined,
      trailerVideoUrl: course.trailerVideoUrl ?? undefined,
      language: course.language,
      estimatedDuration: course.estimatedDuration,
      difficulty: course.difficulty ?? undefined,
      isFeatured: course.isFeatured,
      firstFreeLessonCount: course.firstFreeLessonCount,
      priceAmount: course.priceAmount ?? undefined,
      priceCurrency: course.priceCurrency,
      learningOutcomes: optionalJson(course.learningOutcomes),
      prerequisites: optionalJson(course.prerequisites),
      accessPlan: course.accessPlan,
      academySlug: course.academySlug,
      pathSlug: course.pathSlug,
      stageSlug: course.stageSlug,
      modules: course.modules.map((module) => ({
        title: module.title,
        description: module.description ?? undefined,
        order: module.order,
        isRequired: module.isRequired,
        requiresSequentialCompletion: module.requiresSequentialCompletion,
        requiredCompletionPercent: module.requiredCompletionPercent,
        lessons: module.lessons.map((lesson) => ({
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description ?? undefined,
          type: lesson.type,
          order: lesson.order,
          estimatedDuration: lesson.estimatedDuration,
          phraseOfTheDay: lesson.phraseOfTheDay ?? undefined,
          motivationalQuote: lesson.motivationalQuote ?? undefined,
          learningObjectives: optionalJson(lesson.learningObjectives),
          previewText: lesson.previewText ?? undefined,
          requiredPrerequisiteCompletion: lesson.requiredPrerequisiteCompletion,
          autoUnlockNextLesson: lesson.autoUnlockNextLesson,
          isFree: lesson.isFree,
          blocks: lesson.blocks.map((block) => ({
            type: block.type,
            title: block.title ?? undefined,
            content: optionalJson(block.content),
            settings: optionalJson(block.settings),
            order: block.order,
            isRequired: block.isRequired,
            exercises: block.exercises.map((exercise) => ({
              type: exercise.type,
              engineKey: exercise.engineKey,
              variantKey: exercise.variantKey ?? undefined,
              instruction: exercise.instruction,
              question: exercise.question,
              content: optionalJson(exercise.content),
              correctAnswer: exercise.correctAnswer,
              alternativeAnswers: optionalJson(exercise.alternativeAnswers),
              explanation: exercise.explanation ?? undefined,
              hint: exercise.hint ?? undefined,
              hintsEnabled: exercise.hintsEnabled,
              difficulty: exercise.difficulty,
              basePoints: exercise.basePoints,
              timeLimitSeconds: exercise.timeLimitSeconds ?? undefined,
              solutionCost: exercise.solutionCost,
              allowInstantCheck: exercise.allowInstantCheck,
              allowExtraExercise: exercise.allowExtraExercise,
            })),
          })),
        })),
      })),
    },
  };
}

/** Imports the documented, versioned course transfer format as a complete draft tree. */
export async function importCmsCourse(actorId: string, document: CmsCourseImportDocument) {
  const input = document.course;
  const [level, category, slug] = await Promise.all([
    prisma.languageLevel.findUnique({ where: { code: input.levelCode } }),
    prisma.courseCategory.findUnique({ where: { slug: input.categorySlug } }),
    nextImportedSlug(input.slug ?? "imported-course"),
  ]);
  if (!level) throw new Error("The import references an unknown language level.");
  if (!category) throw new Error("The import references an unknown course category.");
  const lastCourse = await prisma.course.findFirst({ where: { levelId: level.id, categoryId: category.id }, orderBy: { order: "desc" }, select: { order: true } });
  const lessonCount = input.modules.reduce((total, module) => total + module.lessons.length, 0);

  return prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        levelId: level.id,
        categoryId: category.id,
        slug,
        title: input.title,
        shortDescription: input.shortDescription,
        fullDescription: nullable(input.fullDescription),
        coverImage: nullable(input.coverImage),
        trailerVideoUrl: nullable(input.trailerVideoUrl),
        order: (lastCourse?.order ?? 0) + 1,
        language: input.language,
        estimatedDuration: input.estimatedDuration,
        lessonCount,
        difficulty: nullable(input.difficulty),
        isPublished: false,
        contentStatus: "DRAFT",
        isFeatured: input.isFeatured,
        firstFreeLessonCount: input.firstFreeLessonCount,
        priceAmount: input.priceAmount,
        priceCurrency: input.priceCurrency.toUpperCase(),
        learningOutcomes: inputJson(input.learningOutcomes),
        prerequisites: inputJson(input.prerequisites),
        accessPlan: input.accessPlan,
        legacyLevel: legacyLevelFor(input.levelCode),
        academySlug: input.academySlug,
        pathSlug: input.pathSlug,
        stageSlug: input.stageSlug,
        instructorId: actorId,
        createdById: actorId,
        updatedById: actorId,
        modules: {
          create: input.modules.map((module) => ({
            title: module.title,
            description: nullable(module.description),
            order: module.order,
            isRequired: module.isRequired,
            requiresSequentialCompletion: module.requiresSequentialCompletion,
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
                description: nullable(lesson.description),
                type: lesson.type,
                order: lesson.order,
                estimatedDuration: lesson.estimatedDuration,
                phraseOfTheDay: nullable(lesson.phraseOfTheDay),
                motivationalQuote: nullable(lesson.motivationalQuote),
                learningObjectives: inputJson(lesson.learningObjectives),
                previewText: nullable(lesson.previewText),
                isPublished: false,
                contentStatus: "DRAFT",
                isFree: lesson.isFree,
                blocks: {
                  create: lesson.blocks.map((block) => ({
                    type: block.type,
                    title: nullable(block.title),
                    content: inputJson(block.content),
                    settings: inputJson(block.settings),
                    order: block.order,
                    isRequired: block.isRequired,
                    contentStatus: "DRAFT",
                    exercises: {
                      create: block.exercises.map((exercise, index) => ({
                        type: exercise.type,
                        engineKey: exercise.engineKey,
                        variantKey: nullable(exercise.variantKey),
                        instruction: exercise.instruction,
                        question: exercise.question,
                        content: inputJson(exercise.content),
                        correctAnswer: exercise.correctAnswer as Prisma.InputJsonValue,
                        alternativeAnswers: inputJson(exercise.alternativeAnswers),
                        explanation: nullable(exercise.explanation),
                        hint: nullable(exercise.hint),
                        hintsEnabled: exercise.hintsEnabled,
                        difficulty: exercise.difficulty,
                        basePoints: exercise.basePoints,
                        timeLimitSeconds: exercise.timeLimitSeconds,
                        solutionCost: exercise.solutionCost,
                        allowInstantCheck: exercise.allowInstantCheck,
                        allowExtraExercise: exercise.allowExtraExercise,
                        order: index + 1,
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
    await tx.cmsContentVersion.create({ data: { entityType: "COURSE", entityId: course.id, version: 1, action: "IMPORTED", snapshot: { format: document.format, version: document.version }, actorId } });
    await tx.contentAuditLog.create({ data: { actorId, action: "CMS_COURSE_IMPORTED", entityType: "Course", entityId: course.id, metadata: { format: document.format, version: document.version } } });
    return course;
  });
}
