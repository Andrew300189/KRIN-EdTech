import { randomUUID } from "crypto";
import { Prisma, type CourseAccessMode, type CourseType, type SubscriptionPlan } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import {
  addUserWordSchema,
  type CreateCourseCategoryInput,
  type CreateCourseInput,
  type CreateExerciseInput,
  type CreateLessonBlockInput,
  type CreateLessonInput,
  type CreateModuleInput,
  type UpdateModuleInput,
  createGrammarTopicSchema,
  createWordSchema,
  type JsonValue,
  saveLessonProgressSchema,
  saveHomeworkSchema,
  submitExerciseSchema,
  updateLessonBlockSchema,
} from "@/modules/courses/schemas/content.schemas";
import { answerMatches, contentWithOrderSensitiveAnswerValidation, normalizeCompactToBeMatchingAnswer } from "@/modules/courses/utils/exercise-evaluation";
import { calculateLessonResult } from "@/modules/lessons/utils/calculate-lesson-result";
import { resolveLessonProgressStatus } from "@/modules/lessons/utils/lesson-progress-state";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";
import { normalizeWord } from "@/modules/vocabulary/utils/normalize-word";
import { calculateUserLevel, recordExerciseResult, recordLessonCompletion } from "@/modules/motivation/services/motivation.service";
import { notificationService } from "@/modules/communications/services/notification.service";
import { getDefaultExerciseSubtype, resolveExerciseEngineKey } from "@/modules/cms/exercise-engines/registry";
import { validateExerciseConfiguration } from "@/modules/cms/exercise-engines/configuration";
import { recordCmsContentVersion } from "@/modules/cms/services/content-workflow.service";
import { syncCourseDurationForLessonBlock, syncCourseEstimatedDuration, syncLessonEstimatedDuration } from "@/modules/cms/services/course-duration.service";
import { collectCurriculumDescendantIds } from "@/modules/courses/utils/public-content-routes";
import { defaultContentLocale, normalizeContentLocale } from "@/modules/courses/localization/content-locales";

const CEFR_LEVEL_CODES = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type CefrLevelCode = (typeof CEFR_LEVEL_CODES)[number];

/** A solution is deliberately a small, predictable XP spend across all lessons. */
const EXERCISE_SOLUTION_XP_COST = 2;

/** Converts route/query input to the closed CEFR enum before it reaches Prisma. */
export function normalizeCefrLevelCode(value: string | undefined | null): CefrLevelCode | null {
  const normalized = value?.trim().toUpperCase();
  return CEFR_LEVEL_CODES.includes(normalized as CefrLevelCode) ? normalized as CefrLevelCode : null;
}

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

function mistakeTypeForExercise(type: string) {
  if (type.includes("LISTENING") || type === "DICTATION") return "LISTENING";
  if (type.includes("TRANSLATION")) return "TRANSLATION";
  if (type.includes("TENSE") || type === "FILL_IN_THE_BLANK" || type === "ERROR_CORRECTION") return "GRAMMAR";
  if (type.includes("SYNONYM") || type.includes("ANTONYM") || type.includes("PHRASAL")) return "VOCABULARY";
  return "EXERCISE";
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

function stringIdsFromJson(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

type ExerciseFeedback = {
  example: string | null;
  theoryHref: string | null;
  errorDetails: Array<{ incorrect: string; correction: string; explanation: string | null }>;
};

/** Content-managed feedback is deliberately constrained before it reaches the client. */
function getExerciseFeedback(content: Prisma.JsonValue | null): ExerciseFeedback {
  const record = content && typeof content === "object" && !Array.isArray(content) ? content as Prisma.JsonObject : null;
  const example = typeof record?.example === "string" ? record.example : null;
  const candidateHref = typeof record?.theoryHref === "string" ? record.theoryHref : null;
  const theoryHref = candidateHref && /^\/(?:courses|grammar|levels)(?:\/|$)/.test(candidateHref) ? candidateHref : null;
  const rawDetails = Array.isArray(record?.errorDetails) ? record.errorDetails : [];
  const errorDetails = rawDetails.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const detail = entry as Prisma.JsonObject;
    if (typeof detail.incorrect !== "string" || typeof detail.correction !== "string") return [];
    return [{ incorrect: detail.incorrect, correction: detail.correction, explanation: typeof detail.explanation === "string" ? detail.explanation : null }];
  }).slice(0, 20);
  return { example, theoryHref, errorDetails };
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
    include: { _count: { select: { courses: { where: { isPublished: true, isTemplate: false, accessMode: { not: "HIDDEN" }, isVisibleInLevelBlock: true, category: { isPublished: true } } } } } },
  });
}

/** Owner-selected curriculum entries rendered below the legacy landing content. */
export async function listHomepageCurriculumNodes() {
  return prisma.curriculumNode.findMany({
    where: { contentStatus: "PUBLISHED", showOnHomepage: true, level: { isPublished: true } },
    orderBy: [{ level: { order: "asc" } }, { order: "asc" }],
    take: 12,
    select: {
      id: true,
      type: true,
      slug: true,
      title: true,
      description: true,
      level: { select: { code: true, title: true } },
      parent: {
        select: {
          type: true,
          slug: true,
          parent: { select: { type: true, slug: true } },
        },
      },
    },
  });
}

/** Courses explicitly selected by the owner for the homepage feature area. */
export async function listHomepageCourses() {
  return prisma.course.findMany({
    where: { isPublished: true, isTemplate: false, isVisibleOnHomepage: true, accessMode: { not: "HIDDEN" }, level: { isPublished: true }, category: { isPublished: true } },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    take: 6,
    select: { id: true, slug: true, title: true, shortDescription: true, coverImage: true, accessPlan: true, level: { select: { code: true } }, category: { select: { title: true } } },
  });
}

/** Discovery-only recommendations; entitlement checks still happen at lesson access time. */
export async function listStudentDashboardRecommendations() {
  return prisma.course.findMany({
    where: { isPublished: true, isTemplate: false, isVisibleInStudentDashboard: true, isVisibleInRecommendations: true, accessMode: { not: "HIDDEN" }, level: { isPublished: true }, category: { isPublished: true } },
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    take: 3,
    select: { id: true, slug: true, title: true, shortDescription: true, accessPlan: true, level: { select: { code: true } } },
  });
}

/** Visible courses for a legacy academy path, managed by the canonical Course row. */
export async function listPublishedAcademyCourses(academySlug: string) {
  return prisma.course.findMany({
    where: { isPublished: true, isTemplate: false, isVisibleInAcademy: true, accessMode: { not: "HIDDEN" }, academySlug, level: { isPublished: true }, category: { isPublished: true } },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
    take: 24,
    select: { id: true, slug: true, title: true, shortDescription: true, accessPlan: true, level: { select: { code: true } }, category: { select: { title: true } } },
  });
}

