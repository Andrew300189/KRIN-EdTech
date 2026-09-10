/*
 * Imports the canonical A1 Present Continuous mastery course. The curriculum
 * uses the platform's existing Course -> Module -> Lesson -> Block -> Exercise
 * hierarchy and only adds new course-owned content; it never overwrites
 * learner progress or another authored course.
 */
try {
  require("dotenv").config({ path: ".env", quiet: true });
} catch (error) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;
}

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");

const COURSE_SLUG = "present-continuous-full-mastery";
const PRACTICE_PER_FRAGMENT = 12;
const LESSON_DURATION_MINUTES = 55;

const SKILLS = [
  ["present-continuous-meaning", "Present Continuous: значення", "Recognise an action, temporary situation or developing process that requires Present Continuous."],
  ["present-continuous-am", "Present Continuous: am", "Choose am accurately with I in affirmative, negative and question forms."],
  ["present-continuous-is", "Present Continuous: is", "Choose is accurately with he, she, it and singular subjects."],
  ["present-continuous-are", "Present Continuous: are", "Choose are accurately with you, we, they and plural subjects."],
  ["present-continuous-full-forms", "Present Continuous: повні форми", "Build complete forms with am, is and are."],
  ["present-continuous-contractions", "Present Continuous: скорочення", "Recognise and use I’m, you’re, he’s, she’s, it’s, we’re and they’re."],
  ["present-continuous-ing", "Present Continuous: форма V-ing", "Use an -ing form after am, is and are."],
  ["present-continuous-drop-e", "Present Continuous: -e перед -ing", "Drop final -e before -ing where the spelling rule requires it."],
  ["present-continuous-ie-ying", "Present Continuous: -ie -> -ying", "Change -ie to -ying in forms such as lie -> lying."],
  ["present-continuous-double-consonant", "Present Continuous: подвоєння приголосної", "Double the final consonant in eligible short stressed verbs before -ing."],
  ["present-continuous-now", "Present Continuous: дія зараз", "Describe an observable action happening at the moment of speaking."],
  ["present-continuous-around-now", "Present Continuous: період навколо теперішнього", "Use Present Continuous for a current project or activity, not only this exact second."],
  ["present-continuous-temporary", "Present Continuous: тимчасова ситуація", "Distinguish a temporary situation from a permanent fact."],
  ["present-continuous-change", "Present Continuous: зміни", "Describe developing trends with getting, becoming, growing and similar forms."],
  ["present-continuous-always", "Present Continuous: always і емоція", "Use always with Present Continuous to express annoyance or emotional repetition."],
  ["present-continuous-negative", "Present Continuous: заперечення", "Build negative Present Continuous sentences accurately."],
  ["present-continuous-not-order", "Present Continuous: позиція not", "Place not after am, is or are and before the -ing form."],
  ["present-continuous-general-question", "Present Continuous: загальне питання", "Move am, is or are before the subject in a yes/no question."],
  ["present-continuous-wh-question", "Present Continuous: спеціальне питання", "Build Wh-questions with accurate auxiliary order."],
  ["present-continuous-subject-question", "Present Continuous: питання до підмета", "Distinguish Who is calling? from Who is Anna calling?"],
  ["present-continuous-short-answer", "Present Continuous: коротка відповідь", "Give full auxiliary forms in positive short answers and natural negative short answers."],
  ["present-continuous-word-order", "Present Continuous: порядок слів", "Build statements, negatives and questions in a clear English word order."],
  ["present-continuous-signal-words", "Present Continuous: маркери", "Use now, right now, at the moment, currently and these days as meaningful context clues."],
  ["present-continuous-vs-simple", "Present Continuous і Present Simple", "Choose between a current/temporary meaning and a regular/permanent meaning."],
  ["present-continuous-stative", "Present Continuous: stative verbs", "Avoid Continuous with common state verbs such as know, want, need and belong."],
  ["present-continuous-changing-meaning", "Present Continuous: зміна значення", "Choose the correct form of think, have, see, feel, be and related verbs from context."],
  ["present-continuous-future-arrangement", "Present Continuous: домовленості", "Use Present Continuous for a personal future arrangement with a time or place."],
  ["present-continuous-future-choice", "Present Continuous, will і going to", "Choose an arrangement, intention or spontaneous decision from its context."],
  ["present-continuous-listening", "Present Continuous: аудіювання", "Recognise continuous forms and contractions in a supported listening transcript."],
  ["present-continuous-picture", "Present Continuous: опис зображення", "Describe a visible current scene with accurate Present Continuous forms."],
  ["present-continuous-production", "Present Continuous: письмо й мовлення", "Use Present Continuous accurately in a connected written or spoken context."],
];

function lesson(slug, title, role, topics) {
  return { slug, title, role, topics: topics.split("|").map((topic) => topic.trim()).filter(Boolean) };
}

