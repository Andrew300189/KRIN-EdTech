import { randomUUID } from "crypto";
import { Prisma, type SubscriptionPlan } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import {
  addUserWordSchema,
  type CreateCourseCategoryInput,
  type CreateCourseInput,
  type CreateExerciseInput,
  type CreateLessonBlockInput,
  type CreateLessonInput,
  type CreateModuleInput,
  createGrammarTopicSchema,
  createWordSchema,
  type JsonValue,
  saveLessonProgressSchema,
  saveHomeworkSchema,
  submitExerciseSchema,
} from "@/modules/courses/schemas/content.schemas";
import { answerMatches } from "@/modules/courses/utils/exercise-evaluation";
import { calculateLessonResult } from "@/modules/lessons/utils/calculate-lesson-result";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";
import { normalizeWord } from "@/modules/vocabulary/utils/normalize-word";
import { recordExerciseResult, recordLessonCompletion } from "@/modules/motivation/services/motivation.service";
import { notificationService } from "@/modules/communications/services/notification.service";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || "course";
}

function nullableText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toLegacyLevel(code: CreateCourseInput["levelCode"]) {
  if (code === "A1" || code === "A2") return "BEGINNER" as const;
  if (code === "B1" || code === "B2") return "INTERMEDIATE" as const;
  return "ADVANCED" as const;
}

function toPrismaJson(value: JsonValue | undefined) {
  if (value === undefined) return undefined;
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

async function nextCourseSlug(candidate: string) {
  const existing = await prisma.course.findUnique({
    where: { slug: candidate },
    select: { id: true },
  });
  return existing ? `${candidate}-${randomUUID().slice(0, 8)}` : candidate;
}

async function nextLessonSlug(candidate: string) {
  const existing = await prisma.lesson.findUnique({
    where: { slug: candidate },
    select: { id: true },
  });
  return existing ? `${candidate}-${randomUUID().slice(0, 8)}` : candidate;
}

async function nextOrder(
  findLast: () => Promise<{ order: number } | null>,
  requested?: number,
) {
  if (requested) return requested;
  const last = await findLast();
  return (last?.order ?? 0) + 1;
}

export async function listPublishedLanguageLevels() {
  return prisma.languageLevel.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: { _count: { select: { courses: { where: { isPublished: true, category: { isPublished: true } } } } } },
  });
}

export async function getPublishedLevelWithCourses(code: string) {
  return prisma.languageLevel.findFirst({
    where: { code: code.toUpperCase() as never, isPublished: true },
    include: {
      courses: {
        where: { isPublished: true, category: { isPublished: true } },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        select: {
          slug: true,
          title: true,
          shortDescription: true,
          coverImage: true,
          estimatedDuration: true,
          lessonCount: true,
          difficulty: true,
          accessPlan: true,
          category: { select: { slug: true, title: true, icon: true } },
        },
      },
    },
  });
}

export type CourseCatalogFilters = {
  query?: string;
  levelCode?: string;
  categorySlug?: string;
  accessPlan?: "FREE" | "PREMIUM" | "CORPORATE";
  sort?: "newest" | "title" | "duration";
  page?: number;
  pageSize?: number;
};

function publishedCourseWhere(filters: CourseCatalogFilters): Prisma.CourseWhereInput {
  const query = filters.query?.trim();
  return {
    isPublished: true,
    level: { isPublished: true, ...(filters.levelCode ? { code: filters.levelCode.toUpperCase() as never } : {}) },
    ...(filters.categorySlug ? { category: { slug: filters.categorySlug, isPublished: true } } : { category: { isPublished: true } }),
    ...(filters.accessPlan ? { accessPlan: filters.accessPlan } : {}),
    ...(query ? {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { shortDescription: { contains: query, mode: "insensitive" } },
        { category: { title: { contains: query, mode: "insensitive" } } },
      ],
    } : {}),
  };
}

export async function listPublishedCourseCategories() {
  return prisma.courseCategory.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { courses: { where: { isPublished: true, level: { isPublished: true } } } } },
    },
  });
}

