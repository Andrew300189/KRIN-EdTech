/*
 * Rebuilds only lesson 1 of the published "Verb TO BE Masterclass".
 *
 * The earlier draft accumulated large multi-pair exercises. This version
 * keeps every learner attempt intact by archiving those old blocks, then
 * creates a new one-question-at-a-time practice path:
 *   - am / is / are by singular and plural
 *   - personal subjects and the three forms
 *   - short real-life contexts
 *
 * Inspect first:
 *   node database/scripts/rebuild-lesson-1-to-be-foundations.cjs --dry-run
 * Apply once:
 *   node database/scripts/rebuild-lesson-1-to-be-foundations.cjs --apply
 */

require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } },
});

const COURSE_SLUG = "verb-to-be-masterclass";
const SEED_MARKER = "TO_BE_FOUNDATIONS_STEP_BY_STEP_V2";
const shouldApply = process.argv.includes("--apply");
const publishedAt = new Date();
const published = () => ({ contentStatus: "PUBLISHED", publishedAt });

const lessonGoal = "Выбирать am, is или are по лицу и числу — и сразу видеть, почему эта форма верная.";

const theory = `
  <h2>To be: маленький глагол, без которого не обойтись</h2>
  <p><strong>To be</strong> кажется коротким и незаметным, но это один из главных глаголов английского языка. В русском настоящем времени мы обычно не произносим слово «быть»: «я студент», «она дома», «они счастливы». В английском его пропускать нельзя: <strong>I a student</strong> — ошибка, а <strong>I am a student</strong> — правильное предложение.</p>
  <p>С помощью <em>to be</em> мы говорим, кто мы, кем работаем, какие мы, где находимся и в каком состоянии пребываем. Он нужен и для возраста, погоды, времени и дня недели.</p>
  <ul>
    <li><strong>I am a teacher.</strong> — Я учитель.</li>
    <li><strong>She is happy.</strong> — Она счастлива.</li>
    <li><strong>We are at home.</strong> — Мы дома.</li>
    <li><strong>The weather is cold.</strong> — Погода холодная.</li>
    <li><strong>They are interested in music.</strong> — Они интересуются музыкой.</li>
  </ul>
  <h3>Три формы в настоящем времени</h3>
  <ul>
    <li><strong>am</strong> — только с <strong>I</strong>: <em>I am ready.</em></li>
    <li><strong>is</strong> — с <strong>he, she, it</strong> и с одним человеком или предметом: <em>She is kind. The book is interesting.</em></li>
    <li><strong>are</strong> — с <strong>we, you, they</strong> и с несколькими людьми или предметами: <em>We are friends. The children are hungry.</em></li>
  </ul>
  <p><strong>Важно:</strong> <em>am</em> и <em>is</em> относятся к единственному числу, а <em>are</em> — к множественному. Но <strong>you are</strong> всегда использует <em>are</em>, даже когда вы обращаетесь к одному человеку.</p>
  <h3>Где вы встретите to be</h3>
  <ul>
    <li>профессия: <strong>My brother is a doctor.</strong></li>
    <li>качество: <strong>The film is interesting.</strong></li>
    <li>место: <strong>My friends are at the cinema.</strong></li>
    <li>состояние и чувства: <strong>I am tired. We are happy.</strong></li>
    <li>возраст: <strong>She is twenty years old.</strong></li>
    <li>погода, время и дата: <strong>It is rainy. It is five o’clock. Today is Saturday.</strong></li>
  </ul>
  <p>Главное правило этого урока: если в предложении нет действия, но нужно соединить человека или предмет с профессией, качеством, местом или состоянием, выберите подходящую форму <strong>am, is</strong> или <strong>are</strong>.</p>
`;

function optionsWithAnswer(answer) {
  const forms = ["am", "is", "are"];
  const offset = Math.max(0, forms.indexOf(answer));
  return [...forms.slice(offset + 1), ...forms.slice(0, offset + 1)];
}