const MODULES = [
  {
    slug: "present-continuous-affirmatives",
    title: "Модуль 1. Стверджувальна форма Present Continuous",
    description: "am/is/are + V-ing, дія зараз, тимчасові ситуації, зміни, правопис і емоційне always.",
    lessons: [
      lesson("present-continuous-m1-01-overview", "1. Загальне знайомство з Present Continuous", "OVERVIEW", "Що таке Present Continuous|Основне значення часу|Формула subject + am/is/are + V-ing|Вибір am, is і are|Утворення V-ing|Дія безпосередньо зараз|Дія навколо теперішнього моменту|Тимчасові ситуації та зміни|Signal words|Порядок слів і головні помилки"),
      lesson("present-continuous-m1-02-formula", "2. Формула am/is/are + V-ing", "DEEP_DIVE", "Підмет у реченні|I am|He, she, it is|You, we, they are|Смислове дієслово з -ing|Повна граматична формула|Порядок слів|Вибір допоміжного дієслова|Не можна пропускати am/is/are|Автоматизація конструкції"),
      lesson("present-continuous-m1-03-contractions", "3. Повні та скорочені форми", "DEEP_DIVE", "Повна і скорочена форма|I am -> I’m|You are -> you’re|He is -> he’s|She is -> she’s|It is -> it’s|We are -> we’re|They are -> they’re|Вимова скорочень|Скорочення в діалозі"),
      lesson("present-continuous-m1-04-now", "4. Дії, що відбуваються зараз", "PRACTICE", "Поточна дія|Дія в момент мовлення|Дія, яку можна побачити|Дії вдома|Дії в класі|Дії на вулиці|Дії на роботі|Кілька дій одночасно|Опис зображення|Коментар до ситуації"),
      lesson("present-continuous-m1-05-around-now", "5. Дії навколо теперішнього моменту", "DEEP_DIVE", "Дія в поточний період|Поточний проєкт|Книга, яку читають зараз|Курс, який проходять зараз|Тимчасове робоче завдання|Підготовка до іспиту|Дії цього тижня|Дії цього місяця|Не лише в цю секунду|Контекстна практика"),
      lesson("present-continuous-m1-06-temporary", "6. Тимчасові ситуації", "DEEP_DIVE", "Що таке тимчасова ситуація|Тимчасове місце проживання|Тимчасова робота|Тимчасове навчання|Тимчасове користування річчю|Тимчасові труднощі|For now і at present|Тимчасове чи постійне|Порівняння з Present Simple|Змішана практика"),
      lesson("present-continuous-m1-07-change", "7. Зміни та процеси розвитку", "DEEP_DIVE", "Поняття зміни|Зміни погоди|Зростання або падіння цін|Розвиток технологій|Зміни міста|Зміни здоров’я|Розвиток навички|Getting, becoming, growing|Опис тенденцій|Контекстна практика"),
      lesson("present-continuous-m1-08-ing-spelling", "8. Правила утворення V-ing", "DEEP_DIVE", "Просте додавання -ing|Дієслова на -e|Винятки зі збереженням -e|Дієслова на -ie|Заміна -ie на -ying|Подвоєння кінцевої приголосної|Короткі односкладові дієслова|Багатоскладові дієслова і наголос|Коли приголосна не подвоюється|Змішана орфографічна практика"),
      lesson("present-continuous-m1-09-always", "9. Повторювані дії з always", "DEEP_DIVE", "Always у Present Simple|Always у Present Continuous|Повторювана дратівлива дія|Скарга|Критика|Здивування частою поведінкою|Позиція always|Інтонація та емоція|Звичка чи роздратування|Контекстна практика"),
      lesson("present-continuous-m1-10-final", "10. Підсумок стверджувальної форми", "FINAL", "Вибір am/is/are|Утворення V-ing|Скорочені форми|Дія зараз|Дія навколо теперішнього|Тимчасова ситуація|Процес зміни|Always з емоцією|Signal words|Опис поточної ситуації"),
    ],
  },
  {
    slug: "present-continuous-negatives",
    title: "Модуль 2. Заперечна форма Present Continuous",
    description: "am not, isn’t, aren’t, позиція not та точне розрізнення із Present Simple.",
    lessons: [
      lesson("present-continuous-m2-01-overview", "1. Загальне знайомство із запереченням", "OVERVIEW", "Значення заперечення|Формула subject + am/is/are + not + V-ing|Форма am not|Is not та isn’t|Are not та aren’t|Позиція not|V-ing після заперечення|Заперечення дії зараз|Заперечення тимчасової ситуації|Основні помилки"),
      lesson("present-continuous-m2-02-am-not", "2. Заперечення з am not", "DEEP_DIVE", "Повна форма I am not|Скорочення I’m not|Чому немає стандартного amn’t|Поточна дія|Тимчасова діяльність|Заперечення процесу|Signal words|Повна чи скорочена форма|Вимова|Діалогова практика"),
      lesson("present-continuous-m2-03-isnt", "3. Заперечення з isn’t", "DEEP_DIVE", "He is not|He isn’t|She is not|She isn’t|It is not|It isn’t|Однина з іменником|Незлічувані іменники|Вимова isn’t|Контекстна практика"),
      lesson("present-continuous-m2-04-arent", "4. Заперечення з aren’t", "DEEP_DIVE", "You are not|You aren’t|We are not|We aren’t|They are not|They aren’t|Множина з іменником|Повні та скорочені форми|Вимова aren’t|Контекстна практика"),
      lesson("present-continuous-m2-05-not-order", "5. Позиція not і структура заперечення", "DEEP_DIVE", "Підмет|Форма to be|Місце not|Дієслово з -ing|Додаток|Обставина місця|Обставина часу|Кілька обставин|Відновлення порядку слів|Автоматизація конструкції"),
      lesson("present-continuous-m2-06-negative-now", "6. Заперечення дій, що відбуваються зараз", "PRACTICE", "Повідомлення, що дія не відбувається|Виправлення припущення|Контраст двох дій|Дія вдома|Дія в класі|Дія на роботі|Дія на зображенні|But після заперечення|Ствердження після заперечення|Контекстна практика"),
      lesson("present-continuous-m2-07-negative-temporary", "7. Заперечення тимчасових ситуацій і змін", "DEEP_DIVE", "Тимчасова діяльність|Тимчасове проживання|Тимчасова робота|Дія в поточний період|Заперечення зміни|Заперечення розвитку|Заперечення тенденції|Currently|These days|Змішана практика"),
      lesson("present-continuous-m2-08-isnt-vs-dont", "8. Isn’t/aren’t чи don’t/doesn’t", "DEEP_DIVE", "Структура Present Continuous|Структура Present Simple|Isn’t working і doesn’t work|Поточна дія|Постійна звичка|Тимчасова ситуація|Постійний стан|Вибір за контекстом|Вибір за змістом|Виправлення помилок"),
      lesson("present-continuous-m2-09-dialogues", "9. Заперечення в діалогах і контексті", "PRACTICE", "Негативна відповідь про дію|Виправлення співрозмовника|Пояснення ситуації|Контраст дій|Телефонна розмова|Розмова про роботу|Розмова про навчання|Опис зображення|Складання діалогу|Вільна письмова відповідь"),
      lesson("present-continuous-m2-10-final", "10. Підсумок заперечної форми", "FINAL", "Am not|Isn’t|Aren’t|Позиція not|Збереження V-ing|Поточні дії|Тимчасові ситуації|Процеси змін|Don’t/doesn’t чи isn’t/aren’t|Порядок слів"),
    ],
  },
  {
    slug: "present-continuous-questions",
    title: "Модуль 3. Питальна форма Present Continuous",
    description: "Загальні, спеціальні, альтернативні питання та природні короткі відповіді.",
    lessons: [
      lesson("present-continuous-m3-01-overview", "1. Загальне знайомство з питальною формою", "OVERVIEW", "Типи питань|Формула загального питання|Позиція am/is/are|Форма V-ing|Короткі відповіді|Спеціальні питання|Питальні слова|Питання до підмета|Альтернативні питання|Основні помилки"),
      lesson("present-continuous-m3-02-general-questions", "2. Загальні питання з am/is/are", "DEEP_DIVE", "Перестановка to be|Питання з am|Питання з is|Питання з are|Питання з займенниками|Питання з іменниками|Поточна дія|Інтонація|Перетворення ствердження|Контекстна практика"),
      lesson("present-continuous-m3-03-is-questions", "3. Питання з is", "DEEP_DIVE", "Is he|Is she|Is it|Ім’я людини|Іменник в однині|Незлічуваний іменник|Дії людей|Дії тварин і предметів|Опис зображення|Діалогова практика"),
      lesson("present-continuous-m3-04-are-questions", "4. Питання з are", "DEEP_DIVE", "Are you|Are we|Are they|Іменники у множині|You до однієї людини|You до кількох людей|Питання про групу|Поточні та тимчасові дії|Контекстні відмінності|Діалогова практика"),
      lesson("present-continuous-m3-05-short-answers", "5. Короткі та повні відповіді", "DEEP_DIVE", "Yes, I am|No, I’m not|Yes, he/she/it is|No, he/she/it isn’t|Yes, you/we/they are|No, you/we/they aren’t|Заміна іменника займенником|Повна відповідь|Додаткові деталі|Автоматизація в діалогах"),
      lesson("present-continuous-m3-06-wh-questions", "6. Спеціальні питання", "DEEP_DIVE", "Формула спеціального питання|What|Where|Why|Who|Which|When|How|Порядок слів|Розгорнуті відповіді"),
      lesson("present-continuous-m3-07-subject-questions", "7. Питання до підмета", "DEEP_DIVE", "Що таке підмет|Who is working|Who is speaking|What is happening|Чому після who часто is|Питання до підмета|Питання до додатка|Порівняння двох типів|Типові помилки|Змішана практика"),
      lesson("present-continuous-m3-08-alternative", "8. Альтернативні питання", "PRACTICE", "Значення альтернативи|Or|Вибір між діями|Вибір між предметами|Вибір між місцями|Вибір між людьми|Питання з is|Питання з are|Повні відповіді|Діалогова практика"),
      lesson("present-continuous-m3-09-real-questions", "9. Питання в реальних ситуаціях", "PRACTICE", "Телефонна розмова|Заняття людини|Події вдома|Події в класі|Тимчасова робота|Тимчасове проживання|Питання про зміни|Уточнення|Інтерв’ю|Власний діалог"),
      lesson("present-continuous-m3-10-final", "10. Підсумок питальної форми", "FINAL", "Загальні питання|Вибір am/is/are|Порядок слів|Короткі відповіді|Повні відповіді|Спеціальні питання|Питання до підмета|Питання до додатка|Альтернативні питання|Діалог"),
    ],
  },
  {
    slug: "present-continuous-mixed-contexts",
    title: "Модуль 4. Змішані форми Present Continuous",
    description: "Зіставлення з Present Simple, stative verbs, майбутні домовленості та застосування в контексті.",
    lessons: [
      lesson("present-continuous-m4-01-overview", "1. Огляд усіх форм Present Continuous", "OVERVIEW", "Основні випадки вживання|Стверджувальна форма|Заперечна форма|Загальне питання|Спеціальне питання|Короткі відповіді|Утворення V-ing|Signal words|Типові помилки|Загальна система"),
      lesson("present-continuous-m4-02-transformations", "2. Ствердження -> заперечення -> питання", "DEEP_DIVE", "Ствердження з am|Ствердження з is|Ствердження з are|Додавання not|Скорочене заперечення|Перестановка am/is/are|Загальне питання|Спеціальне питання|Коротка відповідь|Змішані трансформації"),
      lesson("present-continuous-m4-03-vs-simple", "3. Present Continuous і Present Simple: основна різниця", "COMPARISON", "Дія зараз|Регулярна дія|Тимчасова ситуація|Постійна ситуація|Now і every day|At the moment і usually|Різниця у формі дієслова|Вибір допоміжного дієслова|Вибір часу за змістом|Змішана практика"),
      lesson("present-continuous-m4-04-context", "4. Present Continuous і Present Simple у контексті", "COMPARISON", "Постійна робота і дія зараз|Постійне та тимчасове проживання|Регулярне навчання і поточний проєкт|Звичка і тимчасова поведінка|Факт і поточний процес|Розклад і дія|Звичка та always з емоцією|Один контекст із двома часами|Редагування тексту|Змішана практика"),
      lesson("present-continuous-m4-05-stative", "5. Stative verbs", "DEEP_DIVE", "Що таке дієслова стану|Знання та розуміння|Думка|Бажання|Почуття|Володіння|Сприйняття|Чому не Continuous|Правильний Present Simple|Змішана практика"),
      lesson("present-continuous-m4-06-changing-meaning", "6. Дієслова, що змінюють значення", "DEEP_DIVE", "Принцип зміни значення|Think|Have|See|Look|Taste|Smell|Feel|Be|Змішана контекстна практика"),
      lesson("present-continuous-m4-07-future-arrangements", "7. Present Continuous для майбутніх домовленостей", "PRACTICE", "Майбутнє значення|Особиста домовленість|Призначена зустріч|Запланований візит|Подорож із деталями|План на вечір|Час і місце|Домовленість з іншою людиною|Не дія зараз|Діалог про плани"),
      lesson("present-continuous-m4-08-future-forms", "8. Present Continuous, will і be going to", "COMPARISON", "Загальна ідея майбутнього|Домовленість із Present Continuous|Намір із be going to|Спонтанне рішення з will|Прогноз-мнення з will|Прогноз за ознаками з going to|Час, місце і домовленість|Вибір за контекстом|Типові помилки|Змішана практика"),
      lesson("present-continuous-m4-09-integrated-skills", "9. Present Continuous у читанні, аудіюванні, письмі й мовленні", "PRACTICE", "Розпізнавання в тексті|Значення форми|Скорочення на слух|Негативні форми на слух|Відповіді за транскрипцією|Опис зображення|Телефонний діалог|Тимчасова ситуація|Плани й домовленості|Вільна усна і письмова практика"),
      lesson("present-continuous-m4-10-final", "10. Фінальний контроль Present Continuous", "FINAL", "Вибір am/is/are|Утворення V-ing|Ствердження|Заперечення|Загальні питання|Спеціальні питання|Короткі відповіді|Дія зараз і тимчасовість|Зміни, stative verbs і future arrangements|Персональне повторення слабких навичок"),
    ],
  },
];