export async function listManagedCourseCategories() {
  return prisma.courseCategory.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { courses: true } } },
  });
}

export async function createCourseCategory(actorId: string, input: CreateCourseCategoryInput) {
  const order = await nextOrder(
    () => prisma.courseCategory.findFirst({ orderBy: { order: "desc" }, select: { order: true } }),
    input.order,
  );
  const category = await prisma.courseCategory.create({
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description?.trim() || "",
      icon: nullableText(input.icon),
      coverImage: nullableText(input.coverImage),
      order,
      isPublished: input.isPublished,
    },
  });
  await writeContentAudit(actorId, "CREATE", "CourseCategory", category.id, { slug: category.slug });
  return category;
}

export async function updateCourseCategory(actorId: string, categoryId: string, input: Partial<CreateCourseCategoryInput>) {
  const category = await prisma.courseCategory.update({
    where: { id: categoryId },
    data: {
      ...(input.slug ? { slug: input.slug } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.icon !== undefined ? { icon: nullableText(input.icon) } : {}),
      ...(input.coverImage !== undefined ? { coverImage: nullableText(input.coverImage) } : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
    },
  });
  await writeContentAudit(actorId, "UPDATE", "CourseCategory", category.id, { slug: category.slug });
  return category;
}

export async function getPublishedCourseCategoryBySlug(slug: string) {
  return prisma.courseCategory.findFirst({
    where: { slug, isPublished: true },
    include: {
      courses: {
        where: { isPublished: true, level: { isPublished: true } },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        include: { level: { select: { code: true, title: true } } },
      },
    },
  });
}

export async function listPublishedCourses(filters: CourseCatalogFilters = {}) {
  const orderBy = filters.sort === "title"
    ? [{ title: "asc" as const }]
    : filters.sort === "duration"
      ? [{ estimatedDuration: "asc" as const }, { title: "asc" as const }]
      : [{ isFeatured: "desc" as const }, { createdAt: "desc" as const }];

  return prisma.course.findMany({
    where: publishedCourseWhere(filters),
    orderBy,
    skip: Math.max(0, ((filters.page ?? 1) - 1) * (filters.pageSize ?? 12)),
    take: filters.pageSize ?? 12,
    include: {
      level: { select: { code: true, title: true } },
      category: { select: { slug: true, title: true, icon: true } },
    },
  });
}

export async function countPublishedCourses(filters: CourseCatalogFilters = {}) {
  return prisma.course.count({ where: publishedCourseWhere(filters) });
}

export async function getPublishedCourseBySlug(slug: string) {
  return prisma.course.findFirst({
    where: { slug, isPublished: true, level: { isPublished: true }, category: { isPublished: true } },
    include: {
      level: { select: { code: true, title: true } },
      category: { select: { slug: true, title: true, description: true, icon: true } },
      modules: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              estimatedDuration: true,
              isFree: true,
              order: true,
            },
          },
        },
      },
    },
  });
}

export async function getPublishedModuleById(courseSlug: string, moduleId: string) {
  return prisma.courseModule.findFirst({
    where: {
      id: moduleId,
      isPublished: true,
      course: { slug: courseSlug, isPublished: true, level: { isPublished: true }, category: { isPublished: true } },
    },
    include: {
      course: { select: { title: true, slug: true, accessPlan: true } },
      lessons: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          estimatedDuration: true,
          isFree: true,
          order: true,
        },
      },
    },
  });
}

