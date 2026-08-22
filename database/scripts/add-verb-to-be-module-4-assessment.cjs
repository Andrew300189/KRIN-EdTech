/*
 * One-time, guarded authoring script for Module 4 of the published A1 course
 * "Глагол to be". It adds a ten-lesson review and assessment module only when
 * the course contains exactly the authored first three ten-lesson modules.
 * Run: node database/scripts/add-verb-to-be-module-4-assessment.cjs
 */
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } },
});

const COURSE_SLUG = "verb-to-be-masterclass";
const published = () => ({ contentStatus: "PUBLISHED", publishedAt: new Date() });

function rotate(items, key) {
  const offset = [...key].reduce((total, character) => total + character.charCodeAt(0), 0) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function choice(question, options, correctAnswer) {
  return {
    type: "SINGLE_CHOICE", engineKey: "single-choice", variantKey: "MODULE_REVIEW",
    instruction: "Выберите один правильный вариант.", question, content: { options: rotate(options, question) }, correctAnswer,
    explanation: `Правильный ответ: ${correctAnswer}.`, hint: "Найдите подлежащее и определите: это утверждение, отрицание или вопрос.",
    hintsEnabled: true, difficulty: 1, basePoints: 1, timeLimitSeconds: 30, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false,
  };
}

function text(question, correctAnswer) {
  return {
    type: "TEXT_INPUT", engineKey: "text-input", variantKey: "SHORT_ANSWER",
    instruction: "Впишите ответ. Точка и заглавная буква не обязательны.", question, content: { ignorePunctuation: true }, correctAnswer,
    explanation: `Правильный ответ: ${correctAnswer}.`, hint: "Сначала произнесите фразу полностью, затем впишите недостающую форму.",
    hintsEnabled: true, difficulty: 1, basePoints: 2, timeLimitSeconds: 45, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false,
  };
}

function matching(question, pairs) {
  const left = Object.keys(pairs);
  const right = Object.values(pairs);
  return {
    type: "MATCHING", engineKey: "matching", variantKey: "PAIR_MATCHING",
    instruction: "Сопоставьте все пары.", question, content: { left, right: rotate(right, question) }, correctAnswer: pairs,
    explanation: "Проверьте форму to be и смысл фразы целиком.", hint: "Читайте каждую фразу вслух: неверная форма обычно сразу слышна.",
    hintsEnabled: true, difficulty: 1, basePoints: 2, timeLimitSeconds: 60, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false,
  };
}

function correction(question, correctAnswer) {
  return {
    type: "ERROR_CORRECTION", engineKey: "find-and-correct", variantKey: "ERROR_CORRECTION",
    instruction: "Исправьте предложение полностью.", question, content: { ignorePunctuation: true }, correctAnswer,
    explanation: `Правильный вариант: ${correctAnswer}.`, hint: "Проверьте форму to be, not и порядок слов.",
    hintsEnabled: true, difficulty: 2, basePoints: 2, timeLimitSeconds: 50, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false,
  };
}

function sentenceOrder(question, correctAnswer) {
  return {
    type: "SENTENCE_ORDER", engineKey: "sentence-builder", variantKey: "SENTENCE_ORDER",
    instruction: "Соберите предложение из слов по порядку.", question, content: { options: rotate(correctAnswer, question) }, correctAnswer,
    explanation: `Верный порядок: ${correctAnswer.join(" ")}.`, hint: "В вопросе форма to be стоит перед подлежащим.",
    hintsEnabled: true, difficulty: 1, basePoints: 2, timeLimitSeconds: 45, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false,
  };
}

function assessmentLesson(source) {
  const cards = source.cards.slice(0, 10);
  const makePairs = (start) => Object.fromEntries(cards.slice(start, start + 4).map(([question, answer]) => [question.replace("___", "…"), answer]));
  return {
    ...source,
    type: "TEST",
    estimatedDuration: 20,
    phraseOfTheDay: source.phraseOfTheDay || cards[0][0].replace("___", cards[0][1]),
    motivationalQuote: "Проверка — это не наказание, а способ увидеть, что уже получается уверенно.",
    previewText: source.description,
    learningObjectives: [source.goal, "Проверить результат по объяснениям после попытки.", "Получить до 40 учебных очков за самостоятельную практику."],
    blocks: [
      { type: "INTRO", title: "Цель и бонус", content: `Цель урока: ${source.goal}\n\nМаксимум за практику: 40 учебных очков. После первого завершения урока награда начисляется по действующим правилам платформы; повторное прохождение остаётся доступным для тренировки.`, isRequired: false },
      { type: "THEORY", title: source.theoryTitle, content: source.theory, isRequired: false },
      { type: "EXERCISE", title: "Выберите правильный вариант", content: null, isRequired: true, exercises: cards.map(([question, answer, distractors]) => choice(question, [answer, ...distractors], answer)) },
      { type: "EXERCISE", title: "Впишите ответ", content: null, isRequired: true, exercises: cards.slice(0, 8).map(([question, answer]) => text(`Впишите пропущенное слово: ${question}`, answer)) },
      { type: "EXERCISE", title: "Сопоставьте формы", content: null, isRequired: true, exercises: [matching("Сопоставьте фразы и нужные формы", makePairs(0)), matching("Сопоставьте ещё четыре фразы", makePairs(3)), matching("Закрепите формы в последней мини-подборке", makePairs(6))] },
      { type: "EXERCISE", title: "Исправьте ошибки", content: null, isRequired: true, exercises: source.corrections.map(([question, answer]) => correction(question, answer)) },
      { type: "EXERCISE", title: "Соберите предложение", content: null, isRequired: true, exercises: source.orders.map(([question, answer]) => sentenceOrder(question, answer)) },
    ],
  };
}

const ASSESSMENT_LESSONS = [
  assessmentLesson({
    slug: "to-be-review-forms-am-is-are", title: "Урок 31. Проверка форм am, is и are", description: "Повторите основу всех утверждений с to be.",
    goal: "без подсказки выбирать am, is и are в коротких утверждениях.", theoryTitle: "Сначала — подлежащее", theory: "Это первая проверка всего курса. Сначала найдите, кто или что является подлежащим. I требует am. He, she, it и один предмет требуют is. You, we, they и несколько предметов требуют are.\n\nНе угадывайте по последнему слову в предложении. Выбирайте форму только по подлежащему. После этой проверки вы увидите, насколько уверенно работает фундамент всех следующих тем.",
    cards: [["I ___ ready.", "am", ["is", "are"]], ["She ___ a doctor.", "is", ["am", "are"]], ["They ___ at school.", "are", ["am", "is"]], ["My brother ___ tall.", "is", ["am", "are"]], ["We ___ friends.", "are", ["am", "is"]], ["It ___ cold.", "is", ["am", "are"]], ["You ___ late.", "are", ["am", "is"]], ["The books ___ new.", "are", ["am", "is"]], ["Anna ___ from Poland.", "is", ["am", "are"]], ["I ___ interested in music.", "am", ["is", "are"]]],
    corrections: [["Исправьте: They is ready.", "They are ready."], ["Исправьте: I is a student.", "I am a student."]], orders: [["Соберите фразу.", ["She", "is", "a", "doctor"]], ["Соберите фразу.", ["We", "are", "friends"]]],
  }),
  assessmentLesson({
    slug: "to-be-review-people-descriptions", title: "Урок 32. Проверка: люди, профессии и характеристики", description: "Проверьте утверждения о людях, профессиях и качествах.",
    goal: "использовать to be в описаниях людей и предметов.", theoryTitle: "Кто это и какой он?", theory: "В английском to be соединяет человека с профессией, национальностью, внешностью и характером. She is an actress. He is from Ukraine. The film is interesting.\n\nПроверьте также число: один человек или предмет — is, несколько — are. Профессия в единственном числе обычно требует a или an. Это простые детали, которые делают фразу грамматически готовой.",
    cards: [["She ___ an actress.", "is", ["am", "are"]], ["He ___ from Ukraine.", "is", ["am", "are"]], ["They ___ film stars.", "are", ["am", "is"]], ["The actor ___ brilliant.", "is", ["am", "are"]], ["These videos ___ great.", "are", ["am", "is"]], ["I ___ a beginner.", "am", ["is", "are"]], ["My parents ___ teachers.", "are", ["am", "is"]], ["The story ___ awful.", "is", ["am", "are"]], ["You ___ very kind.", "are", ["am", "is"]], ["We ___ from Kyiv.", "are", ["am", "is"]]],
    corrections: [["Исправьте: She are an actress.", "She is an actress."], ["Исправьте: The videos is great.", "The videos are great."]], orders: [["Соберите фразу.", ["He", "is", "from", "Ukraine"]], ["Соберите фразу.", ["These", "videos", "are", "great"]]],
  }),
  assessmentLesson({
    slug: "to-be-review-contexts", title: "Урок 33. Проверка: возраст, чувства, место, время и погода", description: "Проверьте жизненные ситуации с to be.",
    goal: "правильно говорить о возрасте, состояниях, месте, времени и погоде.", theoryTitle: "To be в реальном контексте", theory: "Возраст выражается через to be: I am twenty. Состояние тоже: She is tired. О месте говорим with at, in, on: They are at the gym.\n\nДля времени и погоды чаще всего используется it: It is five o'clock. It is rainy today. Если вы различаете эти ситуации, вы уже можете описывать обычный день простыми английскими фразами.",
    cards: [["I ___ twenty years old.", "am", ["is", "are"]], ["She ___ happy today.", "is", ["am", "are"]], ["The children ___ sleepy.", "are", ["am", "is"]], ["They ___ at the cinema.", "are", ["am", "is"]], ["It ___ five o'clock.", "is", ["am", "are"]], ["It ___ rainy today.", "is", ["am", "are"]], ["Today ___ Saturday.", "is", ["am", "are"]], ["My keys ___ on the table.", "are", ["am", "is"]], ["He ___ hungry.", "is", ["am", "are"]], ["We ___ at home.", "are", ["am", "is"]]],
    corrections: [["Исправьте: I have twenty years old.", "I am twenty years old."], ["Исправьте: It are rainy today.", "It is rainy today."]], orders: [["Соберите фразу о времени.", ["It", "is", "five", "o'clock"]], ["Соберите фразу о месте.", ["They", "are", "at", "the", "cinema"]]],
  }),
  assessmentLesson({
    slug: "to-be-review-there-is-are", title: "Урок 34. Проверка: there is и there are", description: "Проверьте описание наличия одного и нескольких предметов.",
    goal: "различать there is и there are в утверждениях о месте.", theoryTitle: "Что есть вокруг?", theory: "There is сообщает, что где-то есть один предмет: There is a cafe nearby. There are сообщает о нескольких: There are two buses today.\n\nЭто не то же самое, что обычное описание известного предмета. There is a book on the table знакомит с новым предметом, а The book is on the table говорит о конкретной книге. Смотрите на число существительного.",
    cards: [["There ___ a cafe nearby.", "is", ["am", "are"]], ["There ___ two buses today.", "are", ["am", "is"]], ["There ___ an apple in my bag.", "is", ["am", "are"]], ["There ___ books on the shelf.", "are", ["am", "is"]], ["There ___ a museum here.", "is", ["am", "are"]], ["There ___ three windows.", "are", ["am", "is"]], ["There ___ a problem.", "is", ["am", "are"]], ["There ___ many students here.", "are", ["am", "is"]], ["There ___ a chair in the room.", "is", ["am", "are"]], ["There ___ two keys on the table.", "are", ["am", "is"]]],
    corrections: [["Исправьте: There are a cafe nearby.", "There is a cafe nearby."], ["Исправьте: There is two keys on the table.", "There are two keys on the table."]], orders: [["Соберите фразу.", ["There", "is", "a", "museum", "here"]], ["Соберите фразу.", ["There", "are", "three", "windows"]]],
  }),
  assessmentLesson({
    slug: "to-be-review-negative-forms", title: "Урок 35. Проверка отрицаний: am not, isn't, aren't", description: "Проверьте базовые формы отрицания с to be.",
    goal: "строить отрицания с am not, isn't и aren't без do/does.", theoryTitle: "Форма to be + not", theory: "С отрицанием to be работает самостоятельно: I am not tired. She isn't here. They aren't late. Обычные do и does здесь не нужны.\n\nС I используйте am not. С одним человеком или предметом — isn't, с несколькими — aren't. Выбирайте форму по подлежащему, а затем добавляйте not или сокращение.",
    cards: [["I ___ not late.", "am", ["is", "are"]], ["She ___ at home.", "isn't", ["aren't", "am not"]], ["They ___ ready.", "aren't", ["isn't", "am not"]], ["It ___ cold.", "isn't", ["aren't", "am not"]], ["We ___ hungry.", "aren't", ["isn't", "am not"]], ["He ___ a teacher.", "isn't", ["aren't", "am not"]], ["You ___ wrong.", "aren't", ["isn't", "am not"]], ["My bag ___ heavy.", "isn't", ["aren't", "am not"]], ["The children ___ sleepy.", "aren't", ["isn't", "am not"]], ["I ___ afraid.", "am not", ["isn't", "aren't"]]],
    corrections: [["Исправьте: I isn't hungry.", "I am not hungry."], ["Исправьте: They doesn't be ready.", "They are not ready."]], orders: [["Соберите отрицание.", ["She", "isn't", "at", "home"]], ["Соберите отрицание.", ["We", "aren't", "late"]]],
  }),
  assessmentLesson({
    slug: "to-be-review-negative-contexts", title: "Урок 36. Проверка отрицаний в жизненных ситуациях", description: "Проверьте отрицания о месте, чувствах, времени, погоде и наличии предметов.",
    goal: "выбирать правильное отрицание в контексте реальной короткой фразы.", theoryTitle: "Отрицание в контексте", theory: "Отрицать можно факт, состояние, место, погоду и наличие предметов. It isn't cold. We aren't at school. There isn't a shop nearby. There aren't any buses.\n\nДля there is / there are особенно важно число: один предмет — isn't, несколько — aren't. В отрицании множественного числа часто используется any. Остановитесь на секунду, назовите тип ситуации и затем выберите форму.",
    cards: [["It ___ sunny today.", "isn't", ["aren't", "am not"]], ["We ___ at school.", "aren't", ["isn't", "am not"]], ["There ___ a bank nearby.", "isn't", ["aren't", "am not"]], ["There ___ any buses now.", "aren't", ["isn't", "am not"]], ["She ___ sad today.", "isn't", ["aren't", "am not"]], ["I ___ tired.", "am not", ["isn't", "aren't"]], ["The shops ___ open.", "aren't", ["isn't", "am not"]], ["It ___ five o'clock.", "isn't", ["aren't", "am not"]], ["My keys ___ here.", "aren't", ["isn't", "am not"]], ["There ___ milk in the fridge.", "isn't", ["aren't", "am not"]]],
    corrections: [["Исправьте: There isn't any buses.", "There aren't any buses."], ["Исправьте: It aren't sunny today.", "It isn't sunny today."]], orders: [["Соберите отрицание.", ["There", "aren't", "any", "buses", "now"]], ["Соберите отрицание.", ["My", "keys", "aren't", "here"]]],
  }),
  assessmentLesson({
    slug: "to-be-review-general-questions", title: "Урок 37. Проверка общих вопросов", description: "Проверьте порядок слов в вопросах Am I? Is he? Are they?", goal: "строить общие вопросы с to be и выбирать точную форму.",
    theoryTitle: "Форма вперёд", theory: "В утверждении форма to be стоит после подлежащего: They are ready. В общем вопросе она переходит вперёд: Are they ready? Am I late? Is she at home?\n\nНе добавляйте do или does. Короткий ответ повторяет нужную форму: Yes, they are. No, she isn't. Эта проверка показывает, насколько уверенно вы управляете порядком слов.",
    cards: [["___ you ready?", "Are", ["Is", "Am"]], ["___ she at home?", "Is", ["Are", "Am"]], ["___ I late?", "Am", ["Is", "Are"]], ["___ they friends?", "Are", ["Is", "Am"]], ["___ it cold?", "Is", ["Are", "Am"]], ["___ we in the right room?", "Are", ["Is", "Am"]], ["___ he a doctor?", "Is", ["Are", "Am"]], ["___ those your books?", "Are", ["Is", "Am"]], ["___ the film interesting?", "Is", ["Are", "Am"]], ["___ the children ready?", "Are", ["Is", "Am"]]],
    corrections: [["Исправьте: You are ready?", "Are you ready?"], ["Исправьте: Is they at home?", "Are they at home?"]], orders: [["Соберите вопрос.", ["Is", "she", "a", "doctor"]], ["Соберите вопрос.", ["Are", "the", "children", "ready"]]],
  }),
  assessmentLesson({
    slug: "to-be-review-special-questions", title: "Урок 38. Проверка специальных вопросов", description: "Проверьте вопросы с who, what, where и how old.", goal: "строить специальные вопросы с правильным порядком слов.",
    theoryTitle: "Вопросительное слово + to be", theory: "Специальный вопрос начинается со слова, которое подсказывает нужную информацию: What is your name? Where are you from? How old is he? После вопросительного слова сразу ставьте am, is или are, затем подлежащее.\n\nС одним человеком или предметом чаще is, с несколькими — are. Не оставляйте форму to be в конце: Where she is? — не обычный прямой вопрос.",
    cards: [["What ___ your name?", "is", ["are", "am"]], ["Where ___ you from?", "are", ["is", "am"]], ["How old ___ he?", "is", ["are", "am"]], ["Who ___ she?", "is", ["are", "am"]], ["Where ___ the keys?", "are", ["is", "am"]], ["What ___ their jobs?", "are", ["is", "am"]], ["How old ___ the children?", "are", ["is", "am"]], ["Where ___ Anna from?", "is", ["are", "am"]], ["Who ___ they?", "are", ["is", "am"]], ["What day ___ it today?", "is", ["are", "am"]]],
    corrections: [["Исправьте: Where you are from?", "Where are you from?"], ["Исправьте: How old are he?", "How old is he?"]], orders: [["Соберите вопрос.", ["What", "is", "your", "name"]], ["Соберите вопрос.", ["How", "old", "are", "the", "children"]]],
  }),
  assessmentLesson({
    slug: "to-be-review-there-questions-answers", title: "Урок 39. Проверка: Is there? Are there? и короткие ответы", description: "Проверьте вопросы о наличии и естественные короткие ответы.",
    goal: "задавать вопросы с there is/are и давать корректные краткие ответы.", theoryTitle: "Есть ли здесь…?", theory: "С одним предметом спросите Is there a cafe? С несколькими — Are there any buses? В коротком ответе повторяется there is или there are: Yes, there is. No, there aren't.\n\nНе путайте число: Is there any shops? неверно, потому что shops — множественное число. Нужен вопрос Are there any shops? Этот навык полезен в городе, путешествии и любом новом месте.",
    cards: [["___ there a cafe nearby?", "Is", ["Are", "Am"]], ["___ there any buses today?", "Are", ["Is", "Am"]], ["Is there a bank? — Yes, there ___.", "is", ["are", "am"]], ["Are there shops? — No, there ___.", "aren't", ["isn't", "am not"]], ["___ there a problem?", "Is", ["Are", "Am"]], ["___ there many students here?", "Are", ["Is", "Am"]], ["Is there a hotel? — No, there ___.", "isn't", ["aren't", "am not"]], ["Are there chairs? — Yes, there ___.", "are", ["is", "am"]], ["___ there a pharmacy here?", "Is", ["Are", "Am"]], ["___ there any questions?", "Are", ["Is", "Am"]]],
    corrections: [["Исправьте: Are there a cafe nearby?", "Is there a cafe nearby?"], ["Исправьте: Is there any buses?", "Are there any buses?"]], orders: [["Соберите вопрос.", ["Are", "there", "any", "shops"]], ["Соберите ответ.", ["No", "there", "aren't"]]],
  }),
  assessmentLesson({
    slug: "to-be-final-assessment", title: "Урок 40. Финальная проверка курса: to be", description: "Проверьте все аспекты курса в одном итоговом уроке.",
    goal: "применить утверждения, отрицания, вопросы и there is/are без подсказок.", theoryTitle: "Финальная карта to be", theory: "Перед финальной попыткой вспомните весь маршрут курса. Для утверждения выберите am, is или are по подлежащему. Для отрицания добавьте not. Для вопроса перенесите форму to be перед подлежащим. Для наличия используйте there is / there are.\n\nНе стремитесь отвечать мгновенно. Сначала определите смысл: это факт, отсутствие, вопрос или наличие предметов? Затем выберите форму. Ошибки после проверки покажут тему для повторения — это нормальная часть обучения.",
    cards: [["She ___ a teacher.", "is", ["am", "are"]], ["They ___ not late.", "are", ["am", "is"]], ["___ you from Ukraine?", "Are", ["Is", "Am"]], ["Where ___ he?", "is", ["are", "am"]], ["There ___ a cafe here.", "is", ["am", "are"]], ["There ___ any taxis now.", "aren't", ["isn't", "am not"]], ["I ___ twenty.", "am", ["is", "are"]], ["It ___ rainy today.", "is", ["am", "are"]], ["Is she ready? — Yes, she ___.", "is", ["are", "am"]], ["Are there shops? — No, there ___.", "aren't", ["isn't", "am not"]]],
    corrections: [["Исправьте: Where are he?", "Where is he?"], ["Исправьте: There isn't any taxis now.", "There aren't any taxis now."]], orders: [["Соберите вопрос.", ["Are", "you", "from", "Ukraine"]], ["Соберите отрицание.", ["They", "aren't", "late"]]],
  }),
];

async function createLesson(tx, moduleId, source, order, prerequisiteLessonId) {
  const lesson = await tx.lesson.create({
    data: {
      moduleId, prerequisiteLessonId, requiredPrerequisiteCompletion: 100, autoUnlockNextLesson: true,
      slug: source.slug, title: source.title, description: source.description, type: source.type, order,
      estimatedDuration: source.estimatedDuration, phraseOfTheDay: source.phraseOfTheDay,
      motivationalQuote: source.motivationalQuote, learningObjectives: source.learningObjectives,
      previewText: source.previewText, isPublished: true, isFree: false, ...published(),
    },
  });
  for (let blockOrder = 0; blockOrder < source.blocks.length; blockOrder += 1) {
    const sourceBlock = source.blocks[blockOrder];
    const block = await tx.lessonBlock.create({ data: { lessonId: lesson.id, type: sourceBlock.type, title: sourceBlock.title, content: sourceBlock.content, order: blockOrder + 1, isRequired: sourceBlock.isRequired, ...published() } });
    for (let exerciseOrder = 0; exerciseOrder < (sourceBlock.exercises ?? []).length; exerciseOrder += 1) {
      await tx.exercise.create({ data: { lessonBlockId: block.id, ...sourceBlock.exercises[exerciseOrder], order: exerciseOrder + 1, ...published() } });
    }
  }
  return lesson.id;
}

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: { id: true, modules: { orderBy: { order: "asc" }, select: { order: true, _count: { select: { lessons: true } } } } },
  });
  if (!course) throw new Error(`Course ${COURSE_SLUG} was not found.`);
  const validFirstThreeModules = course.modules.length === 3 && course.modules.every((module, index) => module.order === index + 1 && module._count.lessons === 10);
  if (!validFirstThreeModules) throw new Error("Expected exactly three complete ten-lesson modules before adding Module 4. No changes made.");

  await prisma.$transaction(async (tx) => {
    const module = await tx.courseModule.create({
      data: {
        courseId: course.id, title: "Модуль 4. Итоговая проверка: все аспекты to be",
        description: "Десять 20-минутных уроков для проверки утверждений, случаев употребления, отрицаний, вопросов и there is / there are.",
        order: 4, isRequired: true, requiresSequentialCompletion: true, requiredCompletionPercent: 100, isPublished: true, ...published(),
      },
    });
    let prerequisiteLessonId = null;
    for (let index = 0; index < ASSESSMENT_LESSONS.length; index += 1) {
      prerequisiteLessonId = await createLesson(tx, module.id, ASSESSMENT_LESSONS[index], index + 1, prerequisiteLessonId);
    }
    await tx.course.update({
      where: { id: course.id },
      data: {
        lessonCount: 40, estimatedDuration: 800,
        fullDescription: "Практический A1-курс по глаголу to be в Present Simple. В программе 40 последовательных уроков по 20 минут: утверждения и жизненные ситуации, отрицания, вопросы и отдельный итоговый модуль, который проверяет все изученные аспекты.\n\nПеред каждым уроком есть понятное объяснение, цель и прозрачный максимум учебных очков за практику. Уроки содержат интерактивные задания: выбор варианта, текстовый ввод, сопоставление, исправление ошибок и сборку предложений. Первый урок остаётся пробным, а прогресс сохраняется после входа.",
      },
    });
  });

  const [moduleCount, lessonCount, exerciseCount] = await Promise.all([
    prisma.courseModule.count({ where: { courseId: course.id } }),
    prisma.lesson.count({ where: { module: { courseId: course.id } } }),
    prisma.exercise.count({ where: { lessonBlock: { lesson: { module: { courseId: course.id } } } } }),
  ]);
  console.log(JSON.stringify({ course: COURSE_SLUG, modules: moduleCount, lessons: lessonCount, exercises: exerciseCount, estimatedMinutes: 800 }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