const ACTIONS = [
  ["I", "am", "read", "reading", "an interesting book", "Я читаю цікаву книжку"],
  ["Anna", "is", "write", "writing", "an email", "Анна пише електронного листа"],
  ["He", "is", "run", "running", "in the park", "Він біжить у парку"],
  ["She", "is", "make", "making", "dinner", "Вона готує вечерю"],
  ["The dog", "is", "lie", "lying", "under the table", "Собака лежить під столом"],
  ["We", "are", "study", "studying", "English this month", "Ми вивчаємо англійську цього місяця"],
  ["They", "are", "play", "playing", "football", "Вони грають у футбол"],
  ["The children", "are", "sit", "sitting", "near the window", "Діти сидять біля вікна"],
  ["You", "are", "work", "working", "from home this week", "Ти працюєш з дому цього тижня"],
  ["My friends", "are", "travel", "travelling", "to Warsaw on Friday", "Мої друзі їдуть до Варшави в п’ятницю"],
];

const SKILL_RULES = {
  "present-continuous-am": ["З I використовуйте am.", "I + am + V-ing"],
  "present-continuous-is": ["З he, she, it та одниною використовуйте is.", "he/she/it + is + V-ing"],
  "present-continuous-are": ["З you, we, they та множиною використовуйте are.", "you/we/they + are + V-ing"],
  "present-continuous-ing": ["Після am, is та are ставте форму дієслова з -ing.", "am/is/are + V-ing"],
  "present-continuous-drop-e": ["У make і write відкиньте кінцеву -e перед -ing.", "make -> making; write -> writing"],
  "present-continuous-ie-ying": ["У lie замініть -ie на -ying.", "lie -> lying"],
  "present-continuous-double-consonant": ["У коротких дієсловах run і sit подвоюйте кінцеву приголосну.", "run -> running; sit -> sitting"],
  "present-continuous-negative": ["Заперечення утворюється через not після am, is або are.", "subject + am/is/are + not + V-ing"],
  "present-continuous-not-order": ["Not стоїть після форми to be, а не перед нею.", "subject + am/is/are + not + V-ing"],
  "present-continuous-general-question": ["У загальному питанні am, is або are переходить перед підмет.", "Am/Is/Are + subject + V-ing?"],
  "present-continuous-wh-question": ["Після питального слова поставте am, is або are, а потім підмет.", "Wh-word + am/is/are + subject + V-ing?"],
  "present-continuous-subject-question": ["У питанні до підмета Who/What є підметом: Who is calling?", "Who/What + is + V-ing?"],
  "present-continuous-short-answer": ["У короткій позитивній відповіді не скорочуйте am, is або are.", "Yes, I am. / Yes, she is. / Yes, they are."],
  "present-continuous-vs-simple": ["Вибирайте Continuous для теперішньої чи тимчасової ситуації, Simple — для звички або факту.", "now/this week -> Continuous; every day/usually -> Simple"],
  "present-continuous-stative": ["Know, want, need, belong і similar state verbs зазвичай не вживають у Continuous.", "I know / She wants / This bag belongs"],
  "present-continuous-changing-meaning": ["Think, have, see та be можуть змінювати значення залежно від контексту.", "I think / I am thinking; has / is having"],
  "present-continuous-future-arrangement": ["Для конкретної домовленості з часом або місцем використовуйте Present Continuous.", "subject + am/is/are + V-ing + future time"],
  "present-continuous-future-choice": ["Домовленість: Continuous; намір: going to; рішення зараз: will.", "I’m meeting / I’m going to / I’ll"],
};

