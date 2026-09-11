/* Imports the authored A1 Future Continuous mastery course without changing learner data. */
const { createContinuousCourseImporter } = require("./continuous-course-importer.cjs");

const COURSE_SLUG = "future-continuous-full-mastery";

function lesson(slug, title, role, topics) {
  return { slug, title, role, topics: topics.split("|").map((topic) => topic.trim()).filter(Boolean) };
}

const SKILLS = [
  ["future-continuous-meaning", "Future Continuous: значення", "Розпізнавати процес, що відбуватиметься в майбутньому."],
  ["future-continuous-formula", "Future Continuous: формула", "Будувати will be + V-ing."],
  ["future-continuous-be", "Future Continuous: обов’язкове be", "Не пропускати незмінювану форму be після will."],
  ["future-continuous-full-forms", "Future Continuous: повні форми", "Уживати will be у повній формі."],
  ["future-continuous-contractions", "Future Continuous: скорочені форми", "Уживати I’ll/you’ll/he’ll та won’t be у відповідному контексті."],
  ["future-continuous-ing", "Future Continuous: форма V-ing", "Уживати V-ing після will be."],
  ["future-continuous-drop-e", "Future Continuous: -e перед -ing", "Прибирати кінцеву -e перед -ing, коли цього вимагає правило."],
  ["future-continuous-ie-ying", "Future Continuous: -ie → -ying", "Змінювати -ie на -ying."],
  ["future-continuous-double-consonant", "Future Continuous: подвоєння приголосної", "Подвоювати кінцеву приголосну у відповідних дієсловах."],
  ["future-continuous-word-order", "Future Continuous: порядок слів", "Будувати точний порядок слів у ствердженні."],
  ["future-continuous-moment", "Future Continuous: майбутній момент", "Описувати процес у конкретний момент майбутнього."],
  ["future-continuous-period", "Future Continuous: майбутній період", "Описувати процес, що триватиме певний час."],
  ["future-continuous-expected", "Future Continuous: очікуваний перебіг", "Описувати природний або очікуваний хід подій."],
  ["future-continuous-parallel", "Future Continuous: паралельні дії", "Описувати два процеси, що відбуватимуться одночасно."],
  ["future-continuous-signal-words", "Future Continuous: часові вказівники", "Використовувати at this time tomorrow та інші вказівники за змістом."],
  ["future-continuous-negative", "Future Continuous: заперечення", "Будувати will not be/won’t be + V-ing."],
  ["future-continuous-wont", "Future Continuous: won’t be", "Зберігати be і V-ing після won’t."],
  ["future-continuous-not-order", "Future Continuous: порядок заперечення", "Ставити not після will, а be — перед V-ing."],
  ["future-continuous-negative-vs-simple", "Future Continuous і Future Simple: заперечення", "Розрізняти won’t do та won’t be doing."],
  ["future-continuous-general-question", "Future Continuous: загальне питання", "Починати питання з Will і ставити be після підмета."],
  ["future-continuous-wh-question", "Future Continuous: спеціальне питання", "Будувати Wh-питання з will + subject + be + V-ing."],
  ["future-continuous-subject-question", "Future Continuous: питання до підмета", "Розрізняти питання до підмета і до додатка."],
  ["future-continuous-short-answer", "Future Continuous: коротка відповідь", "Давати короткі відповіді Yes, I will / No, I won’t."],
  ["future-continuous-polite-question", "Future Continuous: ввічливе питання", "Використовувати Will you be ...? для ввічливого уточнення планів."],
  ["future-continuous-alternative-question", "Future Continuous: альтернативне питання", "Будувати питання з or."],
  ["future-continuous-vs-simple", "Future Continuous і Future Simple", "Розрізняти процес і окрему майбутню дію або рішення."],
  ["future-continuous-vs-present", "Future Continuous і Present Continuous", "Розрізняти процес у майбутній момент і особисту домовленість."],
  ["future-continuous-vs-going-to", "Future Continuous і be going to", "Розрізняти процес у майбутньому та намір."],
  ["future-continuous-vs-perfect", "Future Continuous і Future Perfect", "Розрізняти тривалість процесу та завершений результат."],
  ["future-continuous-time-clause", "Future Continuous: придаточні часу", "Не використовувати will у підрядній частині після when/while/as, де потрібен Present Simple."],
  ["future-continuous-stative-production", "Future Continuous: stative verbs, аудіювання, читання, письмо й мовлення", "Уникати stative verbs у Continuous та застосовувати форму у зв’язному контексті."],
];

