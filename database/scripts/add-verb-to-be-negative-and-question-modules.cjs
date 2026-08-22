/*
 * Adds Modules 2 and 3 to the authored A1 course "Глагол to be".
 * Module 1 is intentionally left untouched: it contains the four lessons
 * supplied by the course author. This script only adds missing modules.
 * Run: node database/scripts/add-verb-to-be-negative-and-question-modules.cjs
 */
require("dotenv").config({ path: ".env" });
const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } } });

const COURSE_SLUG = "verb-to-be-masterclass";
const published = () => ({ contentStatus: "PUBLISHED", publishedAt: new Date() });

function rotate(items, key) {
  const unique = [...new Set(items)];
  const offset = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0) % unique.length;
  return [...unique.slice(offset), ...unique.slice(0, offset)];
}
function choice(question, options, answer) {
  return { type: "SINGLE_CHOICE", engineKey: "single-choice", variantKey: "CONTEXT_SELECTION", instruction: "Выберите один правильный вариант.", question, content: { options: rotate(options, question) }, correctAnswer: answer, explanation: `Правильный ответ: ${answer}.`, hint: "Сначала найдите подлежащее и определите: это утверждение, отрицание или вопрос?", hintsEnabled: true, difficulty: 1, basePoints: 1, timeLimitSeconds: 30, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false };
}
function text(question, answer) {
  return { type: "TEXT_INPUT", engineKey: "text-input", variantKey: "SHORT_ANSWER", instruction: "Напишите ответ. Точка и заглавная буква не обязательны.", question, content: { ignorePunctuation: true }, correctAnswer: answer, explanation: `Правильный ответ: ${answer}.`, hint: "Проговорите предложение целиком, а потом впишите форму.", hintsEnabled: true, difficulty: 1, basePoints: 2, timeLimitSeconds: 45, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false };
}
function matching(question, pairs) {
  const left = Object.keys(pairs); const right = Object.values(pairs);
  return { type: "MATCHING", engineKey: "matching", variantKey: "PAIR_MATCHING", instruction: "Сопоставьте все пары.", question, content: { left, right: rotate(right, question) }, correctAnswer: pairs, explanation: "Проверьте каждую пару целиком: подлежащее, форма to be и смысл должны совпасть.", hint: "Читайте фразу вслух — неправильная форма обычно сразу слышна.", hintsEnabled: true, difficulty: 1, basePoints: 2, timeLimitSeconds: 60, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false };
}
function correction(question, answer) {
  return { type: "ERROR_CORRECTION", engineKey: "find-and-correct", variantKey: "ERROR_CORRECTION", instruction: "Исправьте предложение полностью.", question, content: { ignorePunctuation: true }, correctAnswer: answer, explanation: `Правильный вариант: ${answer}.`, hint: "Проверьте форму to be, not, порядок слов и краткий ответ.", hintsEnabled: true, difficulty: 2, basePoints: 2, timeLimitSeconds: 50, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false };
}
function sentenceOrder(question, correct) {
  return { type: "SENTENCE_ORDER", engineKey: "sentence-builder", variantKey: "SENTENCE_ORDER", instruction: "Соберите предложение из слов по порядку.", question, content: { options: rotate(correct, question) }, correctAnswer: correct, explanation: `Верный порядок: ${correct.join(" ")}.`, hint: "В вопросе форма to be стоит перед подлежащим; в утверждении — после него.", hintsEnabled: true, difficulty: 1, basePoints: 2, timeLimitSeconds: 45, solutionCost: 0, allowInstantCheck: true, allowExtraExercise: false };
}
function exerciseBlock(title, exercises) { return { type: "EXERCISE", title, content: null, isRequired: true, exercises }; }
function authoredLesson(source) {
  return {
    ...source,
    type: "GRAMMAR",
    estimatedDuration: 20,
    learningObjectives: [source.goal, "Находить и исправлять собственные ошибки по объяснениям после попытки.", "Получить до 40 учебных очков за практику и награду за первое завершение урока по правилам платформы."],
    blocks: [
      { type: "INTRO", title: "Цель и бонус", content: `Цель урока: ${source.goal}\n\nМаксимум за практику: 40 учебных очков. После первого завершения урока награда добавляется только по действующим правилам платформы; повторное прохождение остаётся доступным для тренировки.`, isRequired: false },
      { type: "THEORY", title: source.theoryTitle, content: source.theory, isRequired: false },
      exerciseBlock("Выберите правильный вариант", source.choices.map(([question, options, answer]) => choice(question, options, answer))),
      exerciseBlock("Напишите ответ", source.texts.map(([question, answer]) => text(question, answer))),
      exerciseBlock("Сопоставьте фразы", source.matches.map(([question, pairs]) => matching(question, pairs))),
      exerciseBlock("Исправьте ошибки", source.corrections.map(([question, answer]) => correction(question, answer))),
      exerciseBlock("Соберите предложение", source.orders.map(([question, answer]) => sentenceOrder(question, answer))),
    ],
  };
}

// Keeps the authoring file readable while still creating real, independently
// checkable exercises for every lesson. Each card becomes a choice and a text
// input task; the three matching blocks reuse different four-card sets.
function compactLesson(source) {
  const cards = source.cards.slice(0, 10);
  const cardGroup = (start) => Object.fromEntries(cards.slice(start, start + 4).map(([question, answer]) => [question.replace("___", "…"), answer]));
  return authoredLesson({
    ...source,
    phraseOfTheDay: source.phraseOfTheDay || `${cards[0][0].replace("___", cards[0][1])}`,
    motivationalQuote: source.motivationalQuote || "Небольшая точная практика каждый день превращает правило в привычку.",
    previewText: source.previewText || source.description,
    choices: cards.map(([question, answer, distractors]) => [question, [answer, ...distractors], answer]),
    texts: cards.slice(0, 8).map(([question, answer]) => [`Впишите пропущенное слово: ${question}`, answer]),
    matches: [
      ["Сопоставьте фразу и нужную форму", cardGroup(0)],
      ["Сопоставьте ещё четыре фразы и формы", cardGroup(3)],
      ["Закрепите формы в последней мини-подборке", cardGroup(6)],
    ],
  });
}