function actionAt(serial) {
  const [subject, be, base, ing, object, translation] = ACTIONS[serial % ACTIONS.length];
  const time = ["now", "right now", "at the moment", "currently", "these days"][Math.floor(serial / ACTIONS.length) % 5];
  return { subject, be, base, ing, object, translation, time };
}

function pronounFor(subject) {
  if (subject === "I") return "I";
  if (["We", "They", "You", "The children", "My friends"].includes(subject)) return subject === "You" ? "you" : "they";
  if (subject === "The dog") return "it";
  if (["Anna", "She"].includes(subject)) return "she";
  return "he";
}

function oppositeBe(be) {
  return be === "am" ? "is" : be === "is" ? "are" : "is";
}

function scenarioFor(skillSlug, serial) {
  const action = actionAt(serial);
  const { subject, be, base, ing, object, translation, time } = action;
  const subjectLower = subject === "I" ? "I" : subject.toLowerCase();
  const positive = `${subject} ${be} ${ing} ${object} ${time}.`;
  const missingBe = `${subject} ${ing} ${object} ${time}.`;
  const wrongBe = `${subject} ${oppositeBe(be)} ${ing} ${object} ${time}.`;
  const missingIng = `${subject} ${be} ${base} ${object} ${time}.`;
  const negative = `${subject} ${be === "am" ? "am not" : `${be}n’t`} ${ing} ${object} ${time}.`;
  const question = `${be[0].toUpperCase()}${be.slice(1)} ${subjectLower} ${ing} ${object} ${time}?`;
  const [rule, formula] = SKILL_RULES[skillSlug] ?? ["Present Continuous допомагає описати дію зараз, тимчасову ситуацію або процес зміни.", "subject + am/is/are + V-ing"];

  if (skillSlug === "present-continuous-drop-e") {
    const forms = [["make", "making", "makeing"], ["write", "writing", "writeing"], ["come", "coming", "comeing"]][serial % 3];
    return { rule, formula, correct: `She is ${forms[1]} dinner now.`, incorrect: `She is ${forms[2]} dinner now.`, prompt: `She is ___ dinner now.`, answer: forms[1], translation: "Вона зараз готує вечерю." };
  }
  if (skillSlug === "present-continuous-ie-ying") {
    return { rule, formula, correct: "The dog is lying under the table.", incorrect: "The dog is lieing under the table.", prompt: "The dog is ___ under the table.", answer: "lying", translation: "Собака лежить під столом." };
  }
  if (skillSlug === "present-continuous-double-consonant") {
    const forms = [["run", "running", "runing"], ["sit", "sitting", "siting"], ["swim", "swimming", "swiming"]][serial % 3];
    return { rule, formula, correct: `He is ${forms[1]} in the park.`, incorrect: `He is ${forms[2]} in the park.`, prompt: `He is ___ in the park.`, answer: forms[1], translation: "Він біжить у парку." };
  }
  if (skillSlug === "present-continuous-negative" || skillSlug === "present-continuous-not-order") {
    const wrong = `${subject} not ${be} ${ing} ${object} ${time}.`;
    return { rule, formula, correct: negative, incorrect: wrong, prompt: `${subject} ___ ${ing} ${object} ${time}.`, answer: be === "am" ? "am not" : `${be}n’t`, translation: `${translation}, але зараз ні.` };
  }
  if (skillSlug === "present-continuous-general-question") {
    return { rule, formula, correct: question, incorrect: `${subject} ${be} ${ing} ${object} ${time}?`, prompt: `___ ${subjectLower} ${ing} ${object} ${time}?`, answer: be[0].toUpperCase() + be.slice(1), translation: `Чи ${translation.toLowerCase()}?` };
  }
  if (skillSlug === "present-continuous-wh-question") {
    return { rule, formula, correct: `What ${be} ${subjectLower} ${ing} ${time}?`, incorrect: `What ${subjectLower} ${be} ${ing} ${time}?`, prompt: `What ___ ${subjectLower} ${ing} ${time}?`, answer: be, translation: `Що ${translation.toLowerCase()}?` };
  }
  if (skillSlug === "present-continuous-subject-question") {
    return { rule, formula, correct: "Who is calling Anna now?", incorrect: "Who are calling Anna now?", prompt: "Who ___ calling Anna now?", answer: "is", translation: "Хто зараз телефонує Анні?" };
  }
  if (skillSlug === "present-continuous-short-answer") {
    const pronoun = pronounFor(subject);
    const answer = be === "am" ? "am" : be;
    return { rule, formula, correct: `Yes, ${pronoun} ${answer}. ${positive}`, incorrect: `Yes, ${pronoun}${answer === "am" ? "’m" : answer === "is" ? "’s" : "’re"}.`, prompt: `Yes, ${pronoun} ___.`, answer, translation: `Так, ${translation.toLowerCase()}.` };
  }
  if (skillSlug === "present-continuous-vs-simple") {
    return { rule, formula, correct: "Tom usually works in the office, but he is working from home this week.", incorrect: "Tom usually is working in the office, but he works from home this week.", prompt: "Tom usually ___ in the office, but he ___ from home this week.", answer: "works; is working", translation: "Том зазвичай працює в офісі, але цього тижня працює з дому." };
  }
  if (skillSlug === "present-continuous-stative") {
    return { rule, formula, correct: "I know the answer.", incorrect: "I am knowing the answer.", prompt: "I ___ the answer.", answer: "know", translation: "Я знаю відповідь." };
  }
  if (skillSlug === "present-continuous-changing-meaning") {
    return { rule, formula, correct: "She is having lunch with her manager.", incorrect: "She has lunch with her manager right now.", prompt: "She ___ lunch with her manager right now.", answer: "is having", translation: "Вона зараз обідає зі своїм менеджером." };
  }
  if (skillSlug === "present-continuous-future-arrangement") {
    return { rule, formula, correct: "We are meeting Anna at the station tomorrow.", incorrect: "We meet Anna at the station tomorrow.", prompt: "We ___ Anna at the station tomorrow.", answer: "are meeting", translation: "Ми зустрічаємо Анну на вокзалі завтра." };
  }
  if (skillSlug === "present-continuous-future-choice") {
    return { rule, formula, correct: "I’ll answer the phone.", incorrect: "I’m answering the phone tomorrow.", prompt: "The phone is ringing. I ___ answer it.", answer: "will", translation: "Телефон дзвонить. Я відповім." };
  }
  if (skillSlug === "present-continuous-change") {
    return { rule, formula, correct: "The weather is getting colder.", incorrect: "The weather gets colder at the moment.", prompt: "The weather is ___ colder.", answer: "getting", translation: "Погода стає холоднішою." };
  }
  if (skillSlug === "present-continuous-always") {
    return { rule, formula, correct: "He is always losing his keys.", incorrect: "He always is losing his keys.", prompt: "He is ___ losing his keys.", answer: "always", translation: "Він постійно губить ключі, і це дратує мовця." };
  }
  if (skillSlug === "present-continuous-temporary") {
    return { rule, formula, correct: "She is living with relatives this month.", incorrect: "She lives with relatives this month.", prompt: "She ___ with relatives this month.", answer: "is living", translation: "Вона живе у родичів цього місяця." };
  }
  if (skillSlug === "present-continuous-around-now") {
    return { rule, formula, correct: "They are developing a new application these days.", incorrect: "They develop a new application these days.", prompt: "They ___ a new application these days.", answer: "are developing", translation: "Вони розробляють новий застосунок у цей період." };
  }
  if (skillSlug === "present-continuous-contractions") {
    const contractedSubject = subject === "I"
      ? "I’m"
      : ["Anna", "He", "She", "The dog"].includes(subject)
        ? `${subject}’s`
        : ["We", "They", "You"].includes(subject)
          ? `${subject}’re`
          : `${subject} ${be}`;
    return { rule, formula, correct: `${contractedSubject} ${ing} ${object} ${time}.`, incorrect: `${subject} ${be} ${base} ${object} ${time}.`, prompt: `${subject} ___ ${ing} ${object} ${time}.`, answer: be === "am" ? "am" : be, translation };
  }
  if (skillSlug === "present-continuous-listening") {
    return { rule, formula, correct: "They’re waiting for the bus at the moment.", incorrect: "They wait for the bus at the moment.", prompt: "Transcript: ‘They’re waiting for the bus at the moment.’ What are they doing?", answer: "waiting for the bus", translation: "Вони чекають на автобус." };
  }
  if (skillSlug === "present-continuous-picture") {
    return { rule, formula, correct: "The children are playing football in the picture.", incorrect: "The children play football in the picture.", prompt: "Picture description: The children ___ football.", answer: "are playing", translation: "На зображенні діти грають у футбол." };
  }
  return { rule, formula, correct: positive, incorrect: skillSlug === "present-continuous-is" || skillSlug === "present-continuous-are" || skillSlug === "present-continuous-am" ? wrongBe : missingBe, prompt: `${subject} ___ ${ing} ${object} ${time}.`, answer: be, translation };
}