export async function getPublishedLessonBySlug(courseSlug: string, lessonSlug: string) {
  return prisma.lesson.findFirst({
    where: {
      slug: lessonSlug,
      isPublished: true,
      module: {
        isPublished: true,
        course: { slug: courseSlug, isPublished: true, level: { isPublished: true }, category: { isPublished: true } },
      },
    },
    include: {
      module: {
        include: {
          course: { select: { title: true, slug: true, accessPlan: true } },
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            select: { slug: true, title: true, order: true },
          },
        },
      },
      blocks: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          settings: true,
          order: true,
          isRequired: true,
          exercises: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              type: true,
              instruction: true,
              question: true,
              content: true,
              explanation: true,
              hint: true,
              basePoints: true,
              timeLimitSeconds: true,
              allowInstantCheck: true,
              order: true,
            },
          },
        },
      },
      vocabulary: {
        where: { word: { isActive: true } },
        orderBy: { order: "asc" },
        select: {
          wordId: true,
          role: true,
          isRequired: true,
          word: {
            select: {
              lemma: true,
              partOfSpeech: true,
              meanings: {
                orderBy: { order: "asc" },
                take: 2,
                select: { translation: true, definition: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function listManagedCourses() {
  return prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      level: { select: { code: true, title: true } },
      category: { select: { slug: true, title: true } },
      instructor: { select: { id: true, name: true, email: true } },
      _count: { select: { modules: true } },
    },
  });
}

export async function getManagedCourse(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      level: true,
      modules: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { lessons: true } },
          lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true, isPublished: true } },
        },
      },
    },
  });
}

export async function createCourse(ownerId: string, input: CreateCourseInput) {
  const level = await prisma.languageLevel.findUnique({ where: { code: input.levelCode } });
  if (!level) throw new Error("Language level not found");
  const category = await prisma.courseCategory.findUnique({ where: { slug: input.categorySlug } });
  if (!category) throw new Error("Course category not found");

  const slug = await nextCourseSlug(input.slug ?? slugify(input.title));
  const course = await prisma.course.create({
    data: {
      levelId: level.id,
      categoryId: category.id,
      slug,
      title: input.title,
      shortDescription: input.shortDescription,
      fullDescription: nullableText(input.fullDescription),
      coverImage: nullableText(input.coverImage),
      trailerVideoUrl: nullableText(input.trailerVideoUrl),
      language: input.language,
      estimatedDuration: input.estimatedDuration,
      difficulty: nullableText(input.difficulty),
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
      firstFreeLessonCount: input.firstFreeLessonCount,
      accessPlan: input.accessPlan as SubscriptionPlan,
      priceAmount: input.priceAmount,
      priceCurrency: input.priceCurrency.toUpperCase(),
      learningOutcomes: input.learningOutcomes as Prisma.InputJsonValue,
      prerequisites: input.prerequisites as Prisma.InputJsonValue,
      legacyLevel: toLegacyLevel(input.levelCode),
      instructorId: ownerId,
    },
  });
  await writeContentAudit(ownerId, "CREATE", "Course", course.id, { slug: course.slug });
  return course;
}

export async function updateCourse(
  actorId: string,
  courseId: string,
  input: Partial<CreateCourseInput>,
) {
  const levelId = input.levelCode
    ? (await prisma.languageLevel.findUnique({ where: { code: input.levelCode } }))?.id
    : undefined;
  if (input.levelCode && !levelId) throw new Error("Language level not found");
  const categoryId = input.categorySlug
    ? (await prisma.courseCategory.findUnique({ where: { slug: input.categorySlug } }))?.id
    : undefined;
  if (input.categorySlug && !categoryId) throw new Error("Course category not found");

  const data: Prisma.CourseUpdateInput = {
    ...(levelId ? { level: { connect: { id: levelId } }, legacyLevel: toLegacyLevel(input.levelCode!) } : {}),
    ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
    ...(input.slug ? { slug: input.slug } : {}),
    ...(input.title ? { title: input.title } : {}),
    ...(input.shortDescription ? { shortDescription: input.shortDescription } : {}),
    ...(input.fullDescription !== undefined ? { fullDescription: nullableText(input.fullDescription) } : {}),
    ...(input.coverImage !== undefined ? { coverImage: nullableText(input.coverImage) } : {}),
    ...(input.trailerVideoUrl !== undefined ? { trailerVideoUrl: nullableText(input.trailerVideoUrl) } : {}),
    ...(input.language ? { language: input.language } : {}),
    ...(input.estimatedDuration !== undefined ? { estimatedDuration: input.estimatedDuration } : {}),
    ...(input.difficulty !== undefined ? { difficulty: nullableText(input.difficulty) } : {}),
    ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
    ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
    ...(input.firstFreeLessonCount !== undefined ? { firstFreeLessonCount: input.firstFreeLessonCount } : {}),
    ...(input.accessPlan ? { accessPlan: input.accessPlan as SubscriptionPlan } : {}),
    ...(input.priceAmount !== undefined ? { priceAmount: input.priceAmount } : {}),
    ...(input.priceCurrency ? { priceCurrency: input.priceCurrency.toUpperCase() } : {}),
    ...(input.learningOutcomes !== undefined ? { learningOutcomes: input.learningOutcomes as Prisma.InputJsonValue } : {}),
    ...(input.prerequisites !== undefined ? { prerequisites: input.prerequisites as Prisma.InputJsonValue } : {}),
  };
  const course = await prisma.course.update({ where: { id: courseId }, data });
  await writeContentAudit(actorId, "UPDATE", "Course", course.id, { slug: course.slug });
  return course;
}