const PRESENT_EXTENSION_LESSONS = [
  compactLesson({
    slug: "to-be-people-professions",
    title: "Урок 5. To be: имя, профессия и национальность",
    description: "Говорите о себе и других людях: кто вы, чем занимаетесь и откуда вы.",
    goal: "рассказать простыми фразами своё имя, профессию и страну.",
    theoryTitle: "Когда to be связывает человека и информацию о нём",
    theory: "Когда после человека стоит имя, профессия или национальность, английскому предложению нужна форма to be. I am Nikita. She is a doctor. They are from Ukraine. В русском мы часто говорим без глагола: «он врач». В английском без is фраза не готова.\n\nС профессией в единственном числе обычно нужен a или an: He is a singer. She is an author. Не пытайтесь переводить каждое слово по отдельности: сначала назовите человека, затем выберите am, is или are, и только после этого добавьте информацию о нём.",
    cards: [
      ["I ___ Nikita.", "am", ["is", "are"]], ["She ___ a doctor.", "is", ["am", "are"]], ["They ___ from Ukraine.", "are", ["am", "is"]], ["My brother ___ an actor.", "is", ["am", "are"]], ["We ___ students.", "are", ["am", "is"]], ["He ___ a writer.", "is", ["am", "are"]], ["You ___ from Poland.", "are", ["am", "is"]], ["I ___ a beginner.", "am", ["is", "are"]], ["My parents ___ teachers.", "are", ["am", "is"]], ["Anna ___ an engineer.", "is", ["am", "are"]],
    ],
    corrections: [["Исправьте: She doctor.", "She is a doctor."], ["Исправьте: They is from Ukraine.", "They are from Ukraine."]],
    orders: [["Соберите фразу о профессии.", ["He", "is", "a", "singer"]], ["Соберите фразу о стране.", ["We", "are", "from", "Ukraine"]]],
  }),
  compactLesson({
    slug: "to-be-characteristics",
    title: "Урок 6. To be: внешность и характер",
    description: "Описывайте людей, предметы и впечатления с прилагательными.",
    goal: "описывать внешность, характер и предметы с помощью am, is и are.",
    theoryTitle: "Прилагательное после to be",
    theory: "После to be часто стоит прилагательное — слово, которое описывает человека или предмет. She is tall and kind. The film is interesting. These videos are great. Форма to be показывает, о ком или о чём мы говорим, а прилагательное добавляет характеристику.\n\nНе ставьте a/an перед обычным прилагательным: She is kind, не She is a kind. Но если после прилагательного идёт профессия или существительное, артикль снова нужен: He is a good teacher. Смотрите на подлежащее и выбирайте форму спокойно: один предмет — is, несколько — are.",
    cards: [
      ["The film ___ interesting.", "is", ["am", "are"]], ["These videos ___ great.", "are", ["am", "is"]], ["She ___ tall and kind.", "is", ["am", "are"]], ["I ___ ready.", "am", ["is", "are"]], ["The actors ___ brilliant.", "are", ["am", "is"]], ["My story ___ awful.", "is", ["am", "are"]], ["You ___ very patient.", "are", ["am", "is"]], ["The dog ___ friendly.", "is", ["am", "are"]], ["My friends ___ funny.", "are", ["am", "is"]], ["It ___ easy.", "is", ["am", "are"]],
    ],
    corrections: [["Исправьте: These videos is great.", "These videos are great."], ["Исправьте: She are very kind.", "She is very kind."]],
    orders: [["Соберите описание.", ["The", "film", "is", "interesting"]], ["Соберите описание.", ["My", "friends", "are", "funny"]]],
  }),
  compactLesson({
    slug: "to-be-age-feelings",
    title: "Урок 7. To be: возраст, состояние и чувства",
    description: "Выражайте возраст, настроение и физическое состояние по-английски.",
    goal: "говорить о возрасте, самочувствии и эмоциях без русской конструкции «у меня есть». ",
    theoryTitle: "Мне двадцать: I am twenty",
    theory: "В английском возраст выражают через to be, а не через have. I am twenty years old. She is ten. Вопрос звучит How old are you? Это стоит запомнить как готовую формулу.\n\nТак же устроены чувства и состояния: I am tired, We are happy, The children are sleepy. Здесь to be связывает человека с его состоянием. Не добавляйте feel, если вы просто называете состояние: I am hungry — уже полноценная фраза.",
    cards: [
      ["I ___ twenty years old.", "am", ["is", "are"]], ["She ___ happy today.", "is", ["am", "are"]], ["We ___ tired after work.", "are", ["am", "is"]], ["The children ___ sleepy.", "are", ["am", "is"]], ["He ___ afraid of dogs.", "is", ["am", "are"]], ["You ___ hungry.", "are", ["am", "is"]], ["My sister ___ ten.", "is", ["am", "are"]], ["I ___ interested in films.", "am", ["is", "are"]], ["They ___ excited.", "are", ["am", "is"]], ["It ___ cold outside.", "is", ["am", "are"]],
    ],
    corrections: [["Исправьте: I have twenty years old.", "I am twenty years old."], ["Исправьте: The children is sleepy.", "The children are sleepy."]],
    orders: [["Соберите фразу о возрасте.", ["She", "is", "ten"]], ["Соберите фразу о состоянии.", ["I", "am", "hungry"]]],
  }),
  compactLesson({
    slug: "to-be-place-time-weather",
    title: "Урок 8. To be: место, время и погода",
    description: "Говорите, где находятся люди и предметы, который час и какая погода.",
    goal: "использовать to be в сообщениях о месте, времени, дате и погоде.",
    theoryTitle: "Где? Когда? Какая погода?",
    theory: "Чтобы сказать, где кто-то находится, используйте to be + предлог места: She is at home. The dog is on the sofa. They are at the gym. Время и погода тоже строятся с it is: It is five o'clock. It is rainy today.\n\nНе забывайте: погода и время в английском обычно начинаются с it, даже если по-русски мы начинаем без подлежащего. Today is Saturday — так называют день или дату. После изучения этого урока вы сможете уверенно объяснить, где вы и что происходит вокруг.",
    cards: [
      ["She ___ at home.", "is", ["am", "are"]], ["The dog ___ on the sofa.", "is", ["am", "are"]], ["They ___ at the gym.", "are", ["am", "is"]], ["It ___ five o'clock.", "is", ["am", "are"]], ["Today ___ Saturday.", "is", ["am", "are"]], ["It ___ rainy today.", "is", ["am", "are"]], ["We ___ in the museum.", "are", ["am", "is"]], ["I ___ at school.", "am", ["is", "are"]], ["My keys ___ on the table.", "are", ["am", "is"]], ["The cafe ___ near my house.", "is", ["am", "are"]],
    ],
    corrections: [["Исправьте: They is at the gym.", "They are at the gym."], ["Исправьте: It are rainy today.", "It is rainy today."]],
    orders: [["Соберите фразу о времени.", ["It", "is", "five", "o'clock"]], ["Соберите фразу о месте.", ["My", "keys", "are", "on", "the", "table"]]],
  }),
  compactLesson({
    slug: "to-be-there-is-there-are",
    title: "Урок 9. There is и there are: что где есть",
    description: "Расскажите о наличии предметов рядом с вами.",
    goal: "различать there is и there are в простых описаниях места.",
    theoryTitle: "Есть один предмет или несколько?",
    theory: "There is используют, когда предмет один: There is a cosy cafe near my house. There are — когда предметов несколько: There are two chairs in the room. Эта конструкция отвечает на вопрос «что есть где-то?», а не «где находится конкретный предмет».\n\nСравните: The cafe is near my house — мы уже знаем, о каком кафе идёт речь. There is a cafe near my house — мы впервые сообщаем, что кафе там есть. Выбирайте is для одного предмета и are для нескольких.",
    cards: [
      ["There ___ a cafe near my house.", "is", ["am", "are"]], ["There ___ two chairs in the room.", "are", ["am", "is"]], ["There ___ a book on the table.", "is", ["am", "are"]], ["There ___ many students here.", "are", ["am", "is"]], ["There ___ an apple in my bag.", "is", ["am", "are"]], ["There ___ three windows.", "are", ["am", "is"]], ["There ___ a problem.", "is", ["am", "are"]], ["There ___ two buses today.", "are", ["am", "is"]], ["There ___ a museum nearby.", "is", ["am", "are"]], ["There ___ books on the shelf.", "are", ["am", "is"]],
    ],
    corrections: [["Исправьте: There are a cafe near my house.", "There is a cafe near my house."], ["Исправьте: There is two chairs in the room.", "There are two chairs in the room."]],
    orders: [["Соберите фразу.", ["There", "is", "a", "book", "on", "the", "table"]], ["Соберите фразу.", ["There", "are", "three", "windows"]]],
  }),
  compactLesson({
    slug: "to-be-fixed-expressions",
    title: "Урок 10. To be: полезные устойчивые выражения",
    description: "Используйте готовые сочетания be interested in, be good at, be ready for и другие.",
    goal: "встраивать to be в самые частые устойчивые выражения о привычках и интересах.",
    theoryTitle: "To be в готовых сочетаниях",
    theory: "Некоторые идеи по-английски говорят с to be как с готовой частью выражения: be interested in, be keen on, be good at, be afraid of, be late for, be ready for. Не нужно переводить их слово за словом — учите выражение целиком.\n\nНапример: I am interested in music. She is good at maths. We are ready for the test. После формы to be остаётся подходящий предлог. Чем чаще вы повторяете такие короткие фразы в контексте, тем легче они выходят в разговоре.",
    cards: [
      ["I ___ interested in music.", "am", ["is", "are"]], ["She ___ good at maths.", "is", ["am", "are"]], ["We ___ ready for the test.", "are", ["am", "is"]], ["He ___ afraid of dogs.", "is", ["am", "are"]], ["They ___ keen on football.", "are", ["am", "is"]], ["You ___ late for class.", "are", ["am", "is"]], ["My brother ___ interested in films.", "is", ["am", "are"]], ["I ___ good at English.", "am", ["is", "are"]], ["The children ___ ready for bed.", "are", ["am", "is"]], ["It ___ important for me.", "is", ["am", "are"]],
    ],
    corrections: [["Исправьте: She are good at maths.", "She is good at maths."], ["Исправьте: We is ready for the test.", "We are ready for the test."]],
    orders: [["Соберите выражение.", ["I", "am", "interested", "in", "music"]], ["Соберите выражение.", ["They", "are", "ready", "for", "the", "test"]]],
  }),
];