function task(id, type, engineKey, variantKey, instruction, question, content, correctAnswer, explanation, hint, skillSlug, alternativeAnswers) {
  return { id, type, engineKey, variantKey, instruction, question, content, correctAnswer, explanation, hint, skillSlug, alternativeAnswers };
}

function makeExercises(fragment, skillSlug, serial) {
  const first = scenarioFor(skillSlug, serial);
  const second = scenarioFor(skillSlug, serial + 13);
  const third = scenarioFor(skillSlug, serial + 29);
  const strip = (value) => value.replace(/[?.!]$/u, "");
  const errorDetails = [{ incorrect: first.incorrect, correction: first.correct, explanation: first.rule }];
  const tokens = strip(first.correct).split(/\s+/u);
  return [
    task("choice", "SINGLE_CHOICE", "single-choice", "FORM_SELECTION", "Оберіть граматично правильну форму.", `Яке речення точно відпрацьовує «${fragment.focus}»?`, { options: [first.correct, first.incorrect, second.incorrect], example: first.correct, errorDetails }, first.correct, first.rule, `Формула: ${first.formula}`, skillSlug),
    task("multi", "MULTIPLE_CHOICE", "multiple-choice", "MULTI_SELECT", "Оберіть усі правильні варіанти.", "Виберіть речення без граматичної помилки.", { options: [first.correct, second.correct, third.incorrect], example: first.correct, errorDetails: [{ incorrect: third.incorrect, correction: third.correct, explanation: third.rule }] }, [first.correct, second.correct], first.rule, "Перевірте допоміжне дієслово, not і форму V-ing.", skillSlug),
    task("matching", "MATCHING", "matching", "PAIR_MATCHING", "Зіставте приклад із його значенням.", "Знайдіть правильну пару.", { left: [first.correct, first.incorrect], right: [first.translation, "Граматична помилка"], example: first.correct }, { [first.correct]: first.translation, [first.incorrect]: "Граматична помилка" }, first.rule, "Шукайте форму, яка відповідає правилу.", skillSlug),
    task("gap", "FILL_IN_THE_BLANK", "fill-in-the-blanks", "GAP_FILL", "Впишіть точну форму.", first.prompt, { acceptedAnswers: [first.answer], ignorePunctuation: true, example: first.correct, errorDetails }, first.answer, first.rule, `Зосередьтеся на фрагменті: ${fragment.focus}.`, skillSlug),
    task("auxiliary", "SINGLE_CHOICE", "single-choice", "AUXILIARY_SELECTION", "Оберіть потрібну форму або частину форми.", second.prompt, { options: [second.answer, "is", "are", "am"].filter((value, index, values) => values.indexOf(value) === index), example: second.correct, errorDetails: [{ incorrect: second.incorrect, correction: second.correct, explanation: second.rule }] }, second.answer, second.rule, "Почніть із підмета та визначте потрібну конструкцію.", skillSlug),
    task("spelling", "TEXT_INPUT", "text-input", "ING_SPELLING", "Напишіть правильну форму без варіантів.", third.prompt, { acceptedAnswers: [third.answer], ignorePunctuation: true, example: third.correct, errorDetails: [{ incorrect: third.incorrect, correction: third.correct, explanation: third.rule }] }, third.answer, third.rule, "Перевірте написання дієслова і -ing.", skillSlug),
    task("builder", "SENTENCE_ORDER", "sentence-builder", "SENTENCE_ORDER", "Розташуйте слова у правильному порядку.", "Побудуйте точне речення Present Continuous.", { options: tokens, preserveOrder: true, example: first.correct, errorDetails }, tokens, first.rule, "Утвердження починайте з підмета; у питанні — з am/is/are.", skillSlug),
    task("correction", "ERROR_CORRECTION", "find-and-correct", "ERROR_CORRECTION", "Виправте речення, не змінюючи його зміст.", first.incorrect, { acceptedAnswers: [first.correct, strip(first.correct)], ignorePunctuation: true, example: first.correct, errorDetails }, first.correct, `Правильно: ${first.correct} ${first.rule}`, "Виправте саме граматичну форму.", skillSlug, [strip(first.correct)]),
    task("transform", "TENSE_TRANSFORMATION", "tense-transformation", "TRANSFORMATION", "Перетворіть речення на потрібну форму.", second.incorrect, { acceptedAnswers: [second.correct, strip(second.correct)], ignorePunctuation: true, example: second.correct, errorDetails: [{ incorrect: second.incorrect, correction: second.correct, explanation: second.rule }] }, second.correct, second.rule, "Не втрачайте am/is/are, not або -ing під час перетворення.", skillSlug, [strip(second.correct)]),
    task("translation", "SENTENCE_TRANSLATION", "translation", "SENTENCE_TRANSLATION", "Перекладіть речення англійською.", third.translation, { acceptedAnswers: [third.correct, strip(third.correct)], ignorePunctuation: true, example: third.correct }, third.correct, third.rule, "Передайте значення ситуації, а не лише окремі слова.", skillSlug, [strip(third.correct)]),
    task("context", "SINGLE_CHOICE", "single-choice", "CONTEXT_SELECTION", "Оберіть форму, що відповідає контексту.", `Контекст: ${first.translation}. Яке речення точне?`, { options: [first.correct, first.incorrect, third.incorrect], example: first.correct, errorDetails }, first.correct, first.rule, "Часові слова допомагають, але головне — значення ситуації.", skillSlug),
    task("production", "TEXT_INPUT", "text-input", "FREE_RESPONSE", "Напишіть правильний варіант самостійно.", first.prompt, { acceptedAnswers: [first.answer], ignorePunctuation: true, example: first.correct }, first.answer, `Правильна відповідь: ${first.answer}. ${first.rule}`, `Формула: ${first.formula}`, skillSlug),
  ];
}

