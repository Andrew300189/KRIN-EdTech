/*
 * Imports the canonical A1 Past Simple mastery course. It deliberately uses
 * the same Course → Module → Lesson → Block → Exercise architecture as every
 * other course and never replaces learner progress or existing courses.
 */
try {
  require("dotenv").config({ path: ".env", quiet: true });
} catch (error) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;
}

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");

const COURSE_SLUG = "past-simple-full-mastery";
const PRACTICE_PER_FRAGMENT = 12;
const LESSON_DURATION_MINUTES = 55;

const SKILLS = [
  ["past-simple-recognition", "Past Simple: розпізнавання", "Recognise a completed past-time context and the Past Simple form."],
  ["past-simple-uses", "Past Simple: випадки вживання", "Use Past Simple for completed actions, past habits and past facts."],
  ["past-simple-regular-verbs", "Past Simple: правильні дієслова", "Form affirmative sentences with regular past forms."],
  ["past-simple-irregular-verbs", "Past Simple: неправильні дієслова", "Use common irregular second forms accurately."],
  ["past-simple-ed-spelling", "Past Simple: правопис -ed", "Apply -ed, -d, -ied and consonant-doubling spelling rules."],
  ["past-simple-ed-pronunciation-t", "Past Simple: вимова -ed /t/", "Recognise and use the /t/ pronunciation of -ed."],
  ["past-simple-ed-pronunciation-d", "Past Simple: вимова -ed /d/", "Recognise and use the /d/ pronunciation of -ed."],
  ["past-simple-ed-pronunciation-id", "Past Simple: вимова -ed /ɪd/", "Recognise and use the /ɪd/ pronunciation of -ed."],
  ["past-simple-was-were", "Past Simple: was / were", "Choose was or were for past states, places and descriptions."],
  ["past-simple-signal-words", "Past Simple: маркери часу", "Use yesterday, last, ago, in and when I was with past-time meaning."],
  ["past-simple-word-order", "Past Simple: порядок слів", "Build clear affirmative past-time sentences in logical order."],
  ["past-simple-sequence", "Past Simple: послідовність подій", "Tell a chronology with first, then, after that, next and finally."],
  ["past-simple-negative-didnt", "Past Simple: did not / didn’t", "Make a negative with did not or didn’t."],
  ["past-simple-negative-be", "Past Simple: wasn’t / weren’t", "Make negative past states with wasn’t and weren’t."],
  ["past-simple-base-after-did", "Past Simple: V1 після did / didn’t", "Keep the main verb in its base form after did and didn’t."],
  ["past-simple-negative-words", "Past Simple: never, nobody, nothing", "Avoid double negatives and express negative meaning naturally."],
  ["past-simple-general-questions", "Past Simple: загальні запитання", "Form yes/no questions with did and accurate word order."],
  ["past-simple-short-answers", "Past Simple: короткі та повні відповіді", "Give short and expanded answers to past-time questions."],
  ["past-simple-wh-questions", "Past Simple: спеціальні запитання", "Form Wh-questions with did, subject and the base verb."],
  ["past-simple-subject-questions", "Past Simple: запитання до підмета", "Distinguish subject questions from questions to an object."],
  ["past-simple-alternative-questions", "Past Simple: альтернативні запитання", "Use or to offer a meaningful past-time alternative."],
  ["past-simple-context-production", "Past Simple: читання, письмо й мовлення", "Use affirmative, negative and question forms in coherent past-time contexts."],
];

function lesson(slug, title, role, topics) {
  return { slug, title, role, topics: topics.split("|").map((topic) => topic.trim()).filter(Boolean) };
}