export async function createCourseModule(
  actorId: string,
  courseId: string,
  input: CreateModuleInput,
) {
  const order = await nextOrder(
    () => prisma.courseModule.findFirst({ where: { courseId }, orderBy: { order: "desc" }, select: { order: true } }),
    input.order,
  );
  const courseModule = await prisma.courseModule.create({
    data: { courseId, title: input.title, description: nullableText(input.description), order, isPublished: input.isPublished },
  });
  await writeContentAudit(actorId, "CREATE", "CourseModule", courseModule.id, { courseId });
  return courseModule;
}

export async function createLesson(
  actorId: string,
  moduleId: string,
  input: CreateLessonInput,
) {
  const courseModule = await prisma.courseModule.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!courseModule) throw new Error("Course module not found");
  const order = await nextOrder(
    () => prisma.lesson.findFirst({ where: { moduleId }, orderBy: { order: "desc" }, select: { order: true } }),
    input.order,
  );
  const slug = await nextLessonSlug(input.slug ?? slugify(input.title));
  const lesson = await prisma.$transaction(async (tx) => {
    const created = await tx.lesson.create({
      data: {
        moduleId,
        slug,
        title: input.title,
        description: nullableText(input.description),
        type: input.type,
        order,
        estimatedDuration: input.estimatedDuration,
        phraseOfTheDay: nullableText(input.phraseOfTheDay),
        motivationalQuote: nullableText(input.motivationalQuote),
        learningObjectives: input.learningObjectives as Prisma.InputJsonValue,
        previewText: nullableText(input.previewText),
        isPublished: input.isPublished,
        isFree: input.isFree,
      },
    });
    await tx.course.update({ where: { id: courseModule.courseId }, data: { lessonCount: { increment: 1 } } });
    return created;
  });
  await writeContentAudit(actorId, "CREATE", "Lesson", lesson.id, { moduleId });
  return lesson;
}

export async function createLessonBlock(
  actorId: string,
  lessonId: string,
  input: CreateLessonBlockInput,
) {
  const order = await nextOrder(
    () => prisma.lessonBlock.findFirst({ where: { lessonId }, orderBy: { order: "desc" }, select: { order: true } }),
    input.order,
  );
  const block = await prisma.lessonBlock.create({
    data: {
      lessonId,
      type: input.type,
      title: nullableText(input.title),
      content: toPrismaJson(input.content),
      settings: toPrismaJson(input.settings),
      order,
      isRequired: input.isRequired,
    },
  });
  await writeContentAudit(actorId, "CREATE", "LessonBlock", block.id, { lessonId, type: block.type });
  return block;
}