function inferSkill(moduleIndex, focus, fragmentIndex) {
  const text = focus.toLowerCase();
  if (text.includes("am")) return "present-continuous-am";
  if (text.includes(" is") || text.startsWith("is") || text.includes("isn’")) return "present-continuous-is";
  if (text.includes(" are") || text.startsWith("are") || text.includes("aren’")) return "present-continuous-are";
  if (text.includes("скороч") || text.includes("вимова")) return "present-continuous-contractions";
  if (text.includes("-ie") || text.includes("-ying")) return "present-continuous-ie-ying";
  if (text.includes("подвоєн")) return "present-continuous-double-consonant";
  if (text.includes("-e") || text.includes("правопис")) return "present-continuous-drop-e";
  if (text.includes("v-ing") || text.includes("-ing")) return "present-continuous-ing";
  if (text.includes("запереч") || text.includes(" not")) return text.includes("пози") ? "present-continuous-not-order" : "present-continuous-negative";
  if (text.includes("до підмет")) return "present-continuous-subject-question";
  if (text.includes("спеціаль") || text.includes("питальн")) return "present-continuous-wh-question";
  if (text.includes("коротк") || text.includes("відповід")) return "present-continuous-short-answer";
  if (text.includes("альтернатив") || text.includes("загальн") || text.includes("питання")) return "present-continuous-general-question";
  if (text.includes("тимчас") || text.includes("for now") || text.includes("at present")) return "present-continuous-temporary";
  if (text.includes("will") || text.includes("going to") || text.includes("спонтан") || text.includes("намір")) return "present-continuous-future-choice";
  if (text.includes("present simple") || text.includes("звичк") || text.includes("постій")) return "present-continuous-vs-simple";
  if (text.includes("stative") || text.includes("стану")) return "present-continuous-stative";
  if (text.includes("значенн")) return "present-continuous-changing-meaning";
  if (text.includes("домовлен") || text.includes("майбутн") || text.includes("подорож") || text.includes("зустріч")) return "present-continuous-future-arrangement";
  if (text.includes("аудіо") || text.includes("слух")) return "present-continuous-listening";
  if (text.includes("зображ")) return "present-continuous-picture";
  if (text.includes("письм") || text.includes("усн") || text.includes("діалог") || text.includes("контекст")) return "present-continuous-production";
  if (text.includes("змін") || text.includes("тенденц") || text.includes("getting") || text.includes("becoming")) return "present-continuous-change";
  if (text.includes("always")) return "present-continuous-always";
  if (text.includes("навкол") || text.includes("період") || text.includes("тижн") || text.includes("місяц")) return "present-continuous-around-now";
  if (text.includes("зараз") || text.includes("поточн")) return "present-continuous-now";
  if (text.includes("поряд")) return "present-continuous-word-order";
  if (text.includes("signal") || text.includes("маркери")) return "present-continuous-signal-words";
  return fragmentIndex % 2 === 0 ? "present-continuous-meaning" : "present-continuous-full-forms";
}

function blockTypeFor(focus) {
  const text = focus.toLowerCase();
  if (text.includes("аудіо") || text.includes("слух")) return "LISTENING";
  if (text.includes("зображ")) return "IMAGE";
  // Comparison, formula and pronunciation are structured content variants of
  // the existing GRAMMAR block, rather than new enum values or a new player.
  if (text.includes("порівнян") || text.includes("present simple") || text.includes("will") || text.includes("going to") || text.includes("вимова") || text.includes("формула")) return "GRAMMAR";
  return "THEORY";
}

function fragmentBlocks(lessonPlan, moduleIndex, focus, fragmentIndex, offset) {
  const skillSlug = inferSkill(moduleIndex, focus, fragmentIndex);
  const scenario = scenarioFor(skillSlug, moduleIndex * 10_000 + lessonPlan.order * 100 + fragmentIndex);
  const key = `${lessonPlan.slug}-fragment-${fragmentIndex + 1}`;
  const type = blockTypeFor(focus);
  const media = type === "LISTENING"
    ? { transcript: scenario.correct, transcriptTranslation: scenario.translation, accessibleText: scenario.correct, audioRequiredInCms: true }
    : type === "IMAGE"
      ? { alt: "People doing everyday actions in a clear present-time scene.", imagePrompt: scenario.correct, accessibleText: scenario.translation, imageRequiredInCms: true }
      : null;
  return [
    {
      type,
      title: focus,
      content: { text: scenario.rule, formula: scenario.formula, examples: [scenario.correct, scenarioFor(skillSlug, fragmentIndex + 17).correct, scenarioFor(skillSlug, fragmentIndex + 31).correct], translation: scenario.translation, commonMistake: scenario.incorrect, correction: scenario.correct, ...media },
      learningFragmentKey: key,
      isLearningFragment: true,
      requiresTwelveExercises: false,
      order: offset + 1,
      grammarSkillSlugs: [skillSlug],
    },
    {
      type: "EXERCISE",
      title: `Практика: ${focus}`,
      content: { text: "12 різнотипних вправ: вибір, зіставлення, пропуск, правопис, порядок слів, виправлення, трансформація, переклад, контекст і самостійна відповідь.", exerciseCount: PRACTICE_PER_FRAGMENT },
      settings: { adaptiveSkillReview: true, exerciseSequence: "twelve-step" },
      learningFragmentKey: key,
      isLearningFragment: false,
      requiresTwelveExercises: true,
      order: offset + 2,
      grammarSkillSlugs: [skillSlug],
      exercises: makeExercises({ focus }, skillSlug, moduleIndex * 10_000 + lessonPlan.order * 100 + fragmentIndex),
    },
  ];
}

function reviewBlock(lessonPlan, moduleIndex, afterFragment, order) {
  const selected = lessonPlan.topics.slice(afterFragment - 3, afterFragment);
  const skillSlugs = selected.map((focus, index) => inferSkill(moduleIndex, focus, index + afterFragment - 3));
  return {
    type: "REVIEW",
    title: `Міні-повторення: фрагменти ${afterFragment - 2}–${afterFragment}`,
    content: { text: "Поверніться до трьох щойно вивчених правил. Якщо навичка отримала дві помилки поспіль, платформа додасть її до персональної черги повторення.", focuses: selected },
    settings: { reviewAfterFragment: afterFragment, adaptiveSkillReview: true },
    order,
    grammarSkillSlugs: [...new Set(skillSlugs)],
  };
}

