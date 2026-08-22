/*
 * One-time, idempotent authoring script for the published A1 course
 * "Глагол TO BE". It only rewrites the course while it has no learner data.
 * Run: node database/scripts/populate-verb-to-be-course.cjs
 */
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } },
});

const COURSE_SLUG = "verb-to-be-masterclass";

const published = () => ({ contentStatus: "PUBLISHED", publishedAt: new Date() });

function choice(question, options, answer, optionsConfig = {}) {
  return {
    type: "SINGLE_CHOICE",
    engineKey: "single-choice",
    variantKey: "CONTEXT_SELECTION",
    instruction: "Выберите один правильный вариант.",
    question,
    content: { options, ...optionsConfig },
    correctAnswer: answer,
    explanation: `Правильный ответ: ${answer}.`,
    hint: "Сначала найдите подлежащее: I, you, we, they, he, she, it или существительное.",
    hintsEnabled: true,
    difficulty: 1,
    basePoints: 1,
    timeLimitSeconds: 30,
    solutionCost: 0,
    allowInstantCheck: true,
    allowExtraExercise: false,
  };
}

function text(question, answer, explanation, points = 2) {
  return {
    type: "TEXT_INPUT",
    engineKey: "text-input",
    variantKey: "SHORT_ANSWER",
    instruction: "Впишите ответ. Можно писать без точки и заглавной буквы.",
    question,
    content: { ignorePunctuation: true },
    correctAnswer: answer,
    explanation,
    hint: "Проверьте, кто или что является подлежащим.",
    hintsEnabled: true,
    difficulty: 1,
    basePoints: points,
    timeLimitSeconds: 45,
    solutionCost: 0,
    allowInstantCheck: true,
    allowExtraExercise: false,
  };
}

function statement(question, answer, explanation) {
  return {
    type: "SINGLE_CHOICE",
    engineKey: "single-choice",
    variantKey: "STATEMENT_EVALUATION",
    instruction: "Отметьте, верно или неверно утверждение.",
    question,
    content: { options: ["Верно", "Неверно"] },
    correctAnswer: answer,
    explanation,
    hint: "Сверьте утверждение с правилом и примером из теории.",
    hintsEnabled: true,
    difficulty: 1,
    basePoints: 1,
    timeLimitSeconds: 25,
    solutionCost: 0,
    allowInstantCheck: true,
    allowExtraExercise: false,
  };
}

function matching(question, pairs, points = 2) {
  const left = Object.keys(pairs);
  const right = Object.values(pairs);
  return {
    type: "MATCHING",
    engineKey: "matching",
    variantKey: "PAIR_MATCHING",
    instruction: "Сопоставьте элементы. Все пары нужно выбрать правильно.",
    question,
    content: { left, right: [...right].reverse() },
    correctAnswer: pairs,
    explanation: "Каждая форма to be зависит от подлежащего или ситуации.",
    hint: "Не спешите: проговорите каждую пару вслух.",
    hintsEnabled: true,
    difficulty: 1,
    basePoints: points,
    timeLimitSeconds: 60,
    solutionCost: 0,
    allowInstantCheck: true,
    allowExtraExercise: false,
  };
}

function correction(question, answer, explanation) {
  return {
    type: "ERROR_CORRECTION",
    engineKey: "find-and-correct",
    variantKey: "ERROR_CORRECTION",
    instruction: "Исправьте предложение полностью.",
    question,
    content: { ignorePunctuation: true },
    correctAnswer: answer,
    explanation,
    hint: "Проверьте форму to be и форму существительного после неё.",
    hintsEnabled: true,
    difficulty: 2,
    basePoints: 2,
    timeLimitSeconds: 50,
    solutionCost: 0,
    allowInstantCheck: true,
    allowExtraExercise: false,
  };
}