export async function createExercise(
  actorId: string,
  lessonBlockId: string,
  input: CreateExerciseInput,
) {
  const block = await prisma.lessonBlock.findUnique({ where: { id: lessonBlockId }, select: { type: true } });
  if (!block) throw new Error("Lesson block not found");
  if (block.type !== "EXERCISE") throw new Error("Exercises can only be added to EXERCISE blocks");
  const order = await nextOrder(
    () => prisma.exercise.findFirst({ where: { lessonBlockId }, orderBy: { order: "desc" }, select: { order: true } }),
    input.order,
  );
  const exercise = await prisma.exercise.create({
    data: {
      lessonBlockId,
      type: input.type,
      instruction: input.instruction,
      question: input.question,
      content: toPrismaJson(input.content),
      correctAnswer: toPrismaJson(input.correctAnswer)!,
      alternativeAnswers: input.alternativeAnswers ? (input.alternativeAnswers as Prisma.InputJsonValue) : undefined,
      explanation: nullableText(input.explanation),
      hint: nullableText(input.hint),
      difficulty: input.difficulty,
      basePoints: input.basePoints,
      timeLimitSeconds: input.timeLimitSeconds,
      solutionCost: input.solutionCost,
      allowInstantCheck: input.allowInstantCheck,
      allowExtraExercise: input.allowExtraExercise,
      order,
    },
  });
  await writeContentAudit(actorId, "CREATE", "Exercise", exercise.id, { lessonBlockId, type: exercise.type });
  return exercise;
}

export async function createWord(actorId: string, input: unknown) {
  const value = createWordSchema.parse(input);
  const normalizedLemma = normalizeWord(value.lemma);
  const existing = await prisma.word.findFirst({
    where: { normalizedLemma, partOfSpeech: value.partOfSpeech ?? null },
    select: { id: true },
  });
  if (existing) throw new Error("A word with this lemma and part of speech already exists");
  const word = await prisma.word.create({
    data: {
      lemma: value.lemma,
      normalizedLemma,
      partOfSpeech: value.partOfSpeech,
      cefrLevel: value.cefrLevel,
      britishTranscription: nullableText(value.britishTranscription),
      americanTranscription: nullableText(value.americanTranscription),
      meanings: { create: value.meanings.map((meaning, index) => ({ ...meaning, order: index + 1 })) },
    },
    include: { meanings: true },
  });
  await writeContentAudit(actorId, "CREATE", "Word", word.id, { lemma: word.lemma });
  return word;
}

export async function createGrammarTopic(actorId: string, input: unknown) {
  const value = createGrammarTopicSchema.parse(input);
  const slug = value.slug ?? slugify(value.title);
  const topic = await prisma.grammarTopic.create({
    data: { ...value, slug },
  });
  await writeContentAudit(actorId, "CREATE", "GrammarTopic", topic.id, { slug: topic.slug });
  return topic;
}