const MODULES = [
  {
    slug: "past-affirmatives",
    title: "Модуль 1. Стверджувальна форма Past Simple",
    description: "Завершені події, правильні й неправильні дієслова, was/were та часові маркери.",
    lessons: [
      lesson("past-m1-01-overview", "1. Огляд Past Simple", "OVERVIEW", "Що таке Past Simple|Коли вживаємо Past Simple|Загальна формула ствердження|Друга форма смислового дієслова|Правильні дієслова та -ed|Неправильні дієслова|Форми was і were|Основні signal words|Порядок слів|Головні помилки"),
      lesson("past-m1-02-completed-actions", "2. Завершені дії в минулому", "DEEP_DIVE", "Поняття завершеної дії|Дії вчора|Події минулого ранку, дня й вечора|Дії минулого тижня|Дії минулого місяця або року|Точний час події|Використання ago|Одна завершена дія|Кілька завершених дій|Розповідь про минулий день"),
      lesson("past-m1-03-sequences", "3. Послідовність подій", "DEEP_DIVE", "Що таке послідовність подій|Перша й наступна дія|First|Then|After that|Next|Finally|Порядок дій у розповіді|Типові помилки послідовності|Коротка історія"),
      lesson("past-m1-04-past-habits", "4. Минулі звички й повторювані дії", "DEEP_DIVE", "Поняття минулої звички|Щоденні дії в минулому|Шкільні звички|Сімейні традиції|Дитячі захоплення|Повторювані дії|Частотність у минулому|When I was a child|Звичка чи одна подія|Розповідь про минулі звички"),
      lesson("past-m1-05-was-were", "5. Стани й факти: was / were", "DEEP_DIVE", "To be у Past Simple|Використання was|Використання were|I, he, she, it|You, we, they|Вік у минулому|Місце в минулому|Стан та емоції|Погода, дата й час|Змішана практика was/were"),
      lesson("past-m1-06-ed-spelling", "6. Правильні дієслова та -ed", "DEEP_DIVE", "Загальне правило -ed|Просте додавання -ed|Дієслова на -e|Приголосний плюс y: -ied|Голосний плюс y|Подвоєння кінцевої приголосної|Короткі односкладові дієслова|Багатоскладові дієслова й наголос|Орфографічні винятки|Змішана практика"),
      lesson("past-m1-07-ed-pronunciation", "7. Вимова закінчення -ed", "PRACTICE", "Три варіанти вимови -ed|Вимова /t/|Вимова /d/|Вимова /ɪd/|Глухі приголосні|Дзвінкі приголосні та голосні|Дієслова на /t/ і /d/|Розпізнавання форми на слух|Типові помилки вимови|Дієслова в реченнях"),
      lesson("past-m1-08-irregular-verbs", "8. Неправильні дієслова", "DEEP_DIVE", "Що таке неправильні дієслова|Форма не змінюється|Зміна голосної|Повністю змінені форми|Частотні дієслова руху|Дієслова спілкування й мислення|Повсякденні дієслова|Друга й третя форма|Стратегії запам’ятовування|Неправильні дієслова в історії"),
      lesson("past-m1-09-signal-words", "9. Signal words і опис минулого", "DEEP_DIVE", "Yesterday|Last night, week, month, year|Ago|In плюс минулий рік|When I was|Then|The other day|Позиція часу в реченні|Кілька часових маркерів|Розповідь про подію"),
      lesson("past-m1-10-final", "10. Підсумок стверджувальної форми", "FINAL", "Правильні дієслова|Неправильні дієслова|Was/were|Завершені дії|Минулі звички|Послідовності подій|Signal words|Правопис -ed|Вимова -ed|Зв’язна розповідь"),
    ],
  },
  {
    slug: "past-negatives",
    title: "Модуль 2. Заперечна форма Past Simple",
    description: "Точні заперечення з did not, didn’t, wasn’t і weren’t у живому контексті.",
    lessons: [
      lesson("past-m2-01-overview", "1. Огляд заперечної форми", "OVERVIEW", "Значення заперечення в минулому|Формула did not плюс V1|Скорочення didn’t|Однакова форма для всіх осіб|Повернення дієслова до V1|Заперечення з was not|Заперечення з were not|Повні й скорочені форми|Порядок слів|Основні помилки"),
      lesson("past-m2-02-didnt", "2. Заперечення з did not і didn’t", "DEEP_DIVE", "Повна форма did not|Скорочена форма didn’t|I, you, we, they|He, she, it|Заперечення дії|Заперечення завершеної події|Заперечення минулої звички|Офіційний і розмовний стиль|Вимова didn’t|Контекстна практика"),
      lesson("past-m2-03-base-after-didnt", "3. Початкова форма після didn’t", "DEEP_DIVE", "Чому після didn’t V1|Правильні дієслова після didn’t|Неправильні дієслова після didn’t|Didn’t go, не didn’t went|Didn’t see, не didn’t saw|Didn’t study, не didn’t studied|Третя особа після didn’t|Подвійна позначка минулого|Автоматизація правила|Змішана практика"),
      lesson("past-m2-04-wasnt-werent", "4. Заперечення wasn’t і weren’t", "DEEP_DIVE", "Was not|Wasn’t|Were not|Weren’t|I, he, she, it|You, we, they|Місце в минулому|Стани й характеристики|Відмінність від didn’t|Змішана практика"),
      lesson("past-m2-05-didnt-or-be", "5. Didn’t чи wasn’t/weren’t", "DEEP_DIVE", "Смислове дієслово й to be|Didn’t work|Wasn’t at work|Дія та стан|Дія та місце|Прикметник після wasn’t/weren’t|Іменник після wasn’t/weren’t|Недопустимі комбінації|Вибір форми за контекстом|Змішана практика"),
      lesson("past-m2-06-negative-actions", "6. Заперечення регулярних і одиничних дій", "PRACTICE", "Одна нездійснена дія|Що не сталося вчора|План, що не відбувся|Відсутність результату|Заперечення минулої звички|Заперечення послідовності|Контраст сталося чи ні|Причина відсутності дії|Because|Контекстна історія"),
      lesson("past-m2-07-negative-words", "7. Never, nothing, nobody", "DEEP_DIVE", "Значення never|Past Simple після never|Nobody|Nothing|Nowhere|Без подвійного заперечення|Didn’t ever і never|Didn’t see anybody і saw nobody|Типові помилки|Змішана практика"),
      lesson("past-m2-08-negative-errors", "8. Типові помилки в запереченнях", "PRACTICE", "Didn’t плюс V2|Не don’t і doesn’t|Wasn’t зі смисловим дієсловом|Didn’t перед прикметником|Помилки з неправильними дієсловами|Подвійне заперечення|Неправильний порядок слів|Помилки з signal words|Редагування тексту|Пояснення виправлень"),
      lesson("past-m2-09-dialogues", "9. Заперечення в діалогах і розповідях", "PRACTICE", "Що людина не зробила|Заперечення інформації|Виправлення твердження|Невдалі плани|Пояснення причини|Протиставлення з but|Короткі репліки|Повні відповіді|Діалог про минулий день|Письмова розповідь"),
      lesson("past-m2-10-final", "10. Підсумок заперечної форми", "FINAL", "Did not і didn’t|V1 після did|Wasn’t і weren’t|Дія чи стан|Заперечні слова|Порядок слів|Контекст|Письмове застосування|Усне застосування|Персональне повторення"),
    ],
  },
  {
    slug: "past-questions",
    title: "Модуль 3. Питальна форма Past Simple",
    description: "Загальні, спеціальні, альтернативні питання та точні відповіді про минуле.",
    lessons: [
      lesson("past-m3-01-overview", "1. Огляд питань", "OVERVIEW", "Основні типи питань|Формула загального питання з did|V1 після did|Короткі відповіді|Спеціальні питання|Питальні слова|Питання з was|Питання з were|Питання до підмета|Основні помилки"),
      lesson("past-m3-02-general-questions", "2. Загальні питання з did", "DEEP_DIVE", "Значення загального питання|Позиція did|I, you, we, they|He, she, it|Правильні дієслова|Неправильні дієслова|Signal words|Інтонація питання|Перетворення твердження|Контекстна практика"),
      lesson("past-m3-03-base-after-did", "3. Початкова форма після did", "DEEP_DIVE", "Чому після did V1|Did you go|Did she see|Did they have|Правильні дієслова після did|Неправильні дієслова після did|Подвійний Past Simple|Виправлення питань|Швидке утворення форми|Змішана практика"),
      lesson("past-m3-04-answers", "4. Короткі й повні відповіді", "DEEP_DIVE", "Yes, I did|No, I didn’t|Відповіді з різними займенниками|Заміна іменника займенником|Повна позитивна відповідь|Повна негативна відповідь|Додавання деталей|Без повтору смислового дієслова|Відповіді в діалогах|Автоматизація"),
      lesson("past-m3-05-wh-questions", "5. Спеціальні питання", "DEEP_DIVE", "Формула спеціального питання|What did|Where did|When did|Why did|How did|How often did|Who did you|Порядок слів|Розгорнуті відповіді"),
      lesson("past-m3-06-was-were-questions", "6. Питання з was і were", "DEEP_DIVE", "Перестановка was/were|Загальні питання з was|Загальні питання з were|Коротка позитивна відповідь|Коротка негативна відповідь|Where was|Why were|Стан і місце|Відмінність від did|Змішана практика"),
      lesson("past-m3-07-subject-questions", "7. Питання до підмета", "DEEP_DIVE", "Що таке підмет|Who worked here|Who called you|What happened|Чому did не потрібне|Підмет чи додаток|Who saw Tom|Who did Tom see|Типові помилки|Змішана практика"),
      lesson("past-m3-08-alternative-questions", "8. Альтернативні питання", "PRACTICE", "Значення альтернативного питання|Or|Вибір дії|Вибір об’єкта|Вибір місця|Вибір часу|Питання з did|Питання з was/were|Повні відповіді|Діалогова практика"),
      lesson("past-m3-09-interviews", "9. Питання в інтерв’ю й розмові", "PRACTICE", "Питання про вчора|Питання про вихідні|Питання про подорож|Питання про дитинство|Питання про школу|Питання про важливу подію|Логічна послідовність|Уточнювальні питання|Проведення інтерв’ю|Власний діалог"),
      lesson("past-m3-10-final", "10. Підсумок питальної форми", "FINAL", "Питання з did|V1 після did|Короткі відповіді|Спеціальні питання|Was/were у питаннях|Питання до підмета|Питання до додатка|Альтернативні питання|Порядок слів|Діалог"),
    ],
  },
  {
    slug: "past-mixed-contexts",
    title: "Модуль 4. Змішані форми Past Simple",
    description: "Упевнене застосування стверджень, заперечень і питань у читанні, письмі, слуханні та розмові.",
    lessons: [
      lesson("past-m4-01-overview", "1. Огляд усіх форм Past Simple", "OVERVIEW", "Ствердження|Заперечення з didn’t|Питання з did|Was/were|Заперечення wasn’t/weren’t|Питання was/were|V1 після did|V2 у ствердженні|Signal words|Змішане застосування"),
      lesson("past-m4-02-transformations", "2. Ствердження → заперечення → питання", "DEEP_DIVE", "Ствердження як основа|Ствердження в заперечення|Ствердження в загальне питання|Ствердження в спеціальне питання|Правильні дієслова|Неправильні дієслова|Was/were|Короткі відповіді|Повні відповіді|Змішані трансформації"),
      lesson("past-m4-03-yesterday", "3. Учора й щоденні події", "PRACTICE", "Ранок|Навчання або робота|Пересування містом|Покупки|Спілкування|Вільний час|Вечір|Що сталося|Що не сталося|Питання про минулий день"),
      lesson("past-m4-04-travel", "4. Вихідні, подорожі й канікули", "PRACTICE", "Підготовка до поїздки|Транспорт|Прибуття|Місце проживання|Пам’ятки|Їжа й покупки|Проблеми в подорожі|Враження|Питання про поїздку|Розповідь про подорож"),
      lesson("past-m4-05-childhood", "5. Дитинство й особисті події", "PRACTICE", "Вік і місце народження|Родина|Школа|Друзі|Дитячі звички|Захоплення|Важливі події|Позитивні спогади|Негативні спогади|Інтерв’ю про дитинство"),
      lesson("past-m4-06-stories", "6. Історії та послідовність подій", "PRACTICE", "Початок історії|Місце й час|Персонажі|Перша подія|Розвиток подій|Неочікувана проблема|Реакція персонажів|Рішення проблеми|Завершення історії|Власна історія"),
      lesson("past-m4-07-reading", "7. Past Simple у читанні", "DEEP_DIVE", "Час у тексті|Правильні дієслова в тексті|Неправильні дієслова в тексті|Was/were в тексті|Послідовність|Signal words|Загальні питання до тексту|Спеціальні питання до тексту|Пропущені події|Переказ тексту"),
      lesson("past-m4-08-listening", "8. Past Simple в аудіюванні", "PRACTICE", "Розпізнавання правильних дієслів|Розпізнавання неправильних дієслів|Вимова -ed|Розпізнавання didn’t|Розпізнавання wasn’t/weren’t|Час події|Послідовність на слух|Заповнення пропусків|Відповіді на питання|Усний переказ аудіо"),
      lesson("past-m4-09-writing-speaking", "9. Past Simple у письмі й мовленні", "DEEP_DIVE", "Речення про минуле|Опис учорашнього дня|Опис вихідних|Розповідь про подорож|Розповідь про дитинство|Пам’ятна подія|Зв’язувальні слова|Перевірка форм дієслів|Самостійне редагування|Усний і письмовий текст"),
      lesson("past-m4-10-course-final", "10. Фінальний контроль Past Simple", "FINAL", "Випадки вживання|Правильні дієслова|Неправильні дієслова|Правопис -ed|Вимова -ed|Was/were|Заперечення з didn’t|Заперечення wasn’t/weren’t|Загальні й спеціальні питання|Письмовий і усний підсумок"),
    ],
  },
];