const NEGATIVE_LESSONS = [
  authoredLesson({
    slug: "to-be-negative-forms",
    title: "Урок 11. Отрицания: am not, isn't, aren't",
    description: "Освойте основную форму отрицания с to be и перестаньте добавлять do/does там, где они не нужны.",
    previewText: "Основа отрицаний: форма to be + not.", phraseOfTheDay: "I am not late.", motivationalQuote: "Отрицание с to be — это знакомая форма плюс одно короткое слово not.",
    goal: "строить отрицания с am not, is not / isn't и are not / aren't.",
    theoryTitle: "Форма to be + not",
    theory: "С to be отрицание строится очень просто: после формы ставим not. I am not tired. She is not at home. We are not late. Не добавляйте do или does: Do not be — это другая конструкция, а не обычное отрицание с to be.\n\nВ разговоре is not чаще сокращается до isn't, а are not — до aren't. С I обычно используется полная форма am not: I am not a teacher. Сначала выберите am, is или are, только затем добавляйте not.",
    choices: [["I ___ from London.", ["am not", "isn't", "aren't"], "am not"], ["She ___ at school today.", ["isn't", "am not", "aren't"], "isn't"], ["We ___ hungry.", ["aren't", "isn't", "am not"], "aren't"], ["The cat ___ on the sofa.", ["isn't", "aren't", "am not"], "isn't"], ["You ___ late.", ["aren't", "isn't", "am not"], "aren't"], ["They ___ doctors.", ["aren't", "isn't", "am not"], "aren't"], ["It ___ cold outside.", ["isn't", "aren't", "am not"], "isn't"], ["My parents ___ at work.", ["aren't", "isn't", "am not"], "aren't"], ["He ___ afraid of dogs.", ["isn't", "aren't", "am not"], "isn't"], ["I ___ ready yet.", ["am not", "isn't", "aren't"], "am not"]],
    texts: [["Впишите два слова: She ___ ___ tired.", "is not"], ["Впишите сокращение: They ___ at home.", "aren't"], ["Впишите два слова: I ___ ___ a student.", "am not"], ["Впишите сокращение: He ___ my brother.", "isn't"], ["Впишите два слова: We ___ ___ ready.", "are not"], ["Впишите сокращение: It ___ sunny today.", "isn't"], ["Напишите полностью: «Я не опаздываю».", "I am not late."], ["Напишите полностью: «Они не в музее».", "They are not in the museum."]],
    matches: [["Полная форма → сокращение", { "is not": "isn't", "are not": "aren't", "I am not": "I am not", "she is not": "she isn't" }], ["Подлежащее → отрицательная форма", { "I": "am not", "he": "isn't", "we": "aren't", "the books": "aren't" }], ["Фраза → перевод", { "I am not tired": "Я не устал(а)", "She isn't here": "Её здесь нет", "We aren't late": "Мы не опаздываем", "It isn't easy": "Это непросто" }]],
    corrections: [["Исправьте: I isn't hungry.", "I am not hungry."], ["Исправьте: They isn't ready.", "They aren't ready."]],
    orders: [["Соберите отрицание.", ["She", "isn't", "at", "home"]], ["Соберите отрицание.", ["We", "aren't", "late"]]],
  }),
  authoredLesson({
    slug: "to-be-negative-singular-plural",
    title: "Урок 12. Отрицания: один или несколько",
    description: "Тренируйте isn't и aren't с людьми, предметами, this/these и there is/are.",
    previewText: "Единственное и множественное число в отрицаниях.", phraseOfTheDay: "These books aren't new.", motivationalQuote: "В отрицании число никуда не исчезает: один — isn't, несколько — aren't.",
    goal: "выбирать isn't или aren't по числу подлежащего.",
    theoryTitle: "Отрицание зависит от числа",
    theory: "Isn't используют с одним человеком или предметом: The book isn't new. She isn't at home. This isn't my bag. Aren't используют с несколькими: The books aren't new. They aren't here. These aren't my keys.\n\nСмотрите на главное слово. The box of pencils isn't heavy — главное слово box, оно одно. My brother and sister aren't at work — людей двое. После формы to be значение слова not не меняется, меняется только выбранная форма.",
    choices: [["This book ___ old.", ["isn't", "aren't", "am not"], "isn't"], ["These books ___ old.", ["aren't", "isn't", "am not"], "aren't"], ["My brother ___ here.", ["isn't", "aren't", "am not"], "isn't"], ["My brothers ___ here.", ["aren't", "isn't", "am not"], "aren't"], ["The box of pencils ___ heavy.", ["isn't", "aren't", "am not"], "isn't"], ["The children ___ sleepy.", ["aren't", "isn't", "am not"], "aren't"], ["That ___ my seat.", ["isn't", "aren't", "am not"], "isn't"], ["Those ___ our seats.", ["aren't", "isn't", "am not"], "aren't"], ["My parents ___ at home.", ["aren't", "isn't", "am not"], "aren't"], ["The weather ___ warm.", ["isn't", "aren't", "am not"], "isn't"]],
    texts: [["Впишите сокращение: This ___ my phone.", "isn't"], ["Впишите сокращение: These ___ my phones.", "aren't"], ["Впишите сокращение: The child ___ ready.", "isn't"], ["Впишите сокращение: The children ___ ready.", "aren't"], ["Напишите: «Мои ключи не здесь».", "My keys aren't here."], ["Напишите: «Эта сумка не новая».", "This bag isn't new."], ["Впишите сокращение: My sister and I ___ late.", "aren't"], ["Впишите сокращение: The cinema ___ open.", "isn't"]],
    matches: [["Подлежащее → форма", { "this bag": "isn't", "these bags": "aren't", "the child": "isn't", "the children": "aren't" }], ["Фраза → перевод", { "It isn't cold": "Не холодно", "They aren't ready": "Они не готовы", "This isn't mine": "Это не моё", "Those aren't new": "Вон те не новые" }], ["Главное слово → отрицание", { "the box": "isn't", "the boxes": "aren't", "my friend": "isn't", "my friends": "aren't" }]],
    corrections: [["Исправьте: These isn't my shoes.", "These aren't my shoes."], ["Исправьте: My parents isn't at work.", "My parents aren't at work."]],
    orders: [["Соберите отрицание.", ["This", "isn't", "my", "bag"]], ["Соберите отрицание.", ["The", "children", "aren't", "late"]]],
  }),
  authoredLesson({
    slug: "to-be-negative-everyday-contexts",
    title: "Урок 13. Отрицания в жизненных ситуациях",
    description: "Скажите, кем вы не являетесь, где вас нет, как вы себя не чувствуете и что не происходит вокруг.",
    previewText: "Практика отрицаний в реальном контексте.", phraseOfTheDay: "She isn't afraid of dogs.", motivationalQuote: "Отрицание помогает сказать точнее: не просто «я здесь», а «я не там».",
    goal: "использовать отрицания с to be для профессии, места, возраста, чувств, времени и погоды.",
    theoryTitle: "Что именно мы отрицаем",
    theory: "Отрицания с to be работают во всех знакомых ситуациях. Профессия: He isn't a doctor. Место: We aren't at school. Состояние: I am not tired. Погода: It isn't cold. Время: It isn't five o'clock.\n\nНе меняйте остальную часть фразы без необходимости. If you are not hungry, say I am not hungry. Если человек не из страны, говорите She isn't from Spain. Такая простая структура помогает говорить спокойно и понятно.",
    choices: [["He ___ a doctor; he is a teacher.", ["isn't", "aren't", "am not"], "isn't"], ["We ___ at the cinema; we are at home.", ["aren't", "isn't", "am not"], "aren't"], ["I ___ hungry; I am thirsty.", ["am not", "isn't", "aren't"], "am not"], ["It ___ five o'clock yet.", ["isn't", "aren't", "am not"], "isn't"], ["They ___ from Italy.", ["aren't", "isn't", "am not"], "aren't"], ["She ___ afraid of spiders.", ["isn't", "aren't", "am not"], "isn't"], ["The film ___ interesting.", ["isn't", "aren't", "am not"], "isn't"], ["My friends ___ ready for class.", ["aren't", "isn't", "am not"], "aren't"], ["It ___ rainy today.", ["isn't", "aren't", "am not"], "isn't"], ["I ___ good at maths yet.", ["am not", "isn't", "aren't"], "am not"]],
    texts: [["Напишите: «Он не актёр».", "He isn't an actor."], ["Напишите: «Мы не дома».", "We aren't at home."], ["Напишите: «Мне не холодно».", "I am not cold."], ["Напишите: «Сегодня не дождливо».", "It isn't rainy today."], ["Напишите: «Они не из Франции».", "They aren't from France."], ["Напишите: «Она не готова к тесту».", "She isn't ready for the test."], ["Впишите форму: The story ___ funny.", "isn't"], ["Впишите форму: I ___ late for class.", "am not"]],
    matches: [["Ситуация → отрицание", { "не профессия": "He isn't a doctor.", "не место": "They aren't at school.", "не состояние": "I am not tired.", "не погода": "It isn't sunny." }], ["Фраза → перевод", { "She isn't ready": "Она не готова", "We aren't friends": "Мы не друзья", "I am not late": "Я не опаздываю", "It isn't easy": "Это непросто" }], ["Подлежащее → готовая фраза", { "I": "am not hungry", "he": "isn't at home", "we": "aren't late", "the weather": "isn't warm" }]],
    corrections: [["Исправьте: It aren't cold today.", "It isn't cold today."], ["Исправьте: She am not a teacher.", "She isn't a teacher."]],
    orders: [["Соберите отрицание.", ["They", "aren't", "from", "Spain"]], ["Соберите отрицание.", ["I", "am", "not", "afraid"]]],
  }),
  authoredLesson({
    slug: "there-is-there-are-negatives",
    title: "Урок 14. There isn't / There aren't",
    description: "Отрицайте наличие одного или нескольких предметов и задавайте вопросы о том, что есть рядом.",
    previewText: "There isn't a… / There aren't any… в реальных местах.", phraseOfTheDay: "There aren't any buses now.", motivationalQuote: "Пусть there is / there are станет одной готовой рамкой, а не двумя новыми правилами.",
    goal: "строить отрицания и вопросы с there isn't / there aren't.",
    theoryTitle: "Когда чего-то нет",
    theory: "С одним предметом используйте There isn't: There isn't a shop here. С несколькими или с any используйте There aren't: There aren't any buses now. Вопрос сохраняет привычный порядок: Is there a bank nearby? Are there any questions?\n\nНе используйте there is с несколькими предметами: There isn't two chairs — неправильно. Сначала посчитайте предметы, потом выбирайте is или are.",
    choices: [["There ___ a shop here.", ["isn't", "aren't", "am not"], "isn't"], ["There ___ any buses now.", ["aren't", "isn't", "am not"], "aren't"], ["___ there a pharmacy nearby?", ["Is", "Are", "Am"], "Is"], ["___ there any questions?", ["Are", "Is", "Am"], "Are"], ["There ___ two chairs in this room.", ["aren't", "isn't", "am not"], "aren't"], ["There ___ any milk in the fridge.", ["isn't", "aren't", "am not"], "isn't"], ["There ___ a problem.", ["isn't", "aren't", "am not"], "isn't"], ["There ___ many people today.", ["aren't", "isn't", "am not"], "aren't"], ["Which is correct?", ["There isn't a bus.", "There aren't a bus.", "There not is a bus."], "There isn't a bus."], ["Which is correct?", ["There aren't any keys.", "There isn't any keys.", "There any keys aren't."], "There aren't any keys."]],
    texts: [["Напишите: «Здесь нет кафе».", "There isn't a cafe here."], ["Напишите: «Здесь нет людей».", "There aren't any people here."], ["Напишите вопрос: «Здесь есть банк?».", "Is there a bank here?"], ["Напишите вопрос: «Есть ли вопросы?».", "Are there any questions?"], ["Впишите форму: There ___ any chairs.", "aren't"], ["Впишите форму: There ___ a bus today.", "isn't"], ["Напишите: «В комнате нет окна».", "There isn't a window in the room."], ["Напишите: «На столе нет книг».", "There aren't any books on the table."]],
    matches: [["Количество → отрицание", { "one shop": "There isn't a shop", "two shops": "There aren't any shops", "one chair": "There isn't a chair", "many chairs": "There aren't any chairs" }], ["Вопрос → ответ", { "Is there a cafe?": "No, there isn't.", "Are there buses?": "No, there aren't.", "Is there a problem?": "Yes, there is.", "Are there questions?": "Yes, there are." }], ["Фраза → перевод", { "There isn't time": "Нет времени", "There aren't any seats": "Нет мест", "Is there a hotel?": "Есть ли отель?", "Are there shops?": "Есть ли магазины?" }]],
    corrections: [["Исправьте: There isn't any buses.", "There aren't any buses."], ["Исправьте: Are there a pharmacy?", "Is there a pharmacy?"]],
    orders: [["Соберите отрицание.", ["There", "isn't", "a", "bank", "nearby"]], ["Соберите вопрос.", ["Are", "there", "any", "shops"]]],
  }),
  authoredLesson({
    slug: "to-be-negative-module-review",
    title: "Урок 20. Модуль 2: итог по отрицаниям",
    description: "Закрепите все отрицательные формы: люди, предметы, места, состояния и наличие.",
    previewText: "Итоговая практика по отрицаниям с to be.", phraseOfTheDay: "We aren't late, and the lesson isn't difficult.", motivationalQuote: "Если вы умеете спокойно сказать «нет», вы уже управляете формой to be.",
    goal: "подтвердить владение отрицаниями с am not, isn't, aren't и there isn't/aren't.",
    theoryTitle: "Проверяем себя",
    theory: "Короткая проверка перед следующим модулем. Вспомните: I am not; he, she, it isn't; you, we, they aren't. Для наличия — There isn't с одним предметом и There aren't с несколькими.\n\nНе ищите сложное правило. Каждый раз ответьте на два вопроса: кто или что является подлежащим и сколько это предметов? Затем выберите форму и только после этого добавьте not.",
    choices: [["I ___ a teacher.", ["am not", "isn't", "aren't"], "am not"], ["The book ___ new.", ["isn't", "aren't", "am not"], "isn't"], ["The books ___ new.", ["aren't", "isn't", "am not"], "aren't"], ["There ___ a bus today.", ["isn't", "aren't", "am not"], "isn't"], ["There ___ any buses today.", ["aren't", "isn't", "am not"], "aren't"], ["She ___ from Kyiv.", ["isn't", "aren't", "am not"], "isn't"], ["We ___ ready yet.", ["aren't", "isn't", "am not"], "aren't"], ["It ___ warm today.", ["isn't", "aren't", "am not"], "isn't"], ["These ___ my keys.", ["aren't", "isn't", "am not"], "aren't"], ["My name ___ Anna.", ["isn't", "aren't", "am not"], "isn't"]],
    texts: [["Напишите: «Я не голоден».", "I am not hungry."], ["Напишите: «Она не дома».", "She isn't at home."], ["Напишите: «Они не друзья».", "They aren't friends."], ["Напишите: «Здесь нет аптеки».", "There isn't a pharmacy here."], ["Напишите: «Здесь нет стульев».", "There aren't any chairs here."], ["Впишите форму: My parents ___ late.", "aren't"], ["Впишите форму: The weather ___ good.", "isn't"], ["Впишите форму: I ___ afraid.", "am not"]],
    matches: [["Подлежащее → отрицание", { "I": "am not", "she": "isn't", "we": "aren't", "there + plural": "aren't" }], ["Фраза → перевод", { "It isn't sunny": "Не солнечно", "We aren't ready": "Мы не готовы", "There isn't a cafe": "Нет кафе", "They aren't here": "Их здесь нет" }], ["Ошибка → исправление", { "I isn't": "I am not", "she aren't": "she isn't", "there aren't a": "there isn't a", "these isn't": "these aren't" }]],
    corrections: [["Исправьте: We isn't at school.", "We aren't at school."], ["Исправьте: There aren't a problem.", "There isn't a problem."]],
    orders: [["Соберите отрицание.", ["My", "friends", "aren't", "here"]], ["Соберите отрицание.", ["It", "isn't", "cold", "today"]]],
  }),
];