export async function getPublishedLevelWithCourses(code: string) {
  const levelCode = normalizeCefrLevelCode(code);
  if (!levelCode) return null;

  return prisma.languageLevel.findFirst({
    where: { code: levelCode, isPublished: true },
    include: {
      courses: {
        where: { isPublished: true, isTemplate: false, accessMode: { not: "HIDDEN" }, isVisibleInLevelBlock: true, category: { isPublished: true } },
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
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

/**
 * Public CEFR navigation is read from the CMS-managed curriculum tree. Unlike
 * the legacy course catalogue, it deliberately contains no fallback that can
 * leak sections or topics from another level.
 */
export async function getPublishedCurriculumLevelPage(code: string) {
  const levelCode = normalizeCefrLevelCode(code);
  if (!levelCode) return null;

  const level = await prisma.languageLevel.findFirst({
    where: { code: levelCode, isPublished: true },
    select: { id: true, code: true, title: true, description: true },
  });
  if (!level) return null;

  const sections = await prisma.curriculumNode.findMany({
    where: { levelId: level.id, type: "SECTION", parentId: null, contentStatus: "PUBLISHED" },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      order: true,
      children: {
        where: { type: "TOPIC", contentStatus: "PUBLISHED" },
        orderBy: [{ order: "asc" }, { title: "asc" }],
        select: { id: true, title: true },
      },
    },
  });

  return { level, sections };
}

type PublishedCurriculumPageInput = {
  levelCode: string;
  sectionSlug: string;
  topicSlug?: string;
  subtopicSlug?: string;
};

/**
 * Resolves a public curriculum path and its exact descendant course scope.
 * It intentionally never falls back to the level catalogue: an invalid topic
 * URL is a 404, and a valid topic only receives its own linked courses.
 */
async function getPublishedCurriculumPage(input: PublishedCurriculumPageInput) {
  const levelCode = normalizeCefrLevelCode(input.levelCode);
  if (!levelCode) return null;

  const level = await prisma.languageLevel.findFirst({
    where: { code: levelCode, isPublished: true },
    select: { id: true, code: true, title: true, description: true },
  });
  if (!level) return null;

  const nodes = await prisma.curriculumNode.findMany({
    where: { levelId: level.id, contentStatus: "PUBLISHED" },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: { id: true, parentId: true, type: true, slug: true, title: true, description: true, order: true },
  });
  const section = nodes.find((node) => node.type === "SECTION" && !node.parentId && node.slug === input.sectionSlug);
  if (!section) return null;

  let target = section;
  if (input.topicSlug) {
    const topic = nodes.find((node) => node.type === "TOPIC" && node.parentId === section.id && node.slug === input.topicSlug);
    if (!topic) return null;
    target = topic;
  }
  if (input.subtopicSlug) {
    if (!input.topicSlug) return null;
    const subtopic = nodes.find((node) => node.type === "SUBTOPIC" && node.parentId === target.id && node.slug === input.subtopicSlug);
    if (!subtopic) return null;
    target = subtopic;
  }

  const descendantIds = collectCurriculumDescendantIds(nodes, target.id);
  const courses = await prisma.course.findMany({
    where: {
      levelId: level.id,
      isPublished: true,
      isTemplate: false,
      accessMode: { not: "HIDDEN" },
      category: { isPublished: true },
      curriculumLinks: { some: { nodeId: { in: descendantIds } } },
    },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      lessonCount: true,
      estimatedDuration: true,
      accessPlan: true,
      category: { select: { title: true } },
    },
  });

  const ancestors = [section];
  if (target.type === "TOPIC") ancestors.push(target);
  if (target.type === "SUBTOPIC") {
    const topic = nodes.find((node) => node.id === target.parentId);
    if (!topic || topic.type !== "TOPIC") return null;
    ancestors.push(topic, target);
  }

  return {
    level,
    node: target,
    breadcrumbs: ancestors,
    childNodes: nodes.filter((node) => node.parentId === target.id),
    courses,
  };
}

export async function getPublishedCurriculumSectionPage(levelCode: string, sectionSlug: string) {
  return getPublishedCurriculumPage({ levelCode, sectionSlug });
}

export async function getPublishedCurriculumTopicPage(levelCode: string, sectionSlug: string, topicSlug: string) {
  return getPublishedCurriculumPage({ levelCode, sectionSlug, topicSlug });
}

export async function getPublishedCurriculumSubtopicPage(levelCode: string, sectionSlug: string, topicSlug: string, subtopicSlug: string) {
  return getPublishedCurriculumPage({ levelCode, sectionSlug, topicSlug, subtopicSlug });
}

export type CourseCatalogFilters = {
  query?: string;
  levelCode?: string;
  categorySlug?: string;
  /** A closed, server-owned group of catalogue categories (for a skill collection). */
  categorySlugs?: readonly string[];
  courseType?: CourseType;
  accessPlan?: "FREE" | "PREMIUM" | "CORPORATE";
  sort?: "newest" | "title" | "duration";
  page?: number;
  pageSize?: number;
};

function publishedCourseWhere(filters: CourseCatalogFilters): Prisma.CourseWhereInput {
  const query = filters.query?.trim();
  const levelCode = normalizeCefrLevelCode(filters.levelCode);
  const categorySlugs = [...new Set((filters.categorySlugs ?? []).map((slug) => slug.trim()).filter(Boolean))];
  // An invalid URL filter must produce an empty catalogue, not a Prisma enum
  // exception and never a broadened all-level fallback.
  if (filters.levelCode && !levelCode) return { id: { in: [] } };

  return {
    isPublished: true,
    isTemplate: false,
    accessMode: { not: "HIDDEN" },
    isVisibleInCatalog: true,
    level: { isPublished: true, ...(levelCode ? { code: levelCode } : {}) },
    category: {
      isPublished: true,
      ...(categorySlugs.length > 0 ? { slug: { in: categorySlugs } } : filters.categorySlug ? { slug: filters.categorySlug } : {}),
    },
    ...(filters.courseType ? { courseType: filters.courseType } : {}),
    ...(filters.accessPlan ? { accessPlan: filters.accessPlan } : {}),
    ...(query ? {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { shortDescription: { contains: query, mode: "insensitive" } },
        { category: { title: { contains: query, mode: "insensitive" } } },
        { curriculumLinks: { some: { node: { contentStatus: "PUBLISHED", showInSearch: true, OR: [{ title: { contains: query, mode: "insensitive" } }, { slug: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] } } } },
      ],
    } : {}),
  };
}

export async function listPublishedCourseCategories() {
  return prisma.courseCategory.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { courses: { where: { isPublished: true, isTemplate: false, accessMode: { not: "HIDDEN" }, isVisibleInCatalog: true, level: { isPublished: true } } } } },
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
      contentStatus: input.isPublished ? "PUBLISHED" : "DRAFT",
      publishedAt: input.isPublished ? new Date() : null,
    },
  });
  await writeContentAudit(actorId, "CREATE", "CourseCategory", category.id, { slug: category.slug });
  await recordCmsContentVersion({ actorId, entityType: "COURSE_CATEGORY", entityId: category.id, action: "CREATED", snapshot: category });
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
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished, contentStatus: input.isPublished ? "PUBLISHED" : "DRAFT", publishedAt: input.isPublished ? new Date() : null, scheduledAt: null, archivedAt: null } : {}),
    },
  });
  await writeContentAudit(actorId, "UPDATE", "CourseCategory", category.id, { slug: category.slug });
  await recordCmsContentVersion({ actorId, entityType: "COURSE_CATEGORY", entityId: category.id, action: "UPDATED", snapshot: category });
  return category;
}