function mixedPracticeExercises(lessonPlan, moduleIndex) {
  return Array.from({ length: PRACTICE_PER_FRAGMENT }, (_, index) => {
    const skillSlug = lessonPlan.skillSlugs[index % lessonPlan.skillSlugs.length];
    const fragment = { focus: lessonPlan.topics[index % lessonPlan.topics.length] };
    return makeExercises(fragment, skillSlug, moduleIndex * 50_000 + lessonPlan.order * 1_000 + index * 12)[index];
  });
}

function buildPlan() {
  const skills = SKILLS.map(([slug, title, description], order) => ({ slug, title, description, order: order + 1 }));
  return {
    course: {
      slug: COURSE_SLUG,
      title: "Present Continuous: повне опанування",
      shortDescription: "Повний інтерактивний курс Present Continuous: форма, значення, заперечення, питання, порівняння з Present Simple та майбутні домовленості.",
      fullDescription: "Сорок уроків, чотири модулі, десять малих фрагментів у кожному уроці, 12 вправ після кожного фрагмента та вимірювані навички для персонального повторення.",
      learningOutcomes: ["Утворювати am/is/are + V-ing", "Описувати поточні, тимчасові та змінні ситуації", "Будувати заперечення і питання", "Розрізняти Present Continuous і Present Simple", "Використовувати форму для майбутніх домовленостей"],
      prerequisites: ["Базові англійські займенники", "Базова лексика рівня A1"],
    },
    skills,
    modules: MODULES.map((modulePlan, moduleIndex) => ({
      ...modulePlan,
      order: moduleIndex + 1,
      lessons: modulePlan.lessons.map((lessonPlan, lessonIndex) => {
        const order = lessonIndex + 1;
        const lessonWithOrder = { ...lessonPlan, order };
        const skillSlugs = [...new Set(lessonPlan.topics.map((focus, fragmentIndex) => inferSkill(moduleIndex, focus, fragmentIndex)))];
        const fragments = lessonPlan.topics.flatMap((focus, fragmentIndex) => fragmentBlocks(lessonWithOrder, moduleIndex, focus, fragmentIndex, fragmentIndex * 2));
        const reviewBlocks = [3, 6, 9].map((afterFragment, reviewIndex) => reviewBlock(lessonPlan, moduleIndex, afterFragment, afterFragment * 2 + reviewIndex + 1));
        const finalSkill = skillSlugs.at(-1) ?? "present-continuous-production";
        return {
          ...lessonPlan,
          order,
          estimatedDuration: LESSON_DURATION_MINUTES,
          minimumCompletionScore: lessonPlan.role === "FINAL" ? 75 : 60,
          skillSlugs,
          description: `${lessonPlan.title}. Десять навчальних фрагментів, 120 пояснених вправ, три міні-повторення і підсумкова змішана практика.`,
          learningObjectives: skillSlugs.map((slug) => skills.find((skill) => skill.slug === slug)?.title ?? slug),
          previewText: "10 навчальних фрагментів і 120 вправ із перевіркою та поясненням помилок.",
          blocks: [
            ...fragments,
            ...reviewBlocks,
            {
              type: "EXERCISE",
              title: "Змішана практика наприкінці уроку",
              content: { text: "12 підсумкових вправ на різні навички уроку.", mixedPractice: true },
              learningFragmentKey: `${lessonPlan.slug}-fragment-10`,
              isLearningFragment: false,
              requiresTwelveExercises: true,
              order: 24,
              grammarSkillSlugs: skillSlugs,
              exercises: mixedPracticeExercises({ ...lessonPlan, order, skillSlugs }, moduleIndex),
            },
            {
              type: "REVIEW",
              title: lessonPlan.role === "FINAL" ? "Фінальна перевірка модуля" : "Підсумок уроку й наступний крок",
              content: { text: "Перегляньте правила, приклади та особисті слабкі навички. Після завершення доступний перехід до наступного уроку.", finalSummary: true, nextLessonEnabled: true },
              settings: { finalLessonReview: lessonPlan.role === "FINAL", minimumScore: lessonPlan.role === "FINAL" ? 75 : 60 },
              order: 25,
              grammarSkillSlugs: [finalSkill],
            },
          ].sort((left, right) => left.order - right.order),
        };
      }),
    })),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validatePlan(plan) {
  assert(plan.modules.length === 4, "Present Continuous course must contain exactly four modules.");
  assert(plan.skills.length === 31, "Present Continuous course must define thirty-one measurable skills.");
  const skillSlugs = new Set(plan.skills.map((skill) => skill.slug));
  let lessonCount = 0;
  let blockCount = 0;
  let exerciseCount = 0;
  for (const modulePlan of plan.modules) {
    assert(modulePlan.lessons.length === 10, `${modulePlan.slug} must contain exactly ten lessons.`);
    assert(modulePlan.lessons[0].role === "OVERVIEW", `${modulePlan.slug} must start with an overview.`);
    assert(modulePlan.lessons.at(-1).role === "FINAL", `${modulePlan.slug} must end with a final.`);
    for (const lessonPlan of modulePlan.lessons) {
      lessonCount += 1;
      assert(lessonPlan.topics.length === 10, `${lessonPlan.slug} must have ten learning fragments.`);
      assert(lessonPlan.minimumCompletionScore >= 60, `${lessonPlan.slug} needs a 60% completion threshold.`);
      const fragments = lessonPlan.blocks.filter((block) => block.isLearningFragment);
      assert(fragments.length === 10, `${lessonPlan.slug} must persist ten theory fragments.`);
      for (const block of lessonPlan.blocks) {
        blockCount += 1;
        assert(block.grammarSkillSlugs?.every((slug) => skillSlugs.has(slug)), `${lessonPlan.slug} has an unknown skill link.`);
        if (!block.requiresTwelveExercises) continue;
        assert(block.exercises?.length === PRACTICE_PER_FRAGMENT, `${block.learningFragmentKey} must have exactly twelve exercises.`);
        assert(fragments.some((fragment) => fragment.learningFragmentKey === block.learningFragmentKey), `${block.learningFragmentKey} needs a matching theory fragment.`);
        for (const exercise of block.exercises) {
          exerciseCount += 1;
          assert(exercise.correctAnswer !== undefined && exercise.correctAnswer !== null, `${block.learningFragmentKey} has an answerless exercise.`);
          assert(Boolean(exercise.explanation?.trim()), `${block.learningFragmentKey} has an unexplained exercise.`);
          assert(skillSlugs.has(exercise.skillSlug), `${block.learningFragmentKey} exercise lacks a valid skill.`);
        }
      }
    }
  }
  return { modules: plan.modules.length, lessons: lessonCount, blocks: blockCount, exercises: exerciseCount, skills: plan.skills.length };
}

function contentLifecycle(publish) {
  return publish ? { contentStatus: "PUBLISHED", publishedAt: new Date() } : { contentStatus: "DRAFT", publishedAt: null };
}

function publishableLifecycle(publish) {
  return { isPublished: publish, ...contentLifecycle(publish) };
}

async function importCourse(plan, publish) {
  const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required to import the Present Continuous course.");
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const existing = await prisma.course.findUnique({ where: { slug: COURSE_SLUG }, select: { id: true } });
    if (existing) return { status: "already-exists", courseId: existing.id };
    const [level, category, author] = await Promise.all([
      prisma.languageLevel.findUnique({ where: { code: "A1" }, select: { id: true, contentStatus: true } }),
      prisma.courseCategory.findUnique({ where: { slug: "general-english" }, select: { id: true, contentStatus: true } }),
      prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } }),
    ]);
    if (!level || !category || !author) throw new Error("The A1 level, General English category and a platform author are required before import.");
    if (publish && (level.contentStatus !== "PUBLISHED" || category.contentStatus !== "PUBLISHED")) throw new Error("Publish the A1 level and General English category before this course.");
    const publishableState = publishableLifecycle(publish);
    const contentState = contentLifecycle(publish);
    const course = await prisma.$transaction(async (tx) => {
      const createdCourse = await tx.course.create({
        data: {
          levelId: level.id, categoryId: category.id, slug: plan.course.slug, title: plan.course.title,
          shortDescription: plan.course.shortDescription, fullDescription: plan.course.fullDescription, language: "uk",
          estimatedDuration: plan.modules.reduce((sum, modulePlan) => sum + modulePlan.lessons.length * LESSON_DURATION_MINUTES, 0), lessonCount: 40,
          difficulty: "A1", courseType: "SKILL", accessMode: "FREE", accessPlan: "FREE", firstFreeLessonCount: 40,
          isVisibleInCatalog: true, isVisibleInSearch: true, isVisibleInLevelBlock: true, isVisibleInAcademy: true, isVisibleInStudentDashboard: true,
          legacyLevel: "BEGINNER", instructorId: author.id, createdById: author.id, updatedById: author.id,
          learningOutcomes: plan.course.learningOutcomes, prerequisites: plan.course.prerequisites, ...publishableState,
        },
      });
      await tx.grammarSkill.createMany({ data: plan.skills.map((skill) => ({ ...skill, courseId: createdCourse.id })) });
      const storedSkills = await tx.grammarSkill.findMany({ where: { courseId: createdCourse.id }, select: { id: true, slug: true } });
      const skillIds = new Map(storedSkills.map((skill) => [skill.slug, skill.id]));
      let previousModuleId = null;
      for (const modulePlan of plan.modules) {
        const createdModule = await tx.courseModule.create({ data: { courseId: createdCourse.id, title: modulePlan.title, description: modulePlan.description, order: modulePlan.order, isRequired: true, requiresSequentialCompletion: Boolean(previousModuleId), unlockAfterModuleId: previousModuleId, requiredCompletionPercent: 100, minimumFinalLessonScore: 75, ...publishableState } });
        let previousLessonId = null;
        for (const lessonPlan of modulePlan.lessons) {
          const lessonSkillIds = lessonPlan.skillSlugs.map((slug) => skillIds.get(slug)).filter(Boolean);
          const createdLesson = await tx.lesson.create({ data: { moduleId: createdModule.id, prerequisiteLessonId: previousLessonId, requiredPrerequisiteCompletion: 100, autoUnlockNextLesson: true, slug: lessonPlan.slug, title: lessonPlan.title, description: lessonPlan.description, type: "GRAMMAR", curriculumRole: lessonPlan.role, order: lessonPlan.order, estimatedDuration: lessonPlan.estimatedDuration, minimumCompletionScore: lessonPlan.minimumCompletionScore, learningObjectives: lessonPlan.learningObjectives, previewText: lessonPlan.previewText, isFree: true, grammarSkills: { create: lessonSkillIds.map((grammarSkillId) => ({ grammarSkillId })) }, ...publishableState } });
          for (const blockPlan of lessonPlan.blocks) {
            const blockSkillIds = blockPlan.grammarSkillSlugs.map((slug) => skillIds.get(slug)).filter(Boolean);
            const createdBlock = await tx.lessonBlock.create({ data: { lessonId: createdLesson.id, type: blockPlan.type, title: blockPlan.title, content: blockPlan.content, settings: blockPlan.settings, learningFragmentKey: blockPlan.learningFragmentKey, isLearningFragment: Boolean(blockPlan.isLearningFragment), requiresTwelveExercises: Boolean(blockPlan.requiresTwelveExercises), order: blockPlan.order, isRequired: true, grammarSkills: { create: blockSkillIds.map((grammarSkillId) => ({ grammarSkillId })) }, ...contentState } });
            for (const [exerciseIndex, exercisePlan] of (blockPlan.exercises ?? []).entries()) {
              const grammarSkillId = skillIds.get(exercisePlan.skillSlug);
              if (!grammarSkillId) throw new Error(`Unknown grammar skill in ${lessonPlan.slug}.`);
              await tx.exercise.create({ data: { lessonBlockId: createdBlock.id, type: exercisePlan.type, engineKey: exercisePlan.engineKey, variantKey: exercisePlan.variantKey, instruction: exercisePlan.instruction, question: exercisePlan.question, content: exercisePlan.content, correctAnswer: exercisePlan.correctAnswer, alternativeAnswers: exercisePlan.alternativeAnswers, explanation: exercisePlan.explanation, hint: exercisePlan.hint, hintsEnabled: true, difficulty: 2, basePoints: 2, allowInstantCheck: true, allowExtraExercise: true, order: exerciseIndex + 1, grammarSkills: { create: { grammarSkillId } }, ...contentState } });
            }
          }
          previousLessonId = createdLesson.id;
        }
        previousModuleId = createdModule.id;
      }
      const counts = validatePlan(plan);
      await tx.cmsContentVersion.create({ data: { entityType: "COURSE", entityId: createdCourse.id, version: 1, action: "IMPORTED", snapshot: { import: COURSE_SLUG, publish, counts }, actorId: author.id } });
      await tx.contentAuditLog.create({ data: { actorId: author.id, action: "CMS_PRESENT_CONTINUOUS_COURSE_IMPORTED", entityType: "Course", entityId: createdCourse.id, metadata: { publish, counts } } });
      return createdCourse;
    }, { maxWait: 60_000, timeout: 600_000 });
    const counts = await Promise.all([
      prisma.courseModule.count({ where: { courseId: course.id } }), prisma.lesson.count({ where: { module: { courseId: course.id } } }),
      prisma.lessonBlock.count({ where: { lesson: { module: { courseId: course.id } } } }), prisma.exercise.count({ where: { lessonBlock: { lesson: { module: { courseId: course.id } } } } }), prisma.grammarSkill.count({ where: { courseId: course.id } }),
    ]);
    const expected = validatePlan(plan);
    assert(counts.every((count, index) => count === [expected.modules, expected.lessons, expected.blocks, expected.exercises, expected.skills][index]), "The stored Present Continuous course does not match the validated plan.");
    return { status: publish ? "published" : "draft-imported", courseId: course.id, counts: expected };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const plan = buildPlan();
  const counts = validatePlan(plan);
  if (process.argv.includes("--validate")) {
    console.log(JSON.stringify({ status: "valid", course: COURSE_SLUG, ...counts }));
    return;
  }
  console.log(JSON.stringify(await importCourse(plan, process.argv.includes("--publish"))));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { buildPlan, validatePlan };
