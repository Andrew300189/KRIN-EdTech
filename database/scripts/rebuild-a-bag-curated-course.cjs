/*
 * Repackage every A bag of card into ten thematic modules of ten lessons.
 * The previous 468 lessons stay archived, so authored content and attempts
 * remain recoverable. The new lessons are built as drafts before one atomic
 * switch makes the hundred-lesson curriculum public.
 *
 *   node database/scripts/rebuild-a-bag-curated-course.cjs --validate
 *   node database/scripts/rebuild-a-bag-curated-course.cjs --publish
 */
try { require("dotenv").config({ path: ".env", quiet: true }); }
catch (error) { if (error?.code !== "MODULE_NOT_FOUND") throw error; }

const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");

const COURSE_SLUG = "a-bag-of-food-vocabulary";
const LESSONS_PER_MODULE = 10;
const BLOCKS_PER_LESSON = 12;
const CARDS_PER_MODULE = 3 * (5 + 377 + 4 + 1);
const MODULES = [
  { lemmas: ["a bag of rice", "a bag of pasta", "a bag of potatoes"], uk: "Кухня на щодень", ru: "Кухня на каждый день" },
  { lemmas: ["a bag of apples", "a bag of pears", "a bag of grapes"], uk: "Фруктова крамниця", ru: "Фруктовая лавка" },
  { lemmas: ["a bag of oranges", "a bag of lemons", "a bag of frozen berries"], uk: "Цитруси та ягоди", ru: "Цитрусы и ягоды" },
  { lemmas: ["a bag of carrots", "a bag of spinach", "a bag of lettuce"], uk: "Овочі та зелень", ru: "Овощи и зелень" },
  { lemmas: ["a bag of frozen vegetables", "a bag of frozen peas", "a bag of frozen chips"], uk: "Із морозилки", ru: "Из морозилки" },
  { lemmas: ["a bag of coffee beans", "a bag of oats", "a bag of cereal"], uk: "Ранок починається тут", ru: "Утро начинается здесь" },
  { lemmas: ["a bag of nuts", "a bag of almonds", "a bag of peanuts"], uk: "Горіховий перекус", ru: "Ореховый перекус" },
  { lemmas: ["a bag of sweets", "a bag of popcorn", "a bag of marshmallows"], uk: "Солодкий вихідний", ru: "Сладкий выходной" },
  { lemmas: ["a bag of flour", "a bag of bread rolls", "a bag of bagels"], uk: "Тепла пекарня", ru: "Тёплая пекарня" },
  { lemmas: ["a bag of lentils", "a bag of dried fruit", "a bag of raisins"], uk: "Розумні запаси", ru: "Умные запасы" },
];
const LESSON_SCENES = [
  { uk: "Складаємо список покупок", ru: "Составляем список покупок" },
  { uk: "Шукаємо на полицях", ru: "Ищем на полках" },
  { uk: "Обираємо потрібне", ru: "Выбираем нужное" },
  { uk: "Кладемо до кошика", ru: "Кладём в корзину" },
  { uk: "Розмовляємо з продавцем", ru: "Разговариваем с продавцом" },
  { uk: "Розпізнаємо на слух", ru: "Узнаём на слух" },
  { uk: "Біля каси", ru: "У кассы" },
  { uk: "Повертаємося додому", ru: "Возвращаемся домой" },
  { uk: "Розповідаємо без підказки", ru: "Рассказываем без подсказки" },
  { uk: "Вільна розмова", ru: "Свободный разговор" },
];
const BLOCK_SCENES = [
  { uk: "Список", ru: "Список" }, { uk: "Прилавок", ru: "Прилавок" },
  { uk: "Вибір", ru: "Выбор" }, { uk: "Пакування", ru: "Упаковка" },
  { uk: "Кошик", ru: "Корзина" }, { uk: "Запитання", ru: "Вопросы" },
  { uk: "Відповіді", ru: "Ответы" }, { uk: "Каса", ru: "Касса" },
  { uk: "Дорога додому", ru: "Дорога домой" }, { uk: "На кухні", ru: "На кухне" },
  { uk: "За столом", ru: "За столом" }, { uk: "Упевнена розмова", ru: "Уверенный разговор" },
];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const pad = (value) => String(value).padStart(2, "0");
const published = (at) => ({ contentStatus: "PUBLISHED", publishedAt: at, archivedAt: null });