export async function getPublishedCourseCategoryBySlug(slug: string) {
  return prisma.courseCategory.findFirst({
    where: { slug, isPublished: true },
    include: {
      courses: {
        where: { isPublished: true, isTemplate: false, accessMode: { not: "HIDDEN" }, isVisibleInCatalog: true, level: { isPublished: true } },
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
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
      : [{ isFeatured: "desc" as const }, { order: "asc" as const }, { createdAt: "desc" as const }];

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

export async function getPublishedCourseBySlug(slug: string, localeInput?: string | null) {
  const locale = normalizeContentLocale(localeInput);
  const shouldUseTranslation = Boolean(localeInput) && locale !== defaultContentLocale;
  const course = await prisma.course.findFirst({
    where: {
      isPublished: true,
      isTemplate: false,
      accessMode: { not: "HIDDEN" },
      level: { isPublished: true },
      category: { isPublished: true },
      ...(shouldUseTranslation ? { OR: [{ slug }, { translations: { some: { locale, slug, contentStatus: "PUBLISHED" } } }] } : { slug }),
    },
    include: {
      translations: { where: { locale, contentStatus: "PUBLISHED" }, take: 1 },
      level: { select: { code: true, title: true } },
      category: { select: { slug: true, title: true, description: true, icon: true } },
      instructor: {
        select: {
          name: true,
          avatar: true,
          teacherProfile: {
            select: { displayName: true, bio: true, specialization: true, languages: true, experienceYears: true, status: true },
          },
        },
      },
      curriculumLinks: {
        where: { node: { contentStatus: "PUBLISHED", level: { isPublished: true } } },
        include: {
          node: {
            select: {
              type: true,
              title: true,
              description: true,
              order: true,
              parent: { select: { type: true, title: true, parent: { select: { type: true, title: true } } } },
            },
          },
        },
      },
      commerceProducts: {
        where: { isActive: true, isPublic: true },
        include: {
          plan: { select: { title: true, description: true, trialDays: true } },
          prices: {
            where: { isActive: true },
            select: { id: true, provider: true, currency: true, amount: true, billingPeriod: true },
            orderBy: [{ provider: "asc" }, { amount: "asc" }],
          },
        },
        orderBy: { title: "asc" },
      },
      modules: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        include: {
          translations: { where: { locale, contentStatus: "PUBLISHED" }, take: 1 },
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
              translations: { where: { locale, contentStatus: "PUBLISHED" }, take: 1 },
            },
          },
        },
      },
    },
  });
  if (!course) return null;
  const courseTranslation = course.translations[0];
  return {
    ...course,
    // A localized URL is valid only once the course-level locale has been
    // published. Child records may fall back individually to English.
    contentLocale: courseTranslation ? locale : defaultContentLocale,
    localizedSlug: courseTranslation?.slug ?? course.slug,
    title: courseTranslation?.title ?? course.title,
    shortDescription: courseTranslation?.shortDescription ?? course.shortDescription,
    fullDescription: courseTranslation?.fullDescription ?? course.fullDescription,
    learningOutcomes: courseTranslation?.learningOutcomes ?? course.learningOutcomes,
    prerequisites: courseTranslation?.prerequisites ?? course.prerequisites,
    modules: course.modules.map((courseModule) => {
      const moduleTranslation = courseModule.translations[0];
      return {
        ...courseModule,
        title: moduleTranslation?.title ?? courseModule.title,
        description: moduleTranslation?.description ?? courseModule.description,
        lessons: courseModule.lessons.map((lesson) => {
          const lessonTranslation = lesson.translations[0];
          return {
            ...lesson,
            localizedSlug: lessonTranslation?.slug ?? lesson.slug,
            title: lessonTranslation?.title ?? lesson.title,
            description: lessonTranslation?.description ?? lesson.description,
          };
        }),
      };
    }),
  };
}

export async function getPublishedModuleById(courseSlug: string, moduleId: string) {
  return prisma.courseModule.findFirst({
    where: {
      id: moduleId,
      isPublished: true,
      course: { slug: courseSlug, isPublished: true, isTemplate: false, level: { isPublished: true }, category: { isPublished: true } },
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

export async function getPublishedLessonBySlug(courseSlug: string, lessonSlug: string, localeInput?: string | null) {
  const locale = normalizeContentLocale(localeInput);
  const shouldUseTranslation = Boolean(localeInput) && locale !== defaultContentLocale;
  const lesson = await prisma.lesson.findFirst({
    where: {
      ...(shouldUseTranslation ? { OR: [{ slug: lessonSlug }, { translations: { some: { locale, slug: lessonSlug, contentStatus: "PUBLISHED" } } }] } : { slug: lessonSlug }),
      isPublished: true,
      module: {
        isPublished: true,
        course: {
          ...(shouldUseTranslation ? { OR: [{ slug: courseSlug }, { translations: { some: { locale, slug: courseSlug, contentStatus: "PUBLISHED" } } }] } : { slug: courseSlug }),
          isPublished: true,
          isTemplate: false,
          level: { isPublished: true },
          category: { isPublished: true },
        },
      },
    },
    include: {
      translations: { where: { locale, contentStatus: "PUBLISHED" }, take: 1 },
      module: {
        include: {
          translations: { where: { locale, contentStatus: "PUBLISHED" }, take: 1 },
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              accessPlan: true,
              translations: { where: { locale, contentStatus: "PUBLISHED" }, take: 1 },
              modules: {
                where: { isPublished: true },
                orderBy: { order: "asc" },
                select: {
                  order: true,
                  lessons: {
                    where: { isPublished: true },
                    orderBy: { order: "asc" },
                    select: { id: true },
                  },
                },
              },
            },
          },
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            select: { slug: true, title: true, order: true, translations: { where: { locale, contentStatus: "PUBLISHED" }, take: 1 } },
          },
        },
      },
      blocks: {
        where: { contentStatus: "PUBLISHED" },
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          settings: true,
          order: true,
          isRequired: true,
          translations: { where: { locale, contentStatus: "PUBLISHED" }, take: 1 },
          exercises: {
            where: { contentStatus: "PUBLISHED" },
            orderBy: { order: "asc" },
            select: {
              id: true,
              type: true,
              engineKey: true,
              variantKey: true,
              instruction: true,
              question: true,
              content: true,
              explanation: true,
              hint: true,
              hintsEnabled: true,
              basePoints: true,
              timeLimitSeconds: true,
              solutionCost: true,
              allowInstantCheck: true,
              allowExtraExercise: true,
              order: true,
              translations: { where: { locale, contentStatus: "PUBLISHED" }, take: 1 },
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
  if (!lesson) return null;
  const lessonTranslation = lesson.translations[0];
  const moduleTranslation = lesson.module.translations[0];
  const courseTranslation = lesson.module.course.translations[0];
  return {
    ...lesson,
    // Course publication authorizes the locale route. Missing child copies
    // intentionally fall back to the canonical English lesson data.
    contentLocale: courseTranslation ? locale : defaultContentLocale,
    localizedSlug: lessonTranslation?.slug ?? lesson.slug,
    title: lessonTranslation?.title ?? lesson.title,
    description: lessonTranslation?.description ?? lesson.description,
    phraseOfTheDay: lessonTranslation?.phraseOfTheDay ?? lesson.phraseOfTheDay,
    motivationalQuote: lessonTranslation?.motivationalQuote ?? lesson.motivationalQuote,
    learningObjectives: lessonTranslation?.learningObjectives ?? lesson.learningObjectives,
    previewText: lessonTranslation?.previewText ?? lesson.previewText,
    module: {
      ...lesson.module,
      title: moduleTranslation?.title ?? lesson.module.title,
      description: moduleTranslation?.description ?? lesson.module.description,
      course: { ...lesson.module.course, title: courseTranslation?.title ?? lesson.module.course.title, localizedSlug: courseTranslation?.slug ?? lesson.module.course.slug },
      lessons: lesson.module.lessons.map((item) => {
        const itemTranslation = item.translations[0];
        return { ...item, slug: itemTranslation?.slug ?? item.slug, title: itemTranslation?.title ?? item.title };
      }),
    },
    blocks: lesson.blocks.map((block) => {
      const blockTranslation = block.translations[0];
      return {
        ...block,
        title: blockTranslation?.title ?? block.title,
        content: blockTranslation?.content ?? block.content,
        exercises: block.exercises.map((exercise) => {
          const exerciseTranslation = exercise.translations[0];
          return {
            ...exercise,
            instruction: exerciseTranslation?.instruction ?? exercise.instruction,
            question: exerciseTranslation?.question ?? exercise.question,
            content: exerciseTranslation?.content ?? exercise.content,
            explanation: exerciseTranslation?.explanation ?? exercise.explanation,
            hint: exerciseTranslation?.hint ?? exercise.hint,
          };
        }),
      };
    }),
  };
}

export async function listManagedCourses() {
  return prisma.course.findMany({
    orderBy: [{ level: { order: "asc" } }, { category: { order: "asc" } }, { order: "asc" }],
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
      category: { select: { slug: true, title: true } },
      curriculumLinks: {
        orderBy: [{ relation: "asc" }, { createdAt: "asc" }],
        include: { node: { select: { id: true, type: true, slug: true, title: true, contentStatus: true } } },
      },
      modules: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { lessons: true } },
          lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true, contentStatus: true } },
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
  const instructorId = input.instructorId ?? ownerId;
  const instructor = await prisma.user.findUnique({ where: { id: instructorId }, select: { id: true } });
  if (!instructor) throw new Error("Course author not found");
  const lastCourse = await prisma.course.findFirst({
    where: { levelId: level.id, categoryId: category.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

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
      order: (lastCourse?.order ?? 0) + 1,
      language: input.language,
      estimatedDuration: input.estimatedDuration,
      difficulty: nullableText(input.difficulty),
      isPublished: input.isPublished,
      contentStatus: input.isPublished ? "PUBLISHED" : "DRAFT",
      publishedAt: input.isPublished ? new Date() : null,
      isFeatured: input.isFeatured,
      courseType: input.courseType as CourseType,
      accessMode: input.accessMode as CourseAccessMode,
      isVisibleInCatalog: input.isVisibleInCatalog,
      isVisibleInSearch: input.isVisibleInSearch,
      isVisibleOnHomepage: input.isVisibleOnHomepage,
      isVisibleInRecommendations: input.isVisibleInRecommendations,
      isVisibleInLevelBlock: input.isVisibleInLevelBlock,
      isVisibleInAcademy: input.isVisibleInAcademy,
      isVisibleInStudentDashboard: input.isVisibleInStudentDashboard,
      firstFreeLessonCount: input.firstFreeLessonCount,
      accessPlan: input.accessPlan as SubscriptionPlan,
      priceAmount: input.priceAmount,
      priceCurrency: input.priceCurrency.toUpperCase(),
      learningOutcomes: input.learningOutcomes as Prisma.InputJsonValue,
      prerequisites: input.prerequisites as Prisma.InputJsonValue,
      legacyLevel: toLegacyLevel(input.levelCode),
      instructorId,
      createdById: ownerId,
      updatedById: ownerId,
    },
  });
  await writeContentAudit(ownerId, "CREATE", "Course", course.id, { slug: course.slug });
  await recordCmsContentVersion({ actorId: ownerId, entityType: "COURSE", entityId: course.id, action: "CREATED", snapshot: course });
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
  if (input.instructorId) {
    const instructor = await prisma.user.findUnique({ where: { id: input.instructorId }, select: { id: true } });
    if (!instructor) throw new Error("Course author not found");
  }

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
    ...(input.isPublished !== undefined ? { isPublished: input.isPublished, contentStatus: input.isPublished ? "PUBLISHED" : "DRAFT", publishedAt: input.isPublished ? new Date() : null, scheduledAt: null, archivedAt: null } : {}),
    ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
    ...(input.courseType ? { courseType: input.courseType as CourseType } : {}),
    ...(input.accessMode ? { accessMode: input.accessMode as CourseAccessMode } : {}),
    ...(input.isVisibleInCatalog !== undefined ? { isVisibleInCatalog: input.isVisibleInCatalog } : {}),
    ...(input.isVisibleInSearch !== undefined ? { isVisibleInSearch: input.isVisibleInSearch } : {}),
    ...(input.isVisibleOnHomepage !== undefined ? { isVisibleOnHomepage: input.isVisibleOnHomepage } : {}),
    ...(input.isVisibleInRecommendations !== undefined ? { isVisibleInRecommendations: input.isVisibleInRecommendations } : {}),
    ...(input.isVisibleInLevelBlock !== undefined ? { isVisibleInLevelBlock: input.isVisibleInLevelBlock } : {}),
    ...(input.isVisibleInAcademy !== undefined ? { isVisibleInAcademy: input.isVisibleInAcademy } : {}),
    ...(input.isVisibleInStudentDashboard !== undefined ? { isVisibleInStudentDashboard: input.isVisibleInStudentDashboard } : {}),
    ...(input.instructorId ? { instructor: { connect: { id: input.instructorId } } } : {}),
    updatedBy: { connect: { id: actorId } },
    ...(input.firstFreeLessonCount !== undefined ? { firstFreeLessonCount: input.firstFreeLessonCount } : {}),
    ...(input.accessPlan ? { accessPlan: input.accessPlan as SubscriptionPlan } : {}),
    ...(input.priceAmount !== undefined ? { priceAmount: input.priceAmount } : {}),
    ...(input.priceCurrency ? { priceCurrency: input.priceCurrency.toUpperCase() } : {}),
    ...(input.learningOutcomes !== undefined ? { learningOutcomes: input.learningOutcomes as Prisma.InputJsonValue } : {}),
    ...(input.prerequisites !== undefined ? { prerequisites: input.prerequisites as Prisma.InputJsonValue } : {}),
  };
  const course = await prisma.course.update({ where: { id: courseId }, data });
  const duration = await syncCourseEstimatedDuration(course.id);
  const savedCourse = { ...course, estimatedDuration: duration.minutes, lessonCount: duration.lessonCount };
  await writeContentAudit(actorId, "UPDATE", "Course", course.id, { slug: course.slug });
  await recordCmsContentVersion({ actorId, entityType: "COURSE", entityId: course.id, action: "UPDATED", snapshot: savedCourse });
  return savedCourse;
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
    data: {
      courseId,
      title: input.title,
      description: nullableText(input.description),
      order,
      isPublished: input.isPublished,
      contentStatus: input.isPublished ? "PUBLISHED" : "DRAFT",
      publishedAt: input.isPublished ? new Date() : null,
    },
  });
  await writeContentAudit(actorId, "CREATE", "CourseModule", courseModule.id, { courseId });
  await recordCmsContentVersion({ actorId, entityType: "COURSE_MODULE", entityId: courseModule.id, action: "CREATED", snapshot: courseModule });
  return courseModule;
}

/** Modules are the editable subcourses inside a course. Removal is handled by the CMS archive lifecycle. */
export async function updateCourseModule(actorId: string, moduleId: string, input: UpdateModuleInput) {
  const courseModule = await prisma.courseModule.update({
    where: { id: moduleId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: nullableText(input.description) } : {}),
    },
  });
  await writeContentAudit(actorId, "UPDATE", "CourseModule", courseModule.id, { courseId: courseModule.courseId });
  await recordCmsContentVersion({ actorId, entityType: "COURSE_MODULE", entityId: courseModule.id, action: "UPDATED", snapshot: courseModule });
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
  if (input.prerequisiteLessonId) {
    const prerequisite = await prisma.lesson.findUnique({ where: { id: input.prerequisiteLessonId }, select: { moduleId: true, order: true } });
    if (!prerequisite || prerequisite.moduleId !== moduleId) throw new Error("A lesson prerequisite must belong to the same module.");
    if (prerequisite.order >= order) throw new Error("A lesson must remain after its prerequisite.");
  }
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
        prerequisiteLessonId: input.prerequisiteLessonId ?? null,
        requiredPrerequisiteCompletion: input.requiredPrerequisiteCompletion,
        autoUnlockNextLesson: input.autoUnlockNextLesson,
        isPublished: input.isPublished,
        contentStatus: input.isPublished ? "PUBLISHED" : "DRAFT",
        publishedAt: input.isPublished ? new Date() : null,
        isFree: input.isFree,
      },
    });
    await tx.course.update({ where: { id: courseModule.courseId }, data: { lessonCount: { increment: 1 } } });
    return created;
  });
  await writeContentAudit(actorId, "CREATE", "Lesson", lesson.id, { moduleId });
  await recordCmsContentVersion({ actorId, entityType: "LESSON", entityId: lesson.id, action: "CREATED", snapshot: lesson });
  await syncCourseEstimatedDuration(courseModule.courseId);
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
  await recordCmsContentVersion({ actorId, entityType: "LESSON_BLOCK", entityId: block.id, action: "CREATED", snapshot: block });
  await syncCourseDurationForLessonBlock(block.id);
  return block;
}