const NEGATIVE_EXTENSION_LESSONS = [
  compactLesson({
    slug: "to-be-negative-full-and-short-forms",
    title: "Урок 15. Полные и краткие отрицания",
    description: "Уверенно выбирайте полную или разговорную краткую форму отрицания.",
    goal: "понимать разницу между is not / isn't и are not / aren't и использовать их по смыслу.",
    theoryTitle: "Две формы — одно значение",
    theory: "Полная форма и сокращение передают одно и то же отрицание: She is not here = She isn't here. We are not late = We aren't late. В обычном разговоре краткие формы звучат естественнее, а полные полезны, когда нужно сделать отрицание заметнее или писать спокойный нейтральный текст.\n\nС I стандартно используйте I am not. Форма I amn't в современном нейтральном английском не нужна. Главное правило прежнее: сначала выберите am, is или are, затем добавьте not. Никаких do и does для простого отрицания с to be не требуется.",
    cards: [
      ["She ___ not at home.", "is", ["am", "are"]], ["They ___ not ready.", "are", ["am", "is"]], ["I ___ not late.", "am", ["is", "are"]], ["It ___ not easy.", "is", ["am", "are"]], ["We ___ not hungry.", "are", ["am", "is"]], ["He ___ not a teacher.", "is", ["am", "are"]], ["You ___ not wrong.", "are", ["am", "is"]], ["The weather ___ not warm.", "is", ["am", "are"]], ["My parents ___ not here.", "are", ["am", "is"]], ["The book ___ not new.", "is", ["am", "are"]],
    ],
    corrections: [["Исправьте: I isn't ready.", "I am not ready."], ["Исправьте: We is not hungry.", "We are not hungry."]],
    orders: [["Соберите полное отрицание.", ["She", "is", "not", "at", "home"]], ["Соберите краткое отрицание.", ["They", "aren't", "ready"]]],
  }),
  compactLesson({
    slug: "to-be-negative-no-do-does",
    title: "Урок 16. Отрицания с to be без do и does",
    description: "Перестаньте добавлять do/does туда, где отрицание уже строится через to be.",
    goal: "узнавать и исправлять типичную ошибку do not be в предложениях с to be.",
    theoryTitle: "To be уже само несёт отрицание",
    theory: "В Present Simple с обычными глаголами нужны do not и does not: I do not work. Но to be — особый глагол. Он строит отрицание сам: I am not tired. She is not a doctor. They are not at school.\n\nПоэтому Do not be tired не означает обычное «я не устал»; это приказ «не будь уставшим». Когда вы говорите о факте, состоянии, месте или профессии, ставьте not сразу после am, is или are. Это короткое правило убирает очень частую ошибку у начинающих.",
    cards: [
      ["I ___ not tired.", "am", ["do", "does"]], ["She ___ not a doctor.", "is", ["do", "does"]], ["They ___ not at school.", "are", ["do", "does"]], ["We ___ not late.", "are", ["do", "does"]], ["He ___ not from Italy.", "is", ["do", "does"]], ["It ___ not cold.", "is", ["do", "does"]], ["You ___ not alone.", "are", ["do", "does"]], ["My bag ___ not heavy.", "is", ["do", "does"]], ["The children ___ not sleepy.", "are", ["do", "does"]], ["I ___ not afraid.", "am", ["do", "does"]],
    ],
    corrections: [["Исправьте: I don't be late.", "I am not late."], ["Исправьте: She doesn't be a teacher.", "She is not a teacher."]],
    orders: [["Соберите отрицание.", ["I", "am", "not", "afraid"]], ["Соберите отрицание.", ["The", "children", "are", "not", "sleepy"]]],
  }),
  compactLesson({
    slug: "to-be-negative-state-time-weather",
    title: "Урок 17. Отрицания: чувства, время и погода",
    description: "Говорите, что вы не устали, сейчас не пять часов и на улице не холодно.",
    goal: "строить отрицания с to be в сообщениях о состоянии, времени, дате и погоде.",
    theoryTitle: "Отрицаем состояние, а не действие",
    theory: "С to be легко сказать, каким не является состояние: I am not hungry. She isn't sad. We aren't ready. Для погоды и времени используйте it: It isn't cold. It isn't five o'clock. Для дня или даты также обычно is: Today isn't Monday.\n\nВ таких фразах не происходит действие, поэтому нет другого глагола. Вы просто описываете факт. Оставляйте подлежащее на первом месте, после него — подходящую форму to be и not. Это даст вам готовые фразы для реальных разговоров.",
    cards: [
      ["I ___ not hungry.", "am", ["is", "are"]], ["She ___ not sad today.", "is", ["am", "are"]], ["We ___ not ready yet.", "are", ["am", "is"]], ["It ___ not cold outside.", "is", ["am", "are"]], ["It ___ not five o'clock.", "is", ["am", "are"]], ["Today ___ not Monday.", "is", ["am", "are"]], ["The children ___ not sleepy.", "are", ["am", "is"]], ["You ___ not ill.", "are", ["am", "is"]], ["My brother ___ not worried.", "is", ["am", "are"]], ["They ___ not excited.", "are", ["am", "is"]],
    ],
    corrections: [["Исправьте: It aren't cold outside.", "It isn't cold outside."], ["Исправьте: I isn't hungry.", "I am not hungry."]],
    orders: [["Соберите фразу о погоде.", ["It", "isn't", "cold", "outside"]], ["Соберите фразу о состоянии.", ["We", "aren't", "ready", "yet"]]],
  }),
  compactLesson({
    slug: "to-be-negative-there-is-there-are",
    title: "Урок 18. There isn't и there aren't вокруг нас",
    description: "Отрицайте наличие одного или нескольких предметов в доме, городе и классе.",
    goal: "правильно использовать there isn't и there aren't в описании мест.",
    theoryTitle: "Когда чего-то нет",
    theory: "Отрицание с there is / there are строится так же: There isn't a shop nearby. There aren't any buses today. Для одного предмета используйте isn't, для нескольких — aren't. В множественном числе после отрицания часто появляется any: There aren't any chairs.\n\nНе говорите There isn't any chairs — chairs во множественном числе, поэтому нужна форма aren't. Сначала посмотрите, сколько предметов вы называете. Затем выберите is или are и добавьте not. Так вы быстро опишете, чего нет в комнате, районе или расписании.",
    cards: [
      ["There ___ a bank nearby.", "isn't", ["aren't", "am not"]], ["There ___ any buses today.", "aren't", ["isn't", "am not"]], ["There ___ a problem.", "isn't", ["aren't", "am not"]], ["There ___ any chairs here.", "aren't", ["isn't", "am not"]], ["There ___ a cafe in this street.", "isn't", ["aren't", "am not"]], ["There ___ any students in the room.", "aren't", ["isn't", "am not"]], ["There ___ a lift in the building.", "isn't", ["aren't", "am not"]], ["There ___ any shops open.", "aren't", ["isn't", "am not"]], ["There ___ milk in the fridge.", "isn't", ["aren't", "am not"]], ["There ___ two keys on the table.", "aren't", ["isn't", "am not"]],
    ],
    corrections: [["Исправьте: There isn't any chairs here.", "There aren't any chairs here."], ["Исправьте: There aren't a cafe nearby.", "There isn't a cafe nearby."]],
    orders: [["Соберите отрицание.", ["There", "isn't", "a", "bank", "nearby"]], ["Соберите отрицание.", ["There", "aren't", "any", "buses", "today"]]],
  }),
  compactLesson({
    slug: "to-be-negative-mixed-practice",
    title: "Урок 19. Отрицания: смешанная практика",
    description: "Закрепите все виды отрицаний до финальной проверки модуля.",
    goal: "самостоятельно выбирать форму отрицания в разных бытовых ситуациях.",
    theoryTitle: "Быстрый алгоритм отрицания",
    theory: "Перед практикой используйте три шага. Сначала найдите подлежащее: I, she, they, it, there. Затем выберите am, is или are. Наконец, добавьте not — полную или краткую форму. Этого достаточно для большей части коротких фраз уровня A1.\n\nЕсли это наличие предметов, начните с There. Если это погода или время, обычно начните с It. Не спешите: правильная форма становится очевидной, когда вы точно знаете, один объект перед вами или несколько.",
    cards: [
      ["I ___ not late.", "am", ["is", "are"]], ["She ___ not at home.", "is", ["am", "are"]], ["They ___ not friends.", "are", ["am", "is"]], ["It ___ not sunny.", "is", ["am", "are"]], ["There ___ not a bus now.", "is", ["am", "are"]], ["There ___ not any taxis.", "are", ["am", "is"]], ["My keys ___ not here.", "are", ["am", "is"]], ["The museum ___ not open.", "is", ["am", "are"]], ["We ___ not afraid.", "are", ["am", "is"]], ["You ___ not wrong.", "are", ["am", "is"]],
    ],
    corrections: [["Исправьте: They isn't friends.", "They aren't friends."], ["Исправьте: There is not any taxis.", "There are not any taxis."]],
    orders: [["Соберите отрицание.", ["The", "museum", "isn't", "open"]], ["Соберите отрицание.", ["My", "keys", "aren't", "here"]]],
  }),
];

