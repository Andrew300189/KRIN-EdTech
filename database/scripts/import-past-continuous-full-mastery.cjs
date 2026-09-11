/* Imports the authored A1 Past Continuous mastery course without changing learner data. */
const { createContinuousCourseImporter } = require("./continuous-course-importer.cjs");

const COURSE_SLUG = "past-continuous-full-mastery";

function lesson(slug, title, role, topics) {
  return { slug, title, role, topics: topics.split("|").map((topic) => topic.trim()).filter(Boolean) };
}

const SKILLS = [
  ["past-continuous-meaning", "Past Continuous: значення", "Розпізнавати процес, що відбувався в минулому."],
  ["past-continuous-formula", "Past Continuous: формула", "Будувати was/were + V-ing."],
  ["past-continuous-was", "Past Continuous: was", "Обирати was з I та одниною."],
  ["past-continuous-were", "Past Continuous: were", "Обирати were з you, we, they та множиною."],
  ["past-continuous-ing", "Past Continuous: форма V-ing", "Використовувати V-ing після was або were."],
  ["past-continuous-drop-e", "Past Continuous: -e перед -ing", "Прибирати кінцеву -e, коли цього вимагає правило."],
  ["past-continuous-ie-ying", "Past Continuous: -ie → -ying", "Змінювати -ie на -ying."],
  ["past-continuous-double-consonant", "Past Continuous: подвоєння приголосної", "Подвоювати кінцеву приголосну у відповідних коротких дієсловах."],
  ["past-continuous-word-order", "Past Continuous: порядок слів", "Будувати ствердження в точному порядку."],
  ["past-continuous-moment", "Past Continuous: момент у минулому", "Описувати процес у конкретний момент минулого."],
  ["past-continuous-period", "Past Continuous: тривалість у минулому", "Описувати процес, що тривав протягом періоду."],
  ["past-continuous-background", "Past Continuous: фоновий процес", "Створювати фон для основної минулої події."],
  ["past-continuous-simultaneous", "Past Continuous: паралельні дії", "Описувати два процеси, що тривали одночасно."],
  ["past-continuous-signal-words", "Past Continuous: часові вказівники", "Використовувати at that moment, while, as та інші вказівники за змістом."],
  ["past-continuous-negative", "Past Continuous: заперечення", "Будувати was not/were not + V-ing."],
  ["past-continuous-wasnt", "Past Continuous: wasn’t", "Уживати wasn’t з одниною та I."],
  ["past-continuous-werent", "Past Continuous: weren’t", "Уживати weren’t з множиною та you."],
  ["past-continuous-not-order", "Past Continuous: позиція not", "Ставити not після was/were."],
  ["past-continuous-negative-vs-simple", "Past Continuous і Past Simple: заперечення", "Розрізняти wasn’t/weren’t doing та didn’t do."],
  ["past-continuous-general-question", "Past Continuous: загальне питання", "Будувати питання з Was/Were перед підметом."],
  ["past-continuous-wh-question", "Past Continuous: спеціальне питання", "Будувати Wh-питання з правильним порядком слів."],
  ["past-continuous-subject-question", "Past Continuous: питання до підмета", "Розрізняти питання до підмета і до додатка."],
  ["past-continuous-short-answer", "Past Continuous: коротка відповідь", "Давати точні короткі відповіді з was/were."],
  ["past-continuous-alternative-question", "Past Continuous: альтернативне питання", "Будувати питання з or."],
  ["past-continuous-question-order", "Past Continuous: порядок слів у питаннях", "Не ставити was/were після підмета у загальному питанні."],
  ["past-continuous-vs-simple", "Past Continuous і Past Simple", "Розрізняти процес і завершену подію."],
  ["past-continuous-interruption", "Past Continuous: перервана дія", "Поєднувати фоновий процес із короткою подією."],
  ["past-continuous-when-while-as", "Past Continuous: when, while, as", "Добирати сполучник до відношення двох дій."],
  ["past-continuous-stative", "Past Continuous: stative verbs", "Не використовувати звичайні дієслова стану в Continuous."],
  ["past-continuous-changing-meaning", "Past Continuous: зміна значення", "Визначати процесне значення think, have, see та feel у контексті."],
  ["past-continuous-listening-production", "Past Continuous: аудіювання, читання, письмо й мовлення", "Розпізнавати та самостійно вживати форму у зв’язному контексті."],
];