export async function updateLessonBlock(actorId: string, blockId: string, input: unknown) {
  const value = updateLessonBlockSchema.parse(input);
  const block = await prisma.lessonBlock.update({
    where: { id: blockId },
    data: {
      ...(value.title !== undefined ? { title: nullableText(value.title) } : {}),
      ...(value.content !== undefined ? { content: toPrismaJson(value.content) } : {}),
      ...(value.settings !== undefined ? { settings: toPrismaJson(value.settings) } : {}),
      ...(value.isRequired !== undefined ? { isRequired: value.isRequired } : {}),
    },
  });
  await writeContentAudit(actorId, "UPDATE", "LessonBlock", block.id, { lessonId: block.lessonId });
  await recordCmsContentVersion({ actorId, entityType: "LESSON_BLOCK", entityId: block.id, action: "UPDATED", snapshot: block });
  await syncCourseDurationForLessonBlock(block.id);
  return block;
}

export async function duplicateLessonBlock(actorId: string, blockId: string) {
  const source = await prisma.lessonBlock.findUnique({ where: { id: blockId } });
  if (!source) throw new Error("Lesson block not found");
  const order = await nextOrder(
    () => prisma.lessonBlock.findFirst({ where: { lessonId: source.lessonId }, orderBy: { order: "desc" }, select: { order: true } }),
  );
  const block = await prisma.lessonBlock.create({
    data: { lessonId: source.lessonId, type: source.type, title: source.title ? `${source.title} (copy)` : null, content: source.content ?? Prisma.JsonNull, settings: source.settings ?? Prisma.JsonNull, order, isRequired: source.isRequired, contentStatus: "DRAFT" },
  });
  await writeContentAudit(actorId, "CREATE", "LessonBlock", block.id, { lessonId: block.lessonId, copiedFrom: source.id });
  await recordCmsContentVersion({ actorId, entityType: "LESSON_BLOCK", entityId: block.id, action: "CREATED", snapshot: block });
  await syncCourseDurationForLessonBlock(block.id);
  return block;
}