const MODULES = [
  {
    slug: "future-continuous-affirmatives",
    title: "Модуль 1. Стверджувальна форма Future Continuous",
    description: "will be + V-ing, процеси у майбутньому, очікувані події, паралельні дії та правопис.",
    lessons: [
      lesson("future-continuous-m1-01-overview", "1. Загальне знайомство з Future Continuous", "OVERVIEW", "Що таке Future Continuous|Основне значення часу|Формула subject + will be + V-ing|Незмінювана форма be|Утворення V-ing|Процес у певний момент майбутнього|Процес протягом періоду|Очікуваний перебіг подій|Signal words|Порядок слів і головні помилки"),
      lesson("future-continuous-m1-02-formula", "2. Формула will be + V-ing", "DEEP_DIVE", "Підмет|Will для всіх осіб|Обов’язкова форма be|Смислове дієслово з -ing|Повна формула|Додаток|Місце|Час|Порядок слів|Автоматизація конструкції"),
      lesson("future-continuous-m1-03-forms", "3. Повні та скорочені форми", "DEEP_DIVE", "Повна форма will be|I’ll be|You’ll be|He’ll be|She’ll be|It’ll be|We’ll be|They’ll be|Вимова скорочень|Діалогова практика"),
      lesson("future-continuous-m1-04-moment", "4. Процес у конкретний момент майбутнього", "PRACTICE", "Поняття процесу|At five tomorrow|At midnight|At that moment tomorrow|This time tomorrow|Конкретний день|Питання про майбутній момент|Процес чи результат|Часова лінія|Контекстна практика"),
      lesson("future-continuous-m1-05-period", "5. Процес протягом майбутнього періоду", "DEEP_DIVE", "Процес протягом періоду|All morning tomorrow|All day|All evening|Кілька годин|Навчання|Робота над проєктом|Подорож|Значення тривалості|Змішана практика"),
      lesson("future-continuous-m1-06-expected", "6. Очікуваний або природний перебіг подій", "DEEP_DIVE", "Що очікується|Розклад подорожі|Робочий день|Звичайний процес|Припущення про теперішній план|Ввічливий прогноз|Не обіцянка|Контекстні підказки|Типові помилки|Контекстна практика"),
      lesson("future-continuous-m1-07-parallel", "7. Два паралельні процеси в майбутньому", "DEEP_DIVE", "Паралельні процеси|Дії однієї людини|Дії різних людей|While|As|Порядок частин|Кома на початку|Спільний час|Типові помилки|Контекстна практика"),
      lesson("future-continuous-m1-08-ing", "8. Правила утворення V-ing", "DEEP_DIVE", "Просте додавання -ing|Дієслова на -e|Винятки зі збереженням -e|Дієслова на -ie|Заміна -ie на -ying|Подвоєння приголосної|Короткі дієслова|Наголос у довших дієсловах|Форми-винятки|Змішана орфографічна практика"),
      lesson("future-continuous-m1-09-signal-words", "9. Signal words і часові вказівники", "DEEP_DIVE", "At this time tomorrow|At seven tomorrow|This time next week|All day tomorrow|During the journey|While|As|When|Позиція вказівників|Вибір часу за контекстом"),
      lesson("future-continuous-m1-10-final", "10. Підсумок стверджувальної форми", "FINAL", "Формула will be + V-ing|Обов’язкове be|Скорочення|V-ing|Майбутній момент|Тривалість|Очікуваний перебіг|Паралельні дії|Signal words|Зв’язний опис"),
    ],
  },
  {
    slug: "future-continuous-negatives",
    title: "Модуль 2. Заперечна форма Future Continuous",
    description: "will not be/won’t be + V-ing, порядок слів і контраст із Future Simple.",
    lessons: [
      lesson("future-continuous-m2-01-overview", "1. Загальне знайомство із запереченням", "OVERVIEW", "Значення заперечення|Формула заперечення|Will not be|Won’t be|Позиція not|Збереження be|Збереження V-ing|Заперечення процесу|Контраст планів|Основні помилки"),
      lesson("future-continuous-m2-02-will-not", "2. Форми will not be і won’t be", "DEEP_DIVE", "Повна форма will not|Скорочення won’t|Обов’язкове be|I won’t be|He won’t be|We won’t be|Вимова won’t|Повна чи скорочена форма|Контекст|Діалогова практика"),
      lesson("future-continuous-m2-03-structure", "3. Структура won’t be + V-ing", "DEEP_DIVE", "Підмет|Won’t|Be після won’t|V-ing|Додаток|Місце|Час|Повна формула|Типові помилки|Автоматизація"),
      lesson("future-continuous-m2-04-moment", "4. Заперечення в конкретний момент майбутнього", "PRACTICE", "Що не відбуватиметься|At five tomorrow|At that moment|This time tomorrow|Виправлення припущення|Контраст двох дій|Дім|Робота або навчання|Контекст|Міні-діалоги"),
      lesson("future-continuous-m2-05-period", "5. Заперечення протягом майбутнього періоду", "DEEP_DIVE", "Процес протягом періоду|All day tomorrow|Подорож|Робота|Навчання|Перерва|Контраст|Часова лінія|Типові помилки|Змішана практика"),
      lesson("future-continuous-m2-06-contrast", "6. Що одна людина робитиме, а інша — ні", "DEEP_DIVE", "Контраст процесів|But|Одна людина|Дві людини|Паралельні плани|Робота|Навчання|Подорож|Власні приклади|Контекстна практика"),
      lesson("future-continuous-m2-07-vs-simple", "7. Won’t do чи won’t be doing", "DEEP_DIVE", "Окрема дія|Процес|Won’t do|Won’t be doing|Майбутній момент|Значення ситуації|Пари прикладів|Типові помилки|Виправлення|Контекст"),
      lesson("future-continuous-m2-08-time-clauses", "8. Заперечення в придаточних часу", "DEEP_DIVE", "When|While|As|Present Simple після when|Не ставимо will після when|Головна частина|Підрядна частина|Порядок частин|Типові помилки|Змішана практика"),
      lesson("future-continuous-m2-09-dialogues", "9. Заперечення в діалогах і зв’язній мові", "PRACTICE", "Ввічливе уточнення|Робочий графік|Подорож|Навчання|Зустріч|Контраст планів|Діалог|Письмова відповідь|Усна відповідь|Саморедагування"),
      lesson("future-continuous-m2-10-final", "10. Підсумок заперечної форми", "FINAL", "Will not be|Won’t be|Обов’язкове be|V-ing|Порядок слів|Момент|Період|Контраст|Future Simple чи Continuous|Зв’язний контекст"),
    ],
  },
  {
    slug: "future-continuous-questions",
    title: "Модуль 3. Питальна форма Future Continuous",
    description: "Загальні, спеціальні, альтернативні та ввічливі питання про майбутні плани.",
    lessons: [
      lesson("future-continuous-m3-01-overview", "1. Загальне знайомство з питаннями", "OVERVIEW", "Типи питань|Формула загального питання|Will на початку|Підмет після will|Be після підмета|V-ing|Короткі відповіді|Спеціальні питання|Ввічливі питання|Основні помилки"),
      lesson("future-continuous-m3-02-general", "2. Загальні питання", "DEEP_DIVE", "Will I be|Will you be|Will he be|Will she be|Will we be|Will they be|Процес у майбутньому|Порядок слів|Інтонація|Контекстна практика"),
      lesson("future-continuous-m3-03-order", "3. Порядок слів у питаннях", "DEEP_DIVE", "Will на початку|Підмет|Be|V-ing|Додаток|Місце|Час|Повне питання|Типові перестановки|Автоматизація"),
      lesson("future-continuous-m3-04-answers", "4. Короткі та повні відповіді", "DEEP_DIVE", "Yes I will|No I won’t|Відповідь із he|Відповідь із they|Заміна іменника займенником|Повна відповідь|Деталі|Ввічливий тон|Діалоги|Автоматизація"),
      lesson("future-continuous-m3-05-wh", "5. Спеціальні питання", "DEEP_DIVE", "Формула Wh-питання|What|Where|Why|When|Who|Which|How|Порядок слів|Розгорнута відповідь"),
      lesson("future-continuous-m3-06-subject", "6. Питання до підмета", "DEEP_DIVE", "Що таке підмет|Who will be working|What will be happening|Питання до підмета|Питання до додатка|Порівняння|Типові помилки|Контекст|Діалоги|Змішана практика"),
      lesson("future-continuous-m3-07-polite", "7. Ввічливі питання про плани", "PRACTICE", "Will you be using|Ввічливе уточнення|Графік|Подорож|Зустріч|Робочий час|Не прямий наказ|Варіанти відповіді|Діалог|Контекстна практика"),
      lesson("future-continuous-m3-08-alternative", "8. Альтернативні питання", "PRACTICE", "Значення or|Вибір між діями|Вибір між часом|Вибір між місцями|Питання з will|Повна відповідь|Коротка відповідь|Інтонація|Діалог|Контекст"),
      lesson("future-continuous-m3-09-real-questions", "9. Питання в реальних ситуаціях", "PRACTICE", "Уточнення плану|Телефонна розмова|Подорож|Робота|Навчання|Графік|Інтерв’ю|Власний діалог|Письмова відповідь|Усна відповідь"),
      lesson("future-continuous-m3-10-final", "10. Підсумок питальної форми", "FINAL", "Will на початку|Підмет|Be|V-ing|Короткі відповіді|Wh-питання|Питання до підмета|Ввічливі питання|Альтернативи|Підсумкова практика"),
    ],
  },
  {
    slug: "future-continuous-mixed",
    title: "Модуль 4. Змішані форми Future Continuous",
    description: "Усі форми, порівняння майбутніх конструкцій, придаточні часу та продуктивна практика.",
    lessons: [
      lesson("future-continuous-m4-01-overview", "1. Огляд усіх форм Future Continuous", "OVERVIEW", "Ствердження|Заперечення|Загальне питання|Спеціальне питання|Will be|Won’t be|V-ing|Короткі відповіді|Signal words|Змішане застосування"),
      lesson("future-continuous-m4-02-transformations", "2. Ствердження → заперечення → питання", "DEEP_DIVE", "Ствердження як основа|Заперечення|Загальне питання|Wh-питання|Will|Be|V-ing|Короткі відповіді|Порядок слів|Змішані трансформації"),
      lesson("future-continuous-m4-03-vs-simple", "3. Future Continuous і Future Simple", "DEEP_DIVE", "Процес|Окрема дія|Спонтанне рішення|Прогноз|Майбутній момент|Контекстні підказки|Пари прикладів|Значення|Типові помилки|Змішана практика"),
      lesson("future-continuous-m4-04-vs-present", "4. Future Continuous і Present Continuous", "DEEP_DIVE", "Майбутній процес|Особиста домовленість|Час і місце|Розклад|Процес у моменті|Пари прикладів|Значення|Типові помилки|Контекст|Змішана практика"),
      lesson("future-continuous-m4-05-going-to", "5. Future Continuous і be going to", "DEEP_DIVE", "Намір|Процес у майбутньому|Докази зараз|Розвиток події|Пари прикладів|Значення|Часові вказівники|Типові помилки|Контекст|Змішана практика"),
      lesson("future-continuous-m4-06-perfect", "6. Future Continuous і Future Perfect", "DEEP_DIVE", "Процес|Результат до моменту|Тривалість|Завершення|By|At this time|Пари прикладів|Значення|Типові помилки|Контекстна практика"),
      lesson("future-continuous-m4-07-time-clauses", "7. Придаточні часу", "DEEP_DIVE", "When|While|As|Present Simple у підрядній частині|Will у головній частині|Порядок частин|Кома|Процес і подія|Типові помилки|Змішана практика"),
      lesson("future-continuous-m4-08-stative", "8. Stative verbs", "DEEP_DIVE", "Що таке stative verbs|Know|Want|Need|Believe|Understand|Belong|Процесне значення have|Типові помилки|Саморедагування"),
      lesson("future-continuous-m4-09-production", "9. Читання, аудіювання, письмо й мовлення", "PRACTICE", "Читання|Аудіо з транскриптом|Майбутній момент|Паралельні дії|Ввічливі питання|Відповіді за текстом|Опис майбутнього дня|Діалог|Письмовий текст|Усна практика"),
      lesson("future-continuous-m4-10-course-final", "10. Фінальний контроль Future Continuous", "FINAL", "Формула|Скорочення|Заперечення|Питання|V-ing|Майбутній момент|Очікуваний перебіг|Порівняння конструкцій|Придаточні часу|Фінальний проєкт"),
    ],
  },
];