export async function submitExerciseAttempt(userId: string, exerciseId: string, input: unknown) {
  const value = submitExerciseSchema.parse(input);
  const exerciseForAccess = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { lessonBlock: { select: { lessonId: true } } },
  });
  if (!exerciseForAccess) throw new Error("Exercise not found");
  const access = await canAccessLesson(userId, exerciseForAccess.lessonBlock.lessonId);
  if (!access.allowed) throw new Error(access.reason === "PREMIUM_REQUIRED" ? "Premium access is required for this lesson" : "You cannot access this lesson");

  return prisma.$transaction(async (tx) => {
    const exercise = await tx.exercise.findUnique({
      where: { id: exerciseId },
      include: { lessonBlock: { select: { lessonId: true, lesson: { select: { module: { select: { courseId: true } } } } } } },
    });
    if (!exercise) throw new Error("Exercise not found");

    if (value.idempotencyKey) {
      const existing = await tx.exerciseAttempt.findUnique({
        where: { userId_exerciseId_idempotencyKey: { userId, exerciseId, idempotencyKey: value.idempotencyKey } },
        select: { id: true, attemptNumber: true, isCorrect: true, scoreAwarded: true, createdAt: true },
      });
      if (existing) {
        return {
          attempt: existing,
          attemptNumber: existing.attemptNumber,
          isCorrect: existing.isCorrect,
          scoreAwarded: existing.scoreAwarded,
          score: existing.scoreAwarded,
          explanation: exercise.allowInstantCheck ? exercise.explanation : null,
          correctAnswer: exercise.allowInstantCheck ? exercise.correctAnswer : null,
          hint: exercise.hint,
        };
      }
    }

    const isCorrect = answerMatches(value.answer, exercise.correctAnswer, exercise.alternativeAnswers, exercise.content);
    const previous = await tx.exerciseAttempt.findFirst({
      where: { userId, exerciseId },
      orderBy: { attemptNumber: "desc" },
      select: { attemptNumber: true },
    });
    const scoreAwarded = isCorrect ? exercise.basePoints : 0;
    const attempt = await tx.exerciseAttempt.create({
      data: {
        userId,
        exerciseId,
        lessonId: exercise.lessonBlock.lessonId,
        idempotencyKey: value.idempotencyKey,
        submittedAnswer: toPrismaJson(value.answer)!,
        isCorrect,
        scoreAwarded,
        timeSpentSeconds: value.timeSpentSeconds,
        hintUsed: value.hintUsed,
        solutionOpened: value.solutionOpened,
        attemptNumber: (previous?.attemptNumber ?? 0) + 1,
      },
      select: { id: true, attemptNumber: true, createdAt: true },
    });

    if (!isCorrect) {
      const existingMistake = await tx.userMistake.findFirst({
        where: { userId, exerciseId, resolvedAt: null },
        orderBy: { lastOccurredAt: "desc" },
        select: { id: true },
      });
      if (existingMistake) {
        await tx.userMistake.update({
          where: { id: existingMistake.id },
          data: {
            submittedAnswer: toPrismaJson(value.answer),
            expectedAnswer: toPrismaJson(exercise.correctAnswer as JsonValue),
            explanation: exercise.explanation,
            occurrenceCount: { increment: 1 },
            lastOccurredAt: new Date(),
          },
        });
      } else {
        await tx.userMistake.create({
          data: {
            userId,
            exerciseId,
            lessonId: exercise.lessonBlock.lessonId,
            submittedAnswer: toPrismaJson(value.answer),
            expectedAnswer: toPrismaJson(exercise.correctAnswer as JsonValue),
            explanation: exercise.explanation,
          },
        });
      }
    }

    const attempts = await tx.exerciseAttempt.findMany({
      where: { userId, lessonId: exercise.lessonBlock.lessonId },
      select: { exerciseId: true, isCorrect: true, scoreAwarded: true, attemptNumber: true, createdAt: true },
    });
    const result = calculateLessonResult(attempts);
    await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: exercise.lessonBlock.lessonId } },
      create: {
        userId,
        lessonId: exercise.lessonBlock.lessonId,
        status: "STARTED",
        completedBlocks: [],
        score: result.score,
        correctAnswers: result.correctAnswers,
        incorrectAnswers: result.incorrectAnswers,
        lastSeenAt: new Date(),
      },
      update: {
        score: result.score,
        correctAnswers: result.correctAnswers,
        incorrectAnswers: result.incorrectAnswers,
        lastSeenAt: new Date(),
      },
    });

    const correctAttempts = isCorrect ? await tx.exerciseAttempt.count({ where: { userId, exerciseId, isCorrect: true } }) : 0;
    const motivationReward = await recordExerciseResult(tx, {
      userId,
      exerciseId,
      lessonId: exercise.lessonBlock.lessonId,
      courseId: exercise.lessonBlock.lesson.module.courseId,
      attemptId: attempt.id,
      isCorrect,
      isFirstCorrect: isCorrect && correctAttempts === 1,
      score: scoreAwarded,
    });

    return {
      attempt,
      attemptNumber: attempt.attemptNumber,
      isCorrect,
      scoreAwarded,
      score: scoreAwarded,
      explanation: exercise.allowInstantCheck ? exercise.explanation : null,
      correctAnswer: exercise.allowInstantCheck ? exercise.correctAnswer : null,
      hint: exercise.hint,
      motivationReward,
    };
  });
}