const REGULAR_ACTIONS = [
  ["Marta", "clean", "cleaned", "the kitchen", "Марта прибрала кухню"],
  ["Oleh", "watch", "watched", "a film", "Олег подивився фільм"],
  ["Nina", "study", "studied", "for her test", "Ніна навчалася до тесту"],
  ["Danylo", "plan", "planned", "the trip", "Данило спланував поїздку"],
  ["Sofia", "visit", "visited", "her grandmother", "Софія відвідала бабусю"],
  ["Taras", "play", "played", "tennis", "Тарас грав у теніс"],
  ["Ira", "live", "lived", "near the station", "Іра жила біля станції"],
  ["Mark", "stop", "stopped", "the car", "Марк зупинив автомобіль"],
  ["Lena", "carry", "carried", "the boxes", "Лена несла коробки"],
  ["Roman", "work", "worked", "late", "Роман працював допізна"],
  ["Anna", "cook", "cooked", "dinner", "Анна приготувала вечерю"],
  ["My friends", "walk", "walked", "home", "Мої друзі пішли додому пішки"],
];

const IRREGULAR_ACTIONS = [
  ["Marta", "go", "went", "to the museum", "Марта пішла до музею"],
  ["Oleh", "see", "saw", "his teacher", "Олег побачив свого вчителя"],
  ["Nina", "have", "had", "breakfast", "Ніна поснідала"],
  ["Danylo", "take", "took", "a taxi", "Данило взяв таксі"],
  ["Sofia", "buy", "bought", "a new book", "Софія купила нову книжку"],
  ["Taras", "write", "wrote", "an email", "Тарас написав листа"],
  ["Ira", "come", "came", "home early", "Іра прийшла додому рано"],
  ["Mark", "make", "made", "a cake", "Марк зробив торт"],
  ["Lena", "bring", "brought", "her camera", "Лена принесла камеру"],
  ["Roman", "tell", "told", "the story", "Роман розповів історію"],
  ["Anna", "eat", "ate", "an apple", "Анна з’їла яблуко"],
  ["My friends", "meet", "met", "at the café", "Мої друзі зустрілися в кафе"],
];