const ACTIONS = [
  ["I", "read", "reading", "a book", "Я читатиму книжку"],
  ["Anna", "cook", "cooking", "dinner", "Анна готуватиме вечерю"],
  ["He", "wait", "waiting", "for the bus", "Він чекатиме на автобус"],
  ["The dog", "sleep", "sleeping", "under the table", "Собака спатиме під столом"],
  ["We", "work", "working", "on a project", "Ми працюватимемо над проєктом"],
  ["They", "play", "playing", "football", "Вони гратимуть у футбол"],
  ["The children", "write", "writing", "a story", "Діти писатимуть історію"],
  ["My friends", "travel", "travelling", "to Lviv", "Мої друзі подорожуватимуть до Львова"],
];

const RULES = {
  "future-continuous-meaning": ["Future Continuous показує процес, який відбуватиметься в певний момент або період у майбутньому.", "subject + will be + V-ing"],
  "future-continuous-formula": ["Після will обов’язково ставте незмінювану форму be, а далі — V-ing.", "subject + will + be + V-ing"],
  "future-continuous-be": ["Після will не можна пропускати be або замінювати його на is/are.", "will + be + V-ing"],
  "future-continuous-ing": ["Після will be смислове дієслово має форму V-ing.", "will be + V-ing"],
  "future-continuous-negative": ["У запереченні використовуйте will not be або won’t be перед V-ing.", "subject + won’t be + V-ing"],
  "future-continuous-wont": ["Скорочення won’t не скасовує обов’язкову форму be.", "won’t + be + V-ing"],
  "future-continuous-not-order": ["Not стоїть після will; be залишається перед V-ing.", "will + not + be + V-ing"],
  "future-continuous-general-question": ["У загальному питанні перед підметом ставиться тільки Will.", "Will + subject + be + V-ing?"],
  "future-continuous-wh-question": ["У спеціальному питанні після Wh-слова ставте will, підмет, be і V-ing.", "Wh-word + will + subject + be + V-ing?"],
  "future-continuous-vs-simple": ["Future Continuous передає процес у майбутньому, Future Simple — окрему дію, рішення або прогноз.", "will be + V-ing / will + V1"],
  "future-continuous-vs-present": ["Present Continuous часто передає домовленість, Future Continuous — процес у майбутній момент.", "I’m meeting / I’ll be meeting"],
  "future-continuous-vs-going-to": ["Be going to виражає намір або доказ, Future Continuous — процес, який буде тривати.", "I’m going to travel / I’ll be travelling"],
  "future-continuous-vs-perfect": ["Future Perfect показує результат до часу, Future Continuous — процес у цей час.", "will have finished / will be working"],
  "future-continuous-time-clause": ["Після when, while та as у підрядній частині зазвичай використовуйте Present Simple, не will.", "I’ll be working when you arrive"],
  "future-continuous-stative-production": ["Know, want, need та belong зазвичай не вживають у Continuous; форму застосовуйте для реального процесу.", "I’ll know / I’ll be working"],
};