function input(question, answer, hint) {
  return {
    type: "TEXT_INPUT",
    engineKey: "text-input",
    variantKey: "SHORT_ANSWER",
    instruction: "Впишите одну правильную форму: am, is или are.",
    question,
    content: { ignorePunctuation: true },
    correctAnswer: answer,
    explanation: `Правильная форма — ${answer}.`,
    hint,
    hintsEnabled: true,
    difficulty: 1,
    basePoints: 1,
    timeLimitSeconds: 12,
    solutionCost: 0,
    allowInstantCheck: true,
    allowExtraExercise: false,
  };
}

function choice(question, answer, hint) {
  return {
    type: "SINGLE_CHOICE",
    engineKey: "single-choice",
    variantKey: "CONTEXT_SELECTION",
    instruction: "Выберите правильную форму глагола to be.",
    question,
    content: { options: optionsWithAnswer(answer) },
    correctAnswer: answer,
    explanation: `Верно: ${answer}.`,
    hint,
    hintsEnabled: true,
    difficulty: 1,
    basePoints: 1,
    timeLimitSeconds: 9,
    solutionCost: 0,
    allowInstantCheck: true,
    allowExtraExercise: false,
  };
}

function matching(question, left, answer, right, hint) {
  return {
    type: "MATCHING",
    engineKey: "matching",
    variantKey: "PAIR_MATCHING",
    instruction: "Соедините элемент из левой колонки с правильным элементом справа.",
    question,
    content: { left: [left], right },
    correctAnswer: { [left]: answer },
    explanation: `Правильная связь: ${left} → ${answer}.`,
    hint,
    hintsEnabled: true,
    difficulty: 1,
    basePoints: 1,
    timeLimitSeconds: 10,
    solutionCost: 0,
    allowInstantCheck: true,
    allowExtraExercise: false,
  };
}

const numberMatchPrompts = [
  ["am · I", "Singular", "am is used only with I."],
  ["is · he", "Singular", "He names one person."],
  ["is · she", "Singular", "She names one person."],
  ["is · it", "Singular", "It names one thing, animal or situation."],
  ["is · one book", "Singular", "One book is singular."],
  ["is · my friend", "Singular", "One friend is singular."],
  ["are · we", "Plural", "We means more than one person."],
  ["are · you", "Plural", "You always takes are."],
  ["are · they", "Plural", "They means more than one person or thing."],
  ["are · two books", "Plural", "Two books are plural."],
  ["are · my friends", "Plural", "Friends is a plural noun."],
  ["are · the children", "Plural", "Children is plural."],
];

const numberFillPrompts = [
  ["I ___ a student.", "am", "I always goes with am."],
  ["My sister ___ at home.", "is", "One sister is singular."],
  ["The children ___ in the garden.", "are", "Children is plural."],
  ["This book ___ useful.", "is", "This book means one book."],
  ["My parents ___ at work.", "are", "Parents is plural."],
  ["The weather ___ cold today.", "is", "Weather is singular."],
  ["We ___ ready.", "are", "We is plural."],
  ["My name ___ Anna.", "is", "One name is singular."],
  ["You ___ very kind.", "are", "You always takes are."],
  ["The lesson ___ interesting.", "is", "One lesson is singular."],
  ["They ___ from Ukraine.", "are", "They is plural."],
  ["I ___ not late.", "am", "I still takes am before not."],
];

const numberChoicePrompts = [
  ["One dog ___ friendly.", "is", "One dog is singular."],
  ["Three dogs ___ friendly.", "are", "More than one dog is plural."],
  ["My teacher ___ here.", "is", "One teacher is singular."],
  ["My teachers ___ here.", "are", "Teachers is plural."],
  ["The answer ___ correct.", "is", "One answer is singular."],
  ["The answers ___ correct.", "are", "Answers is plural."],
  ["A child ___ sleepy.", "is", "A child is one person."],
  ["Children ___ sleepy.", "are", "Children is plural."],
  ["The film ___ great.", "is", "One film is singular."],
  ["The films ___ great.", "are", "Films is plural."],
  ["My friend and I ___ classmates.", "are", "Two people make a plural subject."],
  ["The coffee ___ hot.", "is", "Coffee is treated as singular here."],
];