const PAST_STATES = [
  ["I", "was", "tired", "Я була втомлена"],
  ["She", "was", "at home", "Вона була вдома"],
  ["He", "was", "angry", "Він був сердитий"],
  ["We", "were", "ready", "Ми були готові"],
  ["They", "were", "in London", "Вони були в Лондоні"],
  ["You", "were", "late", "Ти запізнився"],
];

function actionAt(serial, irregular = false) {
  const source = irregular ? IRREGULAR_ACTIONS : REGULAR_ACTIONS;
  const [subject, base, past, object, translation] = source[serial % source.length];
  const time = ["yesterday", "last night", "two days ago", "last weekend", "in 2024", "after class"][Math.floor(serial / source.length) % 6];
  return { subject, base, past, object, translation: `${translation} ${time === "yesterday" ? "вчора" : ""}`.trim(), time };
}

function stateAt(serial) {
  const [subject, be, complement, translation] = PAST_STATES[serial % PAST_STATES.length];
  return { subject, be, complement, translation, time: ["yesterday", "last week", "after school"][Math.floor(serial / PAST_STATES.length) % 3] };
}

const RULES = {
  "past-simple-recognition": ["Past Simple показує завершену дію в конкретному минулому контексті.", "Subject + V2 + past-time expression"],
  "past-simple-uses": ["Для завершених подій, фактів і звичок у минулому використовуйте Past Simple.", "Subject + V2"],
  "past-simple-regular-verbs": ["У ствердженні правильне дієслово має форму V-ed.", "Subject + regular verb-ed"],
  "past-simple-irregular-verbs": ["Неправильну другу форму потрібно вивчати як окрему форму.", "Subject + irregular V2"],
  "past-simple-ed-spelling": ["Перевірте правило -ed, -d, -ied або подвоєння приголосної перед закінченням.", "base verb + spelling rule"],
  "past-simple-ed-pronunciation-t": ["Після глухого звука -ed часто вимовляється /t/.", "worked → /t/"],
  "past-simple-ed-pronunciation-d": ["Після голосного або дзвінкого звука -ed часто вимовляється /d/.", "played → /d/"],
  "past-simple-ed-pronunciation-id": ["Після /t/ або /d/ закінчення -ed вимовляється /ɪd/.", "wanted / needed → /ɪd/"],
  "past-simple-was-were": ["Використовуйте was з I, he, she, it; were — з you, we, they.", "Subject + was/were + complement"],
  "past-simple-signal-words": ["Маркери yesterday, last, ago та in + year уточнюють завершений минулий час.", "Past-time marker + Past Simple"],
  "past-simple-word-order": ["У ствердженні поставте підмет, форму минулого часу, потім деталі.", "Subject + V2 + object + time"],
  "past-simple-sequence": ["Зв’яжіть завершені події словами first, then, after that, next і finally.", "First … Then … Finally …"],
  "past-simple-negative-didnt": ["Для заперечення дії використовуйте didn’t перед базовою формою.", "Subject + didn’t + V1"],
  "past-simple-negative-be": ["Для заперечення стану або місця використовуйте wasn’t чи weren’t.", "Subject + wasn’t/weren’t + complement"],
  "past-simple-base-after-did": ["Після did і didn’t смислове дієслово завжди повертається до V1.", "did/didn’t + V1"],
  "past-simple-negative-words": ["Never, nobody, nothing і nowhere вже мають заперечне значення; не додавайте друге заперечення.", "never + V2 / didn’t + V1"],
  "past-simple-general-questions": ["У загальному питанні did стоїть перед підметом, а дієслово має V1.", "Did + subject + V1?"],
  "past-simple-short-answers": ["У короткій відповіді повторіть did або didn’t, а не основне дієслово.", "Yes, subject + did. / No, subject + didn’t."],
  "past-simple-wh-questions": ["У спеціальному питанні після question word ставте did, підмет і V1.", "Wh-word + did + subject + V1?"],
  "past-simple-subject-questions": ["Коли питаємо про виконавця дії, did зазвичай не потрібне.", "Who/What + V2 + …?"],
  "past-simple-alternative-questions": ["Поєднайте два реальні варіанти словом or у правильній питальній схемі.", "Did/Was + subject + option A or option B?"],
  "past-simple-context-production": ["Доберіть форму Past Simple до змісту: дія, заперечення, питання або минулий стан.", "Choose the form that matches the context"],
};