/**
 * Removes a disposable block while preserving learner history. A block with
 * submitted work is archived instead of being physically deleted, so attempts
 * and homework never disappear from reporting or a learner's history.
 */
export async function removeLessonBlock(actorId: string, blockId: string) {
  const block = await prisma.lessonBlock.findUnique({
    where: { id: blockId },
    include: { lesson: { include: { module: { select: { courseId: true } } } } },
  });
  if (!block) throw new Error("Lesson block not found");

  const [attemptCount, homeworkCount, mistakeCount] = await Promise.all([
    prisma.exerciseAttempt.count({ where: { exercise: { lessonBlockId: block.id } } }),
    prisma.homeworkSubmission.count({ where: { lessonBlockId: block.id } }),
    prisma.userMistake.count({ where: { exercise: { is: { lessonBlockId: block.id } } } }),
  ]);
  const hasLearnerHistory = attemptCount + homeworkCount + mistakeCount > 0;

  if (hasLearnerHistory) {
    const archived = await prisma.lessonBlock.update({
      where: { id: block.id },
      data: { contentStatus: "ARCHIVED", archivedAt: new Date(), scheduledAt: null, publishedAt: null },
    });
    await writeContentAudit(actorId, "ARCHIVE", "LessonBlock", archived.id, {
      lessonId: archived.lessonId,
      attemptCount,
      homeworkCount,
      mistakeCount,
    });
    await recordCmsContentVersion({
      actorId,
      entityType: "LESSON_BLOCK",
      entityId: archived.id,
      action: "ARCHIVED",
      snapshot: archived,
      note: "Archived instead of deletion because learner history exists.",
    });
    await syncLessonEstimatedDuration(archived.lessonId);
    await syncCourseEstimatedDuration(block.lesson.module.courseId);
    return { action: "ARCHIVED" as const, id: archived.id };
  }

  await prisma.$transaction(async (tx) => {
    await tx.lessonBlock.delete({ where: { id: block.id } });
    const remaining = await tx.lessonBlock.findMany({
      where: { lessonId: block.lessonId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    await Promise.all(remaining.map((item, index) => tx.lessonBlock.update({
      where: { id: item.id },
      data: { order: index + 1 },
    })));
  });
  await writeContentAudit(actorId, "DELETE", "LessonBlock", block.id, { lessonId: block.lessonId });
  await recordCmsContentVersion({
    actorId,
    entityType: "LESSON_BLOCK",
    entityId: block.id,
    action: "ARCHIVED",
    snapshot: block,
    note: "Removed before learners created history.",
  });
  await syncLessonEstimatedDuration(block.lessonId);
  await syncCourseEstimatedDuration(block.lesson.module.courseId);
  return { action: "DELETED" as const, id: block.id };
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
  const engineKey = resolveExerciseEngineKey(input.engineKey, input.type);
  const variantKey = nullableText(input.variantKey) ?? getDefaultExerciseSubtype(engineKey);
  const configurationIssues = validateExerciseConfiguration({
    type: input.type,
    engineKey,
    variantKey,
    instruction: input.instruction,
    question: input.question,
    content: input.content,
    correctAnswer: input.correctAnswer,
  });
  if (configurationIssues.length) throw new Error(configurationIssues.join(" "));
  const exercise = await prisma.exercise.create({
    data: {
      lessonBlockId,
      type: input.type,
      engineKey,
      variantKey,
      instruction: input.instruction,
      question: input.question,
      content: toPrismaJson(input.content),
      correctAnswer: toPrismaJson(input.correctAnswer)!,
      alternativeAnswers: input.alternativeAnswers ? (input.alternativeAnswers as Prisma.InputJsonValue) : undefined,
      explanation: nullableText(input.explanation),
      hint: nullableText(input.hint),
      hintsEnabled: input.hintsEnabled,
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
  await recordCmsContentVersion({ actorId, entityType: "EXERCISE", entityId: exercise.id, action: "CREATED", snapshot: exercise });
  await syncCourseDurationForLessonBlock(lessonBlockId);
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
      contentStatus: "PUBLISHED",
      publishedAt: new Date(),
      britishTranscription: nullableText(value.britishTranscription),
      americanTranscription: nullableText(value.americanTranscription),
      meanings: { create: value.meanings.map((meaning, index) => ({ ...meaning, order: index + 1 })) },
    },
    include: { meanings: true },
  });
  await writeContentAudit(actorId, "CREATE", "Word", word.id, { lemma: word.lemma });
  await recordCmsContentVersion({ actorId, entityType: "WORD", entityId: word.id, action: "CREATED", snapshot: word });
  return word;
}

export async function createGrammarTopic(actorId: string, input: unknown) {
  const value = createGrammarTopicSchema.parse(input);
  const slug = value.slug ?? slugify(value.title);
  const topic = await prisma.grammarTopic.create({
    data: { ...value, slug, contentStatus: "PUBLISHED", publishedAt: new Date() },
  });
  await writeContentAudit(actorId, "CREATE", "GrammarTopic", topic.id, { slug: topic.slug });
  await recordCmsContentVersion({ actorId, entityType: "GRAMMAR_TOPIC", entityId: topic.id, action: "CREATED", snapshot: topic });
  return topic;
}

/**
 * Evaluates an exercise from an actually public/free lesson without creating a
 * user, attempt, mistake, progress row, or reward. This lets a visitor try
 * the real exercise UI before registration while keeping learner history tied
 * only to an authenticated account.
 */
export async function evaluatePublicExerciseAttempt(exerciseId: string, input: unknown) {
  const value = submitExerciseSchema.parse(input);
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: {
      contentStatus: true,
      correctAnswer: true,
      alternativeAnswers: true,
      content: true,
      engineKey: true,
      explanation: true,
      hint: true,
      allowInstantCheck: true,
      lessonBlock: { select: { contentStatus: true, lessonId: true } },
    },
  });
  if (!exercise || exercise.contentStatus !== "PUBLISHED" || exercise.lessonBlock.contentStatus !== "PUBLISHED") throw new Error("Exercise is unavailable.");
  const access = await canAccessLesson(null, exercise.lessonBlock.lessonId);
  if (!access.allowed) throw new Error("This exercise is available after access is granted.");
  const submittedAnswer = normalizeCompactToBeMatchingAnswer(value.answer, exercise.correctAnswer, exercise.engineKey) as JsonValue;
  const isCorrect = answerMatches(
    submittedAnswer,
    exercise.correctAnswer,
    exercise.alternativeAnswers,
    contentWithOrderSensitiveAnswerValidation(exercise.content, exercise.engineKey),
  );
  return {
    attemptNumber: 0,
    isCorrect,
    scoreAwarded: 0,
    score: 0,
    explanation: exercise.allowInstantCheck ? exercise.explanation : null,
    correctAnswer: exercise.allowInstantCheck ? exercise.correctAnswer : null,
    hint: exercise.hint,
    feedback: exercise.allowInstantCheck ? getExerciseFeedback(exercise.content) : null,
    solution: null,
  };
}

export async function submitExerciseAttempt(userId: string, exerciseId: string, input: unknown, reviewRunId?: string) {
  const value = submitExerciseSchema.parse(input);
  const exerciseForAccess = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { lessonBlock: { select: { lessonId: true } } },
  });
  if (!exerciseForAccess) throw new Error("Exercise not found");
  const access = await canAccessLesson(userId, exerciseForAccess.lessonBlock.lessonId);
  const reviewCanBypassSequence = !access.allowed
    && (access.reason === "SEQUENCE_LOCKED" || access.reason === "PREREQUISITE_LOCKED")
    && Boolean(reviewRunId && await prisma.mistakeReviewRun.findFirst({
      where: {
        id: reviewRunId,
        userId,
        status: "ACTIVE",
        items: { some: { mistake: { exerciseId, lessonId: exerciseForAccess.lessonBlock.lessonId, resolvedAt: null } } },
      },
      select: { id: true },
    }));
  if (!access.allowed && !reviewCanBypassSequence) throw new Error(access.reason === "PREMIUM_REQUIRED" ? "Premium access is required for this lesson" : "You cannot access this lesson");

  return prisma.$transaction(async (tx) => {
    const exercise = await tx.exercise.findUnique({
      where: { id: exerciseId },
      include: { lessonBlock: { select: { lessonId: true, lesson: { select: { module: { select: { courseId: true } } } } } } },
    });
    if (!exercise) throw new Error("Exercise not found");
    const submittedAnswer = normalizeCompactToBeMatchingAnswer(value.answer, exercise.correctAnswer, exercise.engineKey) as JsonValue;

    if (value.idempotencyKey) {
      const existing = await tx.exerciseAttempt.findUnique({
        where: { userId_exerciseId_idempotencyKey: { userId, exerciseId, idempotencyKey: value.idempotencyKey } },
        select: { id: true, attemptNumber: true, isCorrect: true, scoreAwarded: true, solutionOpened: true, createdAt: true },
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
          feedback: exercise.allowInstantCheck ? getExerciseFeedback(exercise.content) : null,
          solution: { available: existing.isCorrect === false, cost: EXERCISE_SOLUTION_XP_COST, opened: existing.solutionOpened },
          openMistakeCount: await tx.userMistake.count({ where: { userId, resolvedAt: null } }),
        };
      }
    }

    const isCorrect = answerMatches(
      submittedAnswer,
      exercise.correctAnswer,
      exercise.alternativeAnswers,
      contentWithOrderSensitiveAnswerValidation(exercise.content, exercise.engineKey),
    );
    const previous = await tx.exerciseAttempt.findFirst({
      where: { userId, exerciseId },
      orderBy: { attemptNumber: "desc" },
      select: { attemptNumber: true, solutionOpened: true },
    });
    const openedEarlierSolution = previous?.solutionOpened || Boolean(await tx.exerciseAttempt.findFirst({
      where: { userId, exerciseId, solutionOpened: true },
      select: { id: true },
    }));
    // A solution remains useful after an error, but it cannot be used to earn
    // the full score on a later attempt. Hints are deliberately free: their
    // use is still tracked for learning analytics, never for a score penalty.
    const maximumCorrectScore = openedEarlierSolution ? Math.floor(exercise.basePoints / 2) : exercise.basePoints;
    const scoreAwarded = isCorrect ? maximumCorrectScore : -exercise.basePoints;
    const attempt = await tx.exerciseAttempt.create({
      data: {
        userId,
        exerciseId,
        lessonId: exercise.lessonBlock.lessonId,
        idempotencyKey: value.idempotencyKey,
        submittedAnswer: toPrismaJson(submittedAnswer)!,
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
            submittedAnswer: toPrismaJson(submittedAnswer),
            expectedAnswer: toPrismaJson(exercise.correctAnswer as JsonValue),
            explanation: exercise.explanation,
            mistakeType: mistakeTypeForExercise(exercise.type),
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
            submittedAnswer: toPrismaJson(submittedAnswer),
            expectedAnswer: toPrismaJson(exercise.correctAnswer as JsonValue),
            explanation: exercise.explanation,
            mistakeType: mistakeTypeForExercise(exercise.type),
          },
        });
      }
    } else {
      // An error remains in the learner's review queue only until the same
      // exercise is answered correctly.  This keeps the dashboard counter
      // aligned with work that still needs attention.
      await tx.userMistake.updateMany({
        where: { userId, exerciseId, resolvedAt: null },
        data: { resolvedAt: new Date(), resolutionCount: { increment: 1 } },
      });
    }

    const attempts = await tx.exerciseAttempt.findMany({
      where: { userId, lessonId: exercise.lessonBlock.lessonId },
      select: { exerciseId: true, isCorrect: true, scoreAwarded: true, attemptNumber: true, createdAt: true, hintUsed: true, solutionOpened: true },
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
        hintsUsed: attempts.filter((attempt) => attempt.hintUsed).length,
        solutionsOpened: attempts.filter((attempt) => attempt.solutionOpened).length,
        lastSeenAt: new Date(),
      },
      update: {
        score: result.score,
        correctAnswers: result.correctAnswers,
        incorrectAnswers: result.incorrectAnswers,
        hintsUsed: attempts.filter((attempt) => attempt.hintUsed).length,
        solutionsOpened: attempts.filter((attempt) => attempt.solutionOpened).length,
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
      feedback: exercise.allowInstantCheck ? getExerciseFeedback(exercise.content) : null,
      solution: { available: !isCorrect, cost: EXERCISE_SOLUTION_XP_COST, opened: openedEarlierSolution },
      motivationReward,
      openMistakeCount: await tx.userMistake.count({ where: { userId, resolvedAt: null } }),
    };
  });
}