const personMatchPrompts = [
  ["I", "am", "Only I uses am."],
  ["you", "are", "You always uses are."],
  ["he", "is", "He is one person."],
  ["she", "is", "She is one person."],
  ["it", "is", "It is one thing, animal or situation."],
  ["we", "are", "We means more than one person."],
  ["they", "are", "They means more than one person or thing."],
  ["my brother", "is", "One brother can be replaced with he."],
  ["my sister and I", "are", "My sister and I can be replaced with we."],
  ["the students", "are", "Students can be replaced with they."],
  ["this phone", "is", "This phone can be replaced with it."],
  ["your parents", "are", "Parents can be replaced with they."],
];

const personFillPrompts = [
  ["I ___ happy today.", "am", "Start with the subject I."],
  ["You ___ my partner.", "are", "You takes are."],
  ["He ___ a doctor.", "is", "He takes is."],
  ["She ___ twenty years old.", "is", "She takes is."],
  ["It ___ rainy today.", "is", "Weather with it takes is."],
  ["We ___ at the cinema.", "are", "We takes are."],
  ["They ___ interested in music.", "are", "They takes are."],
  ["I ___ from Kyiv.", "am", "I takes am."],
  ["You ___ right.", "are", "You takes are."],
  ["He ___ late for class.", "is", "He takes is."],
  ["She ___ good at English.", "is", "She takes is."],
  ["It ___ five o’clock.", "is", "Time with it takes is."],
  ["We ___ ready for the lesson.", "are", "We takes are."],
  ["They ___ afraid of spiders.", "are", "They takes are."],
  ["My brother ___ a writer.", "is", "My brother can be replaced with he."],
  ["My friends ___ at the gym.", "are", "My friends can be replaced with they."],
  ["The dog ___ on the sofa.", "is", "The dog can be replaced with it."],
  ["The children ___ sleepy.", "are", "The children can be replaced with they."],
];

const personChoicePrompts = [
  ["I ___ ready to start.", "am", "I → am."],
  ["You ___ welcome here.", "are", "You → are."],
  ["He ___ an actor.", "is", "He → is."],
  ["She ___ very kind.", "is", "She → is."],
  ["It ___ Monday today.", "is", "It → is."],
  ["We ___ in the same class.", "are", "We → are."],
  ["They ___ film stars.", "are", "They → are."],
  ["I ___ interested in true-life films.", "am", "I → am."],
  ["You ___ good at maths.", "are", "You → are."],
  ["He ___ at home now.", "is", "He → is."],
  ["She ___ an author.", "is", "She → is."],
  ["It ___ cold outside.", "is", "It → is."],
  ["We ___ not alone.", "are", "We → are."],
  ["They ___ ready for the test.", "are", "They → are."],
  ["My name ___ Alex.", "is", "My name is singular."],
  ["Your parents ___ at work.", "are", "Parents is plural."],
  ["This video ___ great.", "is", "This video is singular."],
  ["These videos ___ great.", "are", "These videos are plural."],
];

const contextPrompts = [
  ["My brother ___ a doctor.", "is", "A profession for one person needs is."],
  ["She ___ tall and very kind.", "is", "She is one person."],
  ["My friends ___ at the cinema.", "are", "Friends is plural."],
  ["I ___ hungry after work.", "am", "I takes am."],
  ["The film ___ interesting.", "is", "One film takes is."],
  ["The children ___ in the museum.", "are", "Children is plural."],
  ["It ___ sunny today.", "is", "Weather is commonly described with it."],
  ["Today ___ Saturday.", "is", "Today is singular."],
  ["It ___ five o’clock.", "is", "Time uses it is."],
  ["We ___ ready for dinner.", "are", "We is plural."],
  ["They ___ from Ukraine.", "are", "They is plural."],
  ["I ___ a beginner, and that is okay.", "am", "I takes am."],
];

