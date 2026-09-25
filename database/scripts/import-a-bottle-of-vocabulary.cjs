/*
 * Authored vocabulary course: 30 "a bottle of" food phrases in three mastery
 * lessons. Safe to run at every production build; an existing course is left
 * under CMS control. --validate performs no database writes.
 *
 *   node database/scripts/import-a-bottle-of-vocabulary.cjs --validate
 *   node database/scripts/import-a-bottle-of-vocabulary.cjs --publish
 */
try {
  require("dotenv").config({ path: ".env", quiet: true });
} catch (error) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;
}

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");

const COURSE_SLUG = "a-bottle-of-food-vocabulary";
const publishRequested = process.argv.includes("--publish");

// English prompt, Ukrainian answer, Russian answer. Keep the user's authored
// Ukrainian phrases intact; the Russian column serves the Russian route.
const phrases = [
  ["a bottle of water", "пляшка води", "бутылка воды"],
  ["a bottle of mineral water", "пляшка мінеральної води", "бутылка минеральной воды"],
  ["a bottle of milk", "пляшка молока", "бутылка молока"],
  ["a bottle of juice", "пляшка соку", "бутылка сока"],
  ["a bottle of lemonade", "пляшка лимонаду", "бутылка лимонада"],
  ["a bottle of cola", "пляшка коли", "бутылка колы"],
  ["a bottle of olive oil", "пляшка оливкової олії", "бутылка оливкового масла"],
  ["a bottle of vinegar", "пляшка оцту", "бутылка уксуса"],
  ["a bottle of soy sauce", "пляшка соєвого соусу", "бутылка соевого соуса"],
  ["a bottle of salad dressing", "пляшка заправки для салату", "бутылка заправки для салата"],
  ["a bottle of sparkling water", "пляшка газованої води", "бутылка газированной воды"],
  ["a bottle of still water", "пляшка негазованої води", "бутылка негазированной воды"],
  ["a bottle of apple juice", "пляшка яблучного соку", "бутылка яблочного сока"],
  ["a bottle of tomato juice", "пляшка томатного соку", "бутылка томатного сока"],
  ["a bottle of iced tea", "пляшка холодного чаю", "бутылка холодного чая"],
  ["a bottle of cold brew coffee", "пляшка кави холодного заварювання", "бутылка кофе холодного заваривания"],
  ["a bottle of sunflower oil", "пляшка соняшникової олії", "бутылка подсолнечного масла"],
  ["a bottle of sesame oil", "пляшка кунжутної олії", "бутылка кунжутного масла"],
  ["a bottle of coconut oil", "пляшка кокосової олії", "бутылка кокосового масла"],
  ["a bottle of balsamic vinegar", "пляшка бальзамічного оцту", "бутылка бальзамического уксуса"],
  ["a bottle of apple cider vinegar", "пляшка яблучного оцту", "бутылка яблочного уксуса"],
  ["a bottle of hot sauce", "пляшка гострого соусу", "бутылка острого соуса"],
  ["a bottle of barbecue sauce", "пляшка соусу барбекю", "бутылка соуса барбекю"],
  ["a bottle of fish sauce", "пляшка рибного соусу", "бутылка рыбного соуса"],
  ["a bottle of maple syrup", "пляшка кленового сиропу", "бутылка кленового сиропа"],
  ["a bottle of chocolate syrup", "пляшка шоколадного сиропу", "бутылка шоколадного сиропа"],
  ["a bottle of vanilla extract", "пляшечка ванільного екстракту", "бутылочка ванильного экстракта"],
  ["a bottle of kombucha", "пляшка комбучі", "бутылка комбучи"],
  ["a bottle of kefir", "пляшка кефіру", "бутылка кефира"],
  ["a bottle of smoothie", "пляшка смузі", "бутылка смузи"],
];

const lessonCopy = [
  { uk: "1. Напої, олія й заправки: перші 12 фраз", ru: "1. Напитки, масло и заправки: первые 12 фраз" },
  { uk: "2. Соки, олії, оцет і соуси", ru: "2. Соки, масла, уксус и соусы" },
  { uk: "3. Сиропи й напої: підсумкове повторення", ru: "3. Сиропы и напитки: итоговое повторение" },
];