const MODULES = [
  {
    slug: "past-continuous-affirmatives",
    title: "Модуль 1. Стверджувальна форма Past Continuous",
    description: "was/were + V-ing, процеси в минулому, фон, паралельні дії та правопис.",
    lessons: [
      lesson("past-continuous-m1-01-overview", "1. Загальне знайомство з Past Continuous", "OVERVIEW", "Що таке Past Continuous|Основне значення часу|Формула subject + was/were + V-ing|Вибір was або were|Утворення V-ing|Дія в певний момент минулого|Фоновий процес|Одночасні дії|Signal words і зв’язок із Past Simple|Порядок слів і головні помилки"),
      lesson("past-continuous-m1-02-formula", "2. Формула was/were + V-ing", "DEEP_DIVE", "Підмет|I was|He, she, it was|You, we, they were|Смислове дієслово з -ing|Повна формула|Додаток|Місце і час|Порядок слів|Автоматизація конструкції"),
      lesson("past-continuous-m1-03-was-were", "3. Вибір між was і were", "DEEP_DIVE", "Was з I|Was з he|Was з she|Was з it|Were з you|Were з we|Were з they|Однина з іменником|Множина з іменником|Змішана практика"),
      lesson("past-continuous-m1-04-moment", "4. Процес у конкретний момент минулого", "PRACTICE", "Поняття процесу|At five o’clock|At midnight|At that moment|This time yesterday|Конкретний день|Питання про момент|Процес чи результат|Часова лінія|Контекстна практика"),
      lesson("past-continuous-m1-05-period", "5. Процес протягом минулого періоду", "DEEP_DIVE", "Процес протягом періоду|All morning|All day|All evening|Кілька годин|Навчання|Робота над проєктом|Подорож або очікування|Значення тривалості|Змішана практика"),
      lesson("past-continuous-m1-06-background", "6. Фон для іншої події", "DEEP_DIVE", "Що таке фоновий процес|Погода|Місце події|Дії людей на фоні|Початок історії|Тривалий процес|Основна подія|Зв’язок із Past Simple|Описовий абзац|Контекстна практика"),
      lesson("past-continuous-m1-07-simultaneous", "7. Два одночасні процеси", "DEEP_DIVE", "Одночасні процеси|Дії однієї людини|Дії різних людей|While|As|Паралельні процеси|Порядок частин|Кома на початку|Типові помилки|Контекстна практика"),
      lesson("past-continuous-m1-08-ing", "8. Правила утворення V-ing", "DEEP_DIVE", "Просте додавання -ing|Дієслова на -e|Винятки зі збереженням -e|Дієслова на -ie|Заміна -ie на -ying|Подвоєння приголосної|Короткі дієслова|Наголос у довших дієсловах|Форми-винятки|Змішана орфографічна практика"),
      lesson("past-continuous-m1-09-signal-words", "9. Signal words і часові вказівники", "DEEP_DIVE", "At that moment|At seven yesterday|This time yesterday|All morning|All evening|While|As|When|Позиція вказівників|Вибір часу за контекстом"),
      lesson("past-continuous-m1-10-final", "10. Підсумок стверджувальної форми", "FINAL", "Формула was/were + V-ing|Вибір was/were|Утворення V-ing|Конкретний момент|Тривалість|Фоновий процес|Одночасні дії|When while as|Signal words|Зв’язна історія"),
    ],
  },
  {
    slug: "past-continuous-negatives",
    title: "Модуль 2. Заперечна форма Past Continuous",
    description: "was not/wasn’t, were not/weren’t, позиція not і контраст із Past Simple.",
    lessons: [
      lesson("past-continuous-m2-01-overview", "1. Загальне знайомство із запереченням", "OVERVIEW", "Значення заперечення|Формула заперечення|Was not|Wasn’t|Were not|Weren’t|Позиція not|Збереження V-ing|Заперечення процесу|Основні помилки"),
      lesson("past-continuous-m2-02-wasnt", "2. Форми was not і wasn’t", "DEEP_DIVE", "I was not|I wasn’t|He was not|He wasn’t|She wasn’t|It wasn’t|Однина з іменником|Повна і скорочена форма|Вимова wasn’t|Діалогова практика"),
      lesson("past-continuous-m2-03-werent", "3. Форми were not і weren’t", "DEEP_DIVE", "You were not|You weren’t|We were not|We weren’t|They were not|They weren’t|Множина з іменником|Повна і скорочена форма|Вимова weren’t|Контекстна практика"),
      lesson("past-continuous-m2-04-not-order", "4. Позиція not і порядок слів", "DEEP_DIVE", "Підмет|Was або were|Позиція not|V-ing|Додаток|Місце|Час|Повна форма|Скорочена форма|Автоматизація"),
      lesson("past-continuous-m2-05-moment", "5. Заперечення в конкретний момент минулого", "PRACTICE", "Що не відбувалося|At five o’clock|At that moment|This time yesterday|Виправлення припущення|Контраст двох дій|Дім|Робота або навчання|Контекст|Міні-діалоги"),
      lesson("past-continuous-m2-06-contrast", "6. Що відбувалося, а що — ні", "DEEP_DIVE", "Контраст процесів|But|Одна людина|Дві людини|Фоновий процес|Дії в кімнаті|Дії на вулиці|Одночасність|Власні приклади|Контекстна практика"),
      lesson("past-continuous-m2-07-background", "7. Заперечення фонових і паралельних дій", "DEEP_DIVE", "Фоновий процес|Не фонова дія|While у запереченні|As у запереченні|Дві дії|Контраст фону|Початок історії|Опис ситуації|Типові помилки|Змішана практика"),
      lesson("past-continuous-m2-08-vs-simple", "8. Wasn’t/weren’t doing чи didn’t do", "DEEP_DIVE", "Процес у минулому|Завершена дія|Wasn’t doing|Didn’t do|At that moment|Yesterday|Значення ситуації|Пари прикладів|Типові помилки|Виправлення"),
      lesson("past-continuous-m2-09-dialogues", "9. Заперечення в діалогах і розповідях", "PRACTICE", "Уточнення факту|Виправлення співрозмовника|Телефонна розмова|Робота|Навчання|Подорож|Історія|Контраст подій|Власний діалог|Вільна відповідь"),
      lesson("past-continuous-m2-10-final", "10. Підсумок заперечної форми", "FINAL", "Was not|Wasn’t|Were not|Weren’t|Позиція not|V-ing|Момент у минулому|Контраст|Past Simple чи Continuous|Зв’язний контекст"),
    ],
  },
  {
    slug: "past-continuous-questions",
    title: "Модуль 3. Питальна форма Past Continuous",
    description: "Загальні, спеціальні й альтернативні питання, відповіді та розмовна практика.",
    lessons: [
      lesson("past-continuous-m3-01-overview", "1. Загальне знайомство з питаннями", "OVERVIEW", "Типи питань|Формула загального питання|Was перед підметом|Were перед підметом|V-ing|Короткі відповіді|Спеціальні питання|Питання до підмета|Альтернативні питання|Основні помилки"),
      lesson("past-continuous-m3-02-was-questions", "2. Загальні питання з was", "DEEP_DIVE", "Was I|Was he|Was she|Was it|Однина з іменником|Процес у моменті|Порядок слів|Інтонація|Перетворення ствердження|Контекстна практика"),
      lesson("past-continuous-m3-03-were-questions", "3. Загальні питання з were", "DEEP_DIVE", "Were you|Were we|Were they|Множина з іменником|You для однієї людини|Питання про групу|Місце і час|Порядок слів|Інтонація|Діалогова практика"),
      lesson("past-continuous-m3-04-order", "4. Порядок слів у загальному питанні", "DEEP_DIVE", "Was/were на початку|Підмет|V-ing|Додаток|Обставина місця|Обставина часу|Повне питання|Типові перестановки|Відновлення порядку|Автоматизація"),
      lesson("past-continuous-m3-05-answers", "5. Короткі та повні відповіді", "DEEP_DIVE", "Yes I was|No I wasn’t|Yes he was|No she wasn’t|Yes we were|No they weren’t|Заміна іменника займенником|Повна відповідь|Деталі|Діалоги"),
      lesson("past-continuous-m3-06-wh", "6. Спеціальні питання", "DEEP_DIVE", "Формула Wh-питання|What|Where|Why|When|Who|Which|How|Порядок слів|Розгорнута відповідь"),
      lesson("past-continuous-m3-07-subject", "7. Питання до підмета", "DEEP_DIVE", "Що таке підмет|Who was working|Who were talking|What was happening|Питання до підмета|Питання до додатка|Порівняння|Типові помилки|Контекст|Змішана практика"),
      lesson("past-continuous-m3-08-alternative", "8. Альтернативні питання", "PRACTICE", "Значення or|Вибір між діями|Вибір між людьми|Вибір між місцями|Питання з was|Питання з were|Повна відповідь|Коротка відповідь|Діалог|Контекстна практика"),
      lesson("past-continuous-m3-09-conversations", "9. Питання в розмовах про минуле", "PRACTICE", "Уточнення моменту|Телефонна розмова|Подія вдома|Подія на роботі|Подорож|Інтерв’ю|Питання про фон|Питання про дві дії|Власний діалог|Вільна відповідь"),
      lesson("past-continuous-m3-10-final", "10. Підсумок питальної форми", "FINAL", "Was/were у питаннях|Порядок слів|V-ing|Короткі відповіді|Wh-питання|Питання до підмета|Альтернативи|Контекст|Діалог|Підсумкова практика"),
    ],
  },
  {
    slug: "past-continuous-mixed",
    title: "Модуль 4. Змішані форми Past Continuous",
    description: "Усі форми, Past Simple, when/while/as, stative verbs і застосування в реальному контексті.",
    lessons: [
      lesson("past-continuous-m4-01-overview", "1. Огляд усіх форм Past Continuous", "OVERVIEW", "Ствердження|Заперечення|Загальне питання|Спеціальне питання|Was і were|V-ing|Порядок слів|Короткі відповіді|Signal words|Змішане застосування"),
      lesson("past-continuous-m4-02-transformations", "2. Ствердження → заперечення → питання", "DEEP_DIVE", "Ствердження як основа|Заперечення|Загальне питання|Wh-питання|Was|Were|V-ing|Короткі відповіді|Порядок слів|Змішані трансформації"),
      lesson("past-continuous-m4-03-vs-simple", "3. Past Continuous і Past Simple", "DEEP_DIVE", "Процес|Завершена подія|Фон|Основна подія|At that moment|Yesterday|Пари прикладів|Значення ситуації|Типові помилки|Контекстна практика"),
      lesson("past-continuous-m4-04-interruption", "4. Перервана дія", "DEEP_DIVE", "Тривалий процес|Коротка подія|When|Past Continuous як фон|Past Simple як подія|Порядок частин|Кома|Телефонний дзвінок|Несподівана подія|Власні приклади"),
      lesson("past-continuous-m4-05-while", "5. Одночасні дії з while", "DEEP_DIVE", "While|Два процеси|Одна людина|Дві людини|Початок речення|Кінець речення|Кома|Контраст|Типові помилки|Контекстна практика"),
      lesson("past-continuous-m4-06-connectors", "6. When, while і as", "DEEP_DIVE", "When для події|While для процесу|As для паралельності|Значення сполучників|Порядок частин|Фон і подія|Два процеси|Типові помилки|Вибір сполучника|Змішана практика"),
      lesson("past-continuous-m4-07-stative", "7. Stative verbs у минулому", "DEEP_DIVE", "Що таке stative verbs|Know|Want|Need|Believe|Understand|Belong|Почуття і стани|Виняткові значення|Типові помилки"),
      lesson("past-continuous-m4-08-meaning", "8. Дієслова зі зміною значення", "DEEP_DIVE", "Think|Have|See|Feel|Be|Активне значення|Значення стану|Пари речень|Типові помилки|Змішана практика"),
      lesson("past-continuous-m4-09-production", "9. Читання, аудіювання, письмо й мовлення", "PRACTICE", "Читання історії|Аудіо з транскриптом|Фонові дії|Перервані дії|Одночасні процеси|Запитання до тексту|Опис ситуації|Письмова історія|Усний переказ|Саморедагування"),
      lesson("past-continuous-m4-10-course-final", "10. Фінальний контроль Past Continuous", "FINAL", "Формула|Was і were|V-ing|Ствердження|Заперечення|Питання|Past Simple і Continuous|When while as|Stative verbs|Фінальна історія"),
    ],
  },
];