const QUESTION_LESSONS = [
  authoredLesson({
    slug: "to-be-yes-no-questions",
    title: "Урок 21. Общие вопросы: Am I? Is he? Are they?",
    description: "Задавайте вопросы, на которые можно ответить yes или no.",
    previewText: "Форма to be выходит на первое место в вопросе.", phraseOfTheDay: "Are you ready?", motivationalQuote: "Чтобы задать вопрос, просто поставьте am, is или are перед подлежащим.",
    goal: "строить общие вопросы с am, is и are без do/does.",
    theoryTitle: "Вопрос начинается с to be",
    theory: "В утверждении: She is happy. В общем вопросе форма to be встаёт впереди: Is she happy? They are ready. Are they ready?\n\nНе добавляйте do или does: Do you are ready? — неверно. Правильно: Are you ready? С I возможен вопрос Am I late? Он звучит необычно, но грамматически верен. В ответах используйте короткие формы: Yes, she is. No, they aren't.",
    choices: [["___ you ready?", ["Are", "Is", "Am"], "Are"], ["___ she your sister?", ["Is", "Are", "Am"], "Is"], ["___ they at home?", ["Are", "Is", "Am"], "Are"], ["___ I late?", ["Am", "Is", "Are"], "Am"], ["___ it cold outside?", ["Is", "Are", "Am"], "Is"], ["___ we in the right room?", ["Are", "Is", "Am"], "Are"], ["___ this your phone?", ["Is", "Are", "Am"], "Is"], ["___ those your bags?", ["Are", "Is", "Am"], "Are"], ["Which is correct?", ["Is he a teacher?", "Does he is a teacher?", "He is a teacher?"], "Is he a teacher?"], ["Which is correct?", ["Are they busy?", "Do they are busy?", "They are busy?"], "Are they busy?"]],
    texts: [["Соберите вопрос: she / is / happy?", "Is she happy?"], ["Соберите вопрос: you / are / a teacher?", "Are you a teacher?"], ["Соберите вопрос: they / are / at home?", "Are they at home?"], ["Напишите: «Мы готовы?».", "Are we ready?"], ["Напишите: «Это твоя книга?».", "Is this your book?"], ["Впишите форму: ___ he late?", "Is"], ["Впишите форму: ___ these your keys?", "Are"], ["Напишите: «Сегодня холодно?».", "Is it cold today?"]],
    matches: [["Вопрос → ответ", { "Are you ready?": "Yes, I am.", "Is she at home?": "No, she isn't.", "Are they friends?": "Yes, they are.", "Is it your book?": "No, it isn't." }], ["Подлежащее → вопросительная форма", { "I": "Am I?", "he": "Is he?", "we": "Are we?", "the children": "Are the children?" }], ["Утверждение → вопрос", { "She is here.": "Is she here?", "They are late.": "Are they late?", "It is cold.": "Is it cold?", "We are ready.": "Are we ready?" }]],
    corrections: [["Исправьте: Do you are ready?", "Are you ready?"], ["Исправьте: They are at home?", "Are they at home?"]],
    orders: [["Соберите вопрос.", ["Are", "you", "a", "student"]], ["Соберите вопрос.", ["Is", "it", "sunny", "today"]]],
  }),
  authoredLesson({
    slug: "to-be-wh-questions",
    title: "Урок 22. Вопросительные слова: who, what, where, how old",
    description: "Уточняйте имя, человека, место и возраст с правильным порядком слов.",
    previewText: "Who is…? What is…? Where are…? How old is…?", phraseOfTheDay: "Where are you from?", motivationalQuote: "Вопросительное слово идёт первым, а to be — сразу после него.",
    goal: "строить специальные вопросы с who, what, where и how old.",
    theoryTitle: "Сначала вопросительное слово",
    theory: "Если нужно не «да/нет», а информация, поставьте вопросительное слово перед формой to be: Who is he? What is your name? Where are they? How old is she?\n\nПосле where и how old форма to be зависит от подлежащего: Where are you? но Where is your brother? How old are they? но How old is Anna? Порядок «Where they are?» неверен в обычном вопросе: Where are they?",
    choices: [["___ is your name?", ["What", "Where", "Who"], "What"], ["___ are they from?", ["Where", "Who", "What"], "Where"], ["___ is he? — He is my brother.", ["Who", "Where", "What"], "Who"], ["How old ___ she?", ["is", "are", "am"], "is"], ["Where ___ your parents?", ["are", "is", "am"], "are"], ["What ___ this?", ["is", "are", "am"], "is"], ["Who ___ at the door?", ["is", "are", "am"], "is"], ["How old ___ you?", ["are", "is", "am"], "are"], ["Where ___ the cinema?", ["is", "are", "am"], "is"], ["Which is correct?", ["Where are they?", "Where they are?", "Where is they?"], "Where are they?"]],
    texts: [["Напишите: «Как тебя зовут?».", "What is your name?"], ["Напишите: «Откуда ты?».", "Where are you from?"], ["Напишите: «Кто он?».", "Who is he?"], ["Напишите: «Сколько ей лет?».", "How old is she?"], ["Напишите: «Где мои ключи?».", "Where are my keys?"], ["Впишите форму: What ___ this?", "is"], ["Впишите форму: Where ___ we?", "are"], ["Напишите: «Где станция?».", "Where is the station?"]],
    matches: [["Вопросительное слово → значение", { "who": "кто", "what": "что / как", "where": "где / откуда", "how old": "сколько лет" }], ["Ситуация → вопрос", { "имя": "What is your name?", "место": "Where are they?", "возраст": "How old is he?", "человек": "Who is she?" }], ["Вопрос → ответ", { "Who is he?": "He is my teacher.", "Where are you from?": "I am from Ukraine.", "What is this?": "It is a key.", "How old are they?": "They are ten." }]],
    corrections: [["Исправьте: Where they are?", "Where are they?"], ["Исправьте: How old are she?", "How old is she?"]],
    orders: [["Соберите вопрос.", ["What", "is", "your", "name"]], ["Соберите вопрос.", ["Where", "are", "they", "from"]]],
  }),
  authoredLesson({
    slug: "to-be-questions-about-life",
    title: "Урок 23. Вопросы о человеке и жизни",
    description: "Спросите про профессию, состояние, национальность, семью и интересы.",
    previewText: "Практические вопросы для знакомства и small talk.", phraseOfTheDay: "Are you interested in music?", motivationalQuote: "Хороший разговор начинается с простого и искреннего вопроса.",
    goal: "задавать вопросы о личной информации, профессии, чувствах и интересах.",
    theoryTitle: "Вопросы, которые пригодятся сразу",
    theory: "Для знакомства подойдут простые вопросы: Are you a student? Is she a teacher? Where are you from? Are you interested in music? Is he married? How old are your children?\n\nИспользуйте yes/no вопрос, если ответ ожидается короткий. Используйте who, what, where или how old, если нужна новая информация. После вопросов о чувствах или интересах человек может ответить коротко: Yes, I am. No, I'm not.",
    choices: [["___ you a student?", ["Are", "Is", "Am"], "Are"], ["___ she married?", ["Is", "Are", "Am"], "Is"], ["___ he interested in sport?", ["Is", "Are", "Am"], "Is"], ["Where ___ your family from?", ["is", "are", "am"], "is"], ["___ they good at English?", ["Are", "Is", "Am"], "Are"], ["What ___ his job?", ["is", "are", "am"], "is"], ["___ your parents at work?", ["Are", "Is", "Am"], "Are"], ["How old ___ your brother?", ["is", "are", "am"], "is"], ["___ you ready for the test?", ["Are", "Is", "Am"], "Are"], ["Who ___ your teacher?", ["is", "are", "am"], "is"]],
    texts: [["Напишите: «Ты студент?».", "Are you a student?"], ["Напишите: «Она замужем?».", "Is she married?"], ["Напишите: «Чем он интересуется?».", "What is he interested in?"], ["Напишите: «Твои родители на работе?».", "Are your parents at work?"], ["Напишите: «Кто твой учитель?».", "Who is your teacher?"], ["Впишите форму: ___ he good at maths?", "Is"], ["Впишите форму: What ___ her job?", "is"], ["Напишите: «Они готовы к уроку?».", "Are they ready for the lesson?"]],
    matches: [["Вопрос → ответ", { "Are you a student?": "Yes, I am.", "Is she married?": "No, she isn't.", "Are they ready?": "Yes, they are.", "Who is he?": "He is my brother." }], ["Ситуация → вопрос", { "профессия": "What is your job?", "интерес": "Are you interested in art?", "семья": "Who is she?", "возраст": "How old is he?" }], ["Подлежащее → вопрос", { "you": "Are you ready?", "she": "Is she a teacher?", "your parents": "Are your parents here?", "his job": "What is his job?" }]],
    corrections: [["Исправьте: Is you a student?", "Are you a student?"], ["Исправьте: What are his job?", "What is his job?"]],
    orders: [["Соберите вопрос.", ["Are", "you", "interested", "in", "music"]], ["Соберите вопрос.", ["Who", "is", "your", "teacher"]]],
  }),
  authoredLesson({
    slug: "there-is-there-are-questions",
    title: "Урок 24. Вопросы с Is there? / Are there?",
    description: "Спрашивайте о наличии мест, предметов и людей вокруг вас.",
    previewText: "Is there a…? Are there any…? и короткие ответы.", phraseOfTheDay: "Is there a cafe nearby?", motivationalQuote: "Вопрос о месте помогает начать разговор даже с минимальным словарём.",
    goal: "задавать и понимать вопросы с Is there? и Are there?.",
    theoryTitle: "Есть ли здесь…?",
    theory: "С одним предметом спрашивайте Is there a…? Is there a cafe nearby? С несколькими — Are there any…? Are there any buses today?\n\nКороткий ответ повторяет форму: Is there a bank? — Yes, there is. Are there any shops? — No, there aren't. Не говорите Is there any shops: shops — множественное число, поэтому Are there any shops?",
    choices: [["___ there a cafe nearby?", ["Is", "Are", "Am"], "Is"], ["___ there any buses today?", ["Are", "Is", "Am"], "Are"], ["Is there a bank? — Yes, there ___.", ["is", "are", "am"], "is"], ["Are there any shops? — No, there ___.", ["aren't", "isn't", "am not"], "aren't"], ["___ there a problem?", ["Is", "Are", "Am"], "Is"], ["___ there any questions?", ["Are", "Is", "Am"], "Are"], ["Which is correct?", ["Is there a hotel?", "Are there a hotel?", "There is a hotel?"], "Is there a hotel?"], ["Which is correct?", ["Are there any chairs?", "Is there any chairs?", "There are any chairs?"], "Are there any chairs?"], ["___ there a pharmacy in this street?", ["Is", "Are", "Am"], "Is"], ["___ there many students here?", ["Are", "Is", "Am"], "Are"]],
    texts: [["Напишите: «Здесь есть отель?».", "Is there a hotel here?"], ["Напишите: «Здесь есть магазины?».", "Are there any shops here?"], ["Напишите короткий ответ: Is there a bus? (yes)", "Yes, there is."], ["Напишите короткий ответ: Are there any taxis? (no)", "No, there aren't."], ["Впишите форму: ___ there a park nearby?", "Is"], ["Впишите форму: ___ there any seats?", "Are"], ["Напишите: «Есть ли здесь аптека?».", "Is there a pharmacy here?"], ["Напишите: «Есть ли вопросы?».", "Are there any questions?"]],
    matches: [["Вопрос → ответ", { "Is there a cafe?": "Yes, there is.", "Are there buses?": "No, there aren't.", "Is there a station?": "No, there isn't.", "Are there shops?": "Yes, there are." }], ["Количество → вопрос", { "one hotel": "Is there a hotel?", "many hotels": "Are there any hotels?", "one chair": "Is there a chair?", "many chairs": "Are there any chairs?" }], ["Фраза → перевод", { "Is there a bank?": "Есть ли банк?", "Are there any buses?": "Есть ли автобусы?", "Yes, there is": "Да, есть", "No, there aren't": "Нет" }]],
    corrections: [["Исправьте: Are there a cafe nearby?", "Is there a cafe nearby?"], ["Исправьте: Is there any buses?", "Are there any buses?"]],
    orders: [["Соберите вопрос.", ["Is", "there", "a", "pharmacy", "nearby"]], ["Соберите короткий ответ.", ["No", "there", "aren't"]]],
  }),
  authoredLesson({
    slug: "to-be-short-answers",
    title: "Урок 25. Краткие ответы на вопросы",
    description: "Отвечайте естественно: Yes, I am; No, she isn't; Yes, there are.",
    previewText: "Полезные короткие ответы для всех вопросов с to be.", phraseOfTheDay: "Yes, I am ready.", motivationalQuote: "Короткий ответ — это вежливо, понятно и естественно.",
    goal: "давать корректные краткие ответы на вопросы с to be и there is/are.",
    theoryTitle: "Yes / No без лишних слов",
    theory: "Краткий утвердительный ответ повторяет подлежащее и форму to be: Are you ready? — Yes, I am. Is she at home? — Yes, she is. Are they friends? — Yes, they are.\n\nВ отрицательном ответе используйте not: No, I am not. No, she isn't. No, they aren't. Для there is/are: Yes, there is / are; No, there isn't / aren't. В утвердительном коротком ответе обычно не используйте сокращение Yes, I'm — лучше Yes, I am.",
    choices: [["Are you tired? — Yes, ___.", ["I am", "I is", "I are"], "I am"], ["Is she here? — No, ___.", ["she isn't", "she aren't", "she am not"], "she isn't"], ["Are they ready? — Yes, ___.", ["they are", "they is", "they am"], "they are"], ["Is it cold? — No, ___.", ["it isn't", "it aren't", "it am not"], "it isn't"], ["Is there a cafe? — Yes, there ___.", ["is", "are", "am"], "is"], ["Are there shops? — No, there ___.", ["aren't", "isn't", "am not"], "aren't"], ["Are we late? — No, ___.", ["we aren't", "we isn't", "we am not"], "we aren't"], ["Is he a teacher? — Yes, ___.", ["he is", "he are", "he am"], "he is"], ["Are those your books? — No, ___.", ["they aren't", "they isn't", "it isn't"], "they aren't"], ["Am I early? — Yes, ___.", ["you are", "I am", "you is"], "you are"]],
    texts: [["Напишите: Are you ready? (yes)", "Yes, I am."], ["Напишите: Is she a doctor? (no)", "No, she isn't."], ["Напишите: Are they at home? (yes)", "Yes, they are."], ["Напишите: Is it rainy? (no)", "No, it isn't."], ["Напишите: Is there a bank? (yes)", "Yes, there is."], ["Напишите: Are there buses? (no)", "No, there aren't."], ["Напишите: Are we friends? (yes)", "Yes, we are."], ["Напишите: Is he late? (no)", "No, he isn't."]],
    matches: [["Вопрос → краткий ответ", { "Are you okay?": "Yes, I am.", "Is she ready?": "No, she isn't.", "Are they here?": "Yes, they are.", "Is it far?": "No, it isn't." }], ["Вопрос о наличии → ответ", { "Is there a shop?": "Yes, there is.", "Are there buses?": "No, there aren't.", "Is there time?": "No, there isn't.", "Are there questions?": "Yes, there are." }], ["Полный ответ → короткий", { "Yes, I am ready.": "Yes, I am.", "No, she is not here.": "No, she isn't.", "Yes, they are friends.": "Yes, they are.", "No, it is not mine.": "No, it isn't." }]],
    corrections: [["Исправьте: Yes, I'm.", "Yes, I am."], ["Исправьте: No, they isn't.", "No, they aren't."]],
    orders: [["Соберите ответ.", ["Yes", "she", "is"]], ["Соберите ответ.", ["No", "there", "aren't"]]],
  }),
  authoredLesson({
    slug: "to-be-question-module-review",
    title: "Урок 30. Модуль 3: итог по вопросам",
    description: "Итоговая практика: общие вопросы, who/what/where/how old, there is/are и короткие ответы.",
    previewText: "Финальная 20-минутная практика по вопросам с to be.", phraseOfTheDay: "Where are you from?", motivationalQuote: "Вопросы открывают разговор — теперь у вас есть надёжные формы для первого шага.",
    goal: "подтвердить владение вопросами с to be и завершить первый учебный блок курса.",
    theoryTitle: "Финальная карта вопросов",
    theory: "Перед финальной практикой повторите схему. Общий вопрос: форма to be + подлежащее: Are you ready? Специальный вопрос: вопросительное слово + to be + подлежащее: Where are they? How old is he? Вопрос о наличии: Is there a…? / Are there any…?\n\nВ коротком ответе повторяйте форму: Yes, I am; No, she isn't; Yes, there is; No, there aren't. Если вы можете быстро выбрать эту форму, значит to be уже работает в живом разговоре.",
    choices: [["___ you from Ukraine?", ["Are", "Is", "Am"], "Are"], ["Where ___ she?", ["is", "are", "am"], "is"], ["How old ___ they?", ["are", "is", "am"], "are"], ["___ there a cafe here?", ["Is", "Are", "Am"], "Is"], ["___ there any students?", ["Are", "Is", "Am"], "Are"], ["Is he ready? — Yes, he ___.", ["is", "are", "am"], "is"], ["Are they at home? — No, they ___.", ["aren't", "isn't", "am not"], "aren't"], ["What ___ your name?", ["is", "are", "am"], "is"], ["Who ___ she?", ["is", "are", "am"], "is"], ["Which is correct?", ["Where are the keys?", "Where the keys are?", "Where is the keys?"], "Where are the keys?"]],
    texts: [["Напишите: «Ты готов?».", "Are you ready?"], ["Напишите: «Где она?».", "Where is she?"], ["Напишите: «Есть ли здесь банк?».", "Is there a bank here?"], ["Напишите короткий ответ: Are there shops? (yes)", "Yes, there are."], ["Напишите: «Сколько ему лет?».", "How old is he?"], ["Напишите короткий ответ: Is it cold? (no)", "No, it isn't."], ["Впишите форму: Who ___ your teacher?", "is"], ["Впишите форму: ___ we late?", "Are"]],
    matches: [["Вопрос → ответ", { "Are you ready?": "Yes, I am.", "Where is the station?": "It is near the park.", "Is there a cafe?": "No, there isn't.", "How old is she?": "She is twenty." }], ["Ситуация → вопрос", { "имя": "What is your name?", "место": "Where are they?", "наличие": "Are there any buses?", "возраст": "How old is he?" }], ["Форма → пример", { "Am": "Am I late?", "Is": "Is she ready?", "Are": "Are they here?", "Are there": "Are there any shops?" }]],
    corrections: [["Исправьте: Where is they from?", "Where are they from?"], ["Исправьте: Is there any chairs?", "Are there any chairs?"]],
    orders: [["Соберите вопрос.", ["Where", "are", "you", "from"]], ["Соберите ответ.", ["Yes", "there", "is"]]],
  }),
];