function actionAt(serial) {
  const [subject, base, ing, object, translation] = ACTIONS[serial % ACTIONS.length];
  const time = ["at seven tomorrow", "at that moment tomorrow", "this time tomorrow", "all evening tomorrow", "when you arrive"][Math.floor(serial / ACTIONS.length) % 5];
  return { subject, base, ing, object, translation, time };
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
  const { subject, base, ing, object, translation, time } = action;
  const subjectLower = subject === "I" ? "I" : subject.toLowerCase();
  const positive = `${subject} will be ${ing} ${object} ${time}.`;
  const missingBe = `${subject} will ${ing} ${object} ${time}.`;
  const wrongBe = `${subject} will is ${ing} ${object} ${time}.`;
  const missingIng = `${subject} will be ${base} ${object} ${time}.`;
  const negative = `${subject} won’t be ${ing} ${object} ${time}.`;
  const question = `Will ${subjectLower} be ${ing} ${object} ${time}?`;
  const [rule, formula] = RULES[skillSlug] ?? ["Побудуйте Future Continuous за змістом: процес у майбутньому потребує will be + V-ing.", "subject + will be + V-ing"];

  if (skillSlug === "future-continuous-drop-e") {
    const [_baseForm, correctForm, wrongForm] = [["make", "making", "makeing"], ["write", "writing", "writeing"], ["come", "coming", "comeing"]][serial % 3];
    return { rule, formula, correct: `She will be ${correctForm} dinner at six.`, incorrect: `She will be ${wrongForm} dinner at six.`, prompt: `She will be ___ dinner at six.`, answer: correctForm, translation: "Вона готуватиме вечерю о шостій." };
  }
  if (skillSlug === "future-continuous-ie-ying") return { rule, formula, correct: "The dog will be lying under the table.", incorrect: "The dog will be lieing under the table.", prompt: "The dog will be ___ under the table.", answer: "lying", translation: "Собака лежатиме під столом." };
  if (skillSlug === "future-continuous-double-consonant") {
    const [_baseForm, correctForm, wrongForm] = [["run", "running", "runing"], ["sit", "sitting", "siting"], ["swim", "swimming", "swiming"]][serial % 3];
    return { rule, formula, correct: `He will be ${correctForm} in the park.`, incorrect: `He will be ${wrongForm} in the park.`, prompt: `He will be ___ in the park.`, answer: correctForm, translation: "Він бігатиме в парку." };
  }
  if (["future-continuous-negative", "future-continuous-wont", "future-continuous-not-order"].includes(skillSlug)) return { rule, formula, correct: negative, incorrect: `${subject} won’t ${ing} ${object} ${time}.`, prompt: `${subject} ___ ${ing} ${object} ${time}.`, answer: "won’t be", translation: `${translation}, але цього не буде.` };
  if (skillSlug === "future-continuous-negative-vs-simple") return { rule, formula, correct: "She won’t be working at six; she won’t work that day.", incorrect: "She won’t working at six; she won’t be work that day.", prompt: "She ___ at six; she ___ that day.", answer: "won’t be working; won’t work", translation: "Вона не працюватиме о шостій; того дня вона не працюватиме." };
  if (skillSlug === "future-continuous-full-forms") return { rule, formula, correct: positive, incorrect: missingBe, prompt: `${subject} will ___ ${ing} ${object} ${time}.`, answer: "be", translation };
  if (skillSlug === "future-continuous-contractions") return { rule, formula, correct: `${subject === "I" ? "I’ll" : `${subject}’ll`} be ${ing} ${object} ${time}.`, incorrect: `${subject} will ${base} ${object} ${time}.`, prompt: `${subject === "I" ? "I" : subject} ___ be ${ing} ${object} ${time}.`, answer: "will", translation };
  if (skillSlug === "future-continuous-be") return { rule, formula, correct: positive, incorrect: wrongBe, prompt: `${subject} will ___ ${ing} ${object} ${time}.`, answer: "be", translation };
  if (["future-continuous-general-question", "future-continuous-polite-question"].includes(skillSlug)) {
    const polite = skillSlug === "future-continuous-polite-question" ? "Will you be using the meeting room tomorrow?" : question;
    return { rule, formula, correct: polite, incorrect: skillSlug === "future-continuous-polite-question" ? "Will you using the meeting room tomorrow?" : `${subject} will be ${ing} ${object} ${time}?`, prompt: skillSlug === "future-continuous-polite-question" ? "Will you ___ the meeting room tomorrow?" : `___ ${subjectLower} be ${ing} ${object} ${time}?`, answer: skillSlug === "future-continuous-polite-question" ? "be using" : "Will", translation: skillSlug === "future-continuous-polite-question" ? "Чи будете ви користуватися переговорною завтра?" : `Чи ${translation.toLowerCase()}?` };
  }
  if (skillSlug === "future-continuous-wh-question") return { rule, formula, correct: `What will ${subjectLower} be doing ${time}?`, incorrect: `What will be ${subjectLower} doing ${time}?`, prompt: `What will ${subjectLower} be ___ ${time}?`, answer: "doing", translation: `Що ${translation.toLowerCase()}?` };
  if (skillSlug === "future-continuous-subject-question") return { rule, formula, correct: "Who will be working tomorrow?", incorrect: "Who will working tomorrow?", prompt: "Who will ___ working tomorrow?", answer: "be", translation: "Хто працюватиме завтра?" };
  if (skillSlug === "future-continuous-short-answer") {
    const pronoun = pronounFor(subject);
    return { rule, formula, correct: `Yes, ${pronoun} will. ${positive}`, incorrect: `Yes, ${pronoun} will be.`, prompt: `Yes, ${pronoun} ___.`, answer: "will", translation: `Так, ${translation.toLowerCase()}.` };
  }
  if (skillSlug === "future-continuous-alternative-question") return { rule, formula, correct: `Will ${subjectLower} be ${ing} ${object} or resting at home?`, incorrect: `Will ${subjectLower} ${base} ${object} or be resting at home?`, prompt: `Will ${subjectLower} be ${ing} ${object} ___ resting at home?`, answer: "or", translation: `Чи ${translation.toLowerCase()}, чи відпочиватиме вдома?` };
  if (skillSlug === "future-continuous-vs-simple") return { rule, formula, correct: "At eight tomorrow, I’ll be working. I’ll call you later.", incorrect: "At eight tomorrow, I’ll work. I’ll be call you later.", prompt: "At eight tomorrow, I’ll ___ working.", answer: "be", translation: "Завтра о восьмій я працюватиму. Я подзвоню тобі пізніше." };
  if (skillSlug === "future-continuous-vs-present") return { rule, formula, correct: "I’m meeting Anna tomorrow, and I’ll be travelling at noon.", incorrect: "I’ll be meeting Anna tomorrow, and I’m travelling at noon.", prompt: "I’m ___ Anna tomorrow, and I’ll be travelling at noon.", answer: "meeting", translation: "Я зустрічаюся з Анною завтра, а опівдні буду в дорозі." };
  if (skillSlug === "future-continuous-vs-going-to") return { rule, formula, correct: "I’m going to travel next month, and I’ll be travelling all day on Friday.", incorrect: "I’ll be travel next month, and I’m going to travelling all day on Friday.", prompt: "I’m going to ___ next month.", answer: "travel", translation: "Я збираюся подорожувати наступного місяця, а в п’ятницю буду в дорозі весь день." };
  if (skillSlug === "future-continuous-vs-perfect") return { rule, formula, correct: "At six, she’ll be writing; by eight, she’ll have finished.", incorrect: "At six, she’ll have writing; by eight, she’ll be finished.", prompt: "At six, she’ll be ___.", answer: "writing", translation: "О шостій вона писатиме; до восьмої вона завершить." };
  if (skillSlug === "future-continuous-time-clause") return { rule, formula, correct: "I’ll be working when you arrive.", incorrect: "I’ll be working when you will arrive.", prompt: "I’ll be working when you ___.", answer: "arrive", translation: "Я працюватиму, коли ти прийдеш." };
  if (skillSlug === "future-continuous-stative-production") return { rule, formula, correct: "I’ll know the answer, but I’ll be working on the task.", incorrect: "I’ll be knowing the answer, but I’ll work on the task at that moment.", prompt: "I’ll ___ the answer, but I’ll be working on the task.", answer: "know", translation: "Я знатиму відповідь, але працюватиму над завданням." };
  if (skillSlug === "future-continuous-expected") return { rule, formula, correct: "Don’t call at nine: we’ll be having dinner.", incorrect: "Don’t call at nine: we’ll have dinner at that moment.", prompt: "We’ll be ___ dinner at nine.", answer: "having", translation: "Не телефонуй о дев’ятій: ми вечерятимемо." };
  if (skillSlug === "future-continuous-parallel") return { rule, formula, correct: "While Anna cooks, Tom will be setting the table.", incorrect: "While Anna will cook, Tom will set the table.", prompt: "While Anna cooks, Tom will be ___ the table.", answer: "setting", translation: "Поки Анна готуватиме, Том накриватиме на стіл." };
  return { rule, formula, correct: positive, incorrect: skillSlug === "future-continuous-ing" ? missingIng : missingBe, prompt: `${subject} will ___ ${ing} ${object} ${time}.`, answer: "be", translation };
}

