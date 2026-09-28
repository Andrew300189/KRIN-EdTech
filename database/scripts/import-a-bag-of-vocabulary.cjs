/*
 * Authored vocabulary course: 30 "a bag of" food phrases in six short lessons
 * of five phrase-blocks, plus a review lesson of six five-card blocks.
 * --validate performs no database writes. A legacy three-lesson module is
 * archived when the course is first installed. Re-running --publish upgrades
 * v2 blocks in place without deleting exercise attempts or earned XP.
 *
 *   node database/scripts/import-a-bag-of-vocabulary.cjs --validate
 *   node database/scripts/import-a-bag-of-vocabulary.cjs --publish
 */
try {
  require("dotenv").config({ path: ".env", quiet: true });
} catch (error) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;
}

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");

const COURSE_SLUG = "a-bag-of-food-vocabulary";
const publishRequested = process.argv.includes("--publish");

// English prompt, Ukrainian answer, Russian answer. Keep the user's authored
// Ukrainian phrases intact; the Russian column serves the Russian route.
const phrases = [
  ["a bag of rice", "пакет рису", "пакет риса"],
  ["a bag of flour", "пакет борошна", "пакет муки"],
  ["a bag of apples", "пакет яблук", "пакет яблок"],
  ["a bag of carrots", "пакет моркви", "пакет моркови"],
  ["a bag of oranges", "пакет апельсинів", "пакет апельсинов"],
  ["a bag of sweets", "пакет цукерок", "пакет конфет"],
  ["a bag of popcorn", "пакет попкорну", "пакет попкорна"],
  ["a bag of coffee beans", "пакет кавових зерен", "пакет кофейных зёрен"],
  ["a bag of frozen vegetables", "пакет заморожених овочів", "пакет замороженных овощей"],
  ["a bag of potatoes", "мішок картоплі", "мешок картофеля"],
  ["a bag of pears", "пакет груш", "пакет груш"],
  ["a bag of grapes", "пакет винограду", "пакет винограда"],
  ["a bag of lemons", "пакет лимонів", "пакет лимонов"],
  ["a bag of nuts", "пакет горіхів", "пакет орехов"],
  ["a bag of almonds", "пакет мигдалю", "пакет миндаля"],
  ["a bag of peanuts", "пакет арахісу", "пакет арахиса"],
  ["a bag of dried fruit", "пакет сухофруктів", "пакет сухофруктов"],
  ["a bag of raisins", "пакет родзинок", "пакет изюма"],
  ["a bag of pasta", "пакет макаронів", "пакет макарон"],
  ["a bag of lentils", "пакет сочевиці", "пакет чечевицы"],
  ["a bag of oats", "пакет вівсяних пластівців", "пакет овсяных хлопьев"],
  ["a bag of cereal", "пакет сухого сніданку", "пакет сухого завтрака"],
  ["a bag of spinach", "пакет шпинату", "пакет шпината"],
  ["a bag of lettuce", "пакет листя салату", "пакет листьев салата"],
  ["a bag of frozen berries", "пакет заморожених ягід", "пакет замороженных ягод"],
  ["a bag of frozen peas", "пакет замороженого горошку", "пакет замороженного горошка"],
  ["a bag of frozen chips", "пакет замороженої картоплі фрі", "пакет замороженного картофеля фри"],
  ["a bag of bread rolls", "пакет булочок", "пакет булочек"],
  ["a bag of bagels", "пакет бейглів", "пакет бейглов"],
  ["a bag of marshmallows", "пакет маршмелоу", "пакет маршмеллоу"],
];

const lessonCopy = [
  { uk: "1. Перші покупки", ru: "1. Первые покупки" },
  { uk: "2. Смаколики та овочі", ru: "2. Сладости и овощи" },
  { uk: "3. Фрукти й горіхи", ru: "3. Фрукты и орехи" },
  { uk: "4. Сухофрукти й крупи", ru: "4. Сухофрукты и крупы" },
  { uk: "5. Зелень і заморожені продукти", ru: "5. Зелень и замороженные продукты" },
  { uk: "6. Пекарня і повторення", ru: "6. Пекарня и повторение" },
  { uk: "7. Повторення всіх 30 фраз", ru: "7. Повторение всех 30 фраз" },
];

