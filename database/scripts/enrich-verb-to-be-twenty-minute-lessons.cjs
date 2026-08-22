/*
 * Idempotently enriches the existing published "Verb TO BE Masterclass".
 * It appends practice to the final exercise block of each lesson, preserving
 * every existing lesson, attempt, learner-progress record and purchase.
 *
 * Check the plan first:
 *   node database/scripts/enrich-verb-to-be-twenty-minute-lessons.cjs --dry-run
 * Apply it once:
 *   node database/scripts/enrich-verb-to-be-twenty-minute-lessons.cjs
 */
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } },
});

const COURSE_SLUG = "verb-to-be-masterclass";
const MARKER = "VERB_TO_BE_20_MIN_REINFORCEMENT_V1";
const dryRun = process.argv.includes("--dry-run");
const published = () => ({ contentStatus: "PUBLISHED", publishedAt: new Date() });

const banks = [
  [
    ["I", "ready", "am", "I am ready."], ["You", "welcome", "are", "You are welcome."],
    ["He", "a doctor", "is", "He is a doctor."], ["She", "at home", "is", "She is at home."],
    ["It", "cold today", "is", "It is cold today."], ["We", "friends", "are", "We are friends."],
    ["They", "from Kyiv", "are", "They are from Kyiv."], ["My name", "Anna", "is", "My name is Anna."],
    ["The children", "in the garden", "are", "The children are in the garden."], ["My parents", "at work", "are", "My parents are at work."],
    ["This book", "useful", "is", "This book is useful."], ["The lesson", "interesting", "is", "The lesson is interesting."],
  ],
  [
    ["I", "late", "am not", "I am not late."], ["You", "alone", "aren't", "You aren't alone."],
    ["He", "at work", "isn't", "He isn't at work."], ["She", "a doctor", "isn't", "She isn't a doctor."],
    ["It", "cold today", "isn't", "It isn't cold today."], ["We", "ready", "aren't", "We aren't ready."],
    ["They", "from Spain", "aren't", "They aren't from Spain."], ["My bag", "here", "isn't", "My bag isn't here."],
    ["The children", "sleepy", "aren't", "The children aren't sleepy."], ["My parents", "at home", "aren't", "My parents aren't at home."],
    ["This book", "new", "isn't", "This book isn't new."], ["The shops", "open", "aren't", "The shops aren't open."],
  ],
  [
    ["you / ready", "a question", "Are", "Are you ready?"], ["he / at home", "a question", "Is", "Is he at home?"],
    ["they / from Ukraine", "a question", "Are", "Are they from Ukraine?"], ["she / your teacher", "a question", "Is", "Is she your teacher?"],
    ["it / cold outside", "a question", "Is", "Is it cold outside?"], ["we / late", "a question", "Are", "Are we late?"],
    ["I / on the list", "a question", "Am", "Am I on the list?"], ["the children / ready", "a question", "Are", "Are the children ready?"],
    ["this book / useful", "a question", "Is", "Is this book useful?"], ["your parents / at work", "a question", "Are", "Are your parents at work?"],
    ["there / a cafe nearby", "a question", "Is", "Is there a cafe nearby?"], ["there / any questions", "a question", "Are", "Are there any questions?"],
  ],
  [
    ["I", "not afraid", "am", "I am not afraid."], ["You", "my partner", "are", "You are my partner."],
    ["He", "not late", "isn't", "He isn't late."], ["She", "a designer", "is", "She is a designer."],
    ["It", "not difficult", "isn't", "It isn't difficult."], ["We", "ready to begin", "are", "We are ready to begin."],
    ["They", "not at school", "aren't", "They aren't at school."], ["my name", "correct", "is", "My name is correct."],
    ["the students", "not tired", "aren't", "The students aren't tired."], ["your answer", "right", "is", "Your answer is right."],
    ["there", "a mistake", "is", "There is a mistake."], ["there", "any buses", "aren't", "There aren't any buses."],
  ],
];

function rotated(items, offset, count) {
  return Array.from({ length: count }, (_, index) => items[(offset + index) % items.length]);
}

function timingFor(exercise) {
  const content = exercise.content && typeof exercise.content === "object" ? exercise.content : {};
  if (["choice", "single-choice", "true-false-not-given"].includes(exercise.engineKey)) return 5;
  if (exercise.engineKey === "multiple-choice") return 5;
  if (["matching", "drag-and-drop"].includes(exercise.engineKey)) return Math.max(10, (Array.isArray(content.left) ? content.left.length : 1) * 5);
  if (["sorting", "sentence-builder"].includes(exercise.engineKey)) return Math.max(10, (Array.isArray(content.options) ? content.options.length : 2) * 5);
  if (["fill-in-the-blanks", "dropdown-gaps"].includes(exercise.engineKey)) return 10;
  if (exercise.engineKey === "find-and-correct") return 20;
  if (exercise.engineKey === "text-input") return 18;
  return exercise.timeLimitSeconds || 18;
}