function sentenceOrder(question, tokens, explanation) {
  return {
    type: "SENTENCE_ORDER",
    engineKey: "sentence-builder",
    variantKey: "SENTENCE_ORDER",
    instruction: "Соберите предложение из слов по порядку.",
    question,
    content: { options: tokens, shuffleOptions: true },
    correctAnswer: tokens,
    explanation,
    hint: "В простом утверждении обычно: подлежащее + форма to be + остальная информация.",
    hintsEnabled: true,
    difficulty: 1,
    basePoints: 2,
    timeLimitSeconds: 45,
    solutionCost: 0,
    allowInstantCheck: true,
    allowExtraExercise: false,
  };
}

function exerciseBlock(title, exercises) {
  return { type: "EXERCISE", title, isRequired: true, content: null, exercises };
}

const LESSONS = [
  {
    slug: "to-be-the-core-idea",
    title: "Урок 1. To be: основная идея и формы am, is, are",
    description: "Поймите, зачем английскому нужен глагол-связка, и уверенно выбирайте am, is или are.",
    previewText: "Вводный урок: 32 коротких задания и понятное правило без грамматического жаргона.",
    phraseOfTheDay: "I am ready to learn.",
    motivationalQuote: "Ваша цель — не заучить таблицу, а начать узнавать форму to be автоматически.",
    learningObjectives: [
      "Понять, зачем to be нужен в английском предложении.",
      "Выбирать am, is и are по подлежащему.",
      "Получить до 44 учебных очков за правильные ответы и 5 KRIN-coins за первое завершение урока.",
    ],
    blocks: [
      { type: "INTRO", title: "Цель и бонус", content: "Цель урока: научиться видеть «скелет» простого английского предложения и выбирать am, is или are без догадки.\n\nМаксимум за практику: 44 учебных очка. За первое завершение урока система автоматически добавит 5 KRIN-coins в ваш внутренний баланс. Они являются учебной валютой платформы; не являются деньгами и начисляются только за подтверждённый прогресс.", isRequired: false },
      { type: "THEORY", title: "Как работает to be", content: "В русском языке мы часто говорим: «Я студент», «Она дома», «Они готовы» — и не произносим отдельное слово между человеком и информацией о нём. В английском это слово обязательно: I am a student. She is at home. They are ready.\n\nTo be — это глагол-связка. Он соединяет того, о ком мы говорим, с его именем, профессией, возрастом, состоянием, местом или характеристикой. В настоящем времени у него три формы: I am; he, she, it is; you, we, they are.\n\nНе переводите предложение слово в слово. Сначала найдите, кто или что является подлежащим, затем выберите форму to be. После неё можно сообщить факт: I am tired. The book is interesting. We are in Kyiv.", isRequired: false },
      exerciseBlock("Проверьте, как вы поняли правило", [
        choice("I ___ a beginner.", ["am", "is", "are"], "am"),
        choice("She ___ my friend.", ["am", "is", "are"], "is"),
        choice("We ___ at school.", ["am", "is", "are"], "are"),
        choice("My dog ___ friendly.", ["am", "is", "are"], "is"),
        choice("You ___ very kind.", ["am", "is", "are"], "are"),
        choice("The children ___ in the garden.", ["am", "is", "are"], "are"),
        choice("It ___ cold today.", ["am", "is", "are"], "is"),
        choice("My parents ___ at work.", ["am", "is", "are"], "are"),
        choice("I ___ from Ukraine.", ["am", "is", "are"], "am"),
        choice("This lesson ___ useful.", ["am", "is", "are"], "is"),
      ]),
      exerciseBlock("Впишите форму сами", [
        text("Впишите одно слово: I ___ ready.", "am", "С I всегда используется am."),
        text("Впишите одно слово: He ___ a doctor.", "is", "С he используется is."),
        text("Впишите одно слово: They ___ happy.", "are", "С they используется are."),
        text("Впишите одно слово: My name ___ Anna.", "is", "Подлежащее My name — это it, поэтому is."),
        text("Впишите одно слово: We ___ classmates.", "are", "С we используется are."),
        text("Впишите одно слово: The weather ___ nice.", "is", "Weather — единственное число, поэтому is."),
        text("Впишите одно слово: You ___ early.", "are", "С you всегда are — и для одного человека, и для нескольких."),
        text("Впишите одно слово: My sister and I ___ at home.", "are", "My sister and I = we, поэтому are."),
        text("Впишите одно слово: This book ___ new.", "is", "This book — единственное число."),
        text("Впишите одно слово: I ___ not late.", "am", "Отрицание с I строится как I am not."),
      ]),
      exerciseBlock("Верно или неверно", [
        statement("Утверждение: в английском можно сказать «She happy» без глагола.", "Неверно", "Нужно She is happy: английскому нужна связка is."),
        statement("Утверждение: форма am используется только с I.", "Верно", "В настоящем времени am употребляется с I."),
        statement("Утверждение: «They is ready» — правильное предложение.", "Неверно", "С they нужна форма are: They are ready."),
        statement("Утверждение: «The film is interesting» рассказывает о характеристике фильма.", "Верно", "После is стоит прилагательное interesting."),
        statement("Утверждение: с you используется are, даже если вы обращаетесь к одному человеку.", "Верно", "You are — форма и для единственного, и для множественного числа."),
        statement("Утверждение: «I is tired» — правильное предложение.", "Неверно", "С I используется am: I am tired."),
        statement("Утверждение: «It is cold» может описывать погоду.", "Верно", "It is cold — обычная фраза о погоде или температуре."),
        statement("Утверждение: после to be можно назвать профессию.", "Верно", "Например: He is a doctor."),
        statement("Утверждение: «We are friends» означает «Мы друзья».", "Верно", "We are связывает we с информацией friends."),
        statement("Утверждение: форма is подходит для I.", "Неверно", "С I подходит только am."),
      ]),
      exerciseBlock("Финальный мини-шаг", [
        sentenceOrder("Соберите утверждение.", ["I", "am", "ready"], "I am ready — правильный порядок: подлежащее, to be, информация."),
        sentenceOrder("Соберите утверждение.", ["They", "are", "at", "home"], "They are at home — с they используется are."),
      ]),
    ],
  },
  {
    slug: "to-be-singular-and-plural",
    title: "Урок 2. Единственное и множественное число с to be",
    description: "Научитесь замечать, когда нужен is, а когда are, и исправляйте типичные ошибки.",
    previewText: "Тренировка единственного и множественного числа: пары, пропуски, переводы и исправление ошибок.",
    phraseOfTheDay: "These books are useful.",
    motivationalQuote: "Сначала определите количество, а потом выбирайте форму — это надёжнее, чем угадывать.",
    learningObjectives: [
      "Отличать единственное число от множественного в простых предложениях.",
      "Сопоставлять местоимения, существительные и формы to be.",
      "Получить до 42 учебных очков и 5 KRIN-coins за первое завершение урока.",
    ],
    blocks: [
      { type: "INTRO", title: "Цель и бонус", content: "Цель урока: замечать, один предмет или несколько, и сразу выбирать is либо are.\n\nМаксимум за практику: 42 учебных очка. После первого завершения урока — 5 KRIN-coins. Бонус за урок начисляется только один раз, поэтому вы можете спокойно переделывать задания и учиться на ошибках.", isRequired: false },
      { type: "THEORY", title: "Один или несколько?", content: "Форма is нужна, когда мы говорим об одном человеке, одном предмете или об имени одного человека: he is, she is, it is, My brother is, the book is.\n\nФорма are нужна с несколькими людьми или предметами: we are, they are, my friends are, the books are. Есть два важных исключения, которые стоит запомнить: I am; you are. You are подходит и для «ты», и для «вы».\n\nСмотрите не на последнее слово, а на главное подлежащее. The box of pencils is blue — главное слово box, оно одно. My brother and sister are students — людей двое, значит are.", isRequired: false },
      exerciseBlock("Сопоставьте подлежащее и форму", [
        matching("Местоимение → форма to be", { "I": "am", "he": "is", "we": "are", "they": "are" }),
        matching("Существительное → форма to be", { "the cat": "is", "my parents": "are", "this room": "is", "these rooms": "are" }),
        matching("Сокращение → полная форма", { "I'm": "I am", "she's": "she is", "we're": "we are", "they're": "they are" }),
        matching("Подлежащее → правильное окончание", { "one child": "is", "two children": "are", "a person": "is", "people": "are" }),
      ]),
      exerciseBlock("Вставьте нужную форму", [
        text("The girl ___ my cousin.", "is", "Girl — один человек, поэтому is."),
        text("The girls ___ my cousins.", "are", "Girls — несколько людей, поэтому are."),
        text("My phone ___ on the table.", "is", "Phone — один предмет."),
        text("My keys ___ on the table.", "are", "Keys — несколько предметов."),
        text("This exercise ___ easy.", "is", "This exercise — единственное число."),
        text("These exercises ___ easy.", "are", "These exercises — множественное число."),
        text("My brother and I ___ students.", "are", "My brother and I = we."),
        text("The box of pencils ___ new.", "is", "Главное слово box — одно."),
      ]),
      exerciseBlock("Слово и перевод", [
        matching("Сопоставьте английские фразы и перевод", { "I am a student": "Я студент(ка)", "She is a teacher": "Она учительница", "They are friends": "Они друзья", "The books are new": "Книги новые" }),
        matching("Сопоставьте английские фразы и перевод", { "The child is sleepy": "Ребёнок хочет спать", "The children are sleepy": "Дети хотят спать", "This is my bag": "Это моя сумка", "These are my bags": "Это мои сумки" }),
        matching("Сопоставьте вопрос и ответ", { "Is he at home?": "Yes, he is.", "Are they ready?": "Yes, they are.", "Is it your book?": "No, it isn't.", "Are you a student?": "Yes, I am." }),
      ]),
      exerciseBlock("Найдите и исправьте ошибку", [
        correction("Исправьте: They is my friends.", "They are my friends.", "They — множественное число, поэтому are."),
        correction("Исправьте: My shoes is new.", "My shoes are new.", "Shoes — множественное число, поэтому are."),
        correction("Исправьте: This books are interesting.", "These books are interesting.", "С множественным books используем these и are."),
        correction("Исправьте: The children is in the park.", "The children are in the park.", "Children — множественное число."),
        correction("Исправьте: My parents is at work.", "My parents are at work.", "Parents — несколько людей, поэтому are."),
      ]),
      exerciseBlock("Соберите предложение", [
        sentenceOrder("Соберите предложение.", ["These", "books", "are", "useful"], "These books are useful: plural noun books требует are."),
      ]),
    ],
  },
  {
    slug: "to-be-everyday-uses",
    title: "Урок 3. To be в обычных жизненных ситуациях",
    description: "Говорите о себе, возрасте, профессии, чувствах, месте, времени и погоде.",
    previewText: "Практика реальных ситуаций: личные данные, чувства, местоположение, время, погода и устойчивые выражения.",
    phraseOfTheDay: "I am interested in English.",
    motivationalQuote: "Каждый пример — это готовая фраза, которую вы сможете применить в разговоре уже сегодня.",
    learningObjectives: [
      "Использовать to be для личной информации, возраста, профессии и национальности.",
      "Описывать чувства, состояние, местоположение, время и погоду.",
      "Получить до 40 учебных очков и 5 KRIN-coins за первое завершение урока.",
    ],
    blocks: [
      { type: "INTRO", title: "Цель и бонус", content: "Цель урока: перестать видеть to be как таблицу и начать использовать его для реальных сообщений о себе и мире вокруг.\n\nМаксимум за практику: 40 учебных очков. После первого завершения урока — 5 KRIN-coins на внутренний баланс.", isRequired: false },
      { type: "THEORY", title: "Когда мы используем to be", content: "Личные данные и характеристики: I am Nikita. She is 20 years old. My brother is a doctor. They are from Ukraine. He is married. Перед профессией в единственном числе обычно нужен a/an: He is a singer. She is an author.\n\nСостояние и чувства: We are happy today. I am hungry. The children are sleepy. It is cold outside. После to be часто стоит прилагательное: The film is interesting. She is tall and kind.\n\nМесто и время: My friends are at the cinema. The dog is on the sofa. It is five o'clock. Today is Saturday. It is rainy today. Возраст в английском выражают через to be, не через have: I am twenty years old.\n\nУстойчивые сочетания тоже требуют to be: be interested in, be keen on, be good at, be afraid of, be late for, be ready for. А когда говорим о наличии, используем there is / there are: There is a cosy cafe near my house.", isRequired: false },
      exerciseBlock("Выберите ситуацию", [
        choice("Как сказать «Ей 20 лет»?", ["She is 20 years old.", "She has 20 years.", "She are 20 years old."], "She is 20 years old."),
        choice("Какое предложение говорит о профессии?", ["My brother is a doctor.", "My brother is doctoring.", "My brother are a doctor."], "My brother is a doctor."),
        choice("Как сказать о национальности?", ["They are from Ukraine.", "They is from Ukraine.", "They have from Ukraine."], "They are from Ukraine."),
        choice("Какое предложение описывает чувство?", ["We are happy today.", "We have happy today.", "We happy today."], "We are happy today."),
        choice("Как сказать, где находится собака?", ["The dog is on the sofa.", "The dog are on the sofa.", "The dog has on the sofa."], "The dog is on the sofa."),
        choice("Как сказать время?", ["It is five o'clock.", "It has five o'clock.", "There are five o'clock."], "It is five o'clock."),
        choice("Какой вариант о погоде правильный?", ["It is rainy today.", "It rainy today.", "It are rainy today."], "It is rainy today."),
        choice("Какое выражение означает «интересоваться»?", ["be interested in", "be interest at", "have interested in"], "be interested in"),
        choice("Выберите фразу о наличии.", ["There is a cafe near my house.", "It is a cafe near my house.", "There are a cafe near my house."], "There is a cafe near my house."),
        choice("Перед профессией «actor» в единственном числе нужно сказать:", ["He is an actor.", "He is actor.", "He are an actor."], "He is an actor."),
      ]),
      exerciseBlock("Напишите форму или фразу", [
        text("Впишите одно слово: I ___ hungry.", "am", "С I используется am."),
        text("Впишите одно слово: She ___ at home.", "is", "С she используется is."),
        text("Впишите одно слово: They ___ at the gym.", "are", "С they используется are."),
        text("Напишите полное предложение: «Сегодня суббота».", "Today is Saturday.", "Для дней и дат используем It is / Today is."),
        text("Напишите полное предложение: «Он писатель».", "He is a writer.", "Перед профессией writer нужен артикль a."),
        text("Впишите одно слово: We ___ ready for the lesson.", "are", "We are ready for — устойчивая конструкция."),
        text("Впишите одно слово: The film ___ interesting.", "is", "Film — один предмет, поэтому is."),
        text("Напишите форму после I: I ___ good at English.", "am", "Говорим I am good at English."),
        text("Впишите одно слово: There ___ two chairs in the room.", "are", "Two chairs — несколько предметов, поэтому There are."),
        text("Впишите одно слово: He ___ afraid of dogs.", "is", "He is afraid of — устойчивое сочетание."),
      ]),
      exerciseBlock("Верно или неверно", [
        statement("Утверждение: возраст по-английски обычно выражают через have.", "Неверно", "Говорим I am twenty years old, а не I have twenty years."),
        statement("Утверждение: «She is an actress» — корректная фраза о профессии.", "Верно", "Перед actress нужен an, потому что слово начинается с гласного звука."),
        statement("Утверждение: «They are film stars» — фраза о профессии или роде деятельности.", "Верно", "To be соединяет they с информацией film stars."),
        statement("Утверждение: «The children are sleepy» описывает состояние детей.", "Верно", "Sleepy — прилагательное о состоянии."),
        statement("Утверждение: «It is cold outside» нельзя использовать для погоды.", "Неверно", "Это обычная фраза о температуре на улице."),
        statement("Утверждение: «She is at home» сообщает местонахождение.", "Верно", "At home указывает, где она находится."),
        statement("Утверждение: «He is good at maths» — правильная устойчивая конструкция.", "Верно", "Be good at означает «хорошо уметь что-то делать»."),
        statement("Утверждение: «There is two books» — правильное предложение.", "Неверно", "С двумя книгами нужно There are two books."),
        statement("Утверждение: после to be может стоять прилагательное.", "Верно", "Например: The story is awful."),
        statement("Утверждение: «He is late for class» означает, что он готов к уроку.", "Неверно", "Be late for означает «опаздывать на»."),
      ]),
    ],
  },
  {
    slug: "to-be-uses-in-context",
    title: "Урок 4. To be по ситуациям: говорим уверенно",
    description: "Отработайте каждый главный случай употребления to be в коротких жизненных сценариях.",
    previewText: "Итоговая практика по контекстам: человек, профессия, характеристика, место, возраст, чувства, время и устойчивые выражения.",
    phraseOfTheDay: "We are ready for the next step.",
    motivationalQuote: "Если вы можете выбрать форму to be в ситуации, значит правило уже начинает работать в речи.",
    learningObjectives: [
      "Выбирать to be для восьми самых частых жизненных контекстов.",
      "Собирать и исправлять полноценные предложения.",
      "Получить до 38 учебных очков и 5 KRIN-coins за первое завершение урока.",
    ],
    blocks: [
      { type: "INTRO", title: "Цель и бонус", content: "Цель урока: применить to be в реальных мини-сценариях и самостоятельно построить простые фразы.\n\nМаксимум за практику: 38 учебных очков. После первого завершения — 5 KRIN-coins. После этого урока вы завершите первый модуль курса.", isRequired: false },
      { type: "THEORY", title: "Карта ситуаций", content: "1. Имя и личная информация: I am Nikita. My name is Olga.\n2. Профессия: She is an actress. He is an actor. С профессией в единственном числе ставьте a/an.\n3. Характеристика: The actor is brilliant. These videos are great.\n4. Местонахождение: She is at home. The children are in the museum.\n5. Возраст: I am twenty years old. How old are you?\n6. Состояние и чувства: I am tired. He is interested in true-life films.\n7. Время, дата, погода: It is five o'clock. Today is Saturday. It is rainy today.\n8. Устойчивые конструкции: be keen on, be good at, be afraid of, be late for, be ready for.\n\nПеред ответом задавайте себе короткий вопрос: о ком или о чём я говорю? Один это предмет или несколько? Какую информацию я сообщаю — факт, место, состояние, профессию или время?", isRequired: false },
      exerciseBlock("Контекст → правильная фраза", [
        choice("Вы представляете себя. Что скажете?", ["I am Nikita.", "I is Nikita.", "I are Nikita."], "I am Nikita."),
        choice("Вы говорите о профессии Анны. Что правильно?", ["Anna is a designer.", "Anna is designer.", "Anna are a designer."], "Anna is a designer."),
        choice("Вы описываете фильм. Что правильно?", ["The film is interesting.", "The film are interesting.", "The film interesting."], "The film is interesting."),
        choice("Вы говорите, где дети. Что правильно?", ["The children are in the museum.", "The children is in the museum.", "The children in the museum."], "The children are in the museum."),
        choice("Вы спрашиваете возраст. Что правильно?", ["How old are you?", "How old is you?", "How old you are?"], "How old are you?"),
        choice("Вы описываете состояние. Что правильно?", ["I am tired.", "I have tired.", "I tired."], "I am tired."),
        choice("Вы сообщаете время. Что правильно?", ["It is five o'clock.", "There is five o'clock.", "It are five o'clock."], "It is five o'clock."),
        choice("Вы говорите о готовности. Что правильно?", ["We are ready for the test.", "We ready for the test.", "We is ready for the test."], "We are ready for the test."),
      ]),
      exerciseBlock("Заполните ситуацию", [
        text("My name ___ Maria.", "is", "My name — единственное число, поэтому is."),
        text("He ___ an engineer.", "is", "С he используем is; перед profession engineer — an."),
        text("The videos ___ great.", "are", "Videos — множественное число."),
        text("She ___ at the gym.", "is", "Местонахождение одного человека: she is."),
        text("I ___ eighteen years old.", "am", "Возраст с I: I am eighteen years old."),
        text("They ___ afraid of spiders.", "are", "They are afraid of — устойчивое выражение."),
        text("It ___ sunny today.", "is", "Погода: It is sunny."),
        text("We ___ good at English.", "are", "We are good at English."),
      ]),
      exerciseBlock("Сопоставьте ситуации", [
        matching("Ситуация → пример", { "профессия": "She is an author.", "возраст": "He is ten.", "место": "They are at the cinema.", "погода": "It is rainy today." }),
        matching("Выражение → значение", { "be interested in": "интересоваться", "be keen on": "увлекаться", "be good at": "хорошо уметь", "be late for": "опаздывать на" }),
        matching("Подлежащее → готовая фраза", { "I": "am ready", "she": "is kind", "we": "are classmates", "the dog": "is on the sofa" }),
        matching("Вопрос → корректный ответ", { "How old are you?": "I am twenty.", "Where are they?": "They are at home.", "Is he a teacher?": "Yes, he is.", "Are you ready?": "Yes, I am." }),
      ]),
      exerciseBlock("Соберите свои фразы", [
        sentenceOrder("Соберите фразу о профессии.", ["She", "is", "an", "actress"], "С профессией в единственном числе нужен артикль an."),
        sentenceOrder("Соберите фразу о месте.", ["The", "dog", "is", "on", "the", "sofa"], "The dog is on the sofa — описание местонахождения."),
        sentenceOrder("Соберите фразу о состоянии.", ["We", "are", "happy", "today"], "We are happy today — состояние и чувство."),
      ]),
    ],
  },
];

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: {
      id: true,
      modules: { select: { id: true } },
      studentCourses: { select: { id: true }, take: 1 },
      coursePurchases: { select: { id: true }, take: 1 },
      entitlements: { select: { id: true }, take: 1 },
      learningActivities: { select: { id: true }, take: 1 },
      createdById: true,
      updatedById: true,
      instructorId: true,
    },
  });
  if (!course) throw new Error(`Course ${COURSE_SLUG} was not found.`);

  const hasLearnerData = course.studentCourses.length || course.coursePurchases.length || course.entitlements.length || course.learningActivities.length;
  if (hasLearnerData) {
    throw new Error("Refusing to replace course content because learners, purchases, access rights, or activity records already exist.");
  }
  if (course.modules.length) {
    throw new Error("Refusing to create duplicate content: the course already has modules. Edit it in CMS or remove the empty draft structure first.");
  }

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const module = await tx.courseModule.create({
      data: {
        courseId: course.id,
        title: "Модуль 1. Настоящее время: am, is, are",
        description: "Четыре 20-минутных урока: форма глагола, число и реальные ситуации общения.",
        order: 1,
        isRequired: true,
        requiresSequentialCompletion: true,
        requiredCompletionPercent: 100,
        isPublished: true,
        ...published(),
      },
    });

    let previousLessonId = null;
    for (let index = 0; index < LESSONS.length; index += 1) {
      const source = LESSONS[index];
      const lesson = await tx.lesson.create({
        data: {
          moduleId: module.id,
          prerequisiteLessonId: previousLessonId,
          requiredPrerequisiteCompletion: 100,
          autoUnlockNextLesson: true,
          slug: source.slug,
          title: source.title,
          description: source.description,
          type: "GRAMMAR",
          order: index + 1,
          estimatedDuration: 20,
          phraseOfTheDay: source.phraseOfTheDay,
          motivationalQuote: source.motivationalQuote,
          learningObjectives: source.learningObjectives,
          previewText: source.previewText,
          isPublished: true,
          isFree: index === 0,
          ...published(),
        },
      });

      for (let blockIndex = 0; blockIndex < source.blocks.length; blockIndex += 1) {
        const sourceBlock = source.blocks[blockIndex];
        const block = await tx.lessonBlock.create({
          data: {
            lessonId: lesson.id,
            type: sourceBlock.type,
            title: sourceBlock.title,
            content: sourceBlock.content,
            order: blockIndex + 1,
            isRequired: sourceBlock.isRequired,
            ...published(),
          },
        });
        for (let exerciseIndex = 0; exerciseIndex < (sourceBlock.exercises ?? []).length; exerciseIndex += 1) {
          const exercise = sourceBlock.exercises[exerciseIndex];
          await tx.exercise.create({
            data: {
              lessonBlockId: block.id,
              ...exercise,
              order: exerciseIndex + 1,
              ...published(),
            },
          });
        }
      }
      previousLessonId = lesson.id;
    }

    await tx.course.update({
      where: { id: course.id },
      data: {
        title: "Глагол to be: Present Simple для A1",
        shortDescription: "Практический курс A1 по глаголу to be: am, is и are в обычных жизненных ситуациях. Четыре 20-минутных урока с теорией, интерактивными заданиями, XP и KRIN-coins за подтверждённый прогресс.",
        fullDescription: "Научитесь уверенно использовать am, is и are в разговоре и письме. В первом модуле вы разберёте, зачем английскому нужен глагол-связка, как выбирать форму для единственного и множественного числа и как говорить о себе, возрасте, профессии, чувствах, месте, времени и погоде.\n\nКурс состоит из четырёх последовательных уроков по 20 минут. Перед практикой вы получите простое объяснение, затем закрепите его в выборе вариантов, текстовых ответах, сопоставлениях, исправлении ошибок и сборке предложений. Первый урок можно открыть как пробный; прогресс и награды сохраняются после входа.",
        coverImage: "/images/courses/verb-to-be-cover.svg",
        language: "ru",
        estimatedDuration: 80,
        lessonCount: LESSONS.length,
        difficulty: "A1 · Beginner",
        isPublished: true,
        isTemplate: false,
        contentStatus: "PUBLISHED",
        publishedAt: now,
        archivedAt: null,
        scheduledAt: null,
        isVisibleInCatalog: true,
        isVisibleInSearch: true,
        isVisibleOnHomepage: true,
        isVisibleInRecommendations: true,
        isVisibleInLevelBlock: true,
        isVisibleInAcademy: true,
        isVisibleInStudentDashboard: true,
        firstFreeLessonCount: 1,
        accessPlan: "FREE",
        accessMode: "FREE",
        priceAmount: null,
        learningOutcomes: [
          "Выбирать am, is и are без догадки.",
          "Говорить о себе, возрасте, профессии, месте и чувствах.",
          "Использовать to be в реальных коротких фразах.",
          "Распознавать и исправлять типичные ошибки A1.",
        ],
        prerequisites: ["Подходит с нулевого уровня: нужно только уметь читать латинские буквы."],
      },
    });
  });

  const [moduleCount, lessonCount, exerciseCount] = await Promise.all([
    prisma.courseModule.count({ where: { courseId: course.id } }),
    prisma.lesson.count({ where: { module: { courseId: course.id } } }),
    prisma.exercise.count({ where: { lessonBlock: { lesson: { module: { courseId: course.id } } } } }),
  ]);
  console.log(JSON.stringify({ course: COURSE_SLUG, modules: moduleCount, lessons: lessonCount, exercises: exerciseCount, estimatedMinutes: 80 }));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