const courseCopy = {
  uk: {
    title: "A bag of: 30 фраз про продукти",
    shortDescription: "Навчіться впевнено говорити про пакети та мішки з продуктами англійською: 30 фраз, вимова й повторення.",
    fullDescription: "Шість уроків по п’ять коротких блоків: для кожної фрази п’ять різних завдань. Підсумкове повторення поділено на блоки по п’ять фраз.",
  },
  ru: {
    title: "A bag of: 30 фраз о продуктах",
    shortDescription: "Научитесь говорить о пакетах и мешках с продуктами по-английски: 30 фраз, произношение и повторение.",
    fullDescription: "Шесть уроков по пять коротких блоков: для каждой фразы пять разных заданий. Итоговое повторение разделено на блоки по пять фраз.",
  },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeLemma(value) {
  return value.toLocaleLowerCase("en").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function localizedTranslations() {
  return {
    uk: Object.fromEntries(phrases.map(([en, uk]) => [en, uk])),
    ru: Object.fromEntries(phrases.map(([en, , ru]) => [en, ru])),
  };
}

function stageCount(wordCount) { return wordCount * 5; }

function lifecycle() {
  return publishRequested
    ? { isPublished: true, contentStatus: "PUBLISHED", publishedAt: new Date(), scheduledAt: null, archivedAt: null }
    : { isPublished: false, contentStatus: "DRAFT", publishedAt: null, scheduledAt: null, archivedAt: null };
}

function blockLifecycle() {
  const { isPublished: _isPublished, ...state } = lifecycle();
  return state;
}

async function createShortBlocks(tx, lessonId, group, reviewAll, state) {
  const partCount = reviewAll ? 6 : 5;
  const translations = localizedTranslations();
  for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
    const title = reviewAll ? `Повторення · фрази ${partIndex * 5 + 1}–${partIndex * 5 + 5}` : `Блок ${partIndex + 1} · ${group[partIndex][0]}`;
    const russianTitle = reviewAll ? `Повторение · фразы ${partIndex * 5 + 1}–${partIndex * 5 + 5}` : title;
    const block = await tx.lessonBlock.create({
      data: {
        lessonId, type: "VOCABULARY", title,
        content: { text: reviewAll ? "П'ять коротких завдань на повторення." : "П'ять різних завдань для однієї фрази.", engine: "bag-story", newWordCount: reviewAll ? 5 : 1 },
        settings: { engine: "bag-story", version: 3, source: "course-lesson-vocabulary", localizedTranslations: translations, localizationVersion: 1, newWordCount: reviewAll ? 5 : 1, reviewAll, partIndex, partCount },
        order: partIndex + 1, isRequired: true, ...state,
      }, select: { id: true },
    });
    await tx.lessonBlockTranslation.createMany({ data: [
      { lessonBlockId: block.id, locale: "uk", title, content: { text: "Короткий блок із п'яти завдань." }, contentStatus: state.contentStatus, publishedAt: state.publishedAt },
      { lessonBlockId: block.id, locale: "ru", title: russianTitle, content: { text: "Короткий блок из пяти заданий." }, contentStatus: state.contentStatus, publishedAt: state.publishedAt },
    ] });
    await tx.exercise.createMany({ data: Array.from({ length: 5 }, (_, index) => ({
      lessonBlockId: block.id, type: "TEXT_INPUT", engineKey: "text-input", variantKey: "BAG_STORY_STAGE",
      instruction: "Серверний етап засвоєння фрази.", question: `Bag story stage ${partIndex * 5 + index + 1}`,
      content: { engine: "bag-story", stage: partIndex * 5 + index + 1 }, correctAnswer: "server-owned",
      explanation: "This stage is evaluated by the bag story engine.", hintsEnabled: false,
      difficulty: 1, basePoints: 1, allowInstantCheck: true, allowExtraExercise: false,
      order: index + 1, ...state,
    })) });
  }
}

async function upgradeShortCourse(prisma, existing, counts) {
  const lessons = existing.modules.flatMap((module) => module.lessons).filter((lesson) => /^a-bag-of-story-0[1-7]$/.test(lesson.slug)).sort((left, right) => left.slug.localeCompare(right.slug));
  assert(lessons.length === 7, "Expected seven published A bag of lessons before upgrade.");
  assert(lessons.every((lesson) => lesson.blocks.filter((block) => block.settings?.engine === "bag-story" && block.contentStatus === "PUBLISHED").length === 1), "Expected one current bag-story block per lesson.");
  assert(lessons.every((lesson, index) => {
    const block = lesson.blocks.find((item) => item.settings?.engine === "bag-story" && item.contentStatus === "PUBLISHED");
    return Number(block?.settings?.version) === 2 && block?._count.exercises === (index === 6 ? 120 : 1885);
  }), "Published lessons no longer match the seven original v2 blocks; no changes were made.");
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const [lessonIndex, lesson] of lessons.entries()) {
      const oldBlock = lesson.blocks.find((block) => block.settings?.engine === "bag-story" && block.contentStatus === "PUBLISHED");
      const group = lessonIndex === 6 ? phrases : phrases.slice(lessonIndex * 5, lessonIndex * 5 + 5);
      await tx.exercise.updateMany({ where: { lessonBlockId: oldBlock.id, archivedAt: null }, data: { contentStatus: "ARCHIVED", archivedAt: now, publishedAt: null } });
      // LessonBlock has a unique (lessonId, order) key even for archived rows.
      // Move the retired block out of the new 1..6 range before inserting.
      const archivedOrder = Math.max(100, ...lesson.blocks.map((block) => block.order)) + 1;
      await tx.lessonBlock.update({ where: { id: oldBlock.id }, data: { order: archivedOrder, contentStatus: "ARCHIVED", archivedAt: now, publishedAt: null } });
      await createShortBlocks(tx, lesson.id, group, lessonIndex === 6, { contentStatus: "PUBLISHED", publishedAt: now, scheduledAt: null, archivedAt: null });
      await tx.lesson.update({ where: { id: lesson.id }, data: { estimatedDuration: lessonIndex === 6 ? 12 : 8, description: lessonIndex === 6 ? "Повторення всіх 30 фраз у шести коротких блоках." : "П'ять коротких блоків: по одній фразі та п'ять завдань у кожному." } });
      await tx.lessonTranslation.updateMany({ where: { lessonId: lesson.id, locale: "uk" }, data: { description: lessonIndex === 6 ? "Повторення всіх 30 фраз у шести коротких блоках." : "П'ять коротких блоків: по одній фразі та п'ять завдань у кожному." } });
      await tx.lessonTranslation.updateMany({ where: { lessonId: lesson.id, locale: "ru" }, data: { description: lessonIndex === 6 ? "Повторение всех 30 фраз в шести коротких блоках." : "Пять коротких блоков: по одной фразе и пять заданий в каждом." } });
    }
    await tx.course.update({ where: { id: existing.id }, data: { estimatedDuration: 60, fullDescription: courseCopy.uk.fullDescription } });
    for (const locale of ["uk", "ru"]) await tx.courseTranslation.updateMany({ where: { courseId: existing.id, locale }, data: { fullDescription: courseCopy[locale].fullDescription } });
  }, { maxWait: 60_000, timeout: 600_000 });
  console.log(JSON.stringify({ status: "upgraded-short", courseId: existing.id, ...counts }));
}