function inferSkill(_moduleIndex, focus, fragmentIndex) {
  const text = focus.toLowerCase();
  if (text.includes("запереч") || text.includes("won’") || text.includes("will not")) return text.includes("future simple") || text.includes("won’t do") ? "future-continuous-negative-vs-simple" : text.includes("пози") || text.includes("структур") ? "future-continuous-not-order" : text.includes("won’t") ? "future-continuous-wont" : "future-continuous-negative";
  if (text.includes("до підмет")) return "future-continuous-subject-question";
  if (text.includes("ввічлив")) return "future-continuous-polite-question";
  if (text.includes("альтернатив")) return "future-continuous-alternative-question";
  if (text.includes("коротк") || text.includes("відповід")) return "future-continuous-short-answer";
  if (text.includes("спеціаль") || text.includes("wh-")) return "future-continuous-wh-question";
  if (text.includes("питання") || text.includes("порядок слів у питаннях")) return "future-continuous-general-question";
  if (text.includes("-ie") || text.includes("-ying")) return "future-continuous-ie-ying";
  if (text.includes("подвоєн")) return "future-continuous-double-consonant";
  if (text.includes("-e") || text.includes("орфограф")) return "future-continuous-drop-e";
  if (text.includes("v-ing") || text.includes("-ing")) return "future-continuous-ing";
  if (text.includes("future perfect")) return "future-continuous-vs-perfect";
  if (text.includes("present continuous")) return "future-continuous-vs-present";
  if (text.includes("going to")) return "future-continuous-vs-going-to";
  if (text.includes("future simple") || text.includes("окрема дія") || text.includes("спонтан")) return "future-continuous-vs-simple";
  if (text.includes("when") || text.includes("while") || text.includes(" as") || text.includes("придаточ")) return "future-continuous-time-clause";
  if (text.includes("stative") || text.includes("стану") || text.includes("аудіо") || text.includes("слух") || text.includes("читан") || text.includes("письм") || text.includes("усн") || text.includes("діалог")) return "future-continuous-stative-production";
  if (text.includes("паралел")) return "future-continuous-parallel";
  if (text.includes("очікуван") || text.includes("природн")) return "future-continuous-expected";
  if (text.includes("період") || text.includes("all day") || text.includes("all evening")) return "future-continuous-period";
  if (text.includes("момент") || text.includes("at five") || text.includes("this time")) return "future-continuous-moment";
  if (text.includes("signal") || text.includes("вказівник")) return "future-continuous-signal-words";
  if (text.includes("скороч")) return "future-continuous-contractions";
  if (text.includes("повні форми")) return "future-continuous-full-forms";
  if (text.includes("обов’язков") || text.includes("форма be")) return "future-continuous-be";
  if (text.includes("формула")) return "future-continuous-formula";
  if (text.includes("порядок")) return "future-continuous-word-order";
  return fragmentIndex % 2 === 0 ? "future-continuous-meaning" : "future-continuous-formula";
}

