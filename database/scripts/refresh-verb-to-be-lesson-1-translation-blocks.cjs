/*
 * Keeps the first To Be lesson's three personal-pronoun translation blocks
 * aligned in populated databases and in a freshly bootstrapped database.
 *
 * Each card deliberately contains only the source phrase. Learners type the
 * complete English pair (for example, "I am") rather than a missing word in
 * a longer sentence.
 */

try {
  require("dotenv").config({ path: ".env", quiet: true });
} catch (error) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;
}

const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } },
});

const COURSE_SLUG = "verb-to-be-masterclass";
const MARKER = "TO_BE_TRANSLATION_PERSONAL_PRONOUNS_V1";
const instruction = "Переведите на английский. Впишите только два слова.";

const blocks = [
  {
    order: 3,
    title: "Личные местоимения: быть",
    goal: "Перевести простые личные местоимения с формой «быть».",
    ukrainianGoal: "Перекласти прості особові займенники з формою «бути».",
    prompts: [
      ["Я есть", "I am"], ["Ты есть", "You are"], ["Он есть", "He is"], ["Она есть", "She is"],
      ["Оно есть", "It is"], ["Мы есть", "We are"], ["Вы есть", "You are"], ["Они есть", "They are"],
      ["Я есть", "I am"], ["Ты есть", "You are"], ["Он есть", "He is"], ["Они есть", "They are"],
    ],
  },
  {
    order: 4,
    title: "Личные местоимения: являться",
    goal: "Перевести личные местоимения с формой «являться».",
    ukrainianGoal: "Перекласти особові займенники з формою «бути».",
    prompts: [
      ["Я являюсь", "I am"], ["Ты являешься", "You are"], ["Он является", "He is"], ["Она является", "She is"],
      ["Оно является", "It is"], ["Мы являемся", "We are"], ["Вы являетесь", "You are"], ["Они являются", "They are"],
      ["Я являюсь", "I am"], ["Ты являешься", "You are"], ["Она является", "She is"], ["Они являются", "They are"],
    ],
  },
  {
    order: 5,
    title: "Личные местоимения: находиться и существовать",
    goal: "Перевести личные местоимения с формами «находиться» и «существовать».",
    ukrainianGoal: "Перекласти особові займенники з формами «перебувати» та «існувати».",
    prompts: [
      ["Я нахожусь", "I am"], ["Ты находишься", "You are"], ["Он находится", "He is"], ["Она находится", "She is"],
      ["Оно находится", "It is"], ["Мы находимся", "We are"], ["Вы находитесь", "You are"], ["Они находятся", "They are"],
      ["Я существую", "I am"], ["Ты существуешь", "You are"], ["Он существует", "He is"], ["Они существуют", "They are"],
    ],
  },
];

function cuid() {
  return `c${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

function settings(definition) {
  return {
    seedMarker: MARKER,
    lessonGoal: definition.goal,
    lessonGoalTranslations: { ru: definition.goal, uk: definition.ukrainianGoal },
  };
}

function exercise(blockId, [question, answer], index) {
  return {
    id: cuid(),
    lessonBlockId: blockId,
    type: "TEXT_INPUT",
    engineKey: "text-input",
    variantKey: "TO_BE_PERSONAL_PRONOUN_TRANSLATION",
    instruction,
    question,
    content: { ignorePunctuation: true },
    correctAnswer: answer,
    hintsEnabled: false,
    difficulty: 1,
    basePoints: 1,
    timeLimitSeconds: 15,
    solutionCost: 0,
    allowInstantCheck: true,
    allowExtraExercise: false,
    isGeneratedReview: false,
    contentStatus: "PUBLISHED",
    publishedAt: new Date(),
    order: index + 1,
  };
}

function isCurrentBlock(block, definition) {
  const publishedExercises = block?.exercises.filter((item) => item.contentStatus === "PUBLISHED") ?? [];
  return block?.settings
    && typeof block.settings === "object"
    && !Array.isArray(block.settings)
    && block.settings.seedMarker === MARKER
    && publishedExercises.length === definition.prompts.length
    && definition.prompts.every(([question, answer], index) => (
      publishedExercises[index]?.order === index + 1
      && publishedExercises[index]?.question === question
      && publishedExercises[index]?.correctAnswer === answer
    ));
}

async function main() {
  const lesson = await prisma.lesson.findFirst({
    where: { module: { order: 1, course: { slug: COURSE_SLUG } }, order: 1 },
    include: {
      blocks: {
        where: { order: { in: blocks.map((block) => block.order) } },
        include: { exercises: { orderBy: { order: "asc" }, select: { id: true, order: true, question: true, correctAnswer: true, contentStatus: true } } },
      },
    },
  });
  if (!lesson) {
    console.log("Verb to be module 1 lesson 1 is not installed; translation-block refresh skipped.");
    return;
  }

  const existingByOrder = new Map(lesson.blocks.map((block) => [block.order, block]));
  const updates = blocks.filter((definition) => !isCurrentBlock(existingByOrder.get(definition.order), definition));
  if (!updates.length) {
    console.log("Verb to be personal-pronoun translation blocks are already current.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const definition of updates) {
      const existing = existingByOrder.get(definition.order);
      let blockId = existing?.id;
      if (blockId) {
        // Preserve every historic attempt by retiring the old cards before
        // their order slots are reused by the new exercise versions.
        await tx.exercise.updateMany({
          where: { lessonBlockId: blockId },
          data: { contentStatus: "ARCHIVED", archivedAt: new Date(), order: { increment: 1000 } },
        });
        await tx.lessonBlock.update({
          where: { id: blockId },
          data: {
            type: "EXERCISE",
            title: definition.title,
            content: null,
            settings: settings(definition),
            isRequired: true,
            contentStatus: "PUBLISHED",
            publishedAt: new Date(),
            archivedAt: null,
          },
        });
      } else {
        blockId = cuid();
        await tx.lessonBlock.create({
          data: {
            id: blockId,
            lessonId: lesson.id,
            type: "EXERCISE",
            title: definition.title,
            settings: settings(definition),
            order: definition.order,
            isRequired: true,
            contentStatus: "PUBLISHED",
            publishedAt: new Date(),
          },
        });
      }
      await tx.exercise.createMany({ data: definition.prompts.map((prompt, index) => exercise(blockId, prompt, index)) });
    }
  }, { maxWait: 30_000, timeout: 120_000 });

  console.log(`Published ${updates.length} To Be translation block(s), each with 12 short-answer cards.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