/**
 * Opens an exercise solution once, after the learner has made an attempt. The
 * XP debit is recorded with a deterministic key so a double click, retry, or
 * network replay can never charge the learner twice.
 */
export async function openExerciseSolution(userId: string, exerciseId: string) {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: {
      id: true,
      contentStatus: true,
      correctAnswer: true,
      explanation: true,
      content: true,
      lessonBlock: { select: { contentStatus: true, lessonId: true } },
    },
  });
  if (!exercise || exercise.contentStatus !== "PUBLISHED" || exercise.lessonBlock.contentStatus !== "PUBLISHED") throw new Error("Exercise is unavailable.");
  const access = await canAccessLesson(userId, exercise.lessonBlock.lessonId);
  if (!access.allowed) throw new Error("You cannot access this lesson.");

  const latestAttempt = await prisma.exerciseAttempt.findFirst({
    where: { userId, exerciseId },
    orderBy: { attemptNumber: "desc" },
    select: { id: true, solutionOpened: true },
  });
  if (!latestAttempt) throw new Error("Answer this exercise before opening its solution.");

  const idempotencyKey = `exercise-solution-xp:${userId}:${exerciseId}`;
  const previousCharge = await prisma.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { id: true } });
  if (previousCharge || latestAttempt.solutionOpened) {
    if (!latestAttempt.solutionOpened) await prisma.exerciseAttempt.update({ where: { id: latestAttempt.id }, data: { solutionOpened: true } });
    const level = await prisma.userLevel.upsert({ where: { userId }, create: { userId }, update: {} });
    return { alreadyOpened: true, cost: 0, balance: level.lifetimeExperience, correctAnswer: exercise.correctAnswer, explanation: exercise.explanation, feedback: getExerciseFeedback(exercise.content) };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const level = await tx.userLevel.upsert({ where: { userId }, create: { userId }, update: {} });
      const debited = await tx.userLevel.updateMany({
        where: { id: level.id, lifetimeExperience: { gte: EXERCISE_SOLUTION_XP_COST } },
        data: { lifetimeExperience: { decrement: EXERCISE_SOLUTION_XP_COST } },
      });
      if (!debited.count) throw new Error("You need at least 2 XP to show this solution.");
      const reducedLevel = await tx.userLevel.findUniqueOrThrow({ where: { id: level.id } });
      const updatedLevel = await tx.userLevel.update({ where: { id: level.id }, data: calculateUserLevel(reducedLevel.lifetimeExperience) });
      await tx.experienceTransaction.create({
        data: {
          userId,
          amount: -EXERCISE_SOLUTION_XP_COST,
          type: "SOLUTION_PURCHASE",
          sourceType: "EXERCISE_SOLUTION",
          sourceId: exerciseId,
          idempotencyKey,
          localDate: new Date().toISOString().slice(0, 10),
          description: "Exercise solution",
        },
      });
      await tx.exerciseAttempt.update({ where: { id: latestAttempt.id }, data: { solutionOpened: true } });
      return { alreadyOpened: false, cost: EXERCISE_SOLUTION_XP_COST, balance: updatedLevel.lifetimeExperience, correctAnswer: exercise.correctAnswer, explanation: exercise.explanation, feedback: getExerciseFeedback(exercise.content) };
    });
  } catch (error) {
    // A concurrent request can lose the unique idempotency-key race only after
    // its transaction has rolled back. Return the completed first request.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const charge = await prisma.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { id: true } });
      if (charge) {
        const level = await prisma.userLevel.upsert({ where: { userId }, create: { userId }, update: {} });
        return { alreadyOpened: true, cost: 0, balance: level.lifetimeExperience, correctAnswer: exercise.correctAnswer, explanation: exercise.explanation, feedback: getExerciseFeedback(exercise.content) };
      }
    }
    throw error;
  }
}