function buildModuleRows({ moduleId, moduleIndex, words, translations }) {
  const lessons = [], lessonTranslations = [], vocabulary = [], blocks = [], blockTranslations = [], exercises = [];
  let previousLessonId = null;
  for (let lessonIndex = 0; lessonIndex < LESSONS_PER_MODULE; lessonIndex += 1) {
    const lessonId = randomUUID();
    const scene = LESSON_SCENES[lessonIndex];
    const slug = `a-bag-of-journey-${pad(moduleIndex + 1)}-${pad(lessonIndex + 1)}`;
    const start = Math.floor(CARDS_PER_MODULE * lessonIndex / LESSONS_PER_MODULE);
    const end = Math.floor(CARDS_PER_MODULE * (lessonIndex + 1) / LESSONS_PER_MODULE);
    const cardCount = end - start;
    const description = {
      uk: "12 коротких блоків: говоримо, слухаємо, складаємо речення та перекладаємо фрази.",
      ru: "12 коротких блоков: говорим, слушаем, собираем предложения и переводим фразы.",
    };
    lessons.push({ id: lessonId, moduleId, prerequisiteLessonId: previousLessonId, requiredPrerequisiteCompletion: 100,
      autoUnlockNextLesson: true, slug, title: scene.uk, description: description.uk, type: "VOCABULARY",
      curriculumRole: lessonIndex === 9 ? "REVIEW" : "PRACTICE", order: lessonIndex + 1,
      estimatedDuration: 30, minimumCompletionScore: 0, learningObjectives: words.map((word) => word.lemma),
      previewText: description.uk, isFree: true, isPublished: false, contentStatus: "DRAFT",
    });
    for (const locale of ["uk", "ru"]) lessonTranslations.push({ lessonId, locale, slug, title: scene[locale],
      description: description[locale], previewText: description[locale], contentStatus: "DRAFT" });
    words.forEach((word, index) => vocabulary.push({ lessonId, wordId: word.id, role: "REVIEW", order: index + 1, isRequired: true }));

    for (let partIndex = 0; partIndex < BLOCKS_PER_LESSON; partIndex += 1) {
      const blockId = randomUUID();
      const stageStart = Math.floor(cardCount * partIndex / BLOCKS_PER_LESSON);
      const stageEnd = Math.floor(cardCount * (partIndex + 1) / BLOCKS_PER_LESSON);
      const stageCount = stageEnd - stageStart;
      const scene = BLOCK_SCENES[partIndex];
      const settings = { engine: "bag-story", version: 3, source: "course-lesson-vocabulary", practiceKind: "CURATED_STORY",
        curatedLessonIndex: lessonIndex, partIndex, partCount: BLOCKS_PER_LESSON, stageStart, stageCount,
        blockLabelUk: scene.uk, blockLabelRu: scene.ru, reviewAll: false, localizedTranslations: translations,
        localizationVersion: 1, newWordCount: words.length };
      blocks.push({ id: blockId, lessonId, type: "VOCABULARY", title: scene.uk, order: partIndex + 1,
        content: { engine: "bag-story", text: description.uk, newWordCount: words.length }, settings,
        isRequired: true, contentStatus: "DRAFT" });
      for (const locale of ["uk", "ru"]) blockTranslations.push({ lessonBlockId: blockId, locale,
        title: scene[locale], content: { text: description[locale] }, contentStatus: "DRAFT" });
      for (let card = 0; card < stageCount; card += 1) {
        exercises.push({ lessonBlockId: blockId, type: "TEXT_INPUT", engineKey: "text-input", variantKey: "BAG_STORY_STAGE",
          instruction: "Серверний етап засвоєння фрази.", question: `Bag journey ${moduleIndex + 1}.${lessonIndex + 1}.${stageStart + card + 1}`,
          content: { engine: "bag-story", stage: stageStart + card + 1 }, correctAnswer: "server-owned",
          explanation: "This stage is evaluated by the bag story engine.", hintsEnabled: false,
          difficulty: 1, basePoints: 1, allowInstantCheck: true, allowExtraExercise: false,
          order: card + 1, contentStatus: "DRAFT" });
      }
    }
    previousLessonId = lessonId;
  }
  assert(lessons.length === 10 && blocks.length === 120 && exercises.length === CARDS_PER_MODULE, "Curated module counts do not match the complete card plan.");
  return { lessons, lessonTranslations, vocabulary, blocks, blockTranslations, exercises };
}