function matching(items, offset) {
  const selected = rotated(items, offset, 10);
  const pairs = Object.fromEntries(selected.map(([subject, context, form, sentence]) => [`${subject} · ${context}`, `${form.toUpperCase()} — ${sentence}`]));
  return {
    type: "MATCHING", engineKey: "matching", variantKey: MARKER,
    instruction: "Match every prompt with its complete English sentence.",
    question: "Take your time and match all ten pairs.",
    content: { left: Object.keys(pairs), right: Object.values(pairs).reverse() }, correctAnswer: pairs,
    explanation: "Read the subject first, then choose the form of to be that completes the whole sentence.",
    hint: "A complete sentence starts with the subject and uses the correct form of to be.",
    hintsEnabled: true, difficulty: 1, basePoints: 1, timeLimitSeconds: 50,
    solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false,
  };
}

function sentenceBuilder(item) {
  const [, , , sentence] = item;
  const tokens = sentence.replace(/[.?!]$/, "").split(" ");
  return {
    type: "SENTENCE_ORDER", engineKey: "sentence-builder", variantKey: MARKER,
    instruction: "Build the sentence in natural English word order.", question: "Put every word in the right place.",
    content: { options: tokens, shuffleOptions: true }, correctAnswer: tokens,
    explanation: `The correct order is: ${sentence}`, hint: "Start with the subject, then use the form of to be.",
    hintsEnabled: true, difficulty: 1, basePoints: 2, timeLimitSeconds: Math.max(10, tokens.length * 5),
    solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false,
  };
}

function textInput(item) {
  const [, , form, sentence] = item;
  return {
    type: "TEXT_INPUT", engineKey: "text-input", variantKey: MARKER,
    instruction: "Type the missing form of to be.", question: `Complete: ${sentence.replace(form, "___")}`,
    content: { ignorePunctuation: true }, correctAnswer: form,
    explanation: `The correct form is “${form}”: ${sentence}`,
    hint: "Find the subject before you choose the verb form.",
    hintsEnabled: true, difficulty: 1, basePoints: 1, timeLimitSeconds: 18,
    solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false,
  };
}

function correction(item, wrongForm) {
  const [, , form, sentence] = item;
  const incorrect = sentence.replace(form, wrongForm);
  return {
    type: "ERROR_CORRECTION", engineKey: "find-and-correct", variantKey: MARKER,
    instruction: "Correct the full sentence.", question: `Correct: ${incorrect}`,
    content: { ignorePunctuation: true }, correctAnswer: sentence,
    explanation: `Use “${form}”: ${sentence}`,
    hint: "Check which subject appears at the beginning of the sentence.",
    hintsEnabled: true, difficulty: 2, basePoints: 2, timeLimitSeconds: 20,
    solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false,
  };
}

function wrongForm(form) {
  return ({ am: "is", is: "are", are: "is", "am not": "isn't", "isn't": "aren't", "aren't": "isn't", Am: "Is", Is: "Are", Are: "Is" })[form] || "is";
}

function reinforcementExercises(moduleOrder, lessonOrder) {
  const bank = banks[Math.max(0, Math.min(banks.length - 1, moduleOrder - 1))];
  const offset = (lessonOrder - 1) * 3;
  const exercises = Array.from({ length: 6 }, (_, index) => matching(bank, offset + index * 2));
  exercises.push(...rotated(bank, offset + 2, 4).map(sentenceBuilder));
  exercises.push(...rotated(bank, offset + 6, 6).map(textInput));
  exercises.push(...rotated(bank, offset + 1, 2).map((item) => correction(item, wrongForm(item[2]))));
  return exercises;
}

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: {
      id: true,
      modules: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true, order: true, title: true,
              blocks: {
                orderBy: { order: "asc" },
                select: { id: true, type: true, order: true, exercises: { orderBy: { order: "asc" }, select: { id: true, engineKey: true, content: true, timeLimitSeconds: true, variantKey: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!course) throw new Error(`Course ${COURSE_SLUG} was not found.`);

  let changedLessons = 0;
  let addedExercises = 0;
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      const target = [...lesson.blocks].reverse().find((block) => block.type === "EXERCISE");
      if (!target) throw new Error(`Lesson ${lesson.id} has no exercise block.`);
      const needsReinforcement = !target.exercises.some((exercise) => exercise.variantKey === MARKER);
      const additions = needsReinforcement ? reinforcementExercises(module.order, lesson.order) : [];
      if (dryRun) {
        console.log(`${lesson.title}: ${needsReinforcement ? `would add ${additions.length} exercises` : "already enriched"}`);
        continue;
      }
      await prisma.$transaction(async (tx) => {
        await Promise.all(target.exercises.map((exercise) => tx.exercise.update({ where: { id: exercise.id }, data: { timeLimitSeconds: timingFor(exercise) } })));
        if (needsReinforcement) {
          const firstOrder = target.exercises.length + 1;
          await Promise.all(additions.map((exercise, index) => tx.exercise.create({ data: { lessonBlockId: target.id, ...exercise, order: firstOrder + index, ...published() } })));
        }
        await tx.lesson.update({ where: { id: lesson.id }, data: { estimatedDuration: 20 } });
      });
      changedLessons += 1;
      addedExercises += additions.length;
    }
  }
  if (!dryRun) await prisma.course.update({ where: { id: course.id }, data: { estimatedDuration: 800, lessonCount: 40 } });
  console.log(dryRun ? "Dry run complete." : `Updated ${changedLessons} lessons; added ${addedExercises} practice exercises.`);
}

main()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