export async function saveLessonProgress(userId: string, lessonId: string, input: unknown) {
  const value = saveLessonProgressSchema.parse(input);
  const access = await canAccessLesson(userId, lessonId);
  if (!access.allowed) throw new Error(access.reason === "PREMIUM_REQUIRED" ? "Premium access is required for this lesson" : "You cannot access this lesson");
  const saved = await prisma.$transaction(async (tx) => {
    const blocks = await tx.lessonBlock.findMany({ where: { lessonId }, select: { id: true, isRequired: true } });
    if (blocks.length === 0) {
      const lesson = await tx.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
      if (!lesson) throw new Error("Lesson not found");
    }
    const allowed = new Set(blocks.map((block) => block.id));
    if (value.completedBlockIds.some((blockId) => !allowed.has(blockId))) {
      throw new Error("A completed block does not belong to this lesson");
    }
    if (value.currentBlockId && !allowed.has(value.currentBlockId)) {
      throw new Error("The current block does not belong to this lesson");
    }
    const completed = new Set(value.completedBlockIds);
    const allRequiredBlocksComplete = blocks.filter((block) => block.isRequired).every((block) => completed.has(block.id));
    const status = value.complete && allRequiredBlocksComplete ? "COMPLETED" : "STARTED";
    const completionPercent = blocks.length === 0 ? (status === "COMPLETED" ? 100 : 0) : Math.round((completed.size / blocks.length) * 100);
    const attempts = await tx.exerciseAttempt.findMany({
      where: { userId, lessonId },
      select: { exerciseId: true, isCorrect: true, scoreAwarded: true, attemptNumber: true, createdAt: true },
    });
    const result = calculateLessonResult(attempts);
    const now = new Date();
    const previousProgress = await tx.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } }, select: { status: true } });
    const progress = await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        status,
        completedBlocks: value.completedBlockIds as Prisma.InputJsonValue,
        currentBlockId: value.currentBlockId ?? null,
        completionPercent,
        score: result.score,
        grade: status === "COMPLETED" ? result.grade : null,
        correctAnswers: result.correctAnswers,
        incorrectAnswers: result.incorrectAnswers,
        // Active time is now credited only by the server heartbeat mechanism.
        activeSeconds: 0,
        lastSeenAt: now,
        completedAt: status === "COMPLETED" ? now : null,
      },
      update: {
        status,
        completedBlocks: value.completedBlockIds as Prisma.InputJsonValue,
        currentBlockId: value.currentBlockId ?? null,
        completionPercent,
        score: result.score,
        grade: status === "COMPLETED" ? result.grade : null,
        correctAnswers: result.correctAnswers,
        incorrectAnswers: result.incorrectAnswers,
        activeSeconds: { increment: 0 },
        lastSeenAt: now,
        completedAt: status === "COMPLETED" ? now : null,
      },
    });
    let motivationReward: Awaited<ReturnType<typeof recordLessonCompletion>> | null = null;
    if (status === "COMPLETED" && previousProgress?.status !== "COMPLETED") {
      const lesson = await tx.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true } } } });
      if (lesson) motivationReward = await recordLessonCompletion(tx, userId, lessonId, lesson.module.courseId, true);
    }
    return { ...progress, motivationReward, firstCompletion: status === "COMPLETED" && previousProgress?.status !== "COMPLETED" };
  });
  if (saved.firstCompletion) {
    try {
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { title: true, module: { select: { course: { select: { title: true } } } } } });
      await notificationService.createNotification({ userId, type: "LESSON_COMPLETED", idempotencyKey: `lesson-completed-notification:${userId}:${lessonId}`, entityType: "Lesson", entityId: lessonId, title: "Lesson completed", message: lesson ? `Great work — you completed ${lesson.title}.` : "Great work — you completed a lesson.", actionUrl: "/dashboard/lessons", actionLabel: "Continue learning", payload: lesson ? { lessonTitle: lesson.title, courseTitle: lesson.module.course.title } : undefined });
    } catch (error) { console.error("[communications] lesson notification failed", error); }
  }
  return saved;
}

export async function getLessonProgress(userId: string, lessonId: string) {
  return prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: {
      status: true,
      completedBlocks: true,
      currentBlockId: true,
      completionPercent: true,
      score: true,
      grade: true,
      correctAnswers: true,
      incorrectAnswers: true,
      activeSeconds: true,
      lastSeenAt: true,
    },
  });
}

