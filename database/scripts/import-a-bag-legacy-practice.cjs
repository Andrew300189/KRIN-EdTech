/*
 * Keep every archived v2 A bag of card, but spread the 11,430 tasks across
 * short, required lessons. Each phrase-practice lesson alternates five phrases
 * in five blocks (five cards each; the last round has two per block).
 *
 *   node database/scripts/import-a-bag-legacy-practice.cjs --validate
 *   node database/scripts/import-a-bag-legacy-practice.cjs --publish
 */
try { require("dotenv").config({ path: ".env", quiet: true }); }
catch (error) { if (error?.code !== "MODULE_NOT_FOUND") throw error; }

const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");

const COURSE_SLUG = "a-bag-of-food-vocabulary";
const PHRASE_ROUNDS = 76;
const REVIEW_ROUNDS = 5;
const EXPECTED_LESSONS = 6 * PHRASE_ROUNDS + REVIEW_ROUNDS;
const EXPECTED_EXERCISES = 6 * 1885 + 120;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const pad = (value) => String(value).padStart(3, "0");
const published = (at) => ({ contentStatus: "PUBLISHED", publishedAt: at });

function moduleTitle(groupIndex, review) {
  return review ? { uk: "A bag of · велике повторення", ru: "A bag of · большое повторение" }
    : { uk: `A bag of · практика ${groupIndex + 1}`, ru: `A bag of · практика ${groupIndex + 1}` };
}