const QUESTION_EXTENSION_LESSONS = [
  compactLesson({
    slug: "to-be-question-word-order",
    title: "Урок 26. Вопросы: порядок слов без ошибок",
    description: "Собирайте общие и специальные вопросы, не оставляя форму to be после подлежащего.",
    goal: "видеть правильный порядок слов в вопросах с am, is и are.",
    theoryTitle: "Форма to be идёт вперёд",
    theory: "В утверждении мы говорим She is ready. В вопросе форма to be переезжает перед подлежащим: Is she ready? Это главное движение, которое нужно заметить. С I спрашиваем Am I…?, с you/we/they — Are…?, с he/she/it — Is…?\n\nЕсли есть вопросительное слово, оно остаётся в начале: Where is she? What are they? После него сразу ставьте форму to be, а затем человека или предмет. Не повторяйте форму в конце: Where she is? — это не обычный прямой вопрос.",
    cards: [
      ["___ you ready?", "Are", ["Is", "Am"]], ["___ she at home?", "Is", ["Are", "Am"]], ["Where ___ they?", "are", ["is", "am"]], ["What ___ your name?", "is", ["are", "am"]], ["___ I late?", "Am", ["Is", "Are"]], ["Who ___ he?", "is", ["are", "am"]], ["___ we in the right room?", "Are", ["Is", "Am"]], ["How old ___ she?", "is", ["are", "am"]], ["Where ___ the keys?", "are", ["is", "am"]], ["___ it cold outside?", "Is", ["Are", "Am"]],
    ],
    corrections: [["Исправьте: Where she is?", "Where is she?"], ["Исправьте: You are ready?", "Are you ready?"]],
    orders: [["Соберите вопрос.", ["Is", "she", "at", "home"]], ["Соберите специальный вопрос.", ["Where", "are", "the", "keys"]]],
  }),
  compactLesson({
    slug: "to-be-questions-about-people",
    title: "Урок 27. Вопросы о людях и фактах",
    description: "Спрашивайте имя, профессию, национальность, возраст и состояние собеседника.",
    goal: "задавать простые вопросы о человеке и понимать, какую форму to be выбрать.",
    theoryTitle: "Начинаем разговор с простых вопросов",
    theory: "Вопросы с to be помогают быстро познакомиться: What is your name? Where are you from? How old is he? Is she a teacher? Вопросительное слово подсказывает информацию, которую вы хотите получить: what — что/какое, where — где/откуда, who — кто, how old — сколько лет.\n\nПосле слова who чаще всего идёт is, когда спрашиваем об одном человеке: Who is she? Но с несколькими людьми будет are: Who are they? Сначала скажите вопросительное слово, потом форму to be — и ваш вопрос уже звучит естественно.",
    cards: [
      ["What ___ your name?", "is", ["are", "am"]], ["Where ___ you from?", "are", ["is", "am"]], ["How old ___ he?", "is", ["are", "am"]], ["___ she a teacher?", "Is", ["Are", "Am"]], ["Who ___ they?", "are", ["is", "am"]], ["___ you a student?", "Are", ["Is", "Am"]], ["Where ___ Anna from?", "is", ["are", "am"]], ["What ___ their jobs?", "are", ["is", "am"]], ["How old ___ the children?", "are", ["is", "am"]], ["___ he interested in music?", "Is", ["Are", "Am"]],
    ],
    corrections: [["Исправьте: Where you are from?", "Where are you from?"], ["Исправьте: How old are he?", "How old is he?"]],
    orders: [["Соберите вопрос о профессии.", ["Is", "she", "a", "teacher"]], ["Соберите вопрос о стране.", ["Where", "are", "you", "from"]]],
  }),
  compactLesson({
    slug: "to-be-questions-place-time-weather",
    title: "Урок 28. Вопросы о месте, времени и погоде",
    description: "Спросите, где находится человек, который час и какая погода.",
    goal: "задавать вопросы о местоположении, времени, дне и погоде.",
    theoryTitle: "Where is…? Is it…?",
    theory: "Чтобы спросить о месте, начинайте с Where: Where is the station? Where are my keys? Для времени и погоды используйте it: Is it five o'clock? Is it rainy today? О дне можно спросить What day is it today?\n\nНе забывайте, что один предмет требует is, а несколько — are. Where is the dog? Where are the children? Вопрос короткий, но в нём всегда есть подлежащее: it, the dog, the children или конкретный предмет, о котором вы говорите.",
    cards: [
      ["Where ___ the station?", "is", ["are", "am"]], ["Where ___ my keys?", "are", ["is", "am"]], ["___ it rainy today?", "Is", ["Are", "Am"]], ["___ it five o'clock?", "Is", ["Are", "Am"]], ["Where ___ the children?", "are", ["is", "am"]], ["___ the dog on the sofa?", "Is", ["Are", "Am"]], ["What day ___ it today?", "is", ["are", "am"]], ["Where ___ your parents?", "are", ["is", "am"]], ["___ the cafe near here?", "Is", ["Are", "Am"]], ["Where ___ my bag?", "is", ["are", "am"]],
    ],
    corrections: [["Исправьте: Where is my keys?", "Where are my keys?"], ["Исправьте: Are it rainy today?", "Is it rainy today?"]],
    orders: [["Соберите вопрос о месте.", ["Where", "is", "my", "bag"]], ["Соберите вопрос о погоде.", ["Is", "it", "rainy", "today"]]],
  }),
  compactLesson({
    slug: "to-be-question-conversation-practice",
    title: "Урок 29. Вопросы с to be: мини-диалоги",
    description: "Соедините вопросы, короткие ответы и реальные мини-ситуации перед итогом.",
    goal: "начать и поддержать короткий диалог, используя вопросы с to be.",
    theoryTitle: "Вопрос — ответ — следующий вопрос",
    theory: "В живом диалоге один короткий вопрос ведёт к следующему. Are you new here? — Yes, I am. Where are you from? — I am from Ukraine. Is there a cafe nearby? — Yes, there is. Не нужно строить длинные фразы: важнее выбрать правильную форму и услышать ответ.\n\nПотренируйте три шага: задайте вопрос, дайте короткий ответ, спросите что-то ещё. Общие вопросы начинаются с am/is/are, специальные — с вопросительного слова, вопросы о наличии — с is there или are there. Это уже готовый каркас простого разговора.",
    cards: [
      ["___ you new here?", "Are", ["Is", "Am"]], ["Where ___ you from?", "are", ["is", "am"]], ["___ there a cafe nearby?", "Is", ["Are", "Am"]], ["Are they ready? — Yes, they ___.", "are", ["is", "am"]], ["Is she a doctor? — No, she ___.", "isn't", ["aren't", "am not"]], ["___ it cold today?", "Is", ["Are", "Am"]], ["Where ___ your friends?", "are", ["is", "am"]], ["___ there any buses?", "Are", ["Is", "Am"]], ["What ___ your name?", "is", ["are", "am"]], ["Am I early? — Yes, you ___.", "are", ["is", "am"]],
    ],
    corrections: [["Исправьте: Is you new here?", "Are you new here?"], ["Исправьте: Where are she from?", "Where is she from?"]],
    orders: [["Соберите вопрос о кафе.", ["Is", "there", "a", "cafe", "nearby"]], ["Соберите короткий ответ.", ["Yes", "they", "are"]]],
  }),
];