// A last retrieval round makes the displayed 20-minute duration agree with
// the same fast-learner estimator used by the CMS. It is deliberately still
// one response per card: no large, scrolling multi-question worksheet.
const finalChoicePrompts = [
  ["I ___ a teacher.", "am", "I → am."],
  ["You ___ my friend.", "are", "You → are."],
  ["He ___ at work.", "is", "He → is."],
  ["She ___ ready.", "is", "She → is."],
  ["It ___ a nice day.", "is", "It → is."],
  ["We ___ in Kyiv.", "are", "We → are."],
  ["They ___ students.", "are", "They → are."],
  ["My father ___ a driver.", "is", "One father is singular."],
  ["My sisters ___ at home.", "are", "Sisters is plural."],
  ["The room ___ warm.", "is", "One room is singular."],
  ["The rooms ___ warm.", "are", "Rooms is plural."],
  ["You and I ___ a team.", "are", "You and I means we."],
];

const finalFillPrompts = [
  ["The story ___ very interesting.", "is", "One story is singular."],
  ["My classmates ___ friendly.", "are", "Classmates is plural."],
];

const steps = [
  {
    order: 6,
    title: "Форма и число: соедините пары",
    goal: "Связать am, is и are с единственным или множественным числом.",
    exercises: numberMatchPrompts.map(([left, answer, hint]) => matching("В левой колонке — форма глагола. Справа — число.", left, answer, ["Singular", "Plural"], hint)),
  },
  {
    order: 7,
    title: "Форма и число: впишите ответ",
    goal: "Научиться выбирать форму по одному предмету или нескольким.",
    exercises: numberFillPrompts.map(([question, answer, hint]) => input(question, answer, hint)),
  },
  {
    order: 8,
    title: "Форма и число: быстрый выбор",
    goal: "Закрепить различие между одним и несколькими предметами.",
    exercises: numberChoicePrompts.map(([question, answer, hint]) => choice(question, answer, hint)),
  },
  {
    order: 9,
    title: "Лица: соедините с формой",
    goal: "Запомнить связки I → am; he/she/it → is; we/you/they → are.",
    exercises: personMatchPrompts.map(([left, answer, hint]) => matching("В левой колонке — лицо или подлежащее. Справа — правильная форма to be.", left, answer, ["am", "is", "are"], hint)),
  },
  {
    order: 10,
    title: "Лица: впишите форму",
    goal: "Выбирать форму без вариантов ответа.",
    exercises: personFillPrompts.map(([question, answer, hint]) => input(question, answer, hint)),
  },
  {
    order: 11,
    title: "Лица: быстрый выбор",
    goal: "Автоматически узнавать правильную форму по лицу.",
    exercises: personChoicePrompts.map(([question, answer, hint]) => choice(question, answer, hint)),
  },
  {
    order: 12,
    title: "To be в живых ситуациях",
    goal: "Применить am, is и are для профессии, состояния, места, погоды и времени.",
    exercises: contextPrompts.map(([question, answer, hint]) => choice(question, answer, hint)),
  },
  {
    order: 13,
    title: "Финальное закрепление",
    goal: "Быстро и уверенно выбирать am, is или are без подсказки правила.",
    exercises: [
      ...finalChoicePrompts.map(([question, answer, hint]) => choice(question, answer, hint)),
      ...finalFillPrompts.map(([question, answer, hint]) => input(question, answer, hint)),
    ],
  },
];

function hasMarker(settings) {
  return settings && typeof settings === "object" && !Array.isArray(settings) && settings.seedMarker === SEED_MARKER;
}