function buildModuleRows({ moduleId, groupIndex, review, sourceWords, translations, now }) {
  const lessonRows = [];
  const lessonTranslationRows = [];
  const vocabularyRows = [];
  const blockRows = [];
  const blockTranslationRows = [];
  const exerciseRows = [];
  const rounds = review ? REVIEW_ROUNDS : PHRASE_ROUNDS;
  let previousLessonId = null;

  for (let round = 0; round < rounds; round += 1) {
    const lessonId = randomUUID();
    const shortFinalPhraseRound = !review && round === PHRASE_ROUNDS - 1;
    const shortFinalReviewRound = review && round === REVIEW_ROUNDS - 1;
    const stagesPerBlock = shortFinalPhraseRound ? 2 : 5;
    const partCount = shortFinalReviewRound ? 4 : 5;
    const cardCount = stagesPerBlock * partCount;
    const slug = review ? `a-bag-of-legacy-review-${pad(round + 1)}` : `a-bag-of-legacy-practice-${groupIndex + 1}-${pad(round + 1)}`;
    const titleUk = review ? `Велике повторення · урок ${round + 1}` : `Практика ${groupIndex + 1} · урок ${round + 1}`;
    const titleRu = review ? `Большое повторение · урок ${round + 1}` : `Практика ${groupIndex + 1} · урок ${round + 1}`;
    const descriptionUk = review ? `${cardCount} карток для повторення в коротких блоках.` : `П'ять фраз по ${stagesPerBlock} картки у п'яти коротких блоках.`;
    const descriptionRu = review ? `${cardCount} карточек для повторения в коротких блоках.` : `Пять фраз по ${stagesPerBlock} карточки в пяти коротких блоках.`;
    lessonRows.push({
      id: lessonId, moduleId, prerequisiteLessonId: previousLessonId, requiredPrerequisiteCompletion: 100,
      autoUnlockNextLesson: true, slug, title: titleUk, description: descriptionUk,
      type: "VOCABULARY", curriculumRole: review && round === rounds - 1 ? "FINAL" : review ? "REVIEW" : "PRACTICE",
      order: round + 1, estimatedDuration: shortFinalPhraseRound ? 4 : 8, minimumCompletionScore: 0,
      learningObjectives: sourceWords.map((item) => item.word.lemma), previewText: descriptionUk,
      isFree: true, isPublished: true, ...published(now),
    });
    for (const [locale, title, description] of [["uk", titleUk, descriptionUk], ["ru", titleRu, descriptionRu]]) {
      lessonTranslationRows.push({ lessonId, locale, slug, title, description, previewText: description, ...published(now) });
    }
    sourceWords.forEach((item, index) => vocabularyRows.push({ lessonId, wordId: item.wordId, role: "REVIEW", order: index + 1, isRequired: true }));

    for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
      const blockId = randomUUID();
      const name = review ? `Повторення · блок ${partIndex + 1}` : sourceWords[partIndex].word.lemma;
      const settings = {
        engine: "bag-story", version: 3, source: "course-lesson-vocabulary", practiceKind: review ? "LEGACY_REVIEW" : "LEGACY_PHRASE",
        practiceRound: round, reviewAll: review, partIndex, partCount, stagesPerBlock,
        localizedTranslations: translations, localizationVersion: 1, newWordCount: review ? sourceWords.length : 1,
      };
      blockRows.push({ id: blockId, lessonId, type: "VOCABULARY", title: name, order: partIndex + 1,
        content: { engine: "bag-story", text: "Коротка практика з архівних карток.", newWordCount: review ? sourceWords.length : 1 },
        settings, isRequired: true, ...published(now) });
      blockTranslationRows.push(
        { lessonBlockId: blockId, locale: "uk", title: name, content: { text: "Короткий блок вправ." }, ...published(now) },
        { lessonBlockId: blockId, locale: "ru", title: review ? `Повторение · блок ${partIndex + 1}` : name, content: { text: "Короткий блок упражнений." }, ...published(now) },
      );
      for (let taskIndex = 0; taskIndex < stagesPerBlock; taskIndex += 1) {
        const stageIndex = partIndex * stagesPerBlock + taskIndex;
        exerciseRows.push({ lessonBlockId: blockId, type: "TEXT_INPUT", engineKey: "text-input", variantKey: "BAG_STORY_STAGE",
          instruction: "Серверний етап засвоєння фрази.", question: `Bag story practice ${round + 1}.${stageIndex + 1}`,
          content: { engine: "bag-story", stage: stageIndex + 1, practiceRound: round }, correctAnswer: "server-owned",
          explanation: "This stage is evaluated by the bag story engine.", hintsEnabled: false,
          difficulty: 1, basePoints: 1, allowInstantCheck: true, allowExtraExercise: false,
          order: taskIndex + 1, ...published(now),
        });
      }
    }
    previousLessonId = lessonId;
  }
  return { lessonRows, lessonTranslationRows, vocabularyRows, blockRows, blockTranslationRows, exerciseRows };
}

