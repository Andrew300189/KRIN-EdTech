import "server-only";

import { Prisma, type CmsContentStatus } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { defaultContentLocale, normalizeContentLocale } from "@/modules/courses/localization/content-locales";
import { recordCmsContentVersion } from "@/modules/cms/services/content-workflow.service";

type TranslationEntityType = "COURSE" | "MODULE" | "LESSON" | "LESSON_BLOCK" | "EXERCISE";

type CourseEntityTranslationUpdate = {
  entityType: "COURSE";
  entityId: string;
  values: { slug?: string; title?: string; shortDescription?: string; fullDescription?: string | null; seoTitle?: string | null; seoDescription?: string | null; seoKeywords?: string | null; learningOutcomes?: Prisma.InputJsonValue | typeof Prisma.JsonNull; prerequisites?: Prisma.InputJsonValue | typeof Prisma.JsonNull };
};
type ModuleTranslationUpdate = { entityType: "MODULE"; entityId: string; values: { title?: string; description?: string | null } };
type LessonTranslationUpdate = { entityType: "LESSON"; entityId: string; values: { slug?: string; title?: string; description?: string | null; phraseOfTheDay?: string | null; motivationalQuote?: string | null; learningObjectives?: Prisma.InputJsonValue | typeof Prisma.JsonNull; previewText?: string | null } };
type LessonBlockTranslationUpdate = { entityType: "LESSON_BLOCK"; entityId: string; values: { title?: string | null; content?: Prisma.InputJsonValue | typeof Prisma.JsonNull } };
type ExerciseTranslationUpdate = { entityType: "EXERCISE"; entityId: string; values: { instruction?: string; question?: string; content?: Prisma.InputJsonValue | typeof Prisma.JsonNull; explanation?: string | null; hint?: string | null } };

export type CourseTranslationUpdate = CourseEntityTranslationUpdate | ModuleTranslationUpdate | LessonTranslationUpdate | LessonBlockTranslationUpdate | ExerciseTranslationUpdate;