async function createLessons(tx, moduleId, lessons, firstOrder = 1, prerequisiteLessonId = null) {
  for (let lessonOrder = 0; lessonOrder < lessons.length; lessonOrder += 1) {
    const source = lessons[lessonOrder];
    const lesson = await tx.lesson.create({ data: { moduleId, prerequisiteLessonId, requiredPrerequisiteCompletion: 100, autoUnlockNextLesson: true, slug: source.slug, title: source.title, description: source.description, type: source.type, order: firstOrder + lessonOrder, estimatedDuration: source.estimatedDuration, phraseOfTheDay: source.phraseOfTheDay, motivationalQuote: source.motivationalQuote, learningObjectives: source.learningObjectives, previewText: source.previewText, isPublished: true, isFree: false, ...published() } });
    for (let blockOrder = 0; blockOrder < source.blocks.length; blockOrder += 1) {
      const sourceBlock = source.blocks[blockOrder];
      const block = await tx.lessonBlock.create({ data: { lessonId: lesson.id, type: sourceBlock.type, title: sourceBlock.title, content: sourceBlock.content, order: blockOrder + 1, isRequired: sourceBlock.isRequired, ...published() } });
      for (let exerciseOrder = 0; exerciseOrder < (sourceBlock.exercises ?? []).length; exerciseOrder += 1) await tx.exercise.create({ data: { lessonBlockId: block.id, ...sourceBlock.exercises[exerciseOrder], order: exerciseOrder + 1, ...published() } });
    }
    prerequisiteLessonId = lesson.id;
  }
}