function scenarioFor(skillSlug, serial) {
  const [rule, formula] = RULES[skillSlug] ?? RULES["past-simple-context-production"];
  const action = actionAt(serial, skillSlug.includes("irregular") || skillSlug.includes("base-after") || skillSlug.includes("general-question") || skillSlug.includes("wh-question") || skillSlug.includes("subject-question"));
  const state = stateAt(serial);
  const positive = `${action.subject} ${action.past} ${action.object} ${action.time}.`;
  const presentError = `${action.subject} ${action.base}${action.subject === "My friends" ? "" : "s"} ${action.object} ${action.time}.`;
  const negative = `${action.subject} didn’t ${action.base} ${action.object} ${action.time}.`;
  const negativeError = `${action.subject} didn’t ${action.past} ${action.object} ${action.time}.`;
  const generalQuestion = `Did ${action.subject.toLowerCase() === "my friends" ? "my friends" : action.subject.toLowerCase()} ${action.base} ${action.object} ${action.time}?`;
  const generalError = `Did ${action.subject.toLowerCase() === "my friends" ? "my friends" : action.subject.toLowerCase()} ${action.past} ${action.object} ${action.time}?`;

  if (skillSlug === "past-simple-was-were") {
    const correct = `${state.subject} ${state.be} ${state.complement} ${state.time}.`;
    const incorrect = `${state.subject} ${state.be === "was" ? "were" : "was"} ${state.complement} ${state.time}.`;
    return { rule, formula, correct, incorrect, prompt: `${state.subject} ___ ${state.complement} ${state.time}.`, answer: state.be, translation: state.translation };
  }
  if (skillSlug === "past-simple-negative-be") {
    const short = state.be === "was" ? "wasn’t" : "weren’t";
    return { rule, formula, correct: `${state.subject} ${short} ${state.complement} ${state.time}.`, incorrect: `${state.subject} didn’t ${state.complement} ${state.time}.`, prompt: `${state.subject} ___ ${state.complement} ${state.time}.`, answer: short, translation: `${state.translation} не була/не був` };
  }
  if (skillSlug === "past-simple-general-questions") {
    return { rule, formula, correct: generalQuestion, incorrect: generalError, prompt: `___ ${action.subject.toLowerCase()} ${action.base} ${action.object} ${action.time}?`, answer: "Did", translation: `Чи ${action.translation.toLowerCase()}?` };
  }
  if (skillSlug === "past-simple-wh-questions") {
    const correct = `Where did ${action.subject.toLowerCase()} ${action.base} ${action.time}?`;
    return { rule, formula, correct, incorrect: `Where ${action.subject.toLowerCase()} did ${action.base} ${action.time}?`, prompt: `Where ___ ${action.subject.toLowerCase()} ${action.base} ${action.time}?`, answer: "did", translation: `Куди ${action.translation.toLowerCase()}?` };
  }
  if (skillSlug === "past-simple-subject-questions") {
    const correct = `Who ${action.past} ${action.object} ${action.time}?`;
    return { rule, formula, correct, incorrect: `Who did ${action.base} ${action.object} ${action.time}?`, prompt: `Who ___ ${action.object} ${action.time}?`, answer: action.past, translation: `Хто ${action.translation.toLowerCase()}?` };
  }
  if (skillSlug === "past-simple-alternative-questions") {
    const correct = `Did ${action.subject.toLowerCase()} ${action.base} ${action.object} or stay at home ${action.time}?`;
    return { rule, formula, correct, incorrect: `Did ${action.subject.toLowerCase()} ${action.past} ${action.object} or stayed at home ${action.time}?`, prompt: `Did ${action.subject.toLowerCase()} ${action.base} ${action.object} ___ stay at home?`, answer: "or", translation: `Чи ${action.translation.toLowerCase()}, чи залишилася/залишився вдома?` };
  }
  if (skillSlug === "past-simple-short-answers") {
    const pronoun = action.subject === "My friends" ? "they" : action.subject === "Marta" || action.subject === "Nina" || action.subject === "Sofia" || action.subject === "Ira" || action.subject === "Lena" || action.subject === "Anna" ? "she" : "he";
    return { rule, formula, correct: `Yes, ${pronoun} did. ${action.subject} ${action.past} ${action.object} ${action.time}.`, incorrect: `Yes, ${pronoun} ${action.past}.`, prompt: `Yes, ${pronoun} ___.`, answer: "did", translation: `Так, ${action.translation.toLowerCase()}.` };
  }
  if (skillSlug === "past-simple-negative-didnt" || skillSlug === "past-simple-base-after-did") {
    return { rule, formula, correct: negative, incorrect: negativeError, prompt: `${action.subject} ___ ${action.object} ${action.time}.`, answer: `didn’t ${action.base}`, translation: `${action.translation} не відбулася` };
  }
  if (skillSlug === "past-simple-negative-words") {
    return { rule, formula, correct: `${action.subject} never ${action.past} ${action.object}.`, incorrect: `${action.subject} didn’t never ${action.past} ${action.object}.`, prompt: `${action.subject} ___ ${action.past} ${action.object}.`, answer: "never", translation: `${action.translation} ніколи не сталася` };
  }
  if (skillSlug.startsWith("past-simple-ed-pronunciation")) {
    const pairs = skillSlug.endsWith("-t") ? ["worked", "/t/", "/d/"] : skillSlug.endsWith("-d") ? ["played", "/d/", "/ɪd/"] : ["wanted", "/ɪd/", "/t/"];
    return { rule, formula, correct: `${pairs[0]} has the /${pairs[1].replaceAll("/", "")}/ ending pronunciation.`, incorrect: `${pairs[0]} has the /${pairs[2].replaceAll("/", "")}/ ending pronunciation.`, prompt: `${pairs[0]} — ___`, answer: pairs[1], translation: `${pairs[0]}: правильна вимова закінчення ${pairs[1]}` };
  }
  if (skillSlug === "past-simple-ed-spelling") {
    const special = [["study", "studied", "studyed"], ["stop", "stopped", "stoped"], ["live", "lived", "liveed"]][serial % 3];
    return { rule, formula, correct: `Marta ${special[1]} after class.`, incorrect: `Marta ${special[2]} after class.`, prompt: `Marta ___ after class.`, answer: special[1], translation: `Марта навчалася після занять.` };
  }
  if (skillSlug === "past-simple-sequence") {
    return { rule, formula, correct: `First, ${action.subject} ${action.past} ${action.object}; then, ${action.subject.toLowerCase()} went home.`, incorrect: `${action.subject} went home first, then ${action.past} ${action.object}.`, prompt: `First, ${action.subject} ${action.past} ${action.object}; ___, went home.`, answer: "then", translation: `Спочатку ${action.translation.toLowerCase()}, потім пішла/пішов додому.` };
  }
  if (skillSlug === "past-simple-signal-words") {
    return { rule, formula, correct: positive, incorrect: `${action.subject} ${action.past} ${action.object} in last week.`, prompt: `${action.subject} ${action.past} ${action.object} ___.`, answer: action.time, translation: action.translation };
  }
  return { rule, formula, correct: positive, incorrect: presentError, prompt: `${action.subject} ___ ${action.object} ${action.time}.`, answer: action.past, translation: action.translation };
}