async function main() {
  const summary = { course: COURSE_SLUG, modules: 10, lessonsPerModule: 10, lessons: 100,
    blocksPerLesson: 12, blocks: 1200, cardsPerModule: CARDS_PER_MODULE, cards: 10 * CARDS_PER_MODULE,
    cardsPerLesson: "116–117", cardsPerBlock: "9–10" };
  if (process.argv.includes("--validate")) { console.log(JSON.stringify({ status: "valid", ...summary })); return; }
  assert(process.argv.includes("--publish"), "Pass --publish to publish the thematic curriculum.");
  const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  assert(databaseUrl, "DIRECT_DATABASE_URL or DATABASE_URL is required.");
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const course = await prisma.course.findUnique({ where: { slug: COURSE_SLUG }, select: { id: true,
      modules: { select: { id: true, title: true, order: true, isPublished: true,
        _count: { select: { lessons: true } } } },
    } });
    assert(course, "Publish the original A bag of course before rebuilding it.");
    const curated = MODULES.map((definition) => course.modules.find((module) => module.title === definition.uk));
    if (curated.every((module, index) => module?.isPublished && module.order === index + 1 && module._count.lessons === 10)) {
      console.log(JSON.stringify({ status: "already-current", ...summary })); return;
    }
    const core = await prisma.lesson.findUnique({ where: { slug: "a-bag-of-story-01" }, select: {
      module: { select: { courseId: true } }, blocks: { select: { settings: true } },
    } });
    assert(core?.module.courseId === course.id, "The original thirty-phrase source is missing.");
    const translations = core.blocks.find((block) => block.settings?.engine === "bag-story")?.settings?.localizedTranslations;
    assert(translations?.uk && translations?.ru, "The source phrase translations are missing.");
    const sourceVocabulary = await prisma.lessonVocabulary.findMany({ where: { lesson: { module: { courseId: course.id }, slug: { startsWith: "a-bag-of-story-" } } },
      select: { wordId: true, word: { select: { lemma: true } } } });
    const wordByLemma = new Map(sourceVocabulary.map(({ wordId, word }) => [word.lemma, { id: wordId, lemma: word.lemma }]));
    assert(wordByLemma.size === 30 && MODULES.flatMap((module) => module.lemmas).every((lemma) => wordByLemma.has(lemma)), "The thirty source phrases do not match the thematic plan.");

    for (const [moduleIndex, definition] of MODULES.entries()) {
      if (curated[moduleIndex]) {
        assert(curated[moduleIndex]._count.lessons === 10, `The staged module ${moduleIndex + 1} is incomplete.`);
        console.log(JSON.stringify({ status: "staged", module: moduleIndex + 1, lessons: 10 }));
        continue;
      }
      const moduleId = randomUUID();
      const words = definition.lemmas.map((lemma) => wordByLemma.get(lemma));
      const rows = buildModuleRows({ moduleId, moduleIndex, words, translations });
      await prisma.$transaction(async (tx) => {
        await tx.courseModule.create({ data: { id: moduleId, courseId: course.id, title: definition.uk,
          description: `Три тематичні фрази: ${definition.lemmas.join(", ")}.`, order: 201 + moduleIndex,
          isRequired: true, requiresSequentialCompletion: true, requiredCompletionPercent: 100,
          isPublished: false, contentStatus: "DRAFT" } });
        await tx.courseModuleTranslation.createMany({ data: ["uk", "ru"].map((locale) => ({ moduleId, locale,
          title: definition[locale], description: locale === "uk" ? "Покупки англійською — від списку до вільної розмови." : "Покупки по-английски — от списка до свободного разговора.", contentStatus: "DRAFT" })) });
        await tx.lesson.createMany({ data: rows.lessons });
        await tx.lessonTranslation.createMany({ data: rows.lessonTranslations });
        await tx.lessonVocabulary.createMany({ data: rows.vocabulary });
        await tx.lessonBlock.createMany({ data: rows.blocks });
        await tx.lessonBlockTranslation.createMany({ data: rows.blockTranslations });
        for (let offset = 0; offset < rows.exercises.length; offset += 400) await tx.exercise.createMany({ data: rows.exercises.slice(offset, offset + 400) });
      }, { maxWait: 60_000, timeout: 600_000 });
      console.log(JSON.stringify({ status: "staged", module: moduleIndex + 1, lessons: 10, cards: CARDS_PER_MODULE }));
    }

    const staged = await prisma.courseModule.findMany({ where: { courseId: course.id, title: { in: MODULES.map((module) => module.uk) } },
      select: { id: true, title: true, _count: { select: { lessons: true } } } });
    assert(staged.length === 10 && staged.every((module) => module._count.lessons === 10), "The new curriculum must be complete before publication.");
    const curatedIds = MODULES.map((definition) => staged.find((module) => module.title === definition.uk).id);
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const old = await tx.courseModule.findMany({ where: { courseId: course.id, id: { notIn: curatedIds }, order: { lt: 100 } }, select: { id: true, order: true } });
      const oldIds = old.map((module) => module.id);
      for (const module of old) await tx.courseModule.update({ where: { id: module.id }, data: {
        order: module.order + 100, isPublished: false, contentStatus: "ARCHIVED", publishedAt: null, archivedAt: now,
      } });
      if (oldIds.length) await tx.lesson.updateMany({ where: { moduleId: { in: oldIds } }, data: {
        isPublished: false, contentStatus: "ARCHIVED", publishedAt: null, archivedAt: now,
      } });
      for (const [index, moduleId] of curatedIds.entries()) {
        await tx.courseModule.update({ where: { id: moduleId }, data: {
          order: index + 1, unlockAfterModuleId: index ? curatedIds[index - 1] : null,
          isPublished: true, ...published(now),
        } });
      }
      await tx.courseModuleTranslation.updateMany({ where: { moduleId: { in: curatedIds } }, data: { contentStatus: "PUBLISHED", publishedAt: now } });
      await tx.lesson.updateMany({ where: { moduleId: { in: curatedIds } }, data: { isPublished: true, ...published(now) } });
      await tx.lessonTranslation.updateMany({ where: { lesson: { moduleId: { in: curatedIds } } }, data: { contentStatus: "PUBLISHED", publishedAt: now } });
      await tx.lessonBlock.updateMany({ where: { lesson: { moduleId: { in: curatedIds } } }, data: published(now) });
      await tx.lessonBlockTranslation.updateMany({ where: { lessonBlock: { lesson: { moduleId: { in: curatedIds } } } }, data: { contentStatus: "PUBLISHED", publishedAt: now } });
      await tx.exercise.updateMany({ where: { lessonBlock: { lesson: { moduleId: { in: curatedIds } } } }, data: published(now) });
      const titles = { uk: "Покупки англійською: 30 фраз із a bag of", ru: "Покупки по-английски: 30 фраз с a bag of" };
      const shorts = { uk: "10 тематичних модулів, 100 уроків і 30 корисних фраз — від списку покупок до вільної розмови.",
        ru: "10 тематических модулей, 100 уроков и 30 полезных фраз — от списка покупок до свободного разговора." };
      const full = { uk: "Вивчайте покупки англійською у знайомих ситуаціях: фрукти, овочі, сніданок, випічка й перекуси. Кожен урок поділений на 12 блоків. Усі 11 610 карток із попередньої програми збережені, але маршрут став коротшим і зрозумілішим.",
        ru: "Учите английский для покупок в знакомых ситуациях: фрукты, овощи, завтрак, выпечка и перекусы. Каждый урок разделён на 12 блоков. Все 11 610 карточек прежней программы сохранены, но маршрут стал короче и понятнее." };
      await tx.course.update({ where: { id: course.id }, data: { title: titles.uk, shortDescription: shorts.uk,
        fullDescription: full.uk, lessonCount: 100, estimatedDuration: 3000 } });
      for (const locale of ["uk", "ru"]) await tx.courseTranslation.updateMany({ where: { courseId: course.id, locale }, data: {
        title: titles[locale], shortDescription: shorts[locale], fullDescription: full[locale],
        seoTitle: titles[locale], seoDescription: shorts[locale],
      } });
    }, { maxWait: 60_000, timeout: 600_000 });
    console.log(JSON.stringify({ status: "published", ...summary }));
  } finally { await prisma.$disconnect(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