async function createModule(tx, courseId, title, description, order, lessons) {
  const module = await tx.courseModule.create({ data: { courseId, title, description, order, isRequired: true, requiresSequentialCompletion: true, requiredCompletionPercent: 100, isPublished: true, ...published() } });
  await createLessons(tx, module.id, lessons);
}

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: COURSE_SLUG }, select: { id: true, modules: { orderBy: { order: "asc" }, select: { id: true, order: true, title: true, lessons: { orderBy: { order: "asc" }, select: { id: true, order: true } } } } } });
  if (!course) throw new Error(`Course ${COURSE_SLUG} was not found.`);
  const firstModule = course.modules[0];
  if (course.modules.length !== 1 || firstModule.lessons.length !== 4 || firstModule.order !== 1) throw new Error("Expected the untouched four-lesson Module 1 before adding the remaining 26 lessons. No changes made.");
  const negativeModuleLessons = [...NEGATIVE_LESSONS.slice(0, 4), ...NEGATIVE_EXTENSION_LESSONS, NEGATIVE_LESSONS[4]];
  const questionModuleLessons = [...QUESTION_LESSONS.slice(0, 5), ...QUESTION_EXTENSION_LESSONS, QUESTION_LESSONS[5]];
  await prisma.$transaction(async (tx) => {
    await createLessons(tx, firstModule.id, PRESENT_EXTENSION_LESSONS, 5, firstModule.lessons[3].id);
    await tx.courseModule.update({ where: { id: firstModule.id }, data: { title: "Модуль 1. Настоящее время: am, is, are", description: "Десять 20-минутных уроков по формам to be и всем случаям употребления из программы курса." } });
    await createModule(tx, course.id, "Модуль 2. Отрицания с to be", "Десять 20-минутных уроков: am not, isn't, aren't и отрицания с there is / there are.", 2, negativeModuleLessons);
    await createModule(tx, course.id, "Модуль 3. Вопросы с to be", "Десять 20-минутных уроков: общие и специальные вопросы, Is there / Are there, короткие ответы и мини-диалоги.", 3, questionModuleLessons);
    await tx.course.update({ where: { id: course.id }, data: { lessonCount: 30, estimatedDuration: 600, fullDescription: "Практический A1-курс по глаголу to be в Present Simple. В программе 30 последовательных уроков по 20 минут: 10 уроков о формах am, is и are и жизненных ситуациях, 10 уроков об отрицаниях, 10 уроков о вопросах.\n\nПеред каждым уроком есть понятное объяснение, цель и прозрачный максимум учебных очков за практику. Уроки содержат настоящие интерактивные задания: выбор варианта, текстовый ввод, сопоставление, исправление ошибок и сборку предложений. Первый урок остаётся пробным, а прогресс сохраняется после входа." } });
  });
  const [moduleCount, lessonCount, exerciseCount] = await Promise.all([prisma.courseModule.count({ where: { courseId: course.id } }), prisma.lesson.count({ where: { module: { courseId: course.id } } }), prisma.exercise.count({ where: { lessonBlock: { lesson: { module: { courseId: course.id } } } } })]);
  console.log(JSON.stringify({ course: COURSE_SLUG, modules: moduleCount, lessons: lessonCount, exercises: exerciseCount, estimatedMinutes: 600 }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