function task(id, type, engineKey, variantKey, instruction, question, content, correctAnswer, explanation, hint, skillSlug, alternativeAnswers) {
  return { id, type, engineKey, variantKey, instruction, question, content, correctAnswer, explanation, hint, skillSlug, alternativeAnswers };
}

function makeExercises(fragment, skillSlug, serial) {
  const first = scenarioFor(skillSlug, serial);
  const second = scenarioFor(skillSlug, serial + 17);
  const third = scenarioFor(skillSlug, serial + 31);
  const tokens = first.correct.replace(/[?.!]$/g, "").split(/\s+/);
  const alternative = first.correct.replace(/[.]$/, "");
  const errorDetails = [{ incorrect: first.incorrect, correction: first.correct, explanation: first.rule }];
  return [
    task("gap", "FILL_IN_THE_BLANK", "fill-in-the-blanks", "GAP_FILL", "Впишіть точну форму.", first.prompt, { acceptedAnswers: [first.answer], example: first.correct, errorDetails }, first.answer, first.rule, `Формула: ${first.formula}`, skillSlug),
    task("choice", "SINGLE_CHOICE", "single-choice", "CONTEXT_SELECTION", "Оберіть граматично правильне речення.", `Яке речення відповідає правилу «${fragment.focus}»?`, { options: [second.correct, second.incorrect, first.incorrect], example: second.correct, errorDetails: [{ incorrect: second.incorrect, correction: second.correct, explanation: second.rule }] }, second.correct, second.rule, "Перевірте допоміжне дієслово, форму V1/V2 і маркер часу.", skillSlug),
    task("input", "TEXT_INPUT", "text-input", "SHORT_ANSWER", "Напишіть лише потрібне слово або форму.", third.prompt, { acceptedAnswers: [third.answer], ignorePunctuation: true, example: third.correct }, third.answer, third.rule, `Зосередьтеся на фрагменті: ${fragment.focus}.`, skillSlug),
    task("matching", "MATCHING", "matching", "PAIR_MATCHING", "Зіставте правило з прикладом.", "Знайдіть правильний і помилковий приклади.", { left: ["Правильний приклад", "Типова помилка"], right: [first.correct, first.incorrect], example: first.correct }, { "Правильний приклад": first.correct, "Типова помилка": first.incorrect }, first.rule, "Спершу знайдіть форму, яка відповідає формулі.", skillSlug),
    task("builder", "SENTENCE_ORDER", "sentence-builder", "SENTENCE_ORDER", "Розташуйте слова у правильному порядку.", "Побудуйте правильне речення Past Simple.", { options: tokens, preserveOrder: true, example: first.correct, errorDetails }, tokens, first.rule, "Почніть із підмета або питального слова.", skillSlug),
    task("correction", "ERROR_CORRECTION", "find-and-correct", "ERROR_CORRECTION", "Перепишіть речення правильно.", first.incorrect, { acceptedAnswers: [alternative, first.correct], ignorePunctuation: true, example: first.correct, errorDetails }, first.correct, `Виправлена форма: ${first.correct}. ${first.rule}`, "Виправте форму, а не зміст речення.", skillSlug, [alternative]),
    task("multi", "MULTIPLE_CHOICE", "multiple-choice", "MULTI_SELECT", "Оберіть усі правильні варіанти.", "Виберіть речення без граматичної помилки.", { options: [first.correct, second.incorrect, third.incorrect], example: first.correct }, [first.correct], first.rule, "У цьому наборі правильний один варіант.", skillSlug),
    task("translation", "SENTENCE_TRANSLATION", "translation", "SENTENCE_TRANSLATION", "Перекладіть фразу англійською.", second.translation, { acceptedAnswers: [second.correct], ignorePunctuation: true, example: second.correct }, second.correct, second.rule, "Збережіть форму Past Simple та порядок слів.", skillSlug, [second.correct.replace(/[.]$/, "")]),
    task("transform", "TENSE_TRANSFORMATION", "tense-transformation", "TRANSFORMATION", "Перетворіть речення на правильну форму за правилом.", third.incorrect, { acceptedAnswers: [third.correct, third.correct.replace(/[.]$/, "")], ignorePunctuation: true, example: third.correct, errorDetails: [{ incorrect: third.incorrect, correction: third.correct, explanation: third.rule }] }, third.correct, third.rule, "Не залишайте дві позначки минулого часу в одному дієслові.", skillSlug),
    task("context", "SINGLE_CHOICE", "single-choice", "CONTEXT_SELECTION", "Оберіть форму для контексту.", `Контекст: ${first.translation}. Яке англійське речення точне?`, { options: [first.correct, first.incorrect, second.incorrect], example: first.correct }, first.correct, first.rule, "Порівняйте значення та граматичну форму.", skillSlug),
    task("recall", "TEXT_INPUT", "text-input", "SHORT_ANSWER", "Відтворіть правильну форму без варіантів.", first.prompt, { acceptedAnswers: [first.answer], ignorePunctuation: true, example: first.correct }, first.answer, `Правильна відповідь: ${first.answer}. ${first.rule}`, `Формула: ${first.formula}`, skillSlug),
    task("control", "ERROR_CORRECTION", "find-and-correct", "ERROR_CORRECTION", "Контрольне завдання: виправте й поясніть форму подумки.", second.incorrect, { acceptedAnswers: [second.correct, second.correct.replace(/[.]$/, "")], ignorePunctuation: true, example: second.correct, errorDetails: [{ incorrect: second.incorrect, correction: second.correct, explanation: second.rule }] }, second.correct, `Правильно: ${second.correct}. ${second.rule}`, "Після відповіді звірте V1/V2, was/were або порядок питання.", skillSlug, [second.correct.replace(/[.]$/, "")]),
  ];
}