async function main() {
  const lesson = await prisma.lesson.findFirst({
    where: { module: { order: 1, course: { slug: COURSE_SLUG } }, order: 1 },
    include: { blocks: { orderBy: { order: "asc" }, select: { id: true, order: true, title: true, settings: true } } },
  });
  if (!lesson) throw new Error("Lesson 1 in module 1 was not found.");

  const existingSteps = lesson.blocks.filter((block) => hasMarker(block.settings));
  const totalExercises = steps.reduce((sum, step) => sum + step.exercises.length, 0);
  console.log(`${lesson.title}: ${totalExercises} one-question practice tasks across ${steps.length} steps.`);
  const finalStep = existingSteps.find((block) => block.order === 13);
  if (existingSteps.length && finalStep) {
    console.log("The step-by-step foundation practice is already present; no duplicate content was created.");
    return;
  }
  if (existingSteps.length && !finalStep) {
    if (!shouldApply) {
      console.log("The foundation path is present; the final timing round would add 14 individual tasks.");
      return;
    }
    const finalDefinition = steps.find((step) => step.order === 13);
    if (!finalDefinition) throw new Error("The final timing step was not defined.");
    await prisma.$transaction(async (tx) => {
      await tx.lessonBlock.create({
        data: {
          lessonId: lesson.id,
          type: "EXERCISE",
          title: finalDefinition.title,
          settings: { seedMarker: SEED_MARKER, lessonGoal: finalDefinition.goal },
          order: finalDefinition.order,
          isRequired: true,
          ...published(),
          exercises: { create: finalDefinition.exercises.map((exercise, index) => ({ ...exercise, order: index + 1, ...published() })) },
        },
      });
      await tx.lesson.update({ where: { id: lesson.id }, data: { estimatedDuration: 20 } });
    });
    console.log("Added the final timing round with 14 individual tasks.");
    return;
  }
  if (!shouldApply) {
    console.log("Dry run only. Re-run with --apply to archive the previous public practice and publish this path.");
    return;
  }

  const intro = lesson.blocks.find((block) => block.order === 1);
  const theoryBlock = lesson.blocks.find((block) => block.order === 2);
  if (!intro || !theoryBlock) throw new Error("The first lesson is missing its goal or theory block position.");

  const legacyPracticeBlockIds = lesson.blocks
    .filter((block) => block.order >= 2)
    .map((block) => block.id);

  await prisma.$transaction(async (tx) => {
    await tx.exercise.updateMany({
      where: { lessonBlockId: { in: legacyPracticeBlockIds } },
      data: { contentStatus: "ARCHIVED", archivedAt: publishedAt },
    });
    await tx.lessonBlock.updateMany({
      where: { lessonId: lesson.id, order: { gte: 3 } },
      data: { contentStatus: "ARCHIVED", archivedAt: publishedAt },
    });
    await tx.lessonBlock.update({
      where: { id: intro.id },
      data: {
        title: "Цель урока",
        content: "Понять, зачем to be нужен в английском предложении, и уверенно выбирать am, is или are.",
        settings: { seedMarker: SEED_MARKER, lessonGoal },
        isRequired: false,
        ...published(),
      },
    });
    await tx.lessonBlock.update({
      where: { id: theoryBlock.id },
      data: {
        type: "THEORY",
        title: "Как работает to be",
        content: theory,
        settings: { seedMarker: SEED_MARKER },
        isRequired: false,
        archivedAt: null,
        ...published(),
      },
    });
    for (const step of steps) {
      await tx.lessonBlock.create({
        data: {
          lessonId: lesson.id,
          type: "EXERCISE",
          title: step.title,
          settings: { seedMarker: SEED_MARKER, lessonGoal: step.goal },
          order: step.order,
          isRequired: true,
          ...published(),
          exercises: {
            create: step.exercises.map((exercise, index) => ({
              ...exercise,
              order: index + 1,
              ...published(),
            })),
          },
        },
      });
    }
    await tx.lesson.update({
      where: { id: lesson.id },
      data: {
        description: "Основа Present Simple: зачем нужен to be и как выбирать am, is или are по лицу и числу.",
        learningObjectives: [
          "Понимать, когда в английском предложении нужен to be.",
          "Соотносить am, is и are с единственным и множественным числом.",
          "Выбирать форму to be с I, you, he, she, it, we и they.",
          "Использовать формы в ситуациях о профессии, состоянии, месте, погоде и времени.",
        ],
        estimatedDuration: 20,
        isPublished: true,
        ...published(),
      },
    });
  });

  console.log(`Published the new foundation path: ${totalExercises} individual tasks, estimated lesson duration 20 minutes.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