const importer = createContinuousCourseImporter({
  grammarName: "Future Continuous",
  auditKey: "FUTURE_CONTINUOUS",
  imageAlt: "People in a clear future-time scene with ongoing planned actions.",
  typicalContext: "Процес у конкретний момент або період майбутнього.",
  defaultAuxiliaryOne: "will",
  defaultAuxiliaryTwo: "be",
  defaultAuxiliaryThree: "won’t be",
  skills: SKILLS,
  modules: MODULES,
  makeScenario,
  inferSkill,
  course: {
    slug: COURSE_SLUG,
    title: "Future Continuous: повне опанування",
    shortDescription: "Інтерактивний курс Future Continuous: will be + V-ing, майбутні процеси, заперечення, питання та порівняння конструкцій.",
    fullDescription: "Сорок уроків у чотирьох модулях, десять малих навчальних фрагментів у кожному уроці, 12 пояснених вправ після кожного фрагмента та вимірювані навички для адаптивного повторення.",
    learningOutcomes: ["Утворювати will be + V-ing", "Описувати процеси, що відбуватимуться у майбутньому", "Будувати заперечення й питання", "Розрізняти Future Continuous, Future Simple, Present Continuous, be going to та Future Perfect", "Використовувати форму у ввічливих питаннях, читанні, письмі й мовленні"],
    prerequisites: ["Базові англійські займенники", "Базові форми Future Simple", "Базова лексика рівня A1"],
  },
});

if (require.main === module) importer.main().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = { ...importer, makeScenario };