const ACTIONS = [
  ["I", "was", "read", "reading", "a book", "Я читала книжку"],
  ["Anna", "was", "cook", "cooking", "dinner", "Анна готувала вечерю"],
  ["He", "was", "wait", "waiting", "for the bus", "Він чекав на автобус"],
  ["The dog", "was", "sleep", "sleeping", "under the table", "Собака спала під столом"],
  ["We", "were", "work", "working", "on a project", "Ми працювали над проєктом"],
  ["They", "were", "play", "playing", "football", "Вони грали у футбол"],
  ["The children", "were", "write", "writing", "a story", "Діти писали історію"],
  ["My friends", "were", "travel", "travelling", "to Lviv", "Мої друзі подорожували до Львова"],
];

const RULES = {
  "past-continuous-meaning": ["Past Continuous показує дію, яка була в процесі у певний момент минулого.", "subject + was/were + V-ing"],
  "past-continuous-formula": ["Після підмета потрібні was або were, а далі — V-ing.", "subject + was/were + V-ing"],
  "past-continuous-was": ["З I, he, she, it та одниною використовуйте was.", "I/he/she/it + was + V-ing"],
  "past-continuous-were": ["З you, we, they та множиною використовуйте were.", "you/we/they + were + V-ing"],
  "past-continuous-ing": ["Після was/were смислове дієслово має форму V-ing.", "was/were + V-ing"],
  "past-continuous-negative": ["У запереченні not стоїть після was/were, а V-ing не змінюється.", "subject + was/were not + V-ing"],
  "past-continuous-not-order": ["Не ставте not перед was/were: його місце після допоміжного дієслова.", "subject + was/were + not + V-ing"],
  "past-continuous-general-question": ["У загальному питанні Was/Were переходить перед підметом.", "Was/Were + subject + V-ing?"],
  "past-continuous-wh-question": ["У спеціальному питанні після Wh-слова ставте was/were і підмет.", "Wh-word + was/were + subject + V-ing?"],
  "past-continuous-vs-simple": ["Past Continuous описує процес, а Past Simple — завершену або коротку подію.", "was/were + V-ing + when + Past Simple"],
  "past-continuous-interruption": ["Процес використовуйте в Past Continuous, подію, яка його перервала, — у Past Simple.", "was/were + V-ing when + V2"],
  "past-continuous-when-while-as": ["While і as часто вводять процес; when часто вводить подію, що сталася під час процесу.", "while/as + Past Continuous; when + Past Simple"],
  "past-continuous-stative": ["Know, want, need та believe зазвичай виражають стан, а не процес.", "I knew / I wanted — not was knowing/wanting"],
};