/** Returns one unattempted published exercise from the same lesson block. */
export async function getExtraPracticeExercise(userId: string, exerciseId: string) {
  const source = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { id: true, allowExtraExercise: true, lessonBlockId: true, lessonBlock: { select: { lessonId: true } } },
  });
  if (!source || !source.allowExtraExercise) throw new Error("Extra practice is not available for this exercise.");
  const access = await canAccessLesson(userId, source.lessonBlock.lessonId);
  if (!access.allowed) throw new Error("You cannot access this lesson.");
  const hasAttempt = await prisma.exerciseAttempt.findFirst({ where: { userId, exerciseId }, select: { id: true } });
  if (!hasAttempt) throw new Error("Answer this exercise before requesting extra practice.");

  return prisma.exercise.findFirst({
    where: { id: { not: exerciseId }, lessonBlockId: source.lessonBlockId, contentStatus: "PUBLISHED", attempts: { none: { userId } } },
    orderBy: [{ difficulty: "asc" }, { order: "asc" }],
    select: { id: true, type: true, engineKey: true, variantKey: true, instruction: true, question: true, content: true, explanation: true, hint: true, hintsEnabled: true, basePoints: true, timeLimitSeconds: true, solutionCost: true, allowInstantCheck: true, allowExtraExercise: true },
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
    const completedThisVisit = new Set(value.completedBlockIds);
    const allRequiredBlocksComplete = blocks.filter((block) => block.isRequired).every((block) => completedThisVisit.has(block.id));
    const [attempts, sessionTime] = await Promise.all([
      tx.exerciseAttempt.findMany({
        where: { userId, lessonId },
        select: { exerciseId: true, isCorrect: true, scoreAwarded: true, attemptNumber: true, createdAt: true, hintUsed: true, solutionOpened: true },
      }),
      tx.learningSession.aggregate({ where: { userId, lessonId }, _sum: { activeSeconds: true } }),
    ]);
    const result = calculateLessonResult(attempts);
    const hintsUsed = attempts.filter((attempt) => attempt.hintUsed).length;
    const solutionsOpened = attempts.filter((attempt) => attempt.solutionOpened).length;
    // Browser elapsed time is intentionally ignored. Heartbeats are validated
    // on the server for interaction, replay and excessive gaps.
    const trustedSeconds = Math.max(0, sessionTime._sum.activeSeconds ?? 0);
    const now = new Date();
    const previousProgress = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { status: true, completedBlocks: true, completedAt: true },
    });
    const wasCompleted = previousProgress?.status === "COMPLETED";
    const completedNow = value.complete && allRequiredBlocksComplete;
    // A learner may reopen a finished lesson for practice. That new attempt
    // must never turn the historical completion back into STARTED.
    const status = resolveLessonProgressStatus(previousProgress?.status, value.complete, allRequiredBlocksComplete);
    const persistedCompletedBlockIds = wasCompleted
      ? [...new Set([...stringIdsFromJson(previousProgress?.completedBlocks).filter((blockId) => allowed.has(blockId)), ...value.completedBlockIds])]
      : value.completedBlockIds;
    const completionPercent = status === "COMPLETED"
      ? 100
      : blocks.length === 0
        ? 0
        : Math.round((completedThisVisit.size / blocks.length) * 100);
    const progress = await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        status,
        completedBlocks: persistedCompletedBlockIds as Prisma.InputJsonValue,
        currentBlockId: value.currentBlockId ?? null,
        completionPercent,
        score: result.score,
        grade: status === "COMPLETED" ? result.grade : null,
        correctAnswers: result.correctAnswers,
        incorrectAnswers: result.incorrectAnswers,
        hintsUsed,
        solutionsOpened,
        activeSeconds: trustedSeconds,
        totalSeconds: trustedSeconds,
        lastSeenAt: now,
        completedAt: completedNow ? now : null,
      },
      update: {
        status,
        completedBlocks: persistedCompletedBlockIds as Prisma.InputJsonValue,
        currentBlockId: value.currentBlockId ?? null,
        completionPercent,
        score: result.score,
        grade: status === "COMPLETED" ? result.grade : null,
        correctAnswers: result.correctAnswers,
        incorrectAnswers: result.incorrectAnswers,
        hintsUsed,
        solutionsOpened,
        activeSeconds: trustedSeconds,
        totalSeconds: trustedSeconds,
        lastSeenAt: now,
        completedAt: wasCompleted ? previousProgress?.completedAt ?? now : completedNow ? now : null,
      },
    });
    let motivationReward: Awaited<ReturnType<typeof recordLessonCompletion>> | null = null;
    if (completedNow && !wasCompleted) {
      const lesson = await tx.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true } } } });
      if (lesson) motivationReward = await recordLessonCompletion(tx, userId, lessonId, lesson.module.courseId, true);
    }
    return { ...progress, motivationReward, firstCompletion: completedNow && !wasCompleted };
  });
  if (saved.firstCompletion) {
    try {
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { title: true, module: { select: { course: { select: { title: true } } } } } });
      await notificationService.createNotification({ userId, type: "LESSON_COMPLETED", idempotencyKey: `lesson-completed-notification:${userId}:${lessonId}`, entityType: "Lesson", entityId: lessonId, title: "Lesson completed", message: lesson ? `Great work — you completed ${lesson.title}.` : "Great work — you completed a lesson.", actionUrl: "/dashboard/lessons", actionLabel: "Continue learning", payload: lesson ? { lessonTitle: lesson.title, courseTitle: lesson.module.course.title } : undefined });
    } catch (error) { console.error("[communications] lesson notification failed", error); }
  }
  return saved;
}