function toInputJson(value: Prisma.JsonValue | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

function draftStatusData() { return { contentStatus: "DRAFT" as const, publishedAt: null }; }

async function assertTranslationLocale(localeInput: string) {
  const locale = normalizeContentLocale(localeInput);
  if (locale === defaultContentLocale) throw new Error("English is the base content. Edit it in the course editor.");
  const record = await prisma.contentLocale.findFirst({ where: { code: locale, isActive: true }, select: { code: true } });
  if (!record) throw new Error("This content locale is not active.");
  return locale;
}

export async function listContentLocales() {
  return prisma.contentLocale.findMany({ where: { isActive: true }, orderBy: [{ order: "asc" }, { code: "asc" }], select: { code: true, displayName: true, nativeName: true, order: true } });
}

export async function listCourseTranslationSummaries(courseId: string) {
  const [locales, course] = await Promise.all([
    listContentLocales(),
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true, language: true, translations: { select: { locale: true, contentStatus: true, updatedAt: true } },
        modules: {
          select: {
            translations: { select: { locale: true, contentStatus: true } },
            lessons: {
              select: {
                translations: { select: { locale: true, contentStatus: true } },
                blocks: {
                  select: {
                    translations: { select: { locale: true, contentStatus: true } },
                    exercises: { select: { translations: { select: { locale: true, contentStatus: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  if (!course) return null;
  const baseLocale = normalizeContentLocale(course.language);
  const translationRows = (locale: string) => [
    ...course.translations.filter((item) => item.locale === locale),
    ...course.modules.flatMap((module) => [...module.translations.filter((item) => item.locale === locale), ...module.lessons.flatMap((lesson) => [...lesson.translations.filter((item) => item.locale === locale), ...lesson.blocks.flatMap((block) => [...block.translations.filter((item) => item.locale === locale), ...block.exercises.flatMap((exercise) => exercise.translations.filter((item) => item.locale === locale))])])]),
  ];
  const totalUnits = 1 + course.modules.length + course.modules.reduce((count, module) => count + module.lessons.length + module.lessons.reduce((lessonCount, lesson) => lessonCount + lesson.blocks.length + lesson.blocks.reduce((blockCount, block) => blockCount + block.exercises.length, 0), 0), 0);
  return { baseLocale, totalUnits, locales: locales.map((locale) => {
    const rows = translationRows(locale.code);
    const courseTranslation = course.translations.find((item) => item.locale === locale.code);
    return { ...locale, isBase: locale.code === baseLocale, exists: Boolean(courseTranslation), status: courseTranslation?.contentStatus ?? null, updatedAt: courseTranslation?.updatedAt ?? null, translatedUnits: rows.length, publishedUnits: rows.filter((item) => item.contentStatus === "PUBLISHED").length };
  }) };
}

export async function createCourseTranslationDraft(actorId: string, courseId: string, localeInput: string) {
  const locale = await assertTranslationLocale(localeInput);
  const source = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              blocks: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
            },
          },
        },
      },
    },
  });
  if (!source) throw new Error("Course not found.");
  await prisma.$transaction(async (tx) => {
    await tx.courseTranslation.upsert({ where: { courseId_locale: { courseId, locale } }, create: { courseId, locale, slug: source.slug, title: source.title, shortDescription: source.shortDescription, fullDescription: source.fullDescription, seoTitle: null, seoDescription: null, seoKeywords: null, learningOutcomes: toInputJson(source.learningOutcomes), prerequisites: toInputJson(source.prerequisites), ...draftStatusData() }, update: {} });
    for (const module of source.modules) {
      await tx.courseModuleTranslation.upsert({ where: { moduleId_locale: { moduleId: module.id, locale } }, create: { moduleId: module.id, locale, title: module.title, description: module.description, ...draftStatusData() }, update: {} });
      for (const lesson of module.lessons) {
        await tx.lessonTranslation.upsert({ where: { lessonId_locale: { lessonId: lesson.id, locale } }, create: { lessonId: lesson.id, locale, slug: lesson.slug, title: lesson.title, description: lesson.description, phraseOfTheDay: lesson.phraseOfTheDay, motivationalQuote: lesson.motivationalQuote, learningObjectives: toInputJson(lesson.learningObjectives), previewText: lesson.previewText, ...draftStatusData() }, update: {} });
        for (const block of lesson.blocks) {
          await tx.lessonBlockTranslation.upsert({ where: { lessonBlockId_locale: { lessonBlockId: block.id, locale } }, create: { lessonBlockId: block.id, locale, title: block.title, content: toInputJson(block.content), ...draftStatusData() }, update: {} });
          for (const exercise of block.exercises) {
            await tx.exerciseTranslation.upsert({ where: { exerciseId_locale: { exerciseId: exercise.id, locale } }, create: { exerciseId: exercise.id, locale, instruction: exercise.instruction, question: exercise.question, content: toInputJson(exercise.content), explanation: exercise.explanation, hint: exercise.hint, ...draftStatusData() }, update: {} });
          }
        }
      }
    }
  });
  await recordCmsContentVersion({ actorId, entityType: "COURSE", entityId: courseId, action: "UPDATED", snapshot: { localization: { locale, action: "DRAFT_CREATED" } } });
  return listCourseTranslationSummaries(courseId);
}

export async function getCourseTranslationWorkspace(courseId: string, localeInput: string) {
  const locale = await assertTranslationLocale(localeInput);
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      translations: { where: { locale } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          translations: { where: { locale } },
          lessons: {
            orderBy: { order: "asc" },
            include: {
              translations: { where: { locale } },
              blocks: {
                orderBy: { order: "asc" },
                include: {
                  translations: { where: { locale } },
                  exercises: { orderBy: { order: "asc" }, include: { translations: { where: { locale } } } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function updateCourseTranslation(actorId: string, courseId: string, localeInput: string, update: CourseTranslationUpdate) {
  const locale = await assertTranslationLocale(localeInput);
  const reset = draftStatusData();
  if (update.entityType === "COURSE") {
    if (update.entityId !== courseId) throw new Error("Course translation does not match the selected course.");
    await prisma.courseTranslation.update({ where: { courseId_locale: { courseId, locale } }, data: { ...update.values, ...reset } });
  } else if (update.entityType === "MODULE") {
    const module = await prisma.courseModule.findFirst({ where: { id: update.entityId, courseId }, select: { id: true } });
    if (!module) throw new Error("Module is not part of this course.");
    await prisma.courseModuleTranslation.update({ where: { moduleId_locale: { moduleId: module.id, locale } }, data: { ...update.values, ...reset } });
  } else if (update.entityType === "LESSON") {
    const lesson = await prisma.lesson.findFirst({ where: { id: update.entityId, module: { courseId } }, select: { id: true } });
    if (!lesson) throw new Error("Lesson is not part of this course.");
    await prisma.lessonTranslation.update({ where: { lessonId_locale: { lessonId: lesson.id, locale } }, data: { ...update.values, ...reset } });
  } else if (update.entityType === "LESSON_BLOCK") {
    const block = await prisma.lessonBlock.findFirst({ where: { id: update.entityId, lesson: { module: { courseId } } }, select: { id: true } });
    if (!block) throw new Error("Lesson block is not part of this course.");
    await prisma.lessonBlockTranslation.update({ where: { lessonBlockId_locale: { lessonBlockId: block.id, locale } }, data: { ...update.values, ...reset } });
  } else {
    const exercise = await prisma.exercise.findFirst({ where: { id: update.entityId, lessonBlock: { lesson: { module: { courseId } } } }, select: { id: true } });
    if (!exercise) throw new Error("Exercise is not part of this course.");
    await prisma.exerciseTranslation.update({ where: { exerciseId_locale: { exerciseId: exercise.id, locale } }, data: { ...update.values, ...reset } });
  }
  await recordCmsContentVersion({ actorId, entityType: "COURSE", entityId: courseId, action: "UPDATED", snapshot: { localization: { locale, action: "UPDATED", entityType: update.entityType, entityId: update.entityId } } });
}

export async function setCourseTranslationPublication(actorId: string, courseId: string, localeInput: string, publish: boolean) {
  const locale = await assertTranslationLocale(localeInput);
  const translation = await prisma.courseTranslation.findUnique({ where: { courseId_locale: { courseId, locale } }, select: { id: true } });
  if (!translation) throw new Error("Create a localization draft before publishing it.");
  const status: CmsContentStatus = publish ? "PUBLISHED" : "UNPUBLISHED";
  const publishedAt = publish ? new Date() : null;
  await prisma.$transaction([
    prisma.courseTranslation.update({ where: { id: translation.id }, data: { contentStatus: status, publishedAt } }),
    prisma.courseModuleTranslation.updateMany({ where: { locale, module: { courseId } }, data: { contentStatus: status, publishedAt } }),
    prisma.lessonTranslation.updateMany({ where: { locale, lesson: { module: { courseId } } }, data: { contentStatus: status, publishedAt } }),
    prisma.lessonBlockTranslation.updateMany({ where: { locale, lessonBlock: { lesson: { module: { courseId } } } }, data: { contentStatus: status, publishedAt } }),
    prisma.exerciseTranslation.updateMany({ where: { locale, exercise: { lessonBlock: { lesson: { module: { courseId } } } } }, data: { contentStatus: status, publishedAt } }),
  ]);
  await recordCmsContentVersion({ actorId, entityType: "COURSE", entityId: courseId, action: "UPDATED", snapshot: { localization: { locale, action: publish ? "PUBLISHED" : "UNPUBLISHED" } } });
}

export type { TranslationEntityType };