function actionAt(serial) {
  const [subject, be, base, ing, object, translation] = ACTIONS[serial % ACTIONS.length];
  const time = ["at seven yesterday", "at that moment", "this time yesterday", "all evening", "when the phone rang"][Math.floor(serial / ACTIONS.length) % 5];
  return { subject, be, base, ing, object, translation, time };
}

function pronounFor(subject) {
  if (subject === "I") return "I";
  if (["We", "They", "The children", "My friends"].includes(subject)) return "they";
  if (subject === "The dog") return "it";
  if (subject === "Anna") return "she";
  return "he";
}

function makeScenario(skillSlug, serial) {
  const action = actionAt(serial);
  const { subject, be, base, ing, object, translation, time } = action;
  const subjectLower = subject === "I" ? "I" : subject.toLowerCase();
  const positive = `${subject} ${be} ${ing} ${object} ${time}.`;
  const missingBe = `${subject} ${ing} ${object} ${time}.`;
  const wrongBe = `${subject} ${be === "was" ? "were" : "was"} ${ing} ${object} ${time}.`;
  const missingIng = `${subject} ${be} ${base} ${object} ${time}.`;
  const negativeBe = be === "was" ? "wasn’t" : "weren’t";
  const negative = `${subject} ${negativeBe} ${ing} ${object} ${time}.`;
  const question = `${be[0].toUpperCase()}${be.slice(1)} ${subjectLower} ${ing} ${object} ${time}?`;
  const [rule, formula] = RULES[skillSlug] ?? ["Побудуйте Past Continuous за значенням ситуації: процес у минулому потребує was/were + V-ing.", "subject + was/were + V-ing"];

  if (skillSlug === "past-continuous-drop-e") {
    const [baseForm, correctForm, wrongForm] = [["make", "making", "makeing"], ["write", "writing", "writeing"], ["come", "coming", "comeing"]][serial % 3];
    return { rule, formula, correct: `She was ${correctForm} dinner at six.`, incorrect: `She was ${wrongForm} dinner at six.`, prompt: `She was ___ dinner at six.`, answer: correctForm, translation: "Вона готувала вечерю о шостій." };
  }
  if (skillSlug === "past-continuous-ie-ying") return { rule, formula, correct: "The dog was lying under the table.", incorrect: "The dog was lieing under the table.", prompt: "The dog was ___ under the table.", answer: "lying", translation: "Собака лежала під столом." };
  if (skillSlug === "past-continuous-double-consonant") {
    const [baseForm, correctForm, wrongForm] = [["run", "running", "runing"], ["sit", "sitting", "siting"], ["swim", "swimming", "swiming"]][serial % 3];
    return { rule, formula, correct: `He was ${correctForm} in the park.`, incorrect: `He was ${wrongForm} in the park.`, prompt: `He was ___ in the park.`, answer: correctForm, translation: "Він біг у парку." };
  }
  if (["past-continuous-negative", "past-continuous-wasnt", "past-continuous-werent", "past-continuous-not-order"].includes(skillSlug)) return { rule, formula, correct: negative, incorrect: `${subject} not ${be} ${ing} ${object} ${time}.`, prompt: `${subject} ___ ${ing} ${object} ${time}.`, answer: negativeBe, translation: `${translation}, але цього не було.` };
  if (skillSlug === "past-continuous-negative-vs-simple") return { rule, formula, correct: "She wasn’t working at six; she didn’t work that day.", incorrect: "She didn’t working at six; she wasn’t work that day.", prompt: "She ___ at six; she ___ that day.", answer: "wasn’t working; didn’t work", translation: "Вона не працювала о шостій; того дня вона не працювала." };
  if (["past-continuous-general-question", "past-continuous-question-order"].includes(skillSlug)) return { rule, formula, correct: question, incorrect: `${subject} ${be} ${ing} ${object} ${time}?`, prompt: `___ ${subjectLower} ${ing} ${object} ${time}?`, answer: be[0].toUpperCase() + be.slice(1), translation: `Чи ${translation.toLowerCase()}?` };
  if (skillSlug === "past-continuous-wh-question") return { rule, formula, correct: `What ${be} ${subjectLower} ${ing} ${time}?`, incorrect: `What ${subjectLower} ${be} ${ing} ${time}?`, prompt: `What ___ ${subjectLower} ${ing} ${time}?`, answer: be, translation: `Що ${translation.toLowerCase()}?` };
  if (skillSlug === "past-continuous-subject-question") return { rule, formula, correct: "Who was calling Anna at that moment?", incorrect: "Who were calling Anna at that moment?", prompt: "Who ___ calling Anna at that moment?", answer: "was", translation: "Хто телефонував Анні в той момент?" };
  if (skillSlug === "past-continuous-short-answer") {
    const pronoun = pronounFor(subject);
    return { rule, formula, correct: `Yes, ${pronoun} ${be}. ${positive}`, incorrect: `Yes, ${pronoun} ${ing}.`, prompt: `Yes, ${pronoun} ___.`, answer: be, translation: `Так, ${translation.toLowerCase()}.` };
  }
  if (skillSlug === "past-continuous-alternative-question") return { rule, formula, correct: `Was ${subjectLower} ${ing} ${object} or resting at home?`, incorrect: `Was ${subjectLower} ${ing} ${object} or rested at home?`, prompt: `Was ${subjectLower} ${ing} ${object} ___ resting at home?`, answer: "or", translation: `Чи ${translation.toLowerCase()}, чи відпочивав/відпочивала вдома?` };
  if (skillSlug === "past-continuous-vs-simple") return { rule, formula, correct: "I was reading when the phone rang.", incorrect: "I read when the phone was ringing.", prompt: "I ___ when the phone rang.", answer: "was reading", translation: "Я читала, коли задзвонив телефон." };
  if (skillSlug === "past-continuous-interruption") return { rule, formula, correct: "They were walking home when it started to rain.", incorrect: "They walked home when it was starting to rain.", prompt: "They ___ home when it started to rain.", answer: "were walking", translation: "Вони йшли додому, коли почався дощ." };
  if (skillSlug === "past-continuous-simultaneous" || skillSlug === "past-continuous-when-while-as") return { rule, formula, correct: "While Anna was cooking, Tom was setting the table.", incorrect: "While Anna cooked, Tom was set the table.", prompt: "While Anna was cooking, Tom ___ the table.", answer: "was setting", translation: "Поки Анна готувала, Том накривав на стіл." };
  if (skillSlug === "past-continuous-stative") return { rule, formula, correct: "I knew the answer at that moment.", incorrect: "I was knowing the answer at that moment.", prompt: "I ___ the answer at that moment.", answer: "knew", translation: "Я знала відповідь у той момент." };
  if (skillSlug === "past-continuous-changing-meaning") return { rule, formula, correct: "She was having lunch with her manager.", incorrect: "She had lunch with her manager at that moment.", prompt: "She ___ lunch with her manager at that moment.", answer: "was having", translation: "Вона обідала зі своїм менеджером." };
  if (skillSlug === "past-continuous-listening-production") return { rule, formula, correct: "They were waiting for the bus at the moment.", incorrect: "They waited for the bus at the moment.", prompt: "Transcript: ‘They were waiting for the bus.’ What were they doing?", answer: "were waiting", translation: "Вони чекали на автобус." };
  return { rule, formula, correct: positive, incorrect: skillSlug === "past-continuous-was" || skillSlug === "past-continuous-were" ? wrongBe : skillSlug === "past-continuous-ing" ? missingIng : missingBe, prompt: `${subject} ___ ${ing} ${object} ${time}.`, answer: be, translation };
}

