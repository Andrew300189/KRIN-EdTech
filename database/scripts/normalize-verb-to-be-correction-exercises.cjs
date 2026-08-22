/*
 * Converts the existing Verb TO BE "find and correct" activities from
 * whole-sentence answers to a single corrected word. It keeps exercises,
 * attempts and lesson progress intact; only the authoring configuration of
 * eligible exercises changes.
 *
 * Check first: node database/scripts/normalize-verb-to-be-correction-exercises.cjs --dry-run
 * Apply once:  node database/scripts/normalize-verb-to-be-correction-exercises.cjs
 */
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } },
});

const COURSE_SLUG = "verb-to-be-masterclass";
const dryRun = process.argv.includes("--dry-run");

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function words(value) {
  return String(value ?? "").match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) ?? [];
}

function comparable(value) {
  return value.replace(/[’]/g, "'").toLocaleLowerCase("en");
}

function sourceSentence(question) {
  return String(question ?? "").replace(/^[^:]{1,48}:\s*/, "").trim();
}

function extractCorrection(question, answer) {
  const incorrectWords = words(sourceSentence(question));
  const correctWords = words(answer);
  const length = Math.max(incorrectWords.length, correctWords.length);
  for (let index = 0; index < length; index += 1) {
    const incorrect = incorrectWords[index];
    const correct = correctWords[index];
    if (incorrect && correct && comparable(incorrect) !== comparable(correct)) {
      return { incorrect, correct };
    }
  }
  return null;
}

async function main() {
  const exercises = await prisma.exercise.findMany({
    where: {
      engineKey: "find-and-correct",
      lessonBlock: { lesson: { module: { course: { slug: COURSE_SLUG } } } },
    },
    select: { id: true, question: true, correctAnswer: true, content: true },
  });

  const updates = [];
  const skipped = [];
  for (const exercise of exercises) {
    const content = asRecord(exercise.content);
    if (content.answerMode === "CORRECTED_TOKEN") continue;
    if (typeof exercise.correctAnswer !== "string") {
      skipped.push(exercise.id);
      continue;
    }

    const replacement = extractCorrection(exercise.question, exercise.correctAnswer);
    if (!replacement) {
      skipped.push(exercise.id);
      continue;
    }

    const sentence = sourceSentence(exercise.question);
    updates.push({
      id: exercise.id,
      data: {
        instruction: "Найдите ошибочное слово и впишите только правильное слово.",
        question: `В предложении есть ошибка: ${sentence} Впишите только правильное слово.`,
        content: {
          ...content,
          answerMode: "CORRECTED_TOKEN",
          ignorePunctuation: true,
          sourceSentence: sentence,
          incorrectToken: replacement.incorrect,
          correctedToken: replacement.correct,
        },
        correctAnswer: replacement.correct,
        alternativeAnswers: [],
        explanation: `Слово «${replacement.incorrect}» нужно заменить на «${replacement.correct}». Полное предложение: ${exercise.correctAnswer}`,
      },
    });
  }

  console.log(`Found ${exercises.length} correction exercises; ${updates.length} can be normalized; ${skipped.length} require a manual review.`);
  if (dryRun) return;

  for (const update of updates) {
    await prisma.exercise.update({ where: { id: update.id }, data: update.data });
  }
  console.log(`Normalized ${updates.length} correction exercises.`);
  if (skipped.length) console.log(`Manual review IDs: ${skipped.join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