function inferSkill(moduleIndex, focus, fragmentIndex) {
  const text = focus.toLowerCase();
  if (moduleIndex === 0) {
    if (text.includes("вимова /t")) return "past-simple-ed-pronunciation-t";
    if (text.includes("вимова /d")) return "past-simple-ed-pronunciation-d";
    if (text.includes("вимова /ɪd") || text.includes("три варіанти")) return "past-simple-ed-pronunciation-id";
    if (text.includes("-ed") || text.includes("-ied") || text.includes("подвоєн")) return "past-simple-ed-spelling";
    if (text.includes("неправиль")) return "past-simple-irregular-verbs";
    if (text.includes("was") || text.includes("were") || text.includes("стан") || text.includes("місц")) return "past-simple-was-were";
    if (text.includes("signal") || text.includes("yesterday") || text.includes("last") || text.includes("ago") || text.includes("марк")) return "past-simple-signal-words";
    if (text.includes("послідов") || text === "first" || text === "then" || text.includes("after that") || text === "next" || text === "finally") return "past-simple-sequence";
    if (text.includes("порядок")) return "past-simple-word-order";
    if (text.includes("правильн") || text.includes("-ed")) return "past-simple-regular-verbs";
    return fragmentIndex % 2 ? "past-simple-uses" : "past-simple-recognition";
  }
  if (moduleIndex === 1) {
    if (text.includes("never") || text.includes("nobody") || text.includes("nothing") || text.includes("nowhere") || text.includes("подвійн")) return "past-simple-negative-words";
    if (text.includes("wasn") || text.includes("weren") || text.includes("was not") || text.includes("were not") || text.includes("прикметник") || text.includes("стан")) return "past-simple-negative-be";
    if (text.includes("v2") || text.includes("v1") || text.includes("went") || text.includes("saw") || text.includes("studied") || text.includes("подвійн")) return "past-simple-base-after-did";
    return "past-simple-negative-didnt";
  }
  if (moduleIndex === 2) {
    if (text.includes("підмет") || text.includes("who worked") || text.includes("who called") || text.includes("what happened") || text.includes("додатк")) return "past-simple-subject-questions";
    if (text.includes("альтернатив") || text === "or") return "past-simple-alternative-questions";
    if (text.includes("коротк") || text.includes("повн") || text.includes("відповід")) return "past-simple-short-answers";
    if (text.includes("what") || text.includes("where") || text.includes("when") || text.includes("why") || text.includes("how") || text.includes("спеціальн")) return "past-simple-wh-questions";
    if (text.includes("v1") || text.includes("went") || text.includes("saw") || text.includes("had") || text.includes("подвійн")) return "past-simple-base-after-did";
    return "past-simple-general-questions";
  }
  if (text.includes("аудіо") || text.includes("слух") || text.includes("читан") || text.includes("письм") || text.includes("усн") || text.includes("розповід")) return "past-simple-context-production";
  if (text.includes("запереч")) return "past-simple-negative-didnt";
  if (text.includes("питан")) return "past-simple-general-questions";
  if (text.includes("was") || text.includes("were")) return "past-simple-was-were";
  if (text.includes("неправиль")) return "past-simple-irregular-verbs";
  return fragmentIndex % 2 ? "past-simple-context-production" : "past-simple-uses";
}

function blockTypeFor(focus) {
  const text = focus.toLowerCase();
  if (text.includes("читан")) return "READING";
  if (text.includes("аудіо") || text.includes("слух")) return "LISTENING";
  if (text.includes("діалог") || text.includes("інтерв’ю")) return "DIALOGUE";
  if (text.includes("письм") || text.includes("усн")) return "DISCUSSION";
  return "THEORY";
}

function fragmentBlocks(lessonPlan, moduleIndex, focus, fragmentIndex, offset) {
  const skillSlug = inferSkill(moduleIndex, focus, fragmentIndex);
  const key = `${lessonPlan.slug}-fragment-${String(fragmentIndex + 1).padStart(2, "0")}`;
  const examples = [scenarioFor(skillSlug, offset), scenarioFor(skillSlug, offset + 17), scenarioFor(skillSlug, offset + 31)];
  const first = examples[0];
  return [
    {
      type: blockTypeFor(focus),
      title: `${focus}: правило й приклади`,
      content: {
        text: `${first.rule}\n\nФормула: ${first.formula}\n\nТипова помилка: ${first.incorrect}\nПравильно: ${first.correct}`,
        formula: first.formula,
        examples: examples.map((example) => ({ correct: example.correct, incorrect: example.incorrect, translation: example.translation })),
        commonError: { incorrect: first.incorrect, correction: first.correct, explanation: first.rule },
        ...(blockTypeFor(focus) === "LISTENING" ? { transcript: first.correct, transcriptTranslation: first.translation, audioSource: "cms-required" } : {}),
      },
      learningFragmentKey: key,
      isLearningFragment: true,
      requiresTwelveExercises: false,
      order: offset + 1,
      grammarSkillSlugs: [skillSlug],
    },
    {
      type: "EXERCISE",
      title: `Практика: ${focus}`,
      content: { text: `12 різнотипних завдань саме для фрагмента «${focus}».`, practiceFocus: focus, formula: first.formula },
      learningFragmentKey: key,
      isLearningFragment: false,
      requiresTwelveExercises: true,
      order: offset + 2,
      grammarSkillSlugs: [skillSlug],
      exercises: makeExercises({ focus }, skillSlug, offset),
    },
  ];
}