async function main() {
  assert(phrases.length === 30, `Expected 30 phrases; received ${phrases.length}.`);
  assert(phrases.every((row) => row.length === 3 && row.every((value) => typeof value === "string" && value.trim())), "Every phrase needs English, Ukrainian and Russian text.");
  assert(new Set(phrases.map(([en]) => normalizeLemma(en))).size === phrases.length, "English phrases must be unique.");

  const groups = [...Array.from({ length: 6 }, (_, index) => phrases.slice(index * 5, index * 5 + 5)), phrases];
  const stageCounts = groups.map((group, index) => index === 6 ? 30 : stageCount(group.length));
  const counts = { words: 30, lessons: 7, blocks: 36, exercises: stageCounts.reduce((sum, count) => sum + count, 0) };
  if (process.argv.includes("--validate")) {
    console.log(JSON.stringify({ status: "valid", course: COURSE_SLUG, ...counts, stageCounts, translations: { uk: 30, ru: 30 } }));
    return;
  }

  const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required.");
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const existing = await prisma.course.findUnique({
      where: { slug: COURSE_SLUG },
      select: {
        id: true, isPublished: true,
        modules: { select: { id: true, lessons: { select: {
          id: true, slug: true,
          blocks: { select: { id: true, order: true, settings: true, contentStatus: true, _count: { select: { exercises: true } } } },
        } } } },
      },
    });
    const currentBlocks = existing?.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.blocks)).filter((block) => block.settings?.engine === "bag-story" && block.contentStatus === "PUBLISHED") ?? [];
    if (currentBlocks.some((block) => Number(block.settings?.version) >= 3 && block.settings?.reviewAll === true)) {
      console.log(JSON.stringify({ status: "already-current", courseId: existing.id, ...counts }));
      return;
    }
    if (currentBlocks.some((block) => block.settings?.reviewAll === true)) {
      assert(publishRequested, "Use --publish to upgrade the current published course.");
      await upgradeShortCourse(prisma, existing, counts);
      return;
    }

    const [level, category, systemAuthor, locales] = await Promise.all([
      prisma.languageLevel.findUnique({ where: { code: "A2" }, select: { id: true } }),
      prisma.courseCategory.findUnique({ where: { slug: "general-english" }, select: { id: true } }),
      prisma.user.findFirst({ where: { email: "content@seed.krin.local" }, select: { id: true } }),
      prisma.contentLocale.findMany({ where: { code: { in: ["uk", "ru"] } }, select: { code: true } }),
    ]);
    const author = systemAuthor ?? await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    assert(level && category && author, "A2, General English and the content author must exist before import.");
    assert(locales.length === 2, "Ukrainian and Russian content locales must exist before import.");

    const course = await prisma.$transaction(async (tx) => {
      if (existing) {
        const oldModules = await tx.courseModule.findMany({ where: { courseId: existing.id }, select: { id: true } });
        for (const old of oldModules) {
          await tx.exercise.updateMany({ where: { lessonBlock: { lesson: { moduleId: old.id } } }, data: { contentStatus: "ARCHIVED", archivedAt: new Date(), publishedAt: null } });
          await tx.lessonBlock.updateMany({ where: { lesson: { moduleId: old.id } }, data: { contentStatus: "ARCHIVED", archivedAt: new Date(), publishedAt: null } });
          await tx.lesson.updateMany({ where: { moduleId: old.id }, data: { isPublished: false, contentStatus: "ARCHIVED", archivedAt: new Date(), publishedAt: null } });
          await tx.courseModule.update({ where: { id: old.id }, data: { order: 100 + oldModules.indexOf(old), isRequired: false, isPublished: false, contentStatus: "ARCHIVED", archivedAt: new Date(), publishedAt: null } });
        }
      }
      const words = new Map();
      for (const [en, uk] of phrases) {
        const word = await tx.word.upsert({
          where: { normalizedLemma_partOfSpeech: { normalizedLemma: normalizeLemma(en), partOfSpeech: "PHRASE" } },
          create: {
            lemma: en,
            normalizedLemma: normalizeLemma(en),
            partOfSpeech: "PHRASE",
            cefrLevel: "A2",
            isActive: true,
            contentStatus: "DRAFT",
            meanings: { create: { definition: uk, translation: uk, order: 1 } },
          },
          update: {},
          select: { id: true },
        });
        words.set(en, word.id);
      }

      const state = lifecycle();
      const publishedAt = state.publishedAt;
      const course = existing ? await tx.course.update({ where: { id: existing.id }, data: { ...courseCopy.uk, lessonCount: groups.length, estimatedDuration: 60, firstFreeLessonCount: groups.length } }) : await tx.course.create({
        data: {
          levelId: level.id,
          categoryId: category.id,
          slug: COURSE_SLUG,
          ...courseCopy.uk,
          language: "uk",
          estimatedDuration: 60,
          lessonCount: groups.length,
          difficulty: "A2",
          courseType: "SKILL",
          accessMode: "FREE",
          accessPlan: "FREE",
          firstFreeLessonCount: groups.length,
          isVisibleInCatalog: true,
          isVisibleInSearch: true,
          isVisibleOnHomepage: publishRequested,
          isVisibleInLevelBlock: true,
          isVisibleInAcademy: true,
          isVisibleInStudentDashboard: true,
          legacyLevel: "BEGINNER",
          academySlug: "general-english",
          pathSlug: "food-and-shopping",
          stageSlug: "a-bag-of-vocabulary",
          instructorId: author.id,
          createdById: author.id,
          updatedById: author.id,
          learningOutcomes: ["Вимовляти 30 фраз із a bag of.", "Перекладати фрази з англійської та англійською.", "Пригадувати вивчене в змішаних блоках."],
          prerequisites: [],
          ...state,
        },
      });
      for (const locale of ["uk", "ru"]) {
        await tx.courseTranslation.upsert({ where: { courseId_locale: { courseId: course.id, locale } }, create: { courseId: course.id, locale, slug: COURSE_SLUG, ...courseCopy[locale], contentStatus: state.contentStatus, publishedAt }, update: { ...courseCopy[locale] } });
      }

      const courseModule = await tx.courseModule.create({
        data: {
          courseId: course.id,
          title: "A bag of: продукти й покупки",
          description: "Шість уроків по п’ять коротких блоків і спільний урок повторення.",
          order: 1,
          isRequired: true,
          requiresSequentialCompletion: true,
          requiredCompletionPercent: 100,
          ...state,
        },
        select: { id: true },
      });
      await tx.courseModuleTranslation.createMany({
        data: [
          { moduleId: courseModule.id, locale: "uk", title: "A bag of: продукти й покупки", description: "Короткі блоки для вимови, перекладу та практики 30 фраз.", contentStatus: state.contentStatus, publishedAt },
          { moduleId: courseModule.id, locale: "ru", title: "A bag of: продукты и покупки", description: "Короткие блоки для произношения, перевода и практики 30 фраз.", contentStatus: state.contentStatus, publishedAt },
        ],
      });

      let previousLessonId = null;
      for (const [index, group] of groups.entries()) {
        const slug = `a-bag-of-story-${String(index + 1).padStart(2, "0")}`;
        const lesson = await tx.lesson.create({
          data: {
            moduleId: courseModule.id,
            prerequisiteLessonId: previousLessonId,
            requiredPrerequisiteCompletion: 100,
            autoUnlockNextLesson: true,
            slug,
            title: lessonCopy[index].uk,
            description: index === 6 ? "Повторення всіх 30 фраз у шести коротких блоках." : "П'ять коротких блоків: по одній фразі та п'ять завдань у кожному.",
            type: "VOCABULARY",
            curriculumRole: index === 0 ? "OVERVIEW" : index === groups.length - 1 ? "FINAL" : "PRACTICE",
            order: index + 1,
            estimatedDuration: index === 6 ? 12 : 8,
            minimumCompletionScore: 0,
            learningObjectives: group.map(([en]) => en),
            previewText: `${group.length} фраз у коротких блоках.`,
            isFree: true,
            ...state,
          },
          select: { id: true },
        });
        await tx.lessonTranslation.createMany({
          data: ["uk", "ru"].map((locale) => ({
            lessonId: lesson.id,
            locale,
            slug,
            title: lessonCopy[index][locale],
            description: index === 6 ? (locale === "uk" ? "Повторення всіх 30 фраз у шести коротких блоках." : "Повторение всех 30 фраз в шести коротких блоках.") : locale === "uk" ? "П'ять коротких блоків: по одній фразі та п'ять завдань у кожному." : "Пять коротких блоков: по одной фразе и пять заданий в каждом.",
            previewText: locale === "uk" ? `${group.length} фраз у коротких блоках.` : `${group.length} фраз в коротких блоках.`,
            contentStatus: state.contentStatus,
            publishedAt,
          })),
        });

        const blockState = blockLifecycle();
        await tx.lessonVocabulary.createMany({
          data: group.map(([en], wordIndex) => ({ lessonId: lesson.id, wordId: words.get(en), role: index === 6 ? "REVIEW" : "NEW", order: wordIndex + 1, isRequired: true })),
        });
        await createShortBlocks(tx, lesson.id, group, index === 6, blockState);
        previousLessonId = lesson.id;
      }

      const previousVersion = await tx.cmsContentVersion.findFirst({ where: { entityType: "COURSE", entityId: course.id }, orderBy: { version: "desc" }, select: { version: true } });
      await tx.cmsContentVersion.create({
        data: { entityType: "COURSE", entityId: course.id, version: (previousVersion?.version ?? 0) + 1, action: "IMPORTED", snapshot: { importer: "a-bag-of-vocabulary", course: COURSE_SLUG, ...counts, status: state.contentStatus }, actorId: author.id },
      });
      await tx.contentAuditLog.create({
        data: { actorId: author.id, action: "CMS_A_BAG_OF_VOCABULARY_IMPORTED", entityType: "Course", entityId: course.id, metadata: { ...counts, status: state.contentStatus } },
      });
      return course;
    }, { maxWait: 60_000, timeout: 600_000 });

    const [lessons, blocks, exercises, vocabulary] = await Promise.all([
      prisma.lesson.count({ where: { module: { courseId: course.id } } }),
      prisma.lessonBlock.count({ where: { lesson: { module: { courseId: course.id } } } }),
      prisma.exercise.count({ where: { lessonBlock: { lesson: { module: { courseId: course.id } } } } }),
      prisma.lessonVocabulary.count({ where: { lesson: { module: { courseId: course.id } } } }),
    ]);
    assert(lessons >= counts.lessons && blocks >= counts.blocks && exercises >= counts.exercises && vocabulary >= counts.words, "Stored course counts differ from the authored data.");
    console.log(JSON.stringify({ status: existing ? "upgraded" : publishRequested ? "published-imported" : "draft-imported", courseId: course.id, ...counts, stageCounts }));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