const courseCopy = {
  uk: {
    title: "A bottle of: 30 фраз про напої, олії та соуси",
    shortDescription: "30 повсякденних фраз із a bottle of: вимова, переклад і накопичувальне повторення.",
    fullDescription: "Окремий словниковий курс із трьох уроків про напої, олії, оцет і соуси. Кожна фраза відпрацьовується через вимову та переклад в обидва боки.",
  },
  ru: {
    title: "A bottle of: 30 фраз о напитках, маслах и соусах",
    shortDescription: "30 повседневных фраз с a bottle of: произношение, перевод и накопительное повторение.",
    fullDescription: "Отдельный словарный курс из трёх уроков о напитках, маслах, уксусе и соусах. Каждая фраза отрабатывается через произношение и перевод в обе стороны.",
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

function stageCount(wordCount, cumulativeWordCount) {
  const groups = Math.ceil(wordCount / 4);
  let count = 0;
  for (let groupIndex = 0; groupIndex < groups; groupIndex += 1) {
    const size = Math.min(4, wordCount - groupIndex * 4);
    count += size * 3; // pronunciation, EN→local and local→EN per phrase
    count += Math.max(0, size - 1) * 2; // 2-, 3- and 4-phrase recall
    if (groupIndex === 1) count += 2; // revisit the first two groups
  }
  count += 2; // whole-lesson recall in both directions
  if (cumulativeWordCount > wordCount) count += 2; // previous lessons
  return count;
}

function lifecycle() {
  return publishRequested
    ? { isPublished: true, contentStatus: "PUBLISHED", publishedAt: new Date(), scheduledAt: null, archivedAt: null }
    : { isPublished: false, contentStatus: "DRAFT", publishedAt: null, scheduledAt: null, archivedAt: null };
}

function blockLifecycle() {
  const { isPublished: _isPublished, ...state } = lifecycle();
  return state;
}

async function main() {
  assert(phrases.length === 30, `Expected 30 phrases; received ${phrases.length}.`);
  assert(phrases.every((row) => row.length === 3 && row.every((value) => typeof value === "string" && value.trim())), "Every phrase needs English, Ukrainian and Russian text.");
  assert(new Set(phrases.map(([en]) => normalizeLemma(en))).size === phrases.length, "English phrases must be unique.");

  const groups = [phrases.slice(0, 12), phrases.slice(12, 24), phrases.slice(24, 30)];
  const stageCounts = groups.map((group, index) => stageCount(group.length, Math.min(30, (index + 1) * 12)));
  const counts = { words: 30, lessons: 3, blocks: 3, exercises: stageCounts.reduce((sum, count) => sum + count, 0) };
  if (process.argv.includes("--validate")) {
    console.log(JSON.stringify({ status: "valid", course: COURSE_SLUG, ...counts, stageCounts, translations: { uk: 30, ru: 30 } }));
    return;
  }

  const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required.");
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const existing = await prisma.course.findUnique({ where: { slug: COURSE_SLUG }, select: { id: true, isPublished: true } });
    if (existing) {
      console.log(JSON.stringify({ status: "already-exists", courseId: existing.id, published: existing.isPublished, ...counts }));
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
      const course = await tx.course.create({
        data: {
          levelId: level.id,
          categoryId: category.id,
          slug: COURSE_SLUG,
          ...courseCopy.uk,
          language: "uk",
          estimatedDuration: 180,
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
          stageSlug: "a-bottle-of-vocabulary",
          instructorId: author.id,
          createdById: author.id,
          updatedById: author.id,
          learningOutcomes: ["Вимовляти 30 фраз із a bottle of.", "Перекладати фрази з англійської та англійською.", "Пригадувати вивчене в змішаних блоках."],
          prerequisites: [],
          ...state,
        },
      });
      for (const locale of ["uk", "ru"]) {
        await tx.courseTranslation.create({
          data: { courseId: course.id, locale, slug: COURSE_SLUG, ...courseCopy[locale], contentStatus: state.contentStatus, publishedAt },
        });
      }

      const courseModule = await tx.courseModule.create({
        data: {
          courseId: course.id,
          title: "A bottle of: напої й продукти",
          description: "Три уроки для вимови, перекладу й накопичувального повторення 30 фраз.",
          order: 1,
          isRequired: true,
          requiresSequentialCompletion: false,
          requiredCompletionPercent: 100,
          ...state,
        },
        select: { id: true },
      });
      await tx.courseModuleTranslation.createMany({
        data: [
          { moduleId: courseModule.id, locale: "uk", title: "A bottle of: напої й продукти", description: "Три уроки для вимови, перекладу й повторення 30 фраз.", contentStatus: state.contentStatus, publishedAt },
          { moduleId: courseModule.id, locale: "ru", title: "A bottle of: напитки и продукты", description: "Три урока для произношения, перевода и повторения 30 фраз.", contentStatus: state.contentStatus, publishedAt },
        ],
      });

      let previousLessonId = null;
      for (const [index, group] of groups.entries()) {
        const slug = `a-bottle-of-food-${String(index + 1).padStart(2, "0")}`;
        const lesson = await tx.lesson.create({
          data: {
            moduleId: courseModule.id,
            prerequisiteLessonId: previousLessonId,
            requiredPrerequisiteCompletion: 100,
            autoUnlockNextLesson: true,
            slug,
            title: lessonCopy[index].uk,
            description: `${group.length} фраз із a bottle of: вимова й переклад в обидва боки.`,
            type: "VOCABULARY",
            curriculumRole: index === 0 ? "OVERVIEW" : index === groups.length - 1 ? "FINAL" : "PRACTICE",
            order: index + 1,
            estimatedDuration: group.length === 6 ? 40 : 70,
            minimumCompletionScore: 0,
            learningObjectives: group.map(([en]) => en),
            previewText: `${group.length} нових фраз і повторення вивченого.`,
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
            description: locale === "uk" ? `${group.length} фраз із a bottle of: вимова й переклад в обидва боки.` : `${group.length} фраз с a bottle of: произношение и перевод в обе стороны.`,
            previewText: locale === "uk" ? `${group.length} нових фраз і повторення вивченого.` : `${group.length} новых фраз и повторение изученного.`,
            contentStatus: state.contentStatus,
            publishedAt,
          })),
        });

        const blockState = blockLifecycle();
        const block = await tx.lessonBlock.create({
          data: {
            lessonId: lesson.id,
            type: "VOCABULARY",
            title: `A bottle of · ${group.length} фраз`,
            content: { text: "Послухайте й повторіть кожну фразу, потім перекладайте в обидва боки. Попередні уроки повертаються в змішаному повторенні.", engine: "vocabulary-mastery", newWordCount: group.length, cumulativeWordCount: Math.min(30, (index + 1) * 12) },
            settings: { engine: "vocabulary-mastery", version: 1, source: "course-lesson-vocabulary", localizedTranslations: localizedTranslations(), localizationVersion: 1 },
            order: 1,
            isRequired: true,
            ...blockState,
          },
          select: { id: true },
        });
        await tx.lessonBlockTranslation.createMany({
          data: [
            { lessonBlockId: block.id, locale: "uk", title: `A bottle of · ${group.length} фраз`, content: { text: "Вимова, переклад і змішане повторення." }, contentStatus: state.contentStatus, publishedAt },
            { lessonBlockId: block.id, locale: "ru", title: `A bottle of · ${group.length} фраз`, content: { text: "Произношение, перевод и смешанное повторение." }, contentStatus: state.contentStatus, publishedAt },
          ],
        });
        await tx.lessonVocabulary.createMany({
          data: group.map(([en], wordIndex) => ({ lessonId: lesson.id, wordId: words.get(en), role: "NEW", order: wordIndex + 1, isRequired: true })),
        });
        await tx.exercise.createMany({
          data: Array.from({ length: stageCounts[index] }, (_, stageIndex) => ({
            lessonBlockId: block.id,
            type: "TEXT_INPUT",
            engineKey: "text-input",
            variantKey: "VOCABULARY_MASTERY_STAGE",
            instruction: "Серверний етап засвоєння фрази.",
            question: `Vocabulary mastery stage ${stageIndex + 1}`,
            content: { engine: "vocabulary-mastery", stage: stageIndex + 1 },
            correctAnswer: "server-owned",
            explanation: "This stage is evaluated by the vocabulary mastery engine.",
            hintsEnabled: false,
            difficulty: 1,
            basePoints: 1,
            allowInstantCheck: true,
            allowExtraExercise: false,
            order: stageIndex + 1,
            ...blockState,
          })),
        });
        previousLessonId = lesson.id;
      }

      await tx.cmsContentVersion.create({
        data: { entityType: "COURSE", entityId: course.id, version: 1, action: "IMPORTED", snapshot: { importer: "a-bottle-of-vocabulary", course: COURSE_SLUG, ...counts, status: state.contentStatus }, actorId: author.id },
      });
      await tx.contentAuditLog.create({
        data: { actorId: author.id, action: "CMS_A_BOTTLE_OF_VOCABULARY_IMPORTED", entityType: "Course", entityId: course.id, metadata: { ...counts, status: state.contentStatus } },
      });
      return course;
    }, { maxWait: 60_000, timeout: 600_000 });

    const [lessons, blocks, exercises, vocabulary] = await Promise.all([
      prisma.lesson.count({ where: { module: { courseId: course.id } } }),
      prisma.lessonBlock.count({ where: { lesson: { module: { courseId: course.id } } } }),
      prisma.exercise.count({ where: { lessonBlock: { lesson: { module: { courseId: course.id } } } } }),
      prisma.lessonVocabulary.count({ where: { lesson: { module: { courseId: course.id } } } }),
    ]);
    assert(lessons === counts.lessons && blocks === counts.blocks && exercises === counts.exercises && vocabulary === counts.words, "Stored course counts differ from the authored data.");
    console.log(JSON.stringify({ status: publishRequested ? "published-imported" : "draft-imported", courseId: course.id, ...counts, stageCounts }));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