export async function listLessonProgressByLessonIds(userId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return [];
  return prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: { lessonId: true, status: true, completionPercent: true, score: true, grade: true },
  });
}

export async function saveHomeworkSubmission(userId: string, lessonBlockId: string, input: unknown) {
  const value = saveHomeworkSchema.parse(input);
  const block = await prisma.lessonBlock.findUnique({ where: { id: lessonBlockId }, select: { type: true, lessonId: true } });
  if (!block || block.type !== "HOMEWORK") throw new Error("Homework block not found");
  const access = await canAccessLesson(userId, block.lessonId);
  if (!access.allowed) throw new Error(access.reason === "PREMIUM_REQUIRED" ? "Premium access is required for this homework" : "You cannot access this homework");
  const submittedAt = value.submit ? new Date() : undefined;
  return prisma.homeworkSubmission.upsert({
    where: { lessonBlockId_userId: { lessonBlockId, userId } },
    create: { lessonBlockId, userId, answers: toPrismaJson(value.answers), status: value.submit ? "SUBMITTED" : "DRAFT", submittedAt },
    update: { answers: toPrismaJson(value.answers), status: value.submit ? "SUBMITTED" : "DRAFT", submittedAt: value.submit ? submittedAt : null },
  });
}

export async function listUserHomework(userId: string) {
  return prisma.homeworkSubmission.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { lessonBlock: { select: { title: true, lesson: { select: { title: true, slug: true, module: { select: { course: { select: { title: true, slug: true, level: { select: { code: true } } } } } } } } } } },
  });
}

export async function listUserMistakes(userId: string) {
  return prisma.userMistake.findMany({
    where: { userId },
    orderBy: { lastOccurredAt: "desc" },
    include: {
      lesson: { select: { title: true, slug: true, module: { select: { course: { select: { slug: true, title: true, level: { select: { code: true } } } } } } } },
      exercise: { select: { question: true, explanation: true, type: true } },
    },
  });
}

export async function listUserProgress(userId: string) {
  return prisma.lessonProgress.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
    include: {
      lesson: {
        select: {
          title: true,
          slug: true,
          estimatedDuration: true,
          module: { select: { course: { select: { slug: true, title: true, level: { select: { code: true } } } } } },
        },
      },
    },
  });
}

export async function resolveUserMistake(userId: string, mistakeId: string) {
  return prisma.userMistake.updateMany({ where: { id: mistakeId, userId }, data: { resolvedAt: new Date() } });
}

export async function listUserWords(userId: string) {
  return prisma.userWord.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { word: { include: { meanings: { orderBy: { order: "asc" }, take: 1 } } } },
  });
}

export async function addUserWord(userId: string, input: unknown) {
  const value = addUserWordSchema.parse(input);
  if ("wordId" in value && value.wordId) {
    const word = await prisma.word.findUnique({ where: { id: value.wordId }, select: { id: true } });
    if (!word) throw new Error("Word not found");
    return prisma.userWord.upsert({
      where: { userId_wordId: { userId, wordId: word.id } },
      update: {},
      create: { userId, wordId: word.id, nextReviewAt: new Date() },
    });
  }

  const customWord = value.customWord!;
  const existing = await prisma.userWord.findFirst({
    where: { userId, wordId: null, customWord: { equals: customWord, mode: "insensitive" } },
  });
  if (existing) return existing;
  return prisma.userWord.create({
    data: {
      userId,
      customWord,
      customTranslation: value.customTranslation!,
      nextReviewAt: new Date(),
    },
  });
}

export async function listGrammarTopics() {
  return prisma.grammarTopic.findMany({ orderBy: [{ cefrLevel: "asc" }, { order: "asc" }, { title: "asc" }] });
}

export async function listWordsForAdmin() {
  return prisma.word.findMany({ orderBy: { lemma: "asc" }, include: { meanings: { orderBy: { order: "asc" }, take: 1 } }, take: 100 });
}

export async function writeContentAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: JsonValue,
) {
  return prisma.contentAuditLog.create({
    data: { actorId, action, entityType, entityId, metadata: toPrismaJson(metadata) },
  });
}