function inferSkill(_moduleIndex, focus, fragmentIndex) {
  const text = focus.toLowerCase();
  if (text.includes("запереч") || text.includes("wasn’") || text.includes("weren’")) return text.includes("past simple") || text.includes("didn’") ? "past-continuous-negative-vs-simple" : text.includes("пози") ? "past-continuous-not-order" : text.includes("wasn") ? "past-continuous-wasnt" : text.includes("weren") ? "past-continuous-werent" : "past-continuous-negative";
  if (text.includes("до підмет")) return "past-continuous-subject-question";
  if (text.includes("альтернатив")) return "past-continuous-alternative-question";
  if (text.includes("коротк") || text.includes("відповід")) return "past-continuous-short-answer";
  if (text.includes("спеціаль") || text.includes("wh-")) return "past-continuous-wh-question";
  if (text.includes("питання") || text.includes("порядок слів у загальному")) return "past-continuous-general-question";
  if (text.includes("-ie") || text.includes("-ying")) return "past-continuous-ie-ying";
  if (text.includes("подвоєн")) return "past-continuous-double-consonant";
  if (text.includes("-e") || text.includes("орфограф")) return "past-continuous-drop-e";
  if (text.includes("v-ing") || text.includes("-ing")) return "past-continuous-ing";
  if (text.includes("while") || text.includes(" as") || text.includes("сполучник")) return "past-continuous-when-while-as";
  if (text.includes("одночас") || text.includes("паралел")) return "past-continuous-simultaneous";
  if (text.includes("перерван")) return "past-continuous-interruption";
  if (text.includes("past simple") || text.includes("завершен")) return "past-continuous-vs-simple";
  if (text.includes("stative") || text.includes("стану")) return "past-continuous-stative";
  if (text.includes("зміною значенн") || text.includes("think") || text.includes("have")) return "past-continuous-changing-meaning";
  if (text.includes("аудіо") || text.includes("слух") || text.includes("читан") || text.includes("письм") || text.includes("усн") || text.includes("діалог")) return "past-continuous-listening-production";
  if (text.includes("фон")) return "past-continuous-background";
  if (text.includes("період") || text.includes("all day") || text.includes("all evening")) return "past-continuous-period";
  if (text.includes("момент") || text.includes("at five") || text.includes("this time")) return "past-continuous-moment";
  if (text.includes("signal") || text.includes("вказівник") || text.includes("when")) return "past-continuous-signal-words";
  if (text.includes("was")) return "past-continuous-was";
  if (text.includes("were")) return "past-continuous-were";
  if (text.includes("формула")) return "past-continuous-formula";
  if (text.includes("порядок")) return "past-continuous-word-order";
  return fragmentIndex % 2 === 0 ? "past-continuous-meaning" : "past-continuous-formula";
}

