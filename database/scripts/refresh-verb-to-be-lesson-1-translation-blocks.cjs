/*
 * Keeps the first To Be lesson's personal-pronoun translation and error-
 * correction blocks aligned in populated databases and in a fresh bootstrap.
 *
 * Translation cards contain only a source phrase and expect a complete pair
 * (for example, "I am"). Correction cards show an incorrect pair and expect
 * only the corrected to-be form.
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
const TRANSLATION_MARKER = "TO_BE_TRANSLATION_PERSONAL_PRONOUNS_V1";
const CORRECTION_MARKER = "TO_BE_ERROR_CORRECTION_V1";
const DYNAMIC_MATCHING_MARKER = "TO_BE_DYNAMIC_MATCHING_V1";
const translationInstruction = "Переведите на английский. Впишите только два слова.";
const correctionInstruction = "В предложении есть ошибка. Впишите правильную форму глагола to be.";
const dynamicMatchingInstruction = "Соедините личное местоимение с правильной формой глагола to be.";
const dynamicToBePairs = Array.from({ length: 36 }, (_, index) => {
  const cycle = [
    ["I", "am"], ["you", "are"], ["he", "is"], ["she", "is"],
    ["it", "is"], ["we", "are"], ["you", "are"], ["they", "are"],
  ][index % 8];
  return { id: `p${String(index + 1).padStart(2, "0")}`, left: cycle[0], right: cycle[1] };
});

const blocks = [
  {
    order: 3,
    marker: TRANSLATION_MARKER,
    instruction: translationInstruction,
    variantKey: "TO_BE_PERSONAL_PRONOUN_TRANSLATION",
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
    marker: TRANSLATION_MARKER,
    instruction: translationInstruction,
    variantKey: "TO_BE_PERSONAL_PRONOUN_TRANSLATION",
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
    marker: TRANSLATION_MARKER,
    instruction: translationInstruction,
    variantKey: "TO_BE_PERSONAL_PRONOUN_TRANSLATION",
    title: "Личные местоимения: находиться и существовать",
    goal: "Перевести личные местоимения с формами «находиться» и «существовать».",
    ukrainianGoal: "Перекласти особові займенники з формами «перебувати» та «існувати».",
    prompts: [
      ["Я нахожусь", "I am"], ["Ты находишься", "You are"], ["Он находится", "He is"], ["Она находится", "She is"],
      ["Оно находится", "It is"], ["Мы находимся", "We are"], ["Вы находитесь", "You are"], ["Они находятся", "They are"],
      ["Я существую", "I am"], ["Ты существуешь", "You are"], ["Он существует", "He is"], ["Они существуют", "They are"],
    ],
  },
  {
    order: 6,
    marker: CORRECTION_MARKER,
    instruction: correctionInstruction,
    variantKey: "TO_BE_PERSONAL_PRONOUN_ERROR_CORRECTION",
    title: "Исправляем ошибки: am, is, are",
    goal: "Исправить форму глагола to be в коротких фразах.",
    ukrainianGoal: "Виправити форму дієслова to be у коротких фразах.",
    prompts: [
      ["Я есть — I is.", "am"], ["Ты есть — You am.", "are"], ["Он есть — He are.", "is"], ["Она есть — She are.", "is"],
      ["Оно есть — It are.", "is"], ["Мы есть — We am.", "are"], ["Вы есть — You is.", "are"], ["Они есть — They is.", "are"],
      ["Я являюсь — I are.", "am"], ["Ты являешься — You is.", "are"], ["Он является — He am.", "is"], ["Они являются — They am.", "are"],
    ],
  },
  {
    order: 7,
    marker: CORRECTION_MARKER,
    instruction: correctionInstruction,
    variantKey: "TO_BE_PERSONAL_PRONOUN_ERROR_CORRECTION",
    title: "Исправляем ошибки: находиться",
    goal: "Исправить форму глагола to be в фразах о местонахождении.",
    ukrainianGoal: "Виправити форму дієслова to be у фразах про місцезнаходження.",
    prompts: [
      ["Я нахожусь — I is.", "am"], ["Ты находишься — You am.", "are"], ["Он находится — He are.", "is"], ["Она находится — She are.", "is"],
      ["Оно находится — It are.", "is"], ["Мы находимся — We is.", "are"], ["Вы находитесь — You am.", "are"], ["Они находятся — They is.", "are"],
      ["Я нахожусь — I are.", "am"], ["Ты находишься — You is.", "are"], ["Она находится — She am.", "is"], ["Они находятся — They am.", "are"],
    ],
  },
  {
    order: 8,
    marker: CORRECTION_MARKER,
    instruction: correctionInstruction,
    variantKey: "TO_BE_PERSONAL_PRONOUN_ERROR_CORRECTION",
    title: "Исправляем ошибки: существовать",
    goal: "Исправить форму глагола to be в смешанных коротких фразах.",
    ukrainianGoal: "Виправити форму дієслова to be у змішаних коротких фразах.",
    prompts: [
      ["Я существую — I is.", "am"], ["Ты существуешь — You am.", "are"], ["Он существует — He are.", "is"], ["Они существуют — They is.", "are"],
      ["Я есть — I are.", "am"], ["Ты являешься — You is.", "are"], ["Он находится — He am.", "is"], ["Она есть — She are.", "is"],
      ["Оно существует — It are.", "is"], ["Мы являемся — We is.", "are"], ["Вы находитесь — You am.", "are"], ["Они существуют — They am.", "are"],
    ],
  },
  {
    order: 9,
    marker: DYNAMIC_MATCHING_MARKER,
    instruction: dynamicMatchingInstruction,
    variantKey: "TO_BE_DYNAMIC_PRONOUN_MATCHING",
    dynamicPairs: dynamicToBePairs,
    title: "Матчинг: личные местоимения и to be",
    goal: "Соединить личные местоимения с правильной формой глагола to be.",
    ukrainianGoal: "Зіставити особові займенники з правильною формою дієслова to be.",
    prompts: [["am, is, are", Object.fromEntries(dynamicToBePairs.map((pair) => [pair.id, pair.right]))]],
  },
];

function cuid() {
  return `c${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

function settings(definition) {
  return {
    seedMarker: definition.marker,
    lessonGoal: definition.goal,
    lessonGoalTranslations: { ru: definition.goal, uk: definition.ukrainianGoal },
  };
}

function exercise(blockId, definition, [question, answer], index) {
  const dynamicPairs = definition.dynamicPairs;
  return {
    id: cuid(),
    lessonBlockId: blockId,
    type: dynamicPairs ? "MATCHING" : "TEXT_INPUT",
    engineKey: dynamicPairs ? "matching" : "text-input",
    variantKey: definition.variantKey,
    instruction: definition.instruction,
    question,
    content: dynamicPairs ? { dynamicMatching: true, pairs: dynamicPairs } : { ignorePunctuation: true },
    correctAnswer: answer,
    hintsEnabled: false,
    difficulty: 1,
    basePoints: dynamicPairs ? dynamicPairs.length : 1,
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
    && block.settings.seedMarker === definition.marker
    && publishedExercises.length === definition.prompts.length
    && definition.prompts.every(([question, answer], index) => (
      publishedExercises[index]?.order === index + 1
      && publishedExercises[index]?.instruction === definition.instruction
      && publishedExercises[index]?.question === question
      && JSON.stringify(publishedExercises[index]?.correctAnswer) === JSON.stringify(answer)
      && publishedExercises[index]?.variantKey === definition.variantKey
    ));
}

async function main() {
  const lesson = await prisma.lesson.findFirst({
    where: { module: { order: 1, course: { slug: COURSE_SLUG } }, order: 1 },
    include: {
      blocks: {
        where: { order: { in: blocks.map((block) => block.order) } },
        include: { exercises: { orderBy: { order: "asc" }, select: { id: true, order: true, instruction: true, question: true, correctAnswer: true, variantKey: true, contentStatus: true } } },
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
    console.log("Verb to be lesson 1 practice blocks are already current.");
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
      await tx.exercise.createMany({ data: definition.prompts.map((prompt, index) => exercise(blockId, definition, prompt, index)) });
    }
  }, { maxWait: 30_000, timeout: 120_000 });

  console.log(`Published ${updates.length} To Be practice block(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