async function main() {
  const plan = { status: "valid", course: COURSE_SLUG, additionalLessons: EXPECTED_LESSONS, additionalModules: 7,
    additionalBlocks: 6 * PHRASE_ROUNDS * 5 + 24, additionalExercises: EXPECTED_EXERCISES,
    phraseLessonCards: "25 (last round: 10)", reviewLessonCards: "25 (last round: 20)" };
  if (process.argv.includes("--validate")) { console.log(JSON.stringify(plan)); return; }
  assert(process.argv.includes("--publish"), "Pass --publish to add the required practice lessons.");
  const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  assert(databaseUrl, "DIRECT_DATABASE_URL or DATABASE_URL is required.");
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const course = await prisma.course.findUnique({ where: { slug: COURSE_SLUG }, select: {
      id: true, modules: { select: { id: true, order: true, title: true, lessons: { select: {
        slug: true, vocabulary: { orderBy: { order: "asc" }, select: { wordId: true, word: { select: { lemma: true } } } },
        blocks: { where: { contentStatus: "PUBLISHED" }, select: { settings: true } },
      } } }, orderBy: { order: "asc" } },
    } });
    assert(course, "Publish the short seven-lesson A bag of course first.");
    const coreModule = course.modules.find((module) => module.order === 1);
    const sources = Array.from({ length: 7 }, (_, index) => coreModule?.lessons.find((lesson) => lesson.slug === `a-bag-of-story-0${index + 1}`));
    assert(sources.every((lesson, index) => lesson && lesson.vocabulary.length === (index === 6 ? 30 : 5) && lesson.blocks.some((block) => block.settings?.engine === "bag-story" && Number(block.settings?.version) === 3)), "Seven published v3 source lessons are required.");
    const translations = sources[0].blocks.find((block) => block.settings?.engine === "bag-story").settings.localizedTranslations;
    assert(translations?.uk && translations?.ru, "Source vocabulary translations are missing.");

    for (let groupIndex = 0; groupIndex < 7; groupIndex += 1) {
      const review = groupIndex === 6;
      const order = groupIndex + 2;
      const titles = moduleTitle(groupIndex, review);
      const existing = course.modules.find((module) => module.order === order);
      const expectedLessons = review ? REVIEW_ROUNDS : PHRASE_ROUNDS;
      if (existing) {
        assert(existing.title === titles.uk && existing.lessons.length === expectedLessons, `Module ${order} exists but is not the complete practice module.`);
        console.log(JSON.stringify({ status: "already-current", moduleOrder: order, lessons: expectedLessons }));
        continue;
      }
      const moduleId = randomUUID();
      const now = new Date();
      const rows = buildModuleRows({ moduleId, groupIndex, review, sourceWords: sources[groupIndex].vocabulary, translations, now });
      assert(rows.lessonRows.length === expectedLessons && rows.exerciseRows.length === (review ? 120 : 1885), "Practice plan count mismatch.");
      await prisma.$transaction(async (tx) => {
        await tx.courseModule.create({ data: { id: moduleId, courseId: course.id, title: titles.uk,
          description: review ? "Підсумкові короткі уроки." : `Архівні картки для групи фраз ${groupIndex + 1}, розкладені на короткі уроки.`,
          order, isRequired: true, requiresSequentialCompletion: true, requiredCompletionPercent: 100,
          isPublished: true, ...published(now) } });
        await tx.courseModuleTranslation.createMany({ data: [
          { moduleId, locale: "uk", title: titles.uk, description: "Короткі обов'язкові уроки практики.", ...published(now) },
          { moduleId, locale: "ru", title: titles.ru, description: "Короткие обязательные уроки практики.", ...published(now) },
        ] });
        await tx.lesson.createMany({ data: rows.lessonRows });
        await tx.lessonTranslation.createMany({ data: rows.lessonTranslationRows });
        await tx.lessonVocabulary.createMany({ data: rows.vocabularyRows });
        await tx.lessonBlock.createMany({ data: rows.blockRows });
        await tx.lessonBlockTranslation.createMany({ data: rows.blockTranslationRows });
        for (let offset = 0; offset < rows.exerciseRows.length; offset += 400) {
          await tx.exercise.createMany({ data: rows.exerciseRows.slice(offset, offset + 400) });
        }
      }, { maxWait: 60_000, timeout: 600_000 });
      console.log(JSON.stringify({ status: "published", moduleOrder: order, lessons: expectedLessons, exercises: rows.exerciseRows.length }));
    }
    const fullDescription = {
      uk: "Сім основних уроків із 30 фразами та 461 короткий обов'язковий урок практики. Колишні довгі серії розподілені на блоки до п'яти карток.",
      ru: "Семь основных уроков с 30 фразами и 461 короткий обязательный урок практики. Прежние длинные серии распределены на блоки до пяти карточек.",
    };
    await prisma.course.update({ where: { id: course.id }, data: { lessonCount: 7 + EXPECTED_LESSONS, estimatedDuration: 3724, fullDescription: fullDescription.uk } });
    for (const locale of ["uk", "ru"]) await prisma.courseTranslation.updateMany({ where: { courseId: course.id, locale }, data: { fullDescription: fullDescription[locale] } });
    console.log(JSON.stringify({ ...plan, status: "complete" }));
  } finally { await prisma.$disconnect(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
