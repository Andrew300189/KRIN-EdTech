/*
 * Replaces the verbose answer options in the final practice block of
 * "Урок 2. Единственное и множественное число с to be" with only:
 * am / is / are.
 *
 * Safe to run repeatedly. It changes only generated MATCHING exercises of
 * lesson 2 in the published Verb TO BE Masterclass.
 *
 * Inspect first:
 *   node database/scripts/simplify-lesson-2-to-be-matching.cjs --dry-run
 * Apply:
 *   node database/scripts/simplify-lesson-2-to-be-matching.cjs
 */
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } },
});

const COURSE_SLUG = "verb-to-be-masterclass";
const REINFORCEMENT_MARKER = "VERB_TO_BE_20_MIN_REINFORCEMENT_V1";
const dryRun = process.argv.includes("--dry-run");

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toBeForm(value) {
  const candidate = typeof value === "string" ? value.trim().split(/\s+[—-]\s+/)[0].trim().toLowerCase() : "";
  if (["am", "is", "are"].includes(candidate)) return candidate;
  throw new Error(`Expected am, is, or are; received "${String(value)}".`);
}

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: {
      modules: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              title: true,
              blocks: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  type: true,
                  order: true,
                  exercises: {
                    orderBy: { order: "asc" },
                    select: { id: true, engineKey: true, variantKey: true, content: true, correctAnswer: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) throw new Error(`Course ${COURSE_SLUG} was not found.`);
  const firstModule = course.modules.find((module) => module.order === 1);
  const lesson = firstModule?.lessons.find((candidate) => candidate.order === 2);
  if (!lesson) throw new Error("Lesson 2 in module 1 was not found.");

  const finalExerciseBlock = [...lesson.blocks].reverse().find((block) => block.type === "EXERCISE");
  if (!finalExerciseBlock) throw new Error("Lesson 2 has no final exercise block.");

  const exercises = finalExerciseBlock.exercises.filter((exercise) => (
    exercise.engineKey === "matching" && exercise.variantKey === REINFORCEMENT_MARKER
  ));
  if (!exercises.length) throw new Error("No generated matching exercises were found in the final block of lesson 2.");

  const updates = exercises.map((exercise) => {
    const answers = asObject(exercise.correctAnswer);
    const correctAnswer = Object.fromEntries(Object.entries(answers).map(([prompt, answer]) => [prompt, toBeForm(answer)]));
    const content = asObject(exercise.content);

    return {
      id: exercise.id,
      data: {
        instruction: "Choose the correct form of to be: am, is, or are.",
        question: "Read each prompt and choose only am, is, or are.",
        content: { ...content, left: Object.keys(correctAnswer), right: ["am", "is", "are"] },
        correctAnswer,
        explanation: "Look at the subject first: I → am; he, she, it and one thing → is; you, we, they and several things → are.",
        hint: "Choose one of three forms only: am, is, or are.",
      },
    };
  });

  console.log(`${lesson.title}: ${updates.length} matching exercise(s) will use only am / is / are.`);
  if (dryRun) return;

  await prisma.$transaction(updates.map((update) => prisma.exercise.update({ where: { id: update.id }, data: update.data })));
  console.log(`Updated ${updates.length} matching exercise(s).`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