const importer = createContinuousCourseImporter({
  grammarName: "Past Continuous",
  auditKey: "PAST_CONTINUOUS",
  imageAlt: "People in a clear past-time scene with ongoing actions.",
  typicalContext: "Процес у конкретний момент минулого, фонове або одночасне дія.",
  defaultAuxiliaryOne: "was",
  defaultAuxiliaryTwo: "were",
  defaultAuxiliaryThree: "wasn’t",
  skills: SKILLS,
  modules: MODULES,
  makeScenario,
  inferSkill,
  course: {
    slug: COURSE_SLUG,
    title: "Past Continuous: повне опанування",
    shortDescription: "Інтерактивний курс Past Continuous: was/were + V-ing, процеси в минулому, заперечення, питання і Past Simple.",
    fullDescription: "Сорок уроків у чотирьох модулях, десять малих навчальних фрагментів у кожному уроці, 12 пояснених вправ після кожного фрагмента та вимірювані навички для адаптивного повторення.",
    learningOutcomes: ["Утворювати was/were + V-ing", "Описувати процеси, фон і одночасні дії в минулому", "Будувати заперечення й питання", "Розрізняти Past Continuous і Past Simple", "Використовувати when, while та as у зв’язній історії"],
    prerequisites: ["Базові англійські займенники", "Базові форми Past Simple", "Базова лексика рівня A1"],
  },
});

if (require.main === module) importer.main().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = { ...importer, makeScenario };