type LatestExerciseResult = {
  exerciseId: string;
  blockId: string;
  isCorrect: boolean;
};

type LessonAttemptAccuracy = {
  correctAnswers: number;
  incorrectAnswers: number;
  attemptedExercises: number;
  exerciseResults: LatestExerciseResult[];
};

const emptyLessonAttemptAccuracy = (): LessonAttemptAccuracy => ({
  correctAnswers: 0,
  incorrectAnswers: 0,
  attemptedExercises: 0,
  exerciseResults: [],
});

/**
 * Returns the most recent answer for every exercise, rather than the lifetime
 * number of attempts. This is intentionally presentation-only: motivation
 * rewards continue to use their own first-success idempotency rules.
 */
async function getLatestLessonAttemptAccuracy(userId: string, lessonIds: string[]) {
  const accuracyByLesson = new Map<string, LessonAttemptAccuracy>();
  if (lessonIds.length === 0) return accuracyByLesson;

  const attempts = await prisma.exerciseAttempt.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      lessonId: true,
      exerciseId: true,
      isCorrect: true,
      exercise: { select: { lessonBlockId: true } },
    },
  });

  const seenExerciseIds = new Set<string>();
  for (const attempt of attempts) {
    if (seenExerciseIds.has(attempt.exerciseId)) continue;
    seenExerciseIds.add(attempt.exerciseId);

    const accuracy = accuracyByLesson.get(attempt.lessonId) ?? emptyLessonAttemptAccuracy();
    accuracy.attemptedExercises += 1;
    if (attempt.isCorrect) accuracy.correctAnswers += 1;
    else accuracy.incorrectAnswers += 1;
    accuracy.exerciseResults.push({
      exerciseId: attempt.exerciseId,
      blockId: attempt.exercise.lessonBlockId,
      isCorrect: attempt.isCorrect,
    });
    accuracyByLesson.set(attempt.lessonId, accuracy);
  }

  return accuracyByLesson;
}

/**
 * XP is an immutable ledger, not a display estimate. Map every credit for a
 * lesson (its completion and first-correct exercises) back to that lesson so
 * learner-facing screens never show a configured reward that was not earned.
 */
async function getLessonExperienceEarned(userId: string, lessonIds: string[]) {
  const experienceByLesson = new Map<string, number>();
  if (lessonIds.length === 0) return experienceByLesson;

  const [lessonRewards, correctAttempts] = await Promise.all([
    prisma.experienceTransaction.findMany({
      where: { userId, type: "LESSON_COMPLETED", sourceId: { in: lessonIds } },
      select: { sourceId: true, amount: true },
    }),
    prisma.exerciseAttempt.findMany({
      where: { userId, lessonId: { in: lessonIds }, isCorrect: true },
      select: { lessonId: true, exerciseId: true },
    }),
  ]);

  for (const reward of lessonRewards) {
    experienceByLesson.set(reward.sourceId, (experienceByLesson.get(reward.sourceId) ?? 0) + reward.amount);
  }

  const lessonIdByExerciseId = new Map<string, string>();
  for (const attempt of correctAttempts) lessonIdByExerciseId.set(attempt.exerciseId, attempt.lessonId);
  const exerciseIds = [...lessonIdByExerciseId.keys()];
  if (exerciseIds.length === 0) return experienceByLesson;

  const exerciseRewards = await prisma.experienceTransaction.findMany({
    where: { userId, type: "EXERCISE_CORRECT", sourceId: { in: exerciseIds } },
    select: { sourceId: true, amount: true },
  });
  for (const reward of exerciseRewards) {
    const lessonId = lessonIdByExerciseId.get(reward.sourceId);
    if (lessonId) experienceByLesson.set(lessonId, (experienceByLesson.get(lessonId) ?? 0) + reward.amount);
  }
  return experienceByLesson;
}

export async function getLessonProgress(userId: string, lessonId: string) {
  const [progress, accuracyByLesson, experienceByLesson] = await Promise.all([
    prisma.lessonProgress.findUnique({
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
      hintsUsed: true,
      solutionsOpened: true,
      activeSeconds: true,
      totalSeconds: true,
      lastSeenAt: true,
    },
    }),
    getLatestLessonAttemptAccuracy(userId, [lessonId]),
    getLessonExperienceEarned(userId, [lessonId]),
  ]);

  if (!progress) return null;
  return {
    ...progress,
    completionPercent: progress.status === "COMPLETED" ? 100 : progress.completionPercent,
    attemptAccuracy: accuracyByLesson.get(lessonId) ?? emptyLessonAttemptAccuracy(),
    experienceEarned: experienceByLesson.get(lessonId) ?? 0,
  };
}

export async function listLessonProgressByLessonIds(userId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return [];
  const [progress, accuracyByLesson, experienceByLesson] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: lessonIds } },
      select: { lessonId: true, status: true, completionPercent: true, score: true, grade: true },
    }),
    getLatestLessonAttemptAccuracy(userId, lessonIds),
    getLessonExperienceEarned(userId, lessonIds),
  ]);
  return progress.map((item) => ({
    ...item,
    completionPercent: item.status === "COMPLETED" ? 100 : item.completionPercent,
    attemptAccuracy: accuracyByLesson.get(item.lessonId) ?? emptyLessonAttemptAccuracy(),
    experienceEarned: experienceByLesson.get(item.lessonId) ?? 0,
  }));
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
    where: { userId, resolvedAt: null },
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
  return prisma.userMistake.updateMany({
    where: { id: mistakeId, userId, resolvedAt: null },
    data: { resolvedAt: new Date(), resolutionCount: { increment: 1 } },
  });
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