function reviewBlock(lessonPlan, moduleIndex, afterFragment, order) {
  const topics = lessonPlan.topics.slice(afterFragment - 3, afterFragment).join(", ");
  const skillSlug = inferSkill(moduleIndex, lessonPlan.topics[afterFragment - 1], afterFragment - 1);
  return {
    type: "REVIEW",
    title: `Міні-повторення після фрагментів ${afterFragment - 2}–${afterFragment}`,
    content: { text: `Змішане пригадування: ${topics}. Поясніть формулу своїми словами, а потім виконайте пов’язані вправи.`, summary: true },
    settings: { reviewAfterFragment: afterFragment, adaptiveSkillReview: true },
    order,
    grammarSkillSlugs: [skillSlug],
  };
}

function mixedPracticeExercises(lessonPlan, moduleIndex) {
  const skills = lessonPlan.skillSlugs;
  return Array.from({ length: PRACTICE_PER_FRAGMENT }, (_, index) => {
    const skillSlug = skills[index % skills.length];
    const exercise = makeExercises({ focus: "Підсумкова змішана практика" }, skillSlug, 10_000 + moduleIndex * 1_000 + lessonPlan.order * 100 + index)[index];
    return { ...exercise, id: `mixed-${index + 1}` };
  });
}

function buildPlan() {
  return {
    course: {
      slug: COURSE_SLUG,
      title: "Past Simple: повне опанування",
      shortDescription: "Повний A1-курс Past Simple: ствердження, заперечення, питання, читання, письмо й говоріння.",
      fullDescription: "Чотири модулі та сорок уроків. Кожен урок поділяє тему на десять коротких фрагментів: пояснення, формула, приклади, типова помилка й рівно дванадцять пов’язаних вправ після кожного фрагмента.",
      learningOutcomes: SKILLS.map(([, title, description]) => `${title}: ${description}`),
      prerequisites: ["Розуміти базові особові займенники та прості англійські речення."],
    },
    skills: SKILLS.map(([slug, title, description], index) => ({ slug, title, description, order: index + 1 })),
    modules: MODULES.map((modulePlan, moduleIndex) => ({
      ...modulePlan,
      order: moduleIndex + 1,
      lessons: modulePlan.lessons.map((lessonPlan, lessonIndex) => {
        const lessonSkillSlugs = [...new Set(lessonPlan.topics.map((focus, fragmentIndex) => inferSkill(moduleIndex, focus, fragmentIndex)))];
        const fragments = lessonPlan.topics.flatMap((focus, fragmentIndex) => fragmentBlocks(lessonPlan, moduleIndex, focus, fragmentIndex, fragmentIndex * 2 + Math.floor(fragmentIndex / 3)));
        const reviewAfterThree = [3, 6, 9].map((afterFragment, reviewIndex) => reviewBlock(lessonPlan, moduleIndex, afterFragment, afterFragment * 2 + reviewIndex + 1));
        const finalSkill = inferSkill(moduleIndex, lessonPlan.topics.at(-1), 9);
        return {
          ...lessonPlan,
          order: lessonIndex + 1,
          estimatedDuration: LESSON_DURATION_MINUTES,
          minimumCompletionScore: lessonPlan.role === "FINAL" ? 75 : 60,
          skillSlugs: lessonSkillSlugs,
          description: `${lessonPlan.title}. Десять малих фрагментів, 120 перевірених вправ, три міні-повторення та підсумок уроку.`,
          learningObjectives: lessonSkillSlugs.map((slug) => SKILLS.find(([skillSlug]) => skillSlug === slug)?.[1] ?? slug),
          previewText: `10 навчальних фрагментів і ${PRACTICE_PER_FRAGMENT * 10} вправ із поясненням помилок.`,
          blocks: [
            ...fragments,
            ...reviewAfterThree,
            {
              type: "EXERCISE",
              title: "Змішана практика наприкінці уроку",
              content: { text: "12 підсумкових завдань на різні навички цього уроку.", mixedPractice: true },
              learningFragmentKey: `${lessonPlan.slug}-fragment-10`,
              isLearningFragment: false,
              requiresTwelveExercises: true,
              order: 24,
              grammarSkillSlugs: lessonSkillSlugs,
              exercises: mixedPracticeExercises({ ...lessonPlan, skillSlugs: lessonSkillSlugs, order: lessonIndex + 1 }, moduleIndex),
            },
            {
              type: "REVIEW",
              title: lessonPlan.role === "FINAL" ? "Фінальна перевірка модуля" : "Підсумок уроку й наступний крок",
              content: { text: `Підсумуйте десять фрагментів уроку. Слабкі навички автоматично залишаться у вашій черзі повторення.`, finalSummary: true, nextLessonEnabled: true },
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
  assert(plan.modules.length === 4, "Past Simple course must contain exactly four modules.");
  assert(plan.skills.length === 22, "Past Simple course must define twenty-two measurable skills.");
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
  if (!databaseUrl) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required to import the Past Simple course.");
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
      await tx.contentAuditLog.create({ data: { actorId: author.id, action: "CMS_PAST_SIMPLE_COURSE_IMPORTED", entityType: "Course", entityId: createdCourse.id, metadata: { publish, counts } } });
      return createdCourse;
    }, { maxWait: 60_000, timeout: 600_000 });
    const counts = await Promise.all([
      prisma.courseModule.count({ where: { courseId: course.id } }), prisma.lesson.count({ where: { module: { courseId: course.id } } }),
      prisma.lessonBlock.count({ where: { lesson: { module: { courseId: course.id } } } }), prisma.exercise.count({ where: { lessonBlock: { lesson: { module: { courseId: course.id } } } } }), prisma.grammarSkill.count({ where: { courseId: course.id } }),
    ]);
    const expected = validatePlan(plan);
    assert(counts.every((count, index) => count === [expected.modules, expected.lessons, expected.blocks, expected.exercises, expected.skills][index]), "The stored Past Simple course does not match the validated plan.");
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
